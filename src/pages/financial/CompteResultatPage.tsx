// @ts-nocheck

import { formatCurrency } from '@/utils/formatters';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  Building2, TrendingUp, BarChart3, Download, ArrowLeft, Home,
  DollarSign, Target, Activity, FileText, Calculator, PieChart,
  RefreshCw, Eye, X, ChevronRight, ChevronDown
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import type { DBJournalEntry } from '../../lib/db';

const CompteResultatPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { adapter } = useData();
  const [activeTab, setActiveTab] = useState('bilan');
  const [tftMethod, setTftMethod] = useState<'indirect' | 'direct'>('indirect');
  const [tftExpandedRows, setTftExpandedRows] = useState<Set<string>>(new Set());
  const [selectedDetail, setSelectedDetail] = useState<{
    title?: string;
    accountCode?: string;
    month?: string;
    amount?: number;
    subAccounts?: Array<{ id: string; code: string; libelle: string; montant: number; pourcentage: number }>;
    transactions?: Array<{ id: string; date: string; reference: string; libelle: string; tiers: string; piece: string; montant: number }>;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  // Données mensuelles calculées depuis Dexie
  const { data: allEntries = [] } = useQuery({
    queryKey: ['compte-resultat-entries'],
    queryFn: () => adapter.getAll('journalEntries'),
  });

  const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const monthlyData = useMemo(() => {
    const result: Record<string, { name: string; ca: number; charges: number; resultat: number; evolution: number }> = {};
    for (let m = 1; m <= 12; m++) {
      const mStr = String(m);
      const padded = mStr.padStart(2, '0');
      const monthEntries = allEntries.filter(e => {
        const parts = e.date.split('-');
        return parts.length >= 2 && parseInt(parts[1]) === m;
      });
      let ca = 0, charges = 0;
      for (const e of monthEntries) {
        for (const l of e.lines) {
          if (l.accountCode.startsWith('7')) ca += l.credit - l.debit;
          if (l.accountCode.startsWith('6')) charges += l.debit - l.credit;
        }
      }
      const resultat = ca - charges;
      result[mStr] = { name: MONTH_NAMES[m - 1], ca, charges, resultat, evolution: 0 };
    }
    return result;
  }, [allEntries]);

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

  // Helper: calcul de solde net par préfixe de compte pour un mois donné
  const soldeByPrefix = (prefix: string, month: number) => {
    let d = 0, c = 0;
    for (const e of allEntries) {
      const parts = e.date?.split('-');
      if (!parts || parts.length < 2 || parseInt(parts[1]) !== month) continue;
      for (const l of e.lines) {
        if (l.accountCode.startsWith(prefix)) { d += l.debit; c += l.credit; }
      }
    }
    return d - c;
  };

  const soldeCreditByPrefix = (prefix: string, month: number) => -soldeByPrefix(prefix, month);

  // Solde cumulé depuis le début de l'exercice jusqu'au mois donné
  const soldeCumulByPrefix = (prefix: string, upToMonth: number) => {
    let d = 0, c = 0;
    for (const e of allEntries) {
      const parts = e.date?.split('-');
      if (!parts || parts.length < 2 || parseInt(parts[1]) > upToMonth) continue;
      for (const l of e.lines) {
        if (l.accountCode.startsWith(prefix)) { d += l.debit; c += l.credit; }
      }
    }
    return d - c;
  };

  const soldeCreditCumulByPrefix = (prefix: string, upToMonth: number) => -soldeCumulByPrefix(prefix, upToMonth);

  // Génération des données bilans mensuels depuis les écritures réelles
  const generateMonthlyBilan = (month: string) => {
    const m = parseInt(month);
    return {
      actif: bilanStructure.actif.map(item => {
        const prefix = item.code.split('/')[0];
        return Math.round(soldeCumulByPrefix(prefix, m));
      }),
      passif: bilanStructure.passif.map(item => {
        return Math.round(soldeCreditCumulByPrefix(item.code, m));
      })
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

  // Génération des données compte de résultat mensuels depuis écritures réelles
  const generateMonthlyCompteResultat = (month: string) => {
    const m = parseInt(month);
    return {
      produits: compteResultatStructure.produits.map(item =>
        Math.round(soldeCreditByPrefix(item.code, m))
      ),
      charges: compteResultatStructure.charges.map(item =>
        Math.round(soldeByPrefix(item.code, m))
      )
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

  // Génération des SIG mensuels depuis écritures réelles
  const generateMonthlySIG = (month: string) => {
    const m = parseInt(month);
    const ventesMarch = soldeCreditByPrefix('701', m);
    const achatsMarch = soldeByPrefix('601', m);
    const margeCommerciale = ventesMarch - achatsMarch;

    const prodVendue = soldeCreditByPrefix('702', m) + soldeCreditByPrefix('703', m) + soldeCreditByPrefix('704', m);
    const prodStockee = soldeCreditByPrefix('73', m);
    const prodImmob = soldeCreditByPrefix('72', m);
    const productionExercice = prodVendue + prodStockee + prodImmob;

    const consommations = soldeByPrefix('60', m) + soldeByPrefix('61', m) + soldeByPrefix('62', m);
    const valeurAjoutee = margeCommerciale + productionExercice - consommations;

    const chargesPersonnel = soldeByPrefix('66', m);
    const impotsTaxes = soldeByPrefix('64', m);
    const ebe = valeurAjoutee - chargesPersonnel - impotsTaxes;

    const dotations = soldeByPrefix('68', m);
    const reprises = soldeCreditByPrefix('78', m);
    const autresProduits = soldeCreditByPrefix('75', m);
    const autresCharges = soldeByPrefix('65', m);
    const resultatExploitation = ebe - dotations + reprises + autresProduits - autresCharges;

    const produitsFinanciers = soldeCreditByPrefix('77', m);
    const chargesFinancieres = soldeByPrefix('67', m);
    const resultatNet = resultatExploitation + produitsFinanciers - chargesFinancieres;

    return [
      Math.round(margeCommerciale),
      Math.round(productionExercice),
      Math.round(valeurAjoutee),
      Math.round(ebe),
      Math.round(resultatExploitation),
      Math.round(resultatNet)
    ];
  };

  // Détail des transactions réelles depuis les écritures
  const generateTransactionDetails = (accountCode: string, month: string, _amount: number) => {
    const m = month === 'toutes-periodes' ? 0 : parseInt(month);
    const result: Array<{ id: string; date: string; reference: string; libelle: string; montant: number; tiers: string; piece: string }> = [];
    for (const e of allEntries) {
      const parts = e.date?.split('-');
      if (m > 0 && (!parts || parts.length < 2 || parseInt(parts[1]) !== m)) continue;
      for (const l of e.lines) {
        if (l.accountCode.startsWith(accountCode)) {
          result.push({
            id: `${e.id}-${l.accountCode}`,
            date: e.date,
            reference: e.pieceRef || e.id?.substring(0, 8) || '',
            libelle: l.label || e.label || '',
            montant: l.debit - l.credit,
            tiers: (e as unknown as { thirdPartyName?: string }).thirdPartyName || '',
            piece: e.pieceRef || '',
          });
        }
      }
    }
    return result;
  };

  // Sous-comptes réels depuis les écritures
  const generateSubAccounts = (mainAccountCode: string, _amount: number) => {
    const accountTotals: Record<string, { debit: number; credit: number; label: string }> = {};
    for (const e of allEntries) {
      for (const l of e.lines) {
        if (l.accountCode.startsWith(mainAccountCode) && l.accountCode.length > mainAccountCode.length) {
          if (!accountTotals[l.accountCode]) {
            accountTotals[l.accountCode] = { debit: 0, credit: 0, label: l.label || l.accountCode };
          }
          accountTotals[l.accountCode].debit += l.debit;
          accountTotals[l.accountCode].credit += l.credit;
        }
      }
    }
    const entries = Object.entries(accountTotals);
    const totalAbs = entries.reduce((s, [, v]) => s + Math.abs(v.debit - v.credit), 0);
    return entries.map(([code, v]) => {
      const montant = Math.round(v.debit - v.credit);
      return {
        id: code,
        code,
        libelle: v.label,
        montant,
        pourcentage: totalAbs > 0 ? Math.round(Math.abs(montant) / totalAbs * 100) : 0,
      };
    }).filter(s => s.montant !== 0);
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
    <div className="min-h-screen bg-[var(--color-border)] ">
      {/* En-tête */}
      <div className="bg-white border-b border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/financial-analysis-advanced')}
              className="flex items-center space-x-2 px-4 py-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Retour</span>
            </button>
            <div className="h-6 w-px bg-[var(--color-border)]" />
            <div>
              <h1 className="text-lg font-bold text-[var(--color-primary)]">États Financiers Mensuels SYSCOHADA</h1>
              <p className="text-sm text-[var(--color-text-tertiary)]">Tableaux financiers mensualisés de janvier à décembre 2024</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-[var(--color-text-tertiary)]">
              Exercice 2024 • Données mensualisées
            </div>
            <button className="p-2 border border-[var(--color-border)] rounded-lg hover:bg-gray-50" aria-label="Actualiser">
              <RefreshCw className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm">
        <div className="px-6 border-b border-[var(--color-border)]">
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
                      ? 'border-[var(--color-text-secondary)] text-[var(--color-text-secondary)]'
                      : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[#404040]'
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
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">BILAN SYSCOHADA - Exercice 2024</h2>
                <p className="text-[var(--color-text-tertiary)]">Données mensualisées de janvier à décembre</p>
              </div>

              {/* ACTIF */}
              <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                <div className="bg-[var(--color-text-secondary)] text-white p-4">
                  <h3 className="text-lg font-bold text-left">ACTIF</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[var(--color-border)]">Réf</th>
                        <th className="text-left p-3 border-b border-[var(--color-border)] min-w-[200px]">{t('accounting.label')}</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[var(--color-border)] min-w-[90px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[var(--color-border)] min-w-[100px] bg-[var(--color-text-secondary)]/10 font-bold">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bilanStructure.actif.map((item, index) => {
                        const monthlyValues = months.map(month => generateMonthlyBilan(month).actif[index]);
                        const total = monthlyValues.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr key={index} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                            <td className="p-3 text-[#404040] font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', total)}
                                  className="p-1 hover:bg-[var(--color-text-secondary)] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[var(--color-primary)]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className="p-2 text-right font-mono text-xs hover:bg-blue-50 cursor-pointer"
                                onClick={() => openDetailModal(item.code, item.libelle, months[monthIndex], value)}
                                title={`Cliquer pour voir les transactions de ${monthlyData[months[monthIndex] as keyof typeof monthlyData].name}`}
                              >
                                {formatCurrency(value)}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono font-bold bg-[var(--color-text-secondary)]/5">
                              {formatCurrency(total)}
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
                          <tr className="bg-[var(--color-text-secondary)]/10 font-bold border-t-2 border-[var(--color-text-secondary)]">
                            <td className="p-3">TA</td>
                            <td className="p-3">TOTAL ACTIF</td>
                            {monthlyTotals.map((total, index) => (
                              <td key={index} className="p-2 text-right font-mono text-sm">
                                {formatCurrency(total)}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono text-lg bg-[var(--color-text-secondary)]/20">
                              {formatCurrency(grandTotal)}
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PASSIF */}
              <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                <div className="bg-[var(--color-primary)] text-white p-4">
                  <h3 className="text-lg font-bold text-left">PASSIF</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[var(--color-border)]">Réf</th>
                        <th className="text-left p-3 border-b border-[var(--color-border)] min-w-[200px]">{t('accounting.label')}</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[var(--color-border)] min-w-[90px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[var(--color-border)] min-w-[100px] bg-[var(--color-primary)]/10 font-bold">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bilanStructure.passif.map((item, index) => {
                        const monthlyValues = months.map(month => generateMonthlyBilan(month).passif[index]);
                        const total = monthlyValues.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr key={index} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                            <td className="p-3 text-[#404040] font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', total)}
                                  className="p-1 hover:bg-[var(--color-primary)] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[var(--color-primary)]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className="p-2 text-right font-mono text-xs hover:bg-blue-50 cursor-pointer"
                                onClick={() => openDetailModal(item.code, item.libelle, months[monthIndex], value)}
                                title={`Cliquer pour voir les transactions de ${monthlyData[months[monthIndex] as keyof typeof monthlyData].name}`}
                              >
                                {formatCurrency(value)}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono font-bold bg-[var(--color-primary)]/5">
                              {formatCurrency(total)}
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
                          <tr className="bg-[var(--color-primary)]/10 font-bold border-t-2 border-[var(--color-primary)]">
                            <td className="p-3">TP</td>
                            <td className="p-3">TOTAL PASSIF</td>
                            {monthlyTotals.map((total, index) => (
                              <td key={index} className="p-2 text-right font-mono text-sm">
                                {formatCurrency(total)}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono text-lg bg-[var(--color-primary)]/20">
                              {formatCurrency(grandTotal)}
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
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">BILAN FONCTIONNEL - Exercice 2024</h2>
                <p className="text-[var(--color-text-tertiary)]">Analyse fonctionnelle des emplois et ressources mensualisée</p>
              </div>

              {/* EMPLOIS ET RESSOURCES MENSUALISÉS */}
              <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                <div className="bg-[var(--color-text-tertiary)] text-white p-4">
                  <h3 className="text-lg font-bold text-left">BILAN FONCTIONNEL</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[var(--color-border)] min-w-[200px]">Analyse fonctionnelle</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[var(--color-border)] min-w-[90px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[var(--color-border)] min-w-[100px] bg-[var(--color-text-tertiary)]/10 font-bold">TOTAL</th>
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
                          <tr key={`emploi-${index}`} className="border-b border-[var(--color-border)] hover:bg-blue-50">
                            <td className="p-3 text-[var(--color-primary)]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td key={monthIndex} className="p-2 text-right font-mono text-xs">
                                {formatCurrency(value)}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono font-bold bg-blue-100">
                              {formatCurrency(total)}
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
                          <tr key={`ressource-${index}`} className="border-b border-[var(--color-border)] hover:bg-green-50">
                            <td className="p-3 text-[var(--color-primary)]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td key={monthIndex} className="p-2 text-right font-mono text-xs">
                                {formatCurrency(value)}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono font-bold bg-green-100">
                              {formatCurrency(total)}
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
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">COMPTE DE RÉSULTAT - Exercice 2024</h2>
                <p className="text-[var(--color-text-tertiary)]">Produits et charges mensualisés</p>
              </div>

              {/* PRODUITS ET CHARGES SUPERPOSÉS */}
              <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                <div className="bg-[var(--color-text-secondary)] text-white p-4">
                  <h3 className="text-lg font-bold text-left">COMPTE DE RÉSULTAT SYSCOHADA</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[var(--color-border)]">Réf</th>
                        <th className="text-left p-3 border-b border-[var(--color-border)] min-w-[200px]">{t('accounting.label')}</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[var(--color-border)] min-w-[90px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[var(--color-border)] min-w-[100px] bg-[var(--color-text-secondary)]/10 font-bold">TOTAL</th>
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
                          <tr key={`produit-${index}`} className="border-b border-[var(--color-border)] hover:bg-green-50">
                            <td className="p-3 text-[#404040] font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', total)}
                                  className="p-1 hover:bg-[var(--color-text-secondary)] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[var(--color-primary)]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className="p-2 text-right font-mono text-xs text-green-700 hover:bg-blue-50 cursor-pointer"
                                onClick={() => openDetailModal(item.code, item.libelle, months[monthIndex], value)}
                                title={`Cliquer pour voir les transactions de ${monthlyData[months[monthIndex] as keyof typeof monthlyData].name}`}
                              >
                                {formatCurrency(value)}
                              </td>
                            ))}
                            <td
                              className="p-3 text-right font-mono font-bold bg-green-100 text-green-700 hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'total', total)}
                              title="Cliquer pour voir le détail du total annuel"
                            >
                              {formatCurrency(total)}
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
                                {formatCurrency(total)}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono text-lg bg-green-200 text-green-800">
                              {formatCurrency(grandTotal)}
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
                          <tr key={`charge-${index}`} className="border-b border-[var(--color-border)] hover:bg-red-50">
                            <td className="p-3 text-[#404040] font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', total)}
                                  className="p-1 hover:bg-[var(--color-text-secondary)] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[var(--color-primary)]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className="p-2 text-right font-mono text-xs text-red-700 hover:bg-blue-50 cursor-pointer"
                                onClick={() => openDetailModal(item.code, item.libelle, months[monthIndex], value)}
                                title={`Cliquer pour voir les transactions de ${monthlyData[months[monthIndex] as keyof typeof monthlyData].name}`}
                              >
                                {formatCurrency(value)}
                              </td>
                            ))}
                            <td
                              className="p-3 text-right font-mono font-bold bg-red-100 text-red-700 hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'total', total)}
                              title="Cliquer pour voir le détail du total annuel"
                            >
                              {formatCurrency(total)}
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
                                {formatCurrency(total)}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono text-lg bg-red-200 text-red-800">
                              {formatCurrency(grandTotal)}
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
                          <tr className="bg-[var(--color-text-secondary)]/10 font-bold border-t-4 border-[var(--color-text-secondary)]">
                            <td className="p-3">RN</td>
                            <td className="p-3">RÉSULTAT NET</td>
                            {monthlyResultats.map((resultat, index) => (
                              <td key={index} className="p-2 text-right font-mono text-sm text-[var(--color-text-secondary)]">
                                {formatCurrency(resultat)}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono text-lg bg-[var(--color-text-secondary)]/20 text-[var(--color-text-secondary)]">
                              {formatCurrency(totalResultat)}
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
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">TABLEAU DE FINANCEMENT - Exercice 2024</h2>
                <p className="text-[var(--color-text-tertiary)]">Analyse des flux financiers mensualisée</p>
              </div>

              <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                <div className="bg-[var(--color-text-tertiary)] text-white p-4">
                  <h3 className="text-lg font-bold text-left">TABLEAU DE FINANCEMENT</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[var(--color-border)] min-w-[200px]">Flux financiers</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[var(--color-border)] min-w-[90px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[var(--color-border)] min-w-[100px] bg-[var(--color-text-tertiary)]/10 font-bold">TOTAL</th>
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
                          <tr key={`emploi-${index}`} className="border-b border-[var(--color-border)] hover:bg-blue-50">
                            <td className="p-3 text-[var(--color-primary)]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td key={monthIndex} className="p-2 text-right font-mono text-xs">
                                {formatCurrency(value)}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono font-bold bg-blue-100">
                              {formatCurrency(total)}
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
                          <tr key={`ressource-${index}`} className="border-b border-[var(--color-border)] hover:bg-green-50">
                            <td className="p-3 text-[var(--color-primary)]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td key={monthIndex} className="p-2 text-right font-mono text-xs">
                                {formatCurrency(value)}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono font-bold bg-green-100">
                              {formatCurrency(total)}
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

          {/* TABLEAU FLUX TRÉSORERIE */}
          {activeTab === 'flux-tresorerie' && (() => {
            const year = new Date().getFullYear().toString();
            const toggleTftRow = (key: string) => setTftExpandedRows(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

            // Calculer les données TFT depuis les écritures réelles
            const net = (...pfx: string[]) => { let t = 0; for (const e of allEntries) for (const l of e.lines) if (pfx.some(p => l.accountCode.startsWith(p))) t += l.debit - l.credit; return t; };
            const creditN = (...pfx: string[]) => { let t = 0; for (const e of allEntries) for (const l of e.lines) if (pfx.some(p => l.accountCode.startsWith(p))) t += l.credit - l.debit; return t; };

            // Écritures détaillées par préfixe
            const entriesForPrefixes = (...pfx: string[]) => allEntries.filter(e => e.lines?.some((l: any) => pfx.some(p => l.accountCode.startsWith(p)))).map(e => ({ ref: e.entryNumber || e.reference || e.id?.substring(0, 8), date: e.date, label: e.label, journal: e.journal, amount: e.lines.filter((l: any) => pfx.some(p => l.accountCode.startsWith(p))).reduce((s: number, l: any) => s + l.debit - l.credit, 0) }));

            // Données méthode indirecte
            const resultatNet = creditN('7') - net('6');
            const dotations = net('68', '69');
            const reprises = creditN('78', '79');
            const plusMoinsValues = creditN('82') - net('81');
            const caf = resultatNet + dotations - reprises;
            const varStocks = net('3');
            const varClients = net('41');
            const varAutres = net('46');
            const varFournisseurs = creditN('40');
            const varFiscales = creditN('42', '43', '44');
            const fluxExploit = caf - varStocks - varClients - varAutres + varFournisseurs + varFiscales;
            let acqImmos = 0; for (const e of allEntries) { if (e.journal === 'AN' || e.journal === 'RAN') continue; for (const l of e.lines) if (l.accountCode.startsWith('2') && !l.accountCode.startsWith('28') && l.debit > 0) acqImmos += l.debit; }
            const cessImmos = creditN('82');
            const acqFinanc = net('26', '27') > 0 ? net('26', '27') : 0;
            const fluxInvest = cessImmos - acqImmos - acqFinanc;
            const augCapital = creditN('10');
            const emprunts = creditN('16');
            const rembEmprunts = net('16') > 0 ? net('16') : 0;
            const dividendes = net('465');
            const fluxFinanc = augCapital + emprunts - rembEmprunts - dividendes;
            const variation = fluxExploit + fluxInvest + fluxFinanc;
            const tresoOuverture = (() => { let t = 0; for (const e of allEntries) { if (e.journal === 'AN' || e.journal === 'RAN') for (const l of e.lines) if (l.accountCode.startsWith('5')) t += l.debit - l.credit; } return t; })();
            const tresoCloture = net('5');

            // Données méthode directe
            let dEncClients = 0, dDecFournisseurs = 0, dDecPersonnel = 0, dDecImpots = 0, dAutresEnc = 0, dAutresDec = 0;
            let dDecAcqImmos = 0, dEncCessions = 0, dDecAcqFinanc = 0;
            let dEncCapital = 0, dEncEmprunts = 0, dDecRembEmprunts = 0, dDecDividendes = 0;
            for (const e of allEntries) {
              if (e.journal === 'AN' || e.journal === 'RAN') continue;
              const cl = e.lines?.filter((l: any) => l.accountCode.startsWith('5')) || [];
              const oth = e.lines?.filter((l: any) => !l.accountCode.startsWith('5')) || [];
              if (cl.length === 0) continue;
              let cd = 0, cc = 0; for (const c of cl) { cd += c.debit; cc += c.credit; }
              const nc = cd - cc;
              const has = (p: string) => oth.some((l: any) => l.accountCode.startsWith(p));
              if (has('41')) { if (nc > 0) dEncClients += nc; else dAutresDec += Math.abs(nc); }
              else if (has('40')) { if (nc < 0) dDecFournisseurs += Math.abs(nc); else dAutresEnc += nc; }
              else if (has('42') || has('43')) { if (nc < 0) dDecPersonnel += Math.abs(nc); }
              else if (has('44') || has('89')) { if (nc < 0) dDecImpots += Math.abs(nc); }
              else if (has('21') || has('22') || has('23') || has('24') || has('25')) { if (nc < 0) dDecAcqImmos += Math.abs(nc); else dEncCessions += nc; }
              else if (has('26') || has('27')) { if (nc < 0) dDecAcqFinanc += Math.abs(nc); }
              else if (has('10') || has('11') || has('12')) { if (nc > 0) dEncCapital += nc; }
              else if (has('16')) { if (nc > 0) dEncEmprunts += nc; else dDecRembEmprunts += Math.abs(nc); }
              else if (has('465')) { if (nc < 0) dDecDividendes += Math.abs(nc); }
              else { if (nc > 0) dAutresEnc += nc; else dAutresDec += Math.abs(nc); }
            }
            const dFluxExploit = dEncClients + dAutresEnc - dDecFournisseurs - dDecPersonnel - dDecImpots - dAutresDec;
            const dFluxInvest = dEncCessions - dDecAcqImmos - dDecAcqFinanc;
            const dFluxFinanc = dEncCapital + dEncEmprunts - dDecRembEmprunts - dDecDividendes;
            const dVariation = dFluxExploit + dFluxInvest + dFluxFinanc;

            const indirectRows = [
              { section: 'A. FLUX LIÉS À L\'ACTIVITÉ', color: 'blue' },
              { key: 'i-rn', label: 'Résultat net de l\'exercice', value: resultatNet, prefixes: ['6', '7'] },
              { key: 'i-dot', label: '+ Dotations aux amortissements et provisions', value: dotations, prefixes: ['68', '69'] },
              { key: 'i-rep', label: '- Reprises sur provisions', value: -reprises, prefixes: ['78', '79'] },
              { key: 'i-pmv', label: '± Plus/moins-values de cession', value: plusMoinsValues, prefixes: ['81', '82'] },
              { subtotal: true, label: '= Capacité d\'autofinancement (CAF)', value: caf },
              { key: 'i-stk', label: '- Variation des stocks', value: -varStocks, prefixes: ['3'] },
              { key: 'i-cli', label: '- Variation des créances clients', value: -varClients, prefixes: ['41'] },
              { key: 'i-aut', label: '- Variation des autres créances', value: -varAutres, prefixes: ['46'] },
              { key: 'i-frn', label: '+ Variation des dettes fournisseurs', value: varFournisseurs, prefixes: ['40'] },
              { key: 'i-fis', label: '+ Variation des dettes fiscales et sociales', value: varFiscales, prefixes: ['42', '43', '44'] },
              { total: true, label: '= FLUX NET LIÉ À L\'ACTIVITÉ (A)', value: fluxExploit },
              { section: 'B. FLUX LIÉS AUX INVESTISSEMENTS', color: 'orange' },
              { key: 'i-acq', label: '- Acquisitions d\'immobilisations', value: -acqImmos, prefixes: ['21', '22', '23', '24', '25'] },
              { key: 'i-ces', label: '+ Cessions d\'immobilisations', value: cessImmos, prefixes: ['82'] },
              { key: 'i-fin', label: '- Acquisitions financières', value: -acqFinanc, prefixes: ['26', '27'] },
              { total: true, label: '= FLUX NET LIÉ AUX INVESTISSEMENTS (B)', value: fluxInvest },
              { section: 'C. FLUX LIÉS AU FINANCEMENT', color: 'purple' },
              { key: 'i-cap', label: '+ Augmentation de capital', value: augCapital, prefixes: ['10'] },
              { key: 'i-emp', label: '+ Nouveaux emprunts', value: emprunts, prefixes: ['16'] },
              { key: 'i-remb', label: '- Remboursements d\'emprunts', value: -rembEmprunts, prefixes: ['16'] },
              { key: 'i-div', label: '- Dividendes versés', value: -dividendes, prefixes: ['465'] },
              { total: true, label: '= FLUX NET LIÉ AU FINANCEMENT (C)', value: fluxFinanc },
            ];

            const directRows = [
              { section: 'A. FLUX LIÉS À L\'ACTIVITÉ', color: 'blue' },
              { key: 'd-enc', label: '+ Encaissements reçus des clients', value: dEncClients, prefixes: ['41'] },
              { key: 'd-aenc', label: '+ Autres encaissements d\'exploitation', value: dAutresEnc, prefixes: [] },
              { key: 'd-frn', label: '- Décaissements aux fournisseurs', value: -dDecFournisseurs, prefixes: ['40'] },
              { key: 'd-per', label: '- Décaissements au personnel', value: -dDecPersonnel, prefixes: ['42', '43'] },
              { key: 'd-imp', label: '- Impôts payés', value: -dDecImpots, prefixes: ['44', '89'] },
              { key: 'd-adec', label: '- Autres décaissements d\'exploitation', value: -dAutresDec, prefixes: [] },
              { total: true, label: '= FLUX NET LIÉ À L\'ACTIVITÉ (A)', value: dFluxExploit },
              { section: 'B. FLUX LIÉS AUX INVESTISSEMENTS', color: 'orange' },
              { key: 'd-dacq', label: '- Décaissements sur acquisitions d\'immos', value: -dDecAcqImmos, prefixes: ['21', '22', '23', '24', '25'] },
              { key: 'd-dfin', label: '- Décaissements sur acquisitions financières', value: -dDecAcqFinanc, prefixes: ['26', '27'] },
              { key: 'd-eces', label: '+ Encaissements sur cessions', value: dEncCessions, prefixes: ['82'] },
              { total: true, label: '= FLUX NET LIÉ AUX INVESTISSEMENTS (B)', value: dFluxInvest },
              { section: 'C. FLUX LIÉS AU FINANCEMENT', color: 'purple' },
              { key: 'd-ecap', label: '+ Encaissements augmentation capital', value: dEncCapital, prefixes: ['10'] },
              { key: 'd-eemp', label: '+ Encaissements emprunts', value: dEncEmprunts, prefixes: ['16'] },
              { key: 'd-dremp', label: '- Remboursements d\'emprunts', value: -dDecRembEmprunts, prefixes: ['16'] },
              { key: 'd-ddiv', label: '- Dividendes versés', value: -dDecDividendes, prefixes: ['465'] },
              { total: true, label: '= FLUX NET LIÉ AU FINANCEMENT (C)', value: dFluxFinanc },
            ];

            const rows = tftMethod === 'indirect' ? indirectRows : directRows;
            const totalVar = tftMethod === 'indirect' ? variation : dVariation;

            return (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">TABLEAU DES FLUX DE TRÉSORERIE - Exercice {year}</h2>
                <p className="text-[var(--color-text-tertiary)]">Flux de trésorerie par activité selon SYSCOHADA</p>
              </div>

              {/* Sous-onglets Méthode */}
              <div className="flex justify-center">
                <div className="inline-flex bg-gray-100 rounded-lg p-1">
                  <button onClick={() => setTftMethod('indirect')} className={`px-5 py-2 text-sm font-medium rounded-md transition-all ${tftMethod === 'indirect' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Méthode Indirecte</button>
                  <button onClick={() => setTftMethod('direct')} className={`px-5 py-2 text-sm font-medium rounded-md transition-all ${tftMethod === 'direct' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Méthode Directe</button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                <div className="bg-gray-800 text-white p-4">
                  <h3 className="text-base font-bold">TABLEAU DES FLUX DE TRÉSORERIE — Méthode {tftMethod === 'indirect' ? 'Indirecte' : 'Directe'}</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 border-b border-[var(--color-border)] w-8"></th>
                      <th className="text-left p-3 border-b border-[var(--color-border)]">Libellé</th>
                      <th className="text-right p-3 border-b border-[var(--color-border)] w-40">Montant (FCFA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row: any, idx) => {
                      if (row.section) {
                        const colors: any = { blue: 'bg-blue-50 text-blue-800', orange: 'bg-orange-50 text-orange-800', purple: 'bg-purple-50 text-purple-800' };
                        return (
                          <tr key={`s-${idx}`} className={colors[row.color] || 'bg-gray-50'}>
                            <td className="p-2"></td>
                            <td colSpan={2} className="p-3 font-bold text-sm">{row.section}</td>
                          </tr>
                        );
                      }
                      if (row.subtotal) {
                        return (
                          <tr key={`st-${idx}`} className="bg-gray-100 font-semibold">
                            <td className="p-2"></td>
                            <td className="p-3">{row.label}</td>
                            <td className={`p-3 text-right font-mono font-bold ${row.value < 0 ? 'text-red-600' : ''}`}>{formatCurrency(row.value)}</td>
                          </tr>
                        );
                      }
                      if (row.total) {
                        return (
                          <tr key={`t-${idx}`} className="bg-gray-200 font-bold border-t-2 border-gray-400">
                            <td className="p-2"></td>
                            <td className="p-3">{row.label}</td>
                            <td className={`p-3 text-right font-mono text-base ${row.value < 0 ? 'text-red-600' : 'text-[var(--color-primary)]'}`}>{formatCurrency(row.value)}</td>
                          </tr>
                        );
                      }
                      const isExpanded = tftExpandedRows.has(row.key);
                      const details = isExpanded && row.prefixes?.length > 0 ? entriesForPrefixes(...row.prefixes) : [];
                      return (
                        <React.Fragment key={row.key}>
                          <tr className="border-b border-[var(--color-border)] hover:bg-gray-50 cursor-pointer" onClick={() => row.prefixes?.length > 0 && toggleTftRow(row.key)}>
                            <td className="p-2 text-center text-gray-400">
                              {row.prefixes?.length > 0 && (isExpanded ? <ChevronDown className="w-4 h-4 inline" /> : <ChevronRight className="w-4 h-4 inline" />)}
                            </td>
                            <td className="p-3 text-[var(--color-primary)]">{row.label}</td>
                            <td className={`p-3 text-right font-mono ${row.value < 0 ? 'text-red-600' : ''}`}>{formatCurrency(row.value)}</td>
                          </tr>
                          {isExpanded && details.length > 0 && details.slice(0, 20).map((d: any, di: number) => (
                            <tr key={`${row.key}-d-${di}`} className="bg-blue-50/50 border-b border-blue-100">
                              <td className="p-1"></td>
                              <td className="p-2 pl-10 text-xs text-gray-600">
                                <span className="font-mono text-gray-400 mr-2">{d.date}</span>
                                <span className="text-gray-500 mr-2">[{d.journal}]</span>
                                <span className="font-mono mr-2">{d.ref}</span>
                                {d.label}
                              </td>
                              <td className={`p-2 text-right font-mono text-xs ${d.amount < 0 ? 'text-red-500' : 'text-gray-700'}`}>{formatCurrency(d.amount)}</td>
                            </tr>
                          ))}
                          {isExpanded && details.length === 0 && (
                            <tr key={`${row.key}-empty`} className="bg-gray-50">
                              <td className="p-1"></td>
                              <td colSpan={2} className="p-2 pl-10 text-xs text-gray-400 italic">Aucune écriture</td>
                            </tr>
                          )}
                          {isExpanded && details.length > 20 && (
                            <tr key={`${row.key}-more`} className="bg-blue-50/50">
                              <td className="p-1"></td>
                              <td colSpan={2} className="p-2 pl-10 text-xs text-blue-600 italic">...et {details.length - 20} autres écritures</td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {/* Variation totale */}
                    <tr className="bg-gray-200 font-bold border-t-4 border-gray-500">
                      <td className="p-3"></td>
                      <td className="p-3 text-[var(--color-primary)]">VARIATION DE TRÉSORERIE NETTE (A+B+C)</td>
                      <td className={`p-3 text-right font-mono text-lg ${totalVar < 0 ? 'text-red-600' : 'text-green-700'}`}>{totalVar >= 0 ? '+' : ''}{formatCurrency(totalVar)}</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="p-2"></td>
                      <td className="p-3 text-gray-600">Trésorerie d'ouverture</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(tresoOuverture)}</td>
                    </tr>
                    <tr className="bg-gray-100 font-bold">
                      <td className="p-2"></td>
                      <td className="p-3">TRÉSORERIE À LA CLÔTURE</td>
                      <td className="p-3 text-right font-mono text-lg text-[var(--color-primary)]">{formatCurrency(tresoCloture)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            );
          })()}

          {/* SIG MENSUELS */}
          {activeTab === 'sig' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">SIG (SOLDES INTERMÉDIAIRES) - Exercice 2024</h2>
                <p className="text-[var(--color-text-tertiary)]">Formation du résultat mensualisée</p>
              </div>

              <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                <div className="bg-[var(--color-text-secondary)] text-white p-4">
                  <h3 className="text-lg font-bold text-left">SOLDES INTERMÉDIAIRES DE GESTION</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[var(--color-border)]">Réf</th>
                        <th className="text-left p-3 border-b border-[var(--color-border)] min-w-[200px]">Soldes intermédiaires</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[var(--color-border)] min-w-[90px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[var(--color-border)] min-w-[100px] bg-[var(--color-text-secondary)]/10 font-bold">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sigStructure.map((item, index) => {
                        const monthlyValues = months.map(month => generateMonthlySIG(month)[index]);
                        const total = monthlyValues.reduce((sum, value) => sum + value, 0);

                        return (
                          <tr key={index} className={`border-b border-[var(--color-border)] hover:bg-gray-50 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                            <td className="p-3 text-[#404040] font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', total)}
                                  className="p-1 hover:bg-[var(--color-text-secondary)] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 font-medium text-[var(--color-primary)]">{item.libelle}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className="p-2 text-right font-mono text-xs hover:bg-blue-50 cursor-pointer"
                                onClick={() => openDetailModal(item.code, item.libelle, months[monthIndex], value)}
                                title={`Cliquer pour voir les transactions de ${monthlyData[months[monthIndex] as keyof typeof monthlyData].name}`}
                              >
                                {formatCurrency(value)}
                              </td>
                            ))}
                            <td
                              className="p-3 text-right font-mono font-bold bg-[var(--color-text-secondary)]/5 hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'total', total)}
                              title="Cliquer pour voir le détail du total annuel"
                            >
                              {formatCurrency(total)}
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
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">RATIOS FINANCIERS - Exercice 2024</h2>
                <p className="text-[var(--color-text-tertiary)]">Indicateurs de performance mensualisés</p>
              </div>

              {/* RATIOS DE RENTABILITÉ */}
              <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                <div className="bg-green-600 text-white p-4">
                  <h3 className="text-lg font-bold text-left">RATIOS DE RENTABILITÉ</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[var(--color-border)]">Réf</th>
                        <th className="text-left p-3 border-b border-[var(--color-border)] min-w-[150px]">Ratios</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[var(--color-border)] min-w-[80px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[var(--color-border)] min-w-[100px] bg-green-100 font-bold">MOYENNE</th>
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
                          <tr key={index} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                            <td className="p-3 text-[#404040] font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{ratio.code}</span>
                                <button
                                  onClick={() => openDetailModal(ratio.code, `Sous-comptes de ${ratio.nom}`, 'sous-comptes', moyenne)}
                                  className="p-1 hover:bg-[var(--color-text-secondary)] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${ratio.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 font-medium text-[var(--color-primary)]">{ratio.nom}</td>
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
              <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                <div className="bg-blue-600 text-white p-4">
                  <h3 className="text-lg font-bold text-left">RATIOS D'ACTIVITÉ</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 border-b border-[var(--color-border)]">Réf</th>
                        <th className="text-left p-3 border-b border-[var(--color-border)] min-w-[150px]">Ratios</th>
                        {months.map(month => (
                          <th key={month} className="text-right p-2 border-b border-[var(--color-border)] min-w-[80px] text-xs">
                            {monthlyData[month as keyof typeof monthlyData].name}
                          </th>
                        ))}
                        <th className="text-right p-3 border-b border-[var(--color-border)] min-w-[100px] bg-blue-100 font-bold">MOYENNE</th>
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
                          <tr key={index} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                            <td className="p-3 text-[#404040] font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{ratio.code}</span>
                                <button
                                  onClick={() => openDetailModal(ratio.code, `Sous-comptes de ${ratio.nom}`, 'sous-comptes', moyenne)}
                                  className="p-1 hover:bg-[var(--color-text-secondary)] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${ratio.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 font-medium text-[var(--color-primary)]">{ratio.nom}</td>
                            {monthlyValues.map((value, monthIndex) => (
                              <td
                                key={monthIndex}
                                className="p-2 text-right font-mono text-xs hover:bg-blue-50 cursor-pointer"
                                onClick={() => openDetailModal(ratio.code, ratio.nom, months[monthIndex], value)}
                                title={`Cliquer pour voir les transactions de ${monthlyData[months[monthIndex] as keyof typeof monthlyData].name}`}
                              >
                                {ratio.format === '%' ? `${value.toFixed(1)}%` : `${formatCurrency(Math.round(value))}`}
                              </td>
                            ))}
                            <td
                              className="p-3 text-right font-mono font-bold bg-blue-50 hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(ratio.code, ratio.nom, 'moyenne', moyenne)}
                              title="Cliquer pour voir le détail de la moyenne annuelle"
                            >
                              {ratio.format === '%' ? `${moyenne.toFixed(1)}%` : `${formatCurrency(Math.round(moyenne))}`}
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
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">Export États Financiers Mensuels</h2>
                <p className="text-[var(--color-text-tertiary)]">Téléchargement des tableaux pour l'exercice 2024</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tabs.slice(0, -1).map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <div key={tab.id} className="bg-white rounded-lg p-6 border border-[var(--color-border)] hover:shadow-md transition-shadow">
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-lg bg-[var(--color-text-secondary)]/10 flex items-center justify-center mx-auto mb-4">
                          <IconComponent className="w-5 h-5 text-[var(--color-text-secondary)]" />
                        </div>
                        <h3 className="font-semibold text-[var(--color-primary)] mb-2">{tab.label}</h3>
                        <p className="text-sm text-[var(--color-text-tertiary)] mb-4">Exercice 2024 - Mensualisé</p>
                        <div className="space-y-2">
                          <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-[var(--color-text-secondary)] text-white rounded-lg hover:bg-[#404040] transition-colors">
                            <Download className="w-4 h-4" />
                            <span>PDF</span>
                          </button>
                          <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-[var(--color-border)] text-[#404040] rounded-lg hover:bg-gray-50 transition-colors">
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
            <div className="bg-[var(--color-text-secondary)] text-white p-6 flex items-center justify-between">
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
                    <p className="text-sm text-[var(--color-text-tertiary)]">{t('accounting.account')}</p>
                    <p className="font-bold text-[var(--color-primary)]">{selectedDetail.accountCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-tertiary)]">Période</p>
                    <p className="font-bold text-[var(--color-primary)]">{selectedDetail.month} 2024</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-tertiary)]">Montant total</p>
                    <p className="font-bold text-[var(--color-text-secondary)] text-lg">{formatCurrency(selectedDetail.amount)}</p>
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
                        <th className="text-left p-3 border-b border-[var(--color-border)]">Code</th>
                        <th className="text-left p-3 border-b border-[var(--color-border)]">{t('accounting.label')}</th>
                        <th className="text-right p-3 border-b border-[var(--color-border)]">Montant</th>
                        <th className="text-right p-3 border-b border-[var(--color-border)]">%</th>
                        <th className="text-center p-3 border-b border-[var(--color-border)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetail.subAccounts?.map((subAccount, index: number) => (
                        <tr key={subAccount.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          <td className="p-3 border-b border-[var(--color-border)] font-mono font-bold">{subAccount.code}</td>
                          <td className="p-3 border-b border-[var(--color-border)]">{subAccount.libelle}</td>
                          <td className="p-3 border-b border-[var(--color-border)] text-right font-mono font-bold">
                            {formatCurrency(subAccount.montant)}
                          </td>
                          <td className="p-3 border-b border-[var(--color-border)] text-right text-sm text-[var(--color-text-tertiary)]">
                            {subAccount.pourcentage.toFixed(1)}%
                          </td>
                          <td className="p-3 border-b border-[var(--color-border)] text-center">
                            <button
                              onClick={() => openDetailModal(subAccount.code, subAccount.libelle, selectedPeriod, subAccount.montant)}
                              className="px-2 py-1 text-xs bg-[var(--color-text-secondary)] text-white rounded hover:bg-[#404040] transition-colors"
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
                        <th className="text-left p-3 border-b border-[var(--color-border)]">{t('common.date')}</th>
                        <th className="text-left p-3 border-b border-[var(--color-border)]">Référence</th>
                        <th className="text-left p-3 border-b border-[var(--color-border)]">{t('accounting.label')}</th>
                        <th className="text-left p-3 border-b border-[var(--color-border)]">Tiers</th>
                        <th className="text-left p-3 border-b border-[var(--color-border)]">{t('accounting.piece')}</th>
                        <th className="text-right p-3 border-b border-[var(--color-border)]">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetail.transactions?.map((transaction, index: number) => (
                        <tr key={transaction.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          <td className="p-3 border-b border-[var(--color-border)]">{transaction.date}</td>
                          <td className="p-3 border-b border-[var(--color-border)] font-mono text-xs">{transaction.reference}</td>
                          <td className="p-3 border-b border-[var(--color-border)]">{transaction.libelle}</td>
                          <td className="p-3 border-b border-[var(--color-border)]">{transaction.tiers}</td>
                          <td className="p-3 border-b border-[var(--color-border)] font-mono text-xs">{transaction.piece}</td>
                          <td className="p-3 border-b border-[var(--color-border)] text-right font-mono font-bold">
                            {formatCurrency(transaction.montant)}
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
                  <span className="font-bold text-[var(--color-primary)]">
                    {selectedDetail.type === 'sous-comptes'
                      ? `TOTAL (${selectedDetail.subAccounts?.length || 0} sous-comptes)`
                      : `TOTAL (${selectedDetail.transactions?.length || 0} transactions)`
                    }
                  </span>
                  <span className="font-bold text-[var(--color-text-secondary)] text-lg">
                    {formatCurrency(selectedDetail.amount)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-[var(--color-border)]">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-[#404040] hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
                <button className="px-4 py-2 bg-[var(--color-text-secondary)] text-white rounded-lg hover:bg-[#404040] transition-colors flex items-center space-x-2" aria-label="Télécharger">
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