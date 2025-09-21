import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, TrendingUp, BarChart3, Download, ArrowLeft, Home,
  DollarSign, Target, Activity, FileText, Calculator, PieChart,
  ArrowUpRight, Eye, Filter, RefreshCw, ChevronRight, X
} from 'lucide-react';

const BilanSYSCOHADAPageV2: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('synthese');
  const [periode, setPeriode] = useState('current');

  // États pour le modal de détail
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    title: '',
    code: '',
    type: 'exerciceN' as 'sous-comptes' | 'exerciceN' | 'exerciceN-1' | 'ecarts' | 'transactions' | 'details',
    montant: 0
  });

  // Onglets du bilan
  const tabs = [
    { id: 'synthese', label: 'Synthèse', icon: BarChart3 },
    { id: 'actif', label: 'Actif', icon: Building2 },
    { id: 'passif', label: 'Passif', icon: DollarSign },
    { id: 'bilan-fonctionnel', label: 'Bilan Fonctionnel', icon: Building2 },
    { id: 'tableau-financement', label: 'Tableau de Financement', icon: PieChart },
    { id: 'flux-tresorerie', label: 'TFT', icon: Activity },
    { id: 'analyse', label: 'Analyse Financière', icon: Target },
    { id: 'evolution', label: 'Évolution', icon: TrendingUp },
    { id: 'export', label: 'Export', icon: Download },
  ];

  // Fonction pour ouvrir le modal de détail
  const openDetailModal = (code: string, title: string, type: 'sous-comptes' | 'exerciceN' | 'exerciceN-1' | 'ecarts' | 'transactions' | 'details', montant: number) => {
    setModalData({ title, code, type, montant });
    setIsModalOpen(true);
  };

  // Données synthèse bilan
  const bilanSynthese = {
    totalActif: 5670000,
    totalPassif: 5670000,
    capitauxPropres: 3250000,
    dettes: 2420000,
    ratios: {
      liquidite: 1.85,
      autonomie: 57.3,
      endettement: 42.7
    }
  };

  // Données Bilan Fonctionnel
  const bilanFonctionnelData = {
    emplois: [
      { code: 'EI', libelle: 'Emplois stables (Actif immobilisé)', montant: 4640000 },
      { code: 'EA', libelle: 'Actif circulant d\'exploitation', montant: 1020000 },
      { code: 'EHE', libelle: 'Actif circulant hors exploitation', montant: 280000 },
      { code: 'ET', libelle: 'Actif de trésorerie', montant: 1010000 }
    ],
    ressources: [
      { code: 'RS', libelle: 'Ressources stables', montant: 4375000 },
      { code: 'RCE', libelle: 'Passif circulant d\'exploitation', montant: 1020000 },
      { code: 'RCHE', libelle: 'Passif circulant hors exploitation', montant: 340000 },
      { code: 'RT', libelle: 'Passif de trésorerie', montant: 215000 }
    ]
  };

  // Données Tableau de Financement
  const tableauFinancementData = {
    emplois: [
      { code: 'E1', libelle: 'Distributions mises en paiement', montant: 200000 },
      { code: 'E2', libelle: 'Acquisitions d\'immobilisations', montant: 850000 },
      { code: 'E3', libelle: 'Charges à répartir', montant: 45000 },
      { code: 'E4', libelle: 'Réduction des dettes financières', montant: 505000 }
    ],
    ressources: [
      { code: 'R1', libelle: 'CAF de l\'exercice', montant: 1200000 },
      { code: 'R2', libelle: 'Cessions d\'immobilisations', montant: 125000 },
      { code: 'R3', libelle: 'Augmentation de capital', montant: 300000 },
      { code: 'R4', libelle: 'Augmentation des dettes financières', montant: 100000 }
    ]
  };

  // Données Flux de Trésorerie
  const fluxTresorerieData = {
    activitesOperationnelles: [
      { code: 'FO1', libelle: 'Résultat net de l\'exercice', montant: 535000 },
      { code: 'FO2', libelle: 'Dotations aux amortissements', montant: 485000 },
      { code: 'FO3', libelle: 'Dotations aux provisions', montant: 180000 },
      { code: 'FO4', libelle: 'Variation du BFR', montant: -460000 }
    ],
    activitesInvestissement: [
      { code: 'FI1', libelle: 'Acquisitions d\'immobilisations', montant: -850000 },
      { code: 'FI2', libelle: 'Cessions d\'immobilisations', montant: 125000 },
      { code: 'FI3', libelle: 'Autres investissements', montant: -370000 }
    ],
    activitesFinancement: [
      { code: 'FF1', libelle: 'Augmentation de capital', montant: 300000 },
      { code: 'FF2', libelle: 'Nouveaux emprunts', montant: 100000 },
      { code: 'FF3', libelle: 'Remboursements d\'emprunts', montant: -505000 },
      { code: 'FF4', libelle: 'Dividendes versés', montant: -200000 }
    ]
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Bilan SYSCOHADA</h1>
                <p className="text-sm text-[#767676]">États de la situation financière</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/executive')}
              className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Executive</span>
            </button>
            
            <select 
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="px-3 py-2 border border-[#D9D9D9] rounded-lg text-sm focus:ring-2 focus:ring-[#6A8A82]/20"
            >
              <option value="current">31/09/2025</option>
              <option value="quarter">30/06/2025</option>
              <option value="year">31/12/2024</option>
              <option value="comparison">Comparaison</option>
            </select>
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
                      ? 'border-[#6A8A82] text-[#6A8A82]' 
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
              {/* Équilibre bilan */}
              <div className="bg-gradient-to-r from-[#6A8A82]/10 to-[#B87333]/10 rounded-lg p-6 border-2 border-[#6A8A82]/20">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-[#191919] mb-4">💚 Bilan Équilibré</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-semibold text-[#6A8A82] mb-2">TOTAL ACTIF</h4>
                      <p className="text-3xl font-bold text-[#191919]">
                        {(bilanSynthese.totalActif / 1000000).toFixed(2)}M€
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#B87333] mb-2">TOTAL PASSIF</h4>
                      <p className="text-3xl font-bold text-[#191919]">
                        {(bilanSynthese.totalPassif / 1000000).toFixed(2)}M€
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-[#6A8A82] font-medium mt-4">✓ Conformité SYSCOHADA validée</p>
                </div>
              </div>

              {/* Ratios clés */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { 
                    titre: 'Liquidité Générale',
                    valeur: bilanSynthese.ratios.liquidite,
                    unite: '',
                    seuil: '> 1.2',
                    status: 'excellent',
                    color: '#6A8A82'
                  },
                  { 
                    titre: 'Autonomie Financière',
                    valeur: bilanSynthese.ratios.autonomie,
                    unite: '%',
                    seuil: '> 50%',
                    status: 'bon',
                    color: '#B87333'
                  },
                  { 
                    titre: 'Taux d\'Endettement',
                    valeur: bilanSynthese.ratios.endettement,
                    unite: '%',
                    seuil: '< 50%',
                    status: 'optimal',
                    color: '#7A99AC'
                  }
                ].map((ratio, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-[#E8E8E8] hover:shadow-md transition-all">
                    <div className="text-center">
                      <h4 className="font-medium text-[#444444] mb-2">{ratio.titre}</h4>
                      <p className="text-2xl font-bold mb-1" style={{color: ratio.color}}>
                        {ratio.valeur}{ratio.unite}
                      </p>
                      <p className="text-xs text-[#767676] mb-2">Seuil: {ratio.seuil}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        ratio.status === 'excellent' ? 'bg-green-100 text-green-700' :
                        ratio.status === 'bon' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {ratio.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'actif' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="text-lg font-semibold text-[#191919] mb-4">📊 Structure de l'Actif</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Actif immobilisé */}
                  <div>
                    <h4 className="font-semibold text-[#6A8A82] mb-3">Actif Immobilisé</h4>
                    <div className="space-y-2">
                      {[
                        { classe: '21', libelle: 'Immobilisations incorporelles', montant: 450000, percent: 8 },
                        { classe: '22', libelle: 'Terrains', montant: 1200000, percent: 21 },
                        { classe: '23', libelle: 'Bâtiments', montant: 2100000, percent: 37 },
                        { classe: '24', libelle: 'Matériel', montant: 890000, percent: 16 }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <span className="w-8 text-xs font-mono text-[#767676] bg-white px-1 py-0.5 rounded">{item.classe}</span>
                            <span className="text-sm text-[#444444]">{item.libelle}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-[#191919]">
                              {(item.montant / 1000000).toFixed(2)}M€
                            </span>
                            <div className="w-20 h-1 bg-gray-200 rounded-full mt-1">
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

                  {/* Actif circulant */}
                  <div>
                    <h4 className="font-semibold text-[#B87333] mb-3">Actif Circulant</h4>
                    <div className="space-y-2">
                      {[
                        { classe: '31', libelle: 'Stocks marchandises', montant: 340000, percent: 6 },
                        { classe: '41', libelle: 'Clients et comptes rattachés', montant: 680000, percent: 12 },
                        { classe: '52', libelle: 'Banques', montant: 890000, percent: 16 },
                        { classe: '57', libelle: 'Caisse', montant: 120000, percent: 2 }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <span className="w-8 text-xs font-mono text-[#767676] bg-white px-1 py-0.5 rounded">{item.classe}</span>
                            <span className="text-sm text-[#444444]">{item.libelle}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-[#191919]">
                              {(item.montant / 1000).toFixed(0)}K€
                            </span>
                            <div className="w-20 h-1 bg-gray-200 rounded-full mt-1">
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
                </div>
              </div>
            </div>
          )}

          {activeTab === 'passif' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="text-lg font-semibold text-[#191919] mb-4">📊 Structure du Passif</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Capitaux propres */}
                  <div>
                    <h4 className="font-semibold text-[#6A8A82] mb-3">Capitaux Propres</h4>
                    <div className="space-y-2">
                      {[
                        { classe: '10', libelle: 'Capital social', montant: 1500000, percent: 26 },
                        { classe: '11', libelle: 'Réserves', montant: 890000, percent: 16 },
                        { classe: '12', libelle: 'Report à nouveau', montant: 325000, percent: 6 },
                        { classe: '13', libelle: 'Résultat de l\'exercice', montant: 535000, percent: 9 }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <span className="w-8 text-xs font-mono text-[#767676] bg-white px-1 py-0.5 rounded">{item.classe}</span>
                            <span className="text-sm text-[#444444]">{item.libelle}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-[#191919]">
                              {(item.montant / 1000000).toFixed(2)}M€
                            </span>
                            <div className="w-20 h-1 bg-gray-200 rounded-full mt-1">
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

                  {/* Dettes */}
                  <div>
                    <h4 className="font-semibold text-[#B87333] mb-3">Dettes</h4>
                    <div className="space-y-2">
                      {[
                        { classe: '16', libelle: 'Emprunts long terme', montant: 1200000, percent: 21 },
                        { classe: '40', libelle: 'Fournisseurs', montant: 680000, percent: 12 },
                        { classe: '43', libelle: 'Dettes fiscales', montant: 340000, percent: 6 },
                        { classe: '44', libelle: 'Dettes sociales', montant: 200000, percent: 4 }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <span className="w-8 text-xs font-mono text-[#767676] bg-white px-1 py-0.5 rounded">{item.classe}</span>
                            <span className="text-sm text-[#444444]">{item.libelle}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-[#191919]">
                              {(item.montant / 1000000).toFixed(2)}M€
                            </span>
                            <div className="w-20 h-1 bg-gray-200 rounded-full mt-1">
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
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analyse' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Analyse ratios */}
                {[
                  {
                    titre: 'Solvabilité',
                    ratios: [
                      { nom: 'Liquidité générale', valeur: '1.85', benchmark: '> 1.2', status: 'excellent' },
                      { nom: 'Liquidité réduite', valeur: '1.23', benchmark: '> 1.0', status: 'bon' },
                      { nom: 'Liquidité immédiate', valeur: '0.45', benchmark: '> 0.3', status: 'correct' }
                    ],
                    color: '#6A8A82'
                  },
                  {
                    titre: 'Structure Financière', 
                    ratios: [
                      { nom: 'Autonomie financière', valeur: '57.3%', benchmark: '> 50%', status: 'excellent' },
                      { nom: 'Endettement global', valeur: '42.7%', benchmark: '< 50%', status: 'bon' },
                      { nom: 'Couverture dettes', valeur: '2.34', benchmark: '> 2.0', status: 'excellent' }
                    ],
                    color: '#B87333'
                  },
                  {
                    titre: 'Rentabilité',
                    ratios: [
                      { nom: 'ROE', valeur: '16.5%', benchmark: '> 12%', status: 'excellent' },
                      { nom: 'ROA', valeur: '9.4%', benchmark: '> 8%', status: 'bon' },
                      { nom: 'ROCE', valeur: '14.2%', benchmark: '> 10%', status: 'excellent' }
                    ],
                    color: '#7A99AC'
                  }
                ].map((section, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                    <h4 className="font-semibold mb-3" style={{color: section.color}}>{section.titre}</h4>
                    <div className="space-y-2">
                      {section.ratios.map((ratio, i) => (
                        <div key={i} className="flex items-center justify-between py-1">
                          <div>
                            <p className="text-sm text-[#444444]">{ratio.nom}</p>
                            <p className="text-xs text-[#767676]">{ratio.benchmark}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-[#191919]">{ratio.valeur}</span>
                            <span className={`ml-2 text-xs px-1 py-0.5 rounded ${
                              ratio.status === 'excellent' ? 'bg-green-100 text-green-700' :
                              ratio.status === 'bon' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {ratio.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BILAN FONCTIONNEL */}
          {activeTab === 'bilan-fonctionnel' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-[#191919] mb-2">BILAN FONCTIONNEL</h2>
                <p className="text-[#767676]">Analyse fonctionnelle des emplois et ressources</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* EMPLOIS */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-bold text-[#191919] mb-4 text-center">EMPLOIS</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#E8E8E8]">
                          <th className="text-left p-3 text-[#191919] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#191919] font-semibold">Libellé</th>
                          <th className="text-right p-3 text-[#191919] font-semibold">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bilanFonctionnelData.emplois.map((item, index) => (
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-3 text-[#444444]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.montant)}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#444444]">{item.libelle}</td>
                            <td
                              className="p-3 text-right font-mono text-[#191919] hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.montant)}
                              title="Cliquer pour voir les transactions"
                            >
                              {item.montant.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#E8E8E8] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[#191919]">TOTAL EMPLOIS</td>
                          <td className="p-3 text-right text-lg font-bold text-[#191919]">6 950 000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RESSOURCES */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-bold text-[#191919] mb-4 text-center">RESSOURCES</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#E8E8E8]">
                          <th className="text-left p-3 text-[#191919] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#191919] font-semibold">Libellé</th>
                          <th className="text-right p-3 text-[#191919] font-semibold">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bilanFonctionnelData.ressources.map((item, index) => (
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-3 text-[#444444]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.montant)}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#444444]">{item.libelle}</td>
                            <td
                              className="p-3 text-right font-mono text-[#191919] hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.montant)}
                              title="Cliquer pour voir les transactions"
                            >
                              {item.montant.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#E8E8E8] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[#191919]">TOTAL RESSOURCES</td>
                          <td className="p-3 text-right text-lg font-bold text-[#191919]">5 950 000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Indicateurs fonctionnels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#6A8A82] mb-2">Fonds de Roulement Net Global</h4>
                  <p className="text-2xl font-bold text-[#191919]">-265 000 €</p>
                  <p className="text-sm text-[#767676]">Ressources stables - Emplois stables</p>
                </div>
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#B87333] mb-2">Besoin en Fonds de Roulement</h4>
                  <p className="text-2xl font-bold text-[#191919]">-320 000 €</p>
                  <p className="text-sm text-[#767676]">Actif circulant - Passif circulant</p>
                </div>
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#7A99AC] mb-2">Trésorerie Nette</h4>
                  <p className="text-2xl font-bold text-[#191919]">795 000 €</p>
                  <p className="text-sm text-[#767676]">FRNG - BFR</p>
                </div>
              </div>
            </div>
          )}

          {/* TABLEAU DE FINANCEMENT */}
          {activeTab === 'tableau-financement' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-[#191919] mb-2">TABLEAU DE FINANCEMENT SYSCOHADA</h2>
                <p className="text-[#767676]">Analyse des ressources et emplois de fonds</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* EMPLOIS */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-bold text-[#191919] mb-4 text-center">EMPLOIS</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#E8E8E8]">
                          <th className="text-left p-3 text-[#191919] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#191919] font-semibold">Libellé</th>
                          <th className="text-right p-3 text-[#191919] font-semibold">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableauFinancementData.emplois.map((item, index) => (
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-3 text-[#444444]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.montant)}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#444444]">{item.libelle}</td>
                            <td
                              className="p-3 text-right font-mono text-[#191919] hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.montant)}
                              title="Cliquer pour voir les transactions"
                            >
                              {item.montant.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#E8E8E8] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[#191919]">TOTAL EMPLOIS</td>
                          <td className="p-3 text-right text-lg font-bold text-[#191919]">1 600 000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RESSOURCES */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-bold text-[#191919] mb-4 text-center">RESSOURCES</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#E8E8E8]">
                          <th className="text-left p-3 text-[#191919] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#191919] font-semibold">Libellé</th>
                          <th className="text-right p-3 text-[#191919] font-semibold">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableauFinancementData.ressources.map((item, index) => (
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-3 text-[#444444]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.montant)}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#444444]">{item.libelle}</td>
                            <td
                              className="p-3 text-right font-mono text-[#191919] hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.montant)}
                              title="Cliquer pour voir les transactions"
                            >
                              {item.montant.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#E8E8E8] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[#191919]">TOTAL RESSOURCES</td>
                          <td className="p-3 text-right text-lg font-bold text-[#191919]">1 725 000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Variation du Fonds de Roulement */}
              <div className="bg-white rounded-lg p-6 border-2 border-[#E8E8E8] text-center">
                <h3 className="text-lg font-bold text-[#191919] mb-4">VARIATION DU FONDS DE ROULEMENT NET GLOBAL</h3>
                <div className="flex justify-center">
                  <div className="p-6 border border-[#E8E8E8] rounded-lg">
                    <p className="text-[#767676] font-medium mb-2">Ressources - Emplois</p>
                    <p className="text-3xl font-bold text-[#191919]">+125 000 €</p>
                    <p className="text-sm text-[#767676] mt-2">Augmentation du fonds de roulement</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TABLEAU DE FLUX DE TRÉSORERIE */}
          {activeTab === 'flux-tresorerie' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-[#191919] mb-2">TABLEAU DE FLUX DE TRÉSORERIE</h2>
                <p className="text-[#767676]">Flux de trésorerie par activité selon SYSCOHADA</p>
              </div>

              <div className="space-y-6">
                {/* ACTIVITÉS OPÉRATIONNELLES */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-bold text-[#191919] mb-4">FLUX DE TRÉSORERIE DES ACTIVITÉS OPÉRATIONNELLES</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#E8E8E8]">
                          <th className="text-left p-3 text-[#191919] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#191919] font-semibold">Libellé</th>
                          <th className="text-right p-3 text-[#191919] font-semibold">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fluxTresorerieData.activitesOperationnelles.map((item, index) => (
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-3 text-[#444444]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', Math.abs(item.montant))}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#444444]">{item.libelle}</td>
                            <td
                              className={`p-3 text-right font-mono hover:bg-blue-50 cursor-pointer ${item.montant >= 0 ? 'text-[#191919]' : 'text-red-600'}`}
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', Math.abs(item.montant))}
                              title="Cliquer pour voir les transactions"
                            >
                              {item.montant >= 0 ? '' : '('}{Math.abs(item.montant).toLocaleString()}{item.montant >= 0 ? '' : ')'}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#E8E8E8] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[#191919]">FLUX NET DE TRÉSORERIE DES ACTIVITÉS OPÉRATIONNELLES</td>
                          <td className="p-3 text-right text-lg font-bold text-[#191919]">740 000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ACTIVITÉS D'INVESTISSEMENT */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-bold text-[#191919] mb-4">FLUX DE TRÉSORERIE DES ACTIVITÉS D'INVESTISSEMENT</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#E8E8E8]">
                          <th className="text-left p-3 text-[#191919] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#191919] font-semibold">Libellé</th>
                          <th className="text-right p-3 text-[#191919] font-semibold">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fluxTresorerieData.activitesInvestissement.map((item, index) => (
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-3 text-[#444444]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', Math.abs(item.montant))}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#444444]">{item.libelle}</td>
                            <td
                              className={`p-3 text-right font-mono hover:bg-blue-50 cursor-pointer ${item.montant >= 0 ? 'text-[#191919]' : 'text-red-600'}`}
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', Math.abs(item.montant))}
                              title="Cliquer pour voir les transactions"
                            >
                              {item.montant >= 0 ? '' : '('}{Math.abs(item.montant).toLocaleString()}{item.montant >= 0 ? '' : ')'}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#E8E8E8] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[#191919]">FLUX NET DE TRÉSORERIE DES ACTIVITÉS D'INVESTISSEMENT</td>
                          <td className="p-3 text-right text-lg font-bold text-red-600">(1 095 000)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ACTIVITÉS DE FINANCEMENT */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-bold text-[#191919] mb-4">FLUX DE TRÉSORERIE DES ACTIVITÉS DE FINANCEMENT</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#E8E8E8]">
                          <th className="text-left p-3 text-[#191919] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#191919] font-semibold">Libellé</th>
                          <th className="text-right p-3 text-[#191919] font-semibold">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fluxTresorerieData.activitesFinancement.map((item, index) => (
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-3 text-[#444444]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', Math.abs(item.montant))}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#444444]">{item.libelle}</td>
                            <td
                              className={`p-3 text-right font-mono hover:bg-blue-50 cursor-pointer ${item.montant >= 0 ? 'text-[#191919]' : 'text-red-600'}`}
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', Math.abs(item.montant))}
                              title="Cliquer pour voir les transactions"
                            >
                              {item.montant >= 0 ? '' : '('}{Math.abs(item.montant).toLocaleString()}{item.montant >= 0 ? '' : ')'}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#E8E8E8] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[#191919]">FLUX NET DE TRÉSORERIE DES ACTIVITÉS DE FINANCEMENT</td>
                          <td className="p-3 text-right text-lg font-bold text-red-600">(305 000)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* VARIATION NETTE DE TRÉSORERIE */}
                <div className="bg-white rounded-lg p-6 border-2 border-[#E8E8E8]">
                  <h3 className="text-lg font-bold text-[#191919] mb-4 text-center">VARIATION NETTE DE LA TRÉSORERIE</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 border border-[#E8E8E8] rounded">
                      <p className="text-[#767676] font-medium mb-2">Trésorerie début d'exercice</p>
                      <p className="text-xl font-bold text-[#191919]">600 000 €</p>
                    </div>
                    <div className="p-4 border border-[#E8E8E8] rounded">
                      <p className="text-[#767676] font-medium mb-2">Variation nette</p>
                      <p className="text-xl font-bold text-[#191919]">-660 000 €</p>
                    </div>
                    <div className="p-4 border border-[#E8E8E8] rounded">
                      <p className="text-[#767676] font-medium mb-2">Trésorerie fin d'exercice</p>
                      <p className="text-xl font-bold text-[#191919]">-60 000 €</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal de détail */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{modalData.title}</h3>
                  <p className="text-sm text-gray-600">Code: {modalData.code} • Montant: {modalData.montant.toLocaleString()} €</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">Détails en cours de chargement...</p>
                  <p className="text-sm text-gray-400">Intégration avec la base de données comptable en cours.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BilanSYSCOHADAPageV2;