import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  Building2, TrendingUp, BarChart3, Download, ArrowLeft, Home,
  DollarSign, Target, Activity, FileText, Calculator, PieChart,
  RefreshCw, Eye, X, ChevronRight
} from 'lucide-react';

const CompteResultatPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bilan');
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  // Données mensuelles pour chaque mois
  const monthlyData = {
    '1': { name: 'Janvier', ca: 1850000, charges: 1420000, resultat: 430000, evolution: 8.5 },
    '2': { name: 'Février', ca: 1920000, charges: 1450000, resultat: 470000, evolution: 12.3 },
    '3': { name: 'Mars', ca: 2100000, charges: 1580000, resultat: 520000, evolution: 15.8 },
    '4': { name: 'Avril', ca: 1980000, charges: 1520000, resultat: 460000, evolution: 11.2 },
    '5': { name: 'Mai', ca: 2050000, charges: 1560000, resultat: 490000, evolution: 13.7 },
    '6': { name: 'Juin', ca: 2200000, charges: 1680000, resultat: 520000, evolution: 16.4 },
    '7': { name: 'Juillet', ca: 2300000, charges: 1750000, resultat: 550000, evolution: 18.2 },
    '8': { name: 'Août', ca: 1980000, charges: 1520000, resultat: 460000, evolution: 10.8 },
    '9': { name: 'Septembre', ca: 2150000, charges: 1630000, resultat: 520000, evolution: 15.9 },
    '10': { name: 'Octobre', ca: 2250000, charges: 1710000, resultat: 540000, evolution: 17.3 },
    '11': { name: 'Novembre', ca: 2180000, charges: 1650000, resultat: 530000, evolution: 16.1 },
    '12': { name: 'Décembre', ca: 2450000, charges: 1850000, resultat: 600000, evolution: 19.5 }
  };

  const months = Object.keys(monthlyData);

  // Structure des données du bilan SYSCOHADA
  const bilanStructure = {
    actif: [
      { code: '21', libelle: 'Immobilisations incorporelles' },
      { code: '22/23', libelle: 'Terrains' },
      { code: '24', libelle: 'Bâtiments' },
      { code: '245', libelle: 'Matériel et outillage' },
      { code: '31', libelle: 'Stocks de marchandises' },
      { code: '41', libelle: 'Clients et comptes rattachés' },
      { code: '52', libelle: 'Banques' },
      { code: '53', libelle: 'Caisses' }
    ],
    passif: [
      { code: '10', libelle: 'Capital social' },
      { code: '11', libelle: 'Réserves' },
      { code: '13', libelle: 'Résultat de l\'exercice' },
      { code: '16', libelle: 'Emprunts et dettes financières' },
      { code: '40', libelle: 'Fournisseurs et comptes rattachés' },
      { code: '42', libelle: 'Personnel' },
      { code: '44', libelle: 'État et collectivités' }
    ]
  };

  // Génération des données bilans mensuels
  const generateMonthlyBilan = (month: string) => {
    const data = monthlyData[month as keyof typeof monthlyData];
    return {
      actif: [
        Math.round(850000 + (data.ca * 0.05)),
        2500000,
        Math.round(3200000 - (parseInt(month) * 5000)),
        Math.round(1850000 + (data.ca * 0.02)),
        Math.round(data.ca * 0.25),
        Math.round(data.ca * 0.45),
        Math.round(data.resultat * 1.5),
        Math.round(45000 + (data.resultat * 0.02))
      ],
      passif: [
        5000000,
        Math.round(2850000 + (data.resultat * 0.3)),
        data.resultat,
        Math.round(2800000 - (parseInt(month) * 15000)),
        Math.round(data.charges * 0.35),
        Math.round(data.charges * 0.08),
        Math.round(data.charges * 0.12)
      ]
    };
  };

  // Structure des données du compte de résultat SYSCOHADA
  const compteResultatStructure = {
    produits: [
      { code: '70', libelle: 'Ventes de marchandises' },
      { code: '72', libelle: 'Production vendue' },
      { code: '74', libelle: 'Subventions d\'exploitation' },
      { code: '75', libelle: 'Autres produits de gestion' }
    ],
    charges: [
      { code: '60', libelle: 'Achats de marchandises' },
      { code: '61', libelle: 'Transports' },
      { code: '62', libelle: 'Services extérieurs A' },
      { code: '63', libelle: 'Services extérieurs B' },
      { code: '64', libelle: 'Impôts et taxes' },
      { code: '66', libelle: 'Charges de personnel' }
    ]
  };

  // Génération des données compte de résultat mensuels
  const generateMonthlyCompteResultat = (month: string) => {
    const data = monthlyData[month as keyof typeof monthlyData];
    return {
      produits: [
        Math.round(data.ca * 0.6),
        Math.round(data.ca * 0.3),
        Math.round(data.ca * 0.05),
        Math.round(data.ca * 0.05)
      ],
      charges: [
        Math.round(data.charges * 0.45),
        Math.round(data.charges * 0.08),
        Math.round(data.charges * 0.12),
        Math.round(data.charges * 0.10),
        Math.round(data.charges * 0.06),
        Math.round(data.charges * 0.19)
      ]
    };
  };

  // Structure des données SIG SYSCOHADA
  const sigStructure = [
    { code: 'SIG1', libelle: 'Marge commerciale' },
    { code: 'SIG2', libelle: 'Production de l\'exercice' },
    { code: 'SIG3', libelle: 'Valeur ajoutée' },
    { code: 'SIG4', libelle: 'Excédent brut d\'exploitation' },
    { code: 'SIG5', libelle: 'Résultat d\'exploitation' },
    { code: 'SIG6', libelle: 'Résultat net' }
  ];

  // Génération des SIG mensuels
  const generateMonthlySIG = (month: string) => {
    const data = monthlyData[month as keyof typeof monthlyData];
    return [
      Math.round(data.ca * 0.35),
      Math.round(data.ca * 0.3),
      Math.round(data.ca * 0.42),
      Math.round(data.resultat * 1.8),
      data.resultat,
      Math.round(data.resultat * 0.95)
    ];
  };

  // Génération des détails de transactions pour un compte
  const generateTransactionDetails = (accountCode: string, month: string, amount: number) => {
    const transactions = [];
    const numTransactions = Math.floor(Math.random() * 8) + 3; // 3-10 transactions
    let remainingAmount = amount;

    for (let i = 0; i < numTransactions; i++) {
      const isLast = i === numTransactions - 1;
      const transactionAmount = isLast ? remainingAmount : Math.floor(remainingAmount * (0.1 + Math.random() * 0.4));
      remainingAmount -= transactionAmount;

      transactions.push({
        id: `TR-${month}-${accountCode}-${i + 1}`,
        date: `${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}/${month.padStart(2, '0')}/2024`,
        reference: `REF${month}${String(i + 1).padStart(3, '0')}`,
        libelle: getTransactionLibelle(accountCode),
        montant: transactionAmount,
        tiers: getTiers(accountCode),
        piece: `PC${month}${String(i + 1).padStart(4, '0')}`
      });
    }

    return transactions.sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime());
  };

  const getTransactionLibelle = (accountCode: string) => {
    const libelles = {
      '21': ['Achat logiciel comptabilité', 'Licence Microsoft Office', 'Développement site web'],
      '22/23': ['Acquisition terrain industriel', 'Terrain commercial centre-ville'],
      '24': ['Construction bâtiment administratif', 'Rénovation bureaux', 'Extension entrepôt'],
      '245': ['Achat machine production', 'Matériel informatique', 'Outillage spécialisé'],
      '31': ['Achat marchandises', 'Stock matières premières', 'Produits finis'],
      '41': ['Facture client ABC', 'Vente client XYZ', 'Prestation services'],
      '52': ['Virement bancaire', 'Encaissement chèque', 'Paiement fournisseur'],
      '53': ['Espèces caisse', 'Petite caisse', 'Caisse principale'],
      '70': ['Vente marchandises détail', 'Vente export', 'Vente locale'],
      '72': ['Production vendue', 'Prestations services', 'Travaux façon'],
      '60': ['Achat matières premières', 'Achats marchandises', 'Approvisionnements'],
      '66': ['Salaires personnel', 'Charges sociales', 'Primes personnel']
    };
    const accountLibelles = libelles[accountCode as keyof typeof libelles] || ['Transaction générale'];
    return accountLibelles[Math.floor(Math.random() * accountLibelles.length)];
  };

  const getTiers = (accountCode: string) => {
    const tiers = {
      '21': ['Microsoft France', 'SAP France', 'Oracle'],
      '41': ['Client SA', 'Société ABC', 'Entreprise XYZ'],
      '52': ['BNP Paribas', 'Crédit Agricole', 'Société Générale'],
      '60': ['Fournisseur A', 'Supplier B', 'Grossiste C'],
      '66': ['Personnel', 'URSSAF', 'Caisse retraite']
    };
    const accountTiers = tiers[accountCode as keyof typeof tiers] || ['Tiers générique'];
    return accountTiers[Math.floor(Math.random() * accountTiers.length)];
  };

  // Génération des sous-comptes
  const generateSubAccounts = (mainAccountCode: string, amount: number) => {
    const subAccounts: any[] = [];
    const subAccountsConfig = {
      '21': [
        { code: '211', libelle: 'Frais de développement', pourcentage: 0.4 },
        { code: '213', libelle: 'Brevets, licences, logiciels', pourcentage: 0.35 },
        { code: '218', libelle: 'Autres immobilisations incorporelles', pourcentage: 0.25 }
      ],
      '24': [
        { code: '241', libelle: 'Bâtiments', pourcentage: 0.7 },
        { code: '244', libelle: 'Installations techniques', pourcentage: 0.2 },
        { code: '248', libelle: 'Autres constructions', pourcentage: 0.1 }
      ],
      '245': [
        { code: '2451', libelle: 'Outillage', pourcentage: 0.3 },
        { code: '2454', libelle: 'Matériel informatique', pourcentage: 0.4 },
        { code: '2455', libelle: 'Matériel de transport', pourcentage: 0.3 }
      ],
      '31': [
        { code: '311', libelle: 'Matières premières', pourcentage: 0.5 },
        { code: '321', libelle: 'Marchandises', pourcentage: 0.35 },
        { code: '327', libelle: 'Produits finis', pourcentage: 0.15 }
      ]
    };

    const config = subAccountsConfig[mainAccountCode as keyof typeof subAccountsConfig] || [
      { code: `${mainAccountCode}1`, libelle: `Sous-compte 1 de ${mainAccountCode}`, pourcentage: 0.6 },
      { code: `${mainAccountCode}8`, libelle: `Autres ${mainAccountCode}`, pourcentage: 0.4 }
    ];

    config.forEach(sub => {
      subAccounts.push({
        id: sub.code,
        code: sub.code,
        libelle: sub.libelle,
        montant: Math.round(amount * sub.pourcentage),
        pourcentage: sub.pourcentage * 100
      });
    });

    return subAccounts;
  };

  const openDetailModal = (accountCode: string, libelle: string, month: string, amount: number) => {
    if (month === 'sous-comptes') {
      // Affichage des sous-comptes
      const subAccounts = generateSubAccounts(accountCode, amount);
      setSelectedDetail({
        accountCode,
        libelle,
        month: 'Sous-comptes',
        amount,
        subAccounts,
        type: 'sous-comptes'
      });
    } else {
      // Affichage des transactions
      const transactions = generateTransactionDetails(accountCode, month, amount);
      const monthName = month === 'toutes-periodes' ? 'Toutes périodes' :
                      month ? monthlyData[month as keyof typeof monthlyData]?.name || month : '';
      setSelectedDetail({
        accountCode,
        libelle,
        month: monthName,
        amount,
        transactions,
        type: 'transactions'
      });
    }
    setSelectedPeriod(month);
    setSelectedAccount(accountCode);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDetail(null);
    setSelectedPeriod('');
    setSelectedAccount('');
  };

  // Onglets des états financiers SYSCOHADA mensuels
  const tabs = [
    { id: 'bilan', label: 'Bilan SYSCOHADA', icon: BarChart3 },
    { id: 'bilan-fonctionnel', label: 'Bilan Fonctionnel', icon: Building2 },
    { id: 'compte-resultat', label: 'Compte de Résultat', icon: DollarSign },
    { id: 'tableau-financement', label: 'Tableau de Financement', icon: PieChart },
    { id: 'flux-tresorerie', label: 'Tableau Flux Trésorerie', icon: TrendingUp },
    { id: 'sig', label: 'SIG (Soldes Intermédiaires)', icon: Target },
    { id: 'ratios', label: 'Ratios Financiers', icon: Calculator },
    { id: 'export', label: 'Export', icon: Download },
  ];

  return (
    <div className="min-h-screen bg-[#ECECEC] ">
      {/* En-tête */}
      <div className="bg-white border-b border-[#E8E8E8] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/financial-analysis-advanced')}
              className="flex items-center space-x-2 px-4 py-2 text-[#767676] hover:text-[#B87333] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Retour</span>
            </button>
            <div className="h-6 w-px bg-[#E8E8E8]" />
            <div>
              <h1 className="text-lg font-bold text-[#191919]">États Financiers Mensuels SYSCOHADA</h1>
              <p className="text-sm text-[#767676]">Tableaux financiers mensualisés de janvier à décembre 2024</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-[#767676]">
              Exercice 2024 • Données mensualisées
            </div>
            <button className="p-2 border border-[#D9D9D9] rounded-lg hover:bg-gray-50" aria-label="Actualiser">
              <RefreshCw className="w-4 h-4 text-[#767676]" />
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
          {/* BILAN SYSCOHADA MENSUEL */}
          {activeTab === 'bilan' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#191919] mb-2">BILAN SYSCOHADA - Exercice 2024</h2>
                <p className="text-[#767676]">Données mensualisées de janvier à décembre</p>
              </div>

              {/* ACTIF */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="bg-[#B87333] text-white p-4">
                  <h3 className="text-lg font-bold text-left">ACTIF</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[#E8E8E8]">Réf</th>
                        <th className="text-left p-3 border-b border-[#E8E8E8] min-w-[200px]">{t('accounting.label')}</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[#E8E8E8] min-w-[90px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[#E8E8E8] min-w-[100px] bg-[#B87333]/10 font-bold">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bilanStructure.actif.map((item, index) => {
                        const monthlyValues = months.map(month => generateMonthlyBilan(month).actif[index]);
                        const total = monthlyValues.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-3 text-[#444444] font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', total)}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#191919]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className="p-2 text-right font-mono text-xs hover:bg-blue-50 cursor-pointer"
                                onClick={() => openDetailModal(item.code, item.libelle, months[monthIndex], value)}
                                title={`Cliquer pour voir les transactions de ${monthlyData[months[monthIndex] as keyof typeof monthlyData].name}`}
                              >
                                {value.toLocaleString()}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono font-bold bg-[#B87333]/5">
                              {total.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                      {(() => {
                        const monthlyTotals = months.map(month => {
                          const data = generateMonthlyBilan(month);
                          return data.actif.reduce((sum, value) => sum + value, 0);
                        });
                        const grandTotal = monthlyTotals.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr className="bg-[#B87333]/10 font-bold border-t-2 border-[#B87333]">
                            <td className="p-3">TA</td>
                            <td className="p-3">TOTAL ACTIF</td>
                            {monthlyTotals.map((total, index) => (
                              <td key={index} className="p-2 text-right font-mono text-sm">
                                {total.toLocaleString()}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono text-lg bg-[#B87333]/20">
                              {grandTotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PASSIF */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="bg-[#6A8A82] text-white p-4">
                  <h3 className="text-lg font-bold text-left">PASSIF</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[#E8E8E8]">Réf</th>
                        <th className="text-left p-3 border-b border-[#E8E8E8] min-w-[200px]">{t('accounting.label')}</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[#E8E8E8] min-w-[90px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[#E8E8E8] min-w-[100px] bg-[#6A8A82]/10 font-bold">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bilanStructure.passif.map((item, index) => {
                        const monthlyValues = months.map(month => generateMonthlyBilan(month).passif[index]);
                        const total = monthlyValues.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-3 text-[#444444] font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', total)}
                                  className="p-1 hover:bg-[#6A8A82] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#191919]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className="p-2 text-right font-mono text-xs hover:bg-blue-50 cursor-pointer"
                                onClick={() => openDetailModal(item.code, item.libelle, months[monthIndex], value)}
                                title={`Cliquer pour voir les transactions de ${monthlyData[months[monthIndex] as keyof typeof monthlyData].name}`}
                              >
                                {value.toLocaleString()}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono font-bold bg-[#6A8A82]/5">
                              {total.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                      {(() => {
                        const monthlyTotals = months.map(month => {
                          const data = generateMonthlyBilan(month);
                          return data.passif.reduce((sum, value) => sum + value, 0);
                        });
                        const grandTotal = monthlyTotals.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr className="bg-[#6A8A82]/10 font-bold border-t-2 border-[#6A8A82]">
                            <td className="p-3">TP</td>
                            <td className="p-3">TOTAL PASSIF</td>
                            {monthlyTotals.map((total, index) => (
                              <td key={index} className="p-2 text-right font-mono text-sm">
                                {total.toLocaleString()}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono text-lg bg-[#6A8A82]/20">
                              {grandTotal.toLocaleString()}
                            </td>
                            <td className="p-3"></td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* BILAN FONCTIONNEL MENSUEL */}
          {activeTab === 'bilan-fonctionnel' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#191919] mb-2">BILAN FONCTIONNEL - Exercice 2024</h2>
                <p className="text-[#767676]">Analyse fonctionnelle des emplois et ressources mensualisée</p>
              </div>

              {/* EMPLOIS ET RESSOURCES MENSUALISÉS */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="bg-[#7A99AC] text-white p-4">
                  <h3 className="text-lg font-bold text-left">BILAN FONCTIONNEL</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[#E8E8E8] min-w-[200px]">Analyse fonctionnelle</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[#E8E8E8] min-w-[90px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[#E8E8E8] min-w-[100px] bg-[#7A99AC]/10 font-bold">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* EMPLOIS */}
                      <tr className="bg-blue-50">
                        <td colSpan={1 + months.length + 1} className="p-2 font-bold text-blue-700 text-center">
                          EMPLOIS
                        </td>
                      </tr>
                      {[
                        { libelle: 'Emplois stables', calcul: (month: string) => Math.round(monthlyData[month as keyof typeof monthlyData].ca * 3.2) },
                        { libelle: 'Actif circulant d\'exploitation', calcul: (month: string) => Math.round(monthlyData[month as keyof typeof monthlyData].ca * 0.8) },
                        { libelle: 'Actif de trésorerie', calcul: (month: string) => Math.round(monthlyData[month as keyof typeof monthlyData].resultat * 1.2) }
                      ].map((item, index) => {
                        const monthlyValues = months.map(month => item.calcul(month));
                        const total = monthlyValues.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr key={`emploi-${index}`} className="border-b border-[#E8E8E8] hover:bg-blue-50">
                            <td className="p-3 text-[#191919]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td key={monthIndex} className="p-2 text-right font-mono text-xs">
                                {value.toLocaleString()}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono font-bold bg-blue-100">
                              {total.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}

                      {/* RESSOURCES */}
                      <tr className="bg-green-50">
                        <td colSpan={1 + months.length + 1} className="p-2 font-bold text-green-700 text-center">
                          RESSOURCES
                        </td>
                      </tr>
                      {[
                        { libelle: 'Ressources stables', calcul: (month: string) => Math.round(monthlyData[month as keyof typeof monthlyData].ca * 2.8) },
                        { libelle: 'Passif circulant d\'exploitation', calcul: (month: string) => Math.round(monthlyData[month as keyof typeof monthlyData].charges * 0.6) },
                        { libelle: 'Passif de trésorerie', calcul: (month: string) => Math.round(monthlyData[month as keyof typeof monthlyData].charges * 0.25) }
                      ].map((item, index) => {
                        const monthlyValues = months.map(month => item.calcul(month));
                        const total = monthlyValues.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr key={`ressource-${index}`} className="border-b border-[#E8E8E8] hover:bg-green-50">
                            <td className="p-3 text-[#191919]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td key={monthIndex} className="p-2 text-right font-mono text-xs">
                                {value.toLocaleString()}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono font-bold bg-green-100">
                              {total.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* COMPTE DE RÉSULTAT MENSUEL */}
          {activeTab === 'compte-resultat' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#191919] mb-2">COMPTE DE RÉSULTAT - Exercice 2024</h2>
                <p className="text-[#767676]">Produits et charges mensualisés</p>
              </div>

              {/* PRODUITS ET CHARGES SUPERPOSÉS */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="bg-[#B87333] text-white p-4">
                  <h3 className="text-lg font-bold text-left">COMPTE DE RÉSULTAT SYSCOHADA</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[#E8E8E8]">Réf</th>
                        <th className="text-left p-3 border-b border-[#E8E8E8] min-w-[200px]">{t('accounting.label')}</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[#E8E8E8] min-w-[90px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[#E8E8E8] min-w-[100px] bg-[#B87333]/10 font-bold">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* PRODUITS */}
                      <tr className="bg-green-50">
                        <td colSpan={2 + months.length + 1} className="p-2 font-bold text-green-700 text-center">
                          PRODUITS (Classe 7)
                        </td>
                      </tr>
                      {compteResultatStructure.produits.map((item, index) => {
                        const monthlyValues = months.map(month => generateMonthlyCompteResultat(month).produits[index]);
                        const total = monthlyValues.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr key={`produit-${index}`} className="border-b border-[#E8E8E8] hover:bg-green-50">
                            <td className="p-3 text-[#444444] font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', total)}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#191919]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className="p-2 text-right font-mono text-xs text-green-700 hover:bg-blue-50 cursor-pointer"
                                onClick={() => openDetailModal(item.code, item.libelle, months[monthIndex], value)}
                                title={`Cliquer pour voir les transactions de ${monthlyData[months[monthIndex] as keyof typeof monthlyData].name}`}
                              >
                                {value.toLocaleString()}
                              </td>
                            ))}
                            <td
                              className="p-3 text-right font-mono font-bold bg-green-100 text-green-700 hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'total', total)}
                              title="Cliquer pour voir le détail du total annuel"
                            >
                              {total.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                      {/* TOTAL PRODUITS */}
                      {(() => {
                        const monthlyTotals = months.map(month => {
                          const data = generateMonthlyCompteResultat(month);
                          return data.produits.reduce((sum, value) => sum + value, 0);
                        });
                        const grandTotal = monthlyTotals.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr className="bg-green-100 font-bold border-b-2 border-green-500">
                            <td className="p-3">TP</td>
                            <td className="p-3">TOTAL PRODUITS</td>
                            {monthlyTotals.map((total, index) => (
                              <td key={index} className="p-2 text-right font-mono text-sm text-green-700">
                                {total.toLocaleString()}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono text-lg bg-green-200 text-green-800">
                              {grandTotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })()}

                      {/* CHARGES */}
                      <tr className="bg-red-50">
                        <td colSpan={2 + months.length + 1} className="p-2 font-bold text-red-700 text-center">
                          CHARGES (Classe 6)
                        </td>
                      </tr>
                      {compteResultatStructure.charges.map((item, index) => {
                        const monthlyValues = months.map(month => generateMonthlyCompteResultat(month).charges[index]);
                        const total = monthlyValues.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr key={`charge-${index}`} className="border-b border-[#E8E8E8] hover:bg-red-50">
                            <td className="p-3 text-[#444444] font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', total)}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#191919]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className="p-2 text-right font-mono text-xs text-red-700 hover:bg-blue-50 cursor-pointer"
                                onClick={() => openDetailModal(item.code, item.libelle, months[monthIndex], value)}
                                title={`Cliquer pour voir les transactions de ${monthlyData[months[monthIndex] as keyof typeof monthlyData].name}`}
                              >
                                {value.toLocaleString()}
                              </td>
                            ))}
                            <td
                              className="p-3 text-right font-mono font-bold bg-red-100 text-red-700 hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'total', total)}
                              title="Cliquer pour voir le détail du total annuel"
                            >
                              {total.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                      {/* TOTAL CHARGES */}
                      {(() => {
                        const monthlyTotals = months.map(month => {
                          const data = generateMonthlyCompteResultat(month);
                          return data.charges.reduce((sum, value) => sum + value, 0);
                        });
                        const grandTotal = monthlyTotals.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr className="bg-red-100 font-bold border-b-2 border-red-500">
                            <td className="p-3">TC</td>
                            <td className="p-3">TOTAL CHARGES</td>
                            {monthlyTotals.map((total, index) => (
                              <td key={index} className="p-2 text-right font-mono text-sm text-red-700">
                                {total.toLocaleString()}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono text-lg bg-red-200 text-red-800">
                              {grandTotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })()}

                      {/* RÉSULTAT NET */}
                      {(() => {
                        const monthlyResultats = months.map(month => {
                          const data = monthlyData[month as keyof typeof monthlyData];
                          return data.resultat;
                        });
                        const totalResultat = monthlyResultats.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr className="bg-[#B87333]/10 font-bold border-t-4 border-[#B87333]">
                            <td className="p-3">RN</td>
                            <td className="p-3">RÉSULTAT NET</td>
                            {monthlyResultats.map((resultat, index) => (
                              <td key={index} className="p-2 text-right font-mono text-sm text-[#B87333]">
                                {resultat.toLocaleString()}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono text-lg bg-[#B87333]/20 text-[#B87333]">
                              {totalResultat.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TABLEAU DE FINANCEMENT MENSUEL */}
          {activeTab === 'tableau-financement' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#191919] mb-2">TABLEAU DE FINANCEMENT - Exercice 2024</h2>
                <p className="text-[#767676]">Analyse des flux financiers mensualisée</p>
              </div>

              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="bg-[#7A99AC] text-white p-4">
                  <h3 className="text-lg font-bold text-left">TABLEAU DE FINANCEMENT</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[#E8E8E8] min-w-[200px]">Flux financiers</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[#E8E8E8] min-w-[90px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[#E8E8E8] min-w-[100px] bg-[#7A99AC]/10 font-bold">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* EMPLOIS */}
                      <tr className="bg-blue-50">
                        <td colSpan={1 + months.length + 1} className="p-2 font-bold text-blue-700 text-center">
                          EMPLOIS
                        </td>
                      </tr>
                      {[
                        { libelle: 'Investissements du mois', calcul: (month: string) => Math.round(monthlyData[month as keyof typeof monthlyData].ca * 0.15) },
                        { libelle: 'Remboursements d\'emprunts', calcul: (month: string) => Math.round(monthlyData[month as keyof typeof monthlyData].ca * 0.08) },
                        { libelle: 'Distributions', calcul: (month: string) => Math.round(monthlyData[month as keyof typeof monthlyData].resultat * 0.3) }
                      ].map((item, index) => {
                        const monthlyValues = months.map(month => item.calcul(month));
                        const total = monthlyValues.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr key={`emploi-${index}`} className="border-b border-[#E8E8E8] hover:bg-blue-50">
                            <td className="p-3 text-[#191919]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td key={monthIndex} className="p-2 text-right font-mono text-xs">
                                {value.toLocaleString()}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono font-bold bg-blue-100">
                              {total.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}

                      {/* RESSOURCES */}
                      <tr className="bg-green-50">
                        <td colSpan={1 + months.length + 1} className="p-2 font-bold text-green-700 text-center">
                          RESSOURCES
                        </td>
                      </tr>
                      {[
                        { libelle: 'Capacité d\'autofinancement', calcul: (month: string) => Math.round(monthlyData[month as keyof typeof monthlyData].resultat * 1.2) },
                        { libelle: 'Nouveaux emprunts', calcul: (month: string) => Math.round(monthlyData[month as keyof typeof monthlyData].ca * 0.1) },
                        { libelle: 'Autres ressources', calcul: (month: string) => Math.round(monthlyData[month as keyof typeof monthlyData].ca * 0.05) }
                      ].map((item, index) => {
                        const monthlyValues = months.map(month => item.calcul(month));
                        const total = monthlyValues.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr key={`ressource-${index}`} className="border-b border-[#E8E8E8] hover:bg-green-50">
                            <td className="p-3 text-[#191919]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td key={monthIndex} className="p-2 text-right font-mono text-xs">
                                {value.toLocaleString()}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono font-bold bg-green-100">
                              {total.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TABLEAU FLUX TRÉSORERIE MENSUEL */}
          {activeTab === 'flux-tresorerie' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#191919] mb-2">TABLEAU FLUX TRÉSORERIE - Exercice 2024</h2>
                <p className="text-[#767676]">Flux de trésorerie par activité mensualisés</p>
              </div>

              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="bg-[#6A8A82] text-white p-4">
                  <h3 className="text-lg font-bold text-left">TABLEAU DES FLUX DE TRÉSORERIE</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[#E8E8E8] min-w-[200px]">Flux de trésorerie</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[#E8E8E8] min-w-[90px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[#E8E8E8] min-w-[100px] bg-[#6A8A82]/10 font-bold">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* FLUX OPÉRATIONNELS */}
                      <tr className="bg-blue-50">
                        <td colSpan={1 + months.length + 1} className="p-2 font-bold text-blue-700 text-center">
                          FLUX OPÉRATIONNELS
                        </td>
                      </tr>
                      {[
                        { libelle: 'Résultat net du mois', calcul: (month: string) => monthlyData[month as keyof typeof monthlyData].resultat },
                        { libelle: 'Dotations aux amortissements', calcul: (month: string) => Math.round(monthlyData[month as keyof typeof monthlyData].ca * 0.05) },
                        { libelle: 'Variation BFR', calcul: (month: string) => Math.round(-monthlyData[month as keyof typeof monthlyData].ca * 0.08) }
                      ].map((item, index) => {
                        const monthlyValues = months.map(month => item.calcul(month));
                        const total = monthlyValues.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr key={`operationnel-${index}`} className="border-b border-[#E8E8E8] hover:bg-blue-50">
                            <td className="p-3 text-[#191919]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td key={monthIndex} className={`p-2 text-right font-mono text-xs ${value < 0 ? 'text-red-600' : ''}`}>
                                {value < 0 ? '(' : ''}{Math.abs(value).toLocaleString()}{value < 0 ? ')' : ''}
                              </td>
                            ))}
                            <td className={`p-3 text-right font-mono font-bold bg-blue-100 ${total < 0 ? 'text-red-600' : ''}`}>
                              {total < 0 ? '(' : ''}{Math.abs(total).toLocaleString()}{total < 0 ? ')' : ''}
                            </td>
                          </tr>
                        );
                      })}

                      {/* FLUX D'INVESTISSEMENT */}
                      <tr className="bg-orange-50">
                        <td colSpan={1 + months.length + 1} className="p-2 font-bold text-orange-700 text-center">
                          FLUX D'INVESTISSEMENT
                        </td>
                      </tr>
                      {[
                        { libelle: 'Acquisitions d\'immobilisations', calcul: (month: string) => Math.round(-monthlyData[month as keyof typeof monthlyData].ca * 0.12) },
                        { libelle: 'Cessions d\'actifs', calcul: (month: string) => Math.round(monthlyData[month as keyof typeof monthlyData].ca * 0.02) }
                      ].map((item, index) => {
                        const monthlyValues = months.map(month => item.calcul(month));
                        const total = monthlyValues.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr key={`investissement-${index}`} className="border-b border-[#E8E8E8] hover:bg-orange-50">
                            <td className="p-3 text-[#191919]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td key={monthIndex} className={`p-2 text-right font-mono text-xs ${value < 0 ? 'text-red-600' : ''}`}>
                                {value < 0 ? '(' : ''}{Math.abs(value).toLocaleString()}{value < 0 ? ')' : ''}
                              </td>
                            ))}
                            <td className={`p-3 text-right font-mono font-bold bg-orange-100 ${total < 0 ? 'text-red-600' : ''}`}>
                              {total < 0 ? '(' : ''}{Math.abs(total).toLocaleString()}{total < 0 ? ')' : ''}
                            </td>
                          </tr>
                        );
                      })}

                      {/* VARIATION TRÉSORERIE */}
                      {(() => {
                        const monthlyVariations = months.map(month => {
                          const data = monthlyData[month as keyof typeof monthlyData];
                          return Math.round(data.resultat * 0.8);
                        });
                        const totalVariation = monthlyVariations.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr className="bg-[#B87333]/10 font-bold border-t-4 border-[#B87333]">
                            <td className="p-3">VARIATION TRÉSORERIE</td>
                            {monthlyVariations.map((variation, index) => (
                              <td key={index} className="p-2 text-right font-mono text-sm text-[#B87333]">
                                +{variation.toLocaleString()}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono text-lg bg-[#B87333]/20 text-[#B87333]">
                              +{totalVariation.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SIG MENSUELS */}
          {activeTab === 'sig' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#191919] mb-2">SIG (SOLDES INTERMÉDIAIRES) - Exercice 2024</h2>
                <p className="text-[#767676]">Formation du résultat mensualisée</p>
              </div>

              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="bg-[#B87333] text-white p-4">
                  <h3 className="text-lg font-bold text-left">SOLDES INTERMÉDIAIRES DE GESTION</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[#E8E8E8]">Réf</th>
                        <th className="text-left p-3 border-b border-[#E8E8E8] min-w-[200px]">Soldes intermédiaires</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[#E8E8E8] min-w-[90px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[#E8E8E8] min-w-[100px] bg-[#B87333]/10 font-bold">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sigStructure.map((item, index) => {
                        const monthlyValues = months.map(month => generateMonthlySIG(month)[index]);
                        const total = monthlyValues.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr key={index} className={`border-b border-[#E8E8E8] hover:bg-gray-50 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                            <td className="p-3 text-[#444444] font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', total)}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 font-medium text-[#191919]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className="p-2 text-right font-mono text-xs hover:bg-blue-50 cursor-pointer"
                                onClick={() => openDetailModal(item.code, item.libelle, months[monthIndex], value)}
                                title={`Cliquer pour voir les transactions de ${monthlyData[months[monthIndex] as keyof typeof monthlyData].name}`}
                              >
                                {value.toLocaleString()}
                              </td>
                            ))}
                            <td
                              className="p-3 text-right font-mono font-bold bg-[#B87333]/5 hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'total', total)}
                              title="Cliquer pour voir le détail du total annuel"
                            >
                              {total.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* RATIOS FINANCIERS MENSUELS */}
          {activeTab === 'ratios' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#191919] mb-2">RATIOS FINANCIERS - Exercice 2024</h2>
                <p className="text-[#767676]">Indicateurs de performance mensualisés</p>
              </div>

              {/* RATIOS DE RENTABILITÉ */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="bg-green-600 text-white p-4">
                  <h3 className="text-lg font-bold text-left">RATIOS DE RENTABILITÉ</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[#E8E8E8]">Réf</th>
                        <th className="text-left p-3 border-b border-[#E8E8E8] min-w-[150px]">Ratios</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[#E8E8E8] min-w-[80px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[#E8E8E8] min-w-[100px] bg-green-100 font-bold">MOYENNE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { code: 'R1', nom: 'Marge nette', calcul: (month: string) => ((monthlyData[month as keyof typeof monthlyData].resultat / monthlyData[month as keyof typeof monthlyData].ca) * 100) },
                        { code: 'R2', nom: 'Marge brute', calcul: (month: string) => ((monthlyData[month as keyof typeof monthlyData].resultat / monthlyData[month as keyof typeof monthlyData].ca) * 100 + 15) },
                        { code: 'R3', nom: 'Rentabilité CA', calcul: (month: string) => ((monthlyData[month as keyof typeof monthlyData].resultat / monthlyData[month as keyof typeof monthlyData].ca) * 100 + 5) }
                      ].map((ratio, index) => {
                        const monthlyValues = months.map(month => ratio.calcul(month));
                        const moyenne = monthlyValues.reduce((sum, value) => sum + value, 0) / monthlyValues.length;

                        return (
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-3 text-[#444444] font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{ratio.code}</span>
                                <button
                                  onClick={() => openDetailModal(ratio.code, `Sous-comptes de ${ratio.nom}`, 'sous-comptes', moyenne)}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${ratio.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 font-medium text-[#191919]">{ratio.nom}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className="p-2 text-right font-mono text-xs hover:bg-blue-50 cursor-pointer"
                                onClick={() => openDetailModal(ratio.code, ratio.nom, months[monthIndex], value)}
                                title={`Cliquer pour voir les transactions de ${monthlyData[months[monthIndex] as keyof typeof monthlyData].name}`}
                              >
                                {value.toFixed(1)}%
                              </td>
                            ))}
                            <td
                              className="p-3 text-right font-mono font-bold bg-green-50 hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(ratio.code, ratio.nom, 'moyenne', moyenne)}
                              title="Cliquer pour voir le détail de la moyenne annuelle"
                            >
                              {moyenne.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RATIOS D'ACTIVITÉ */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="bg-blue-600 text-white p-4">
                  <h3 className="text-lg font-bold text-left">RATIOS D'ACTIVITÉ</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[#E8E8E8]">Réf</th>
                        <th className="text-left p-3 border-b border-[#E8E8E8] min-w-[150px]">Ratios</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[#E8E8E8] min-w-[80px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[#E8E8E8] min-w-[100px] bg-blue-100 font-bold">MOYENNE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { code: 'A1', nom: 'Charges/CA', calcul: (month: string) => ((monthlyData[month as keyof typeof monthlyData].charges / monthlyData[month as keyof typeof monthlyData].ca) * 100), format: '%' },
                        { code: 'A2', nom: 'Croissance', calcul: (month: string) => monthlyData[month as keyof typeof monthlyData].evolution, format: '%' },
                        { code: 'A3', nom: 'CA/jour', calcul: (month: string) => (monthlyData[month as keyof typeof monthlyData].ca / 30), format: '€' }
                      ].map((ratio, index) => {
                        const monthlyValues = months.map(month => ratio.calcul(month));
                        const moyenne = monthlyValues.reduce((sum, value) => sum + value, 0) / monthlyValues.length;

                        return (
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-3 text-[#444444] font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{ratio.code}</span>
                                <button
                                  onClick={() => openDetailModal(ratio.code, `Sous-comptes de ${ratio.nom}`, 'sous-comptes', moyenne)}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${ratio.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 font-medium text-[#191919]">{ratio.nom}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className="p-2 text-right font-mono text-xs hover:bg-blue-50 cursor-pointer"
                                onClick={() => openDetailModal(ratio.code, ratio.nom, months[monthIndex], value)}
                                title={`Cliquer pour voir les transactions de ${monthlyData[months[monthIndex] as keyof typeof monthlyData].name}`}
                              >
                                {ratio.format === '%' ? `${value.toFixed(1)}%` : `${Math.round(value).toLocaleString()}€`}
                              </td>
                            ))}
                            <td
                              className="p-3 text-right font-mono font-bold bg-blue-50 hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(ratio.code, ratio.nom, 'moyenne', moyenne)}
                              title="Cliquer pour voir le détail de la moyenne annuelle"
                            >
                              {ratio.format === '%' ? `${moyenne.toFixed(1)}%` : `${Math.round(moyenne).toLocaleString()}€`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#191919] mb-2">Export États Financiers Mensuels</h2>
                <p className="text-[#767676]">Téléchargement des tableaux pour l'exercice 2024</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tabs.slice(0, -1).map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <div key={tab.id} className="bg-white rounded-lg p-6 border border-[#E8E8E8] hover:shadow-md transition-shadow">
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-lg bg-[#B87333]/10 flex items-center justify-center mx-auto mb-4">
                          <IconComponent className="w-5 h-5 text-[#B87333]" />
                        </div>
                        <h3 className="font-semibold text-[#191919] mb-2">{tab.label}</h3>
                        <p className="text-sm text-[#767676] mb-4">Exercice 2024 - Mensualisé</p>
                        <div className="space-y-2">
                          <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors">
                            <Download className="w-4 h-4" />
                            <span>PDF</span>
                          </button>
                          <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-[#E8E8E8] text-[#444444] rounded-lg hover:bg-gray-50 transition-colors">
                            <FileText className="w-4 h-4" />
                            <span>Excel</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de détail des transactions */}
      {isModalOpen && selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden">
            {/* En-tête du modal */}
            <div className="bg-[#B87333] text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {selectedDetail.type === 'sous-comptes' ? 'Sous-comptes' : 'Détail des transactions'}
                </h2>
                <p className="text-sm opacity-90">
                  {selectedDetail.accountCode} - {selectedDetail.libelle} | {selectedDetail.month} 2024
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors" aria-label="Fermer">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenu du modal */}
            <div className="p-6">
              {/* Résumé */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-[#767676]">{t('accounting.account')}</p>
                    <p className="font-bold text-[#191919]">{selectedDetail.accountCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#767676]">Période</p>
                    <p className="font-bold text-[#191919]">{selectedDetail.month} 2024</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#767676]">Montant total</p>
                    <p className="font-bold text-[#B87333] text-lg">{selectedDetail.amount.toLocaleString()} €</p>
                  </div>
                </div>
              </div>

              {/* Table des transactions ou sous-comptes */}
              <div className="overflow-x-auto max-h-[60vh]">
                {selectedDetail.type === 'sous-comptes' ? (
                  // Table des sous-comptes
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left p-3 border-b border-[#E8E8E8]">Code</th>
                        <th className="text-left p-3 border-b border-[#E8E8E8]">{t('accounting.label')}</th>
                        <th className="text-right p-3 border-b border-[#E8E8E8]">Montant</th>
                        <th className="text-right p-3 border-b border-[#E8E8E8]">%</th>
                        <th className="text-center p-3 border-b border-[#E8E8E8]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetail.subAccounts?.map((subAccount: any, index: number) => (
                        <tr key={subAccount.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          <td className="p-3 border-b border-[#E8E8E8] font-mono font-bold">{subAccount.code}</td>
                          <td className="p-3 border-b border-[#E8E8E8]">{subAccount.libelle}</td>
                          <td className="p-3 border-b border-[#E8E8E8] text-right font-mono font-bold">
                            {subAccount.montant.toLocaleString()} €
                          </td>
                          <td className="p-3 border-b border-[#E8E8E8] text-right text-sm text-[#767676]">
                            {subAccount.pourcentage.toFixed(1)}%
                          </td>
                          <td className="p-3 border-b border-[#E8E8E8] text-center">
                            <button
                              onClick={() => openDetailModal(subAccount.code, subAccount.libelle, selectedPeriod, subAccount.montant)}
                              className="px-2 py-1 text-xs bg-[#B87333] text-white rounded hover:bg-[#A86323] transition-colors"
                            >
                              Transactions
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  // Table des transactions
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left p-3 border-b border-[#E8E8E8]">{t('common.date')}</th>
                        <th className="text-left p-3 border-b border-[#E8E8E8]">Référence</th>
                        <th className="text-left p-3 border-b border-[#E8E8E8]">{t('accounting.label')}</th>
                        <th className="text-left p-3 border-b border-[#E8E8E8]">Tiers</th>
                        <th className="text-left p-3 border-b border-[#E8E8E8]">{t('accounting.piece')}</th>
                        <th className="text-right p-3 border-b border-[#E8E8E8]">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetail.transactions?.map((transaction: any, index: number) => (
                        <tr key={transaction.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          <td className="p-3 border-b border-[#E8E8E8]">{transaction.date}</td>
                          <td className="p-3 border-b border-[#E8E8E8] font-mono text-xs">{transaction.reference}</td>
                          <td className="p-3 border-b border-[#E8E8E8]">{transaction.libelle}</td>
                          <td className="p-3 border-b border-[#E8E8E8]">{transaction.tiers}</td>
                          <td className="p-3 border-b border-[#E8E8E8] font-mono text-xs">{transaction.piece}</td>
                          <td className="p-3 border-b border-[#E8E8E8] text-right font-mono font-bold">
                            {transaction.montant.toLocaleString()} €
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Résumé */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#191919]">
                    {selectedDetail.type === 'sous-comptes'
                      ? `TOTAL (${selectedDetail.subAccounts?.length || 0} sous-comptes)`
                      : `TOTAL (${selectedDetail.transactions?.length || 0} transactions)`
                    }
                  </span>
                  <span className="font-bold text-[#B87333] text-lg">
                    {selectedDetail.amount.toLocaleString()} €
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-[#E8E8E8]">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-[#D9D9D9] rounded-lg text-[#444444] hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
                <button className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors flex items-center space-x-2" aria-label="Télécharger">
                  <Download className="w-4 h-4" />
                  <span>{t('common.export')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompteResultatPage;