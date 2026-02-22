import { formatCurrency } from '@/utils/formatters';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  Building2, TrendingUp, BarChart3, Download, ArrowLeft, Home,
  DollarSign, Target, Activity, FileText, Calculator, PieChart,
  ArrowUpRight, Eye, Filter, RefreshCw, ChevronRight, X
} from 'lucide-react';
import PrintableArea from '../../components/ui/PrintableArea';
import { usePrintReport } from '../../hooks/usePrint';
import { useData } from '../../contexts/DataContext';
import type { DBJournalEntry } from '../../lib/db';
import { money } from '../../utils/money';

const BilanSYSCOHADAPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { adapter } = useData();
  const [activeTab, setActiveTab] = useState('bilan');
  const [periode, setPeriode] = useState('current');

  // États pour la modal de détails
  const [selectedDetail, setSelectedDetail] = useState<{ type: string; title: string; data: Array<Record<string, unknown>>; total?: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  const { printRef, handlePrint } = usePrintReport({
    orientation: 'landscape',
    fileName: 'bilan-syscohada.pdf'
  });

  // Onglets des états financiers SYSCOHADA
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

  // ========== DONNÉES RÉELLES DEPUIS DEXIE ==========
  const { data: rawEntries = [] } = useQuery({
    queryKey: ['bilan-syscohada-entries'],
    queryFn: () => adapter.getAll('journalEntries'),
  });

  // Helper: net balance (debit - credit) for account prefixes
  const net = (prefixes: string[]) => {
    let t = 0;
    for (const e of rawEntries) for (const l of e.lines)
      if (prefixes.some(p => l.accountCode.startsWith(p))) t += l.debit - l.credit;
    return t;
  };
  const creditNet = (prefixes: string[]) => {
    let t = 0;
    for (const e of rawEntries) for (const l of e.lines)
      if (prefixes.some(p => l.accountCode.startsWith(p))) t += l.credit - l.debit;
    return t;
  };

  // Bilan data — computed from entries
  const bilanData = useMemo(() => ({
    actif: [
      { code: '20', libelle: 'Charges immobilisées', exerciceN: Math.max(0, net(['20'])), exerciceN1: 0 },
      { code: '21', libelle: 'Immobilisations incorporelles', exerciceN: Math.max(0, net(['21'])), exerciceN1: 0 },
      { code: '22/23', libelle: 'Terrains', exerciceN: Math.max(0, net(['22', '23'])), exerciceN1: 0 },
      { code: '24', libelle: 'Bâtiments et installations', exerciceN: Math.max(0, net(['24'])), exerciceN1: 0 },
      { code: '245', libelle: 'Matériel et outillage', exerciceN: Math.max(0, net(['245'])), exerciceN1: 0 },
      { code: '246', libelle: 'Matériel de transport', exerciceN: Math.max(0, net(['246'])), exerciceN1: 0 },
      { code: '247', libelle: 'Matériel et mobilier', exerciceN: Math.max(0, net(['247'])), exerciceN1: 0 },
      { code: '31', libelle: 'Stocks de marchandises', exerciceN: Math.max(0, net(['31'])), exerciceN1: 0 },
      { code: '32', libelle: 'Stocks de matières premières', exerciceN: Math.max(0, net(['32'])), exerciceN1: 0 },
      { code: '41', libelle: 'Clients et comptes rattachés', exerciceN: Math.max(0, net(['41'])), exerciceN1: 0 },
      { code: '46', libelle: 'Débiteurs divers', exerciceN: Math.max(0, net(['46'])), exerciceN1: 0 },
      { code: '50', libelle: 'Valeurs mobilières de placement', exerciceN: Math.max(0, net(['50'])), exerciceN1: 0 },
      { code: '52', libelle: 'Banques', exerciceN: Math.max(0, net(['52'])), exerciceN1: 0 },
      { code: '53', libelle: 'Caisses', exerciceN: Math.max(0, net(['57'])), exerciceN1: 0 },
    ],
    passif: [
      { code: '10', libelle: 'Capital social', exerciceN: creditNet(['10']), exerciceN1: 0 },
      { code: '11', libelle: 'Réserves', exerciceN: creditNet(['11']), exerciceN1: 0 },
      { code: '12', libelle: 'Report à nouveau', exerciceN: creditNet(['12']), exerciceN1: 0 },
      { code: '13', libelle: 'Résultat de l\'exercice', exerciceN: creditNet(['7']) - (net(['6']) > 0 ? net(['6']) : 0), exerciceN1: 0 },
      { code: '16', libelle: 'Emprunts et dettes financières', exerciceN: creditNet(['16']), exerciceN1: 0 },
      { code: '40', libelle: 'Fournisseurs et comptes rattachés', exerciceN: creditNet(['40']), exerciceN1: 0 },
      { code: '42', libelle: 'Personnel', exerciceN: creditNet(['42']), exerciceN1: 0 },
      { code: '43', libelle: 'Organismes sociaux', exerciceN: creditNet(['43']), exerciceN1: 0 },
      { code: '44', libelle: 'État et collectivités', exerciceN: creditNet(['44']), exerciceN1: 0 },
      { code: '47', libelle: 'Créditeurs divers', exerciceN: creditNet(['47']), exerciceN1: 0 },
    ],
  }), [rawEntries]);

  // Compte de Résultat
  const compteResultatData = useMemo(() => ({
    produits: [
      { code: '70', libelle: 'Ventes de marchandises', exerciceN: creditNet(['70']), exerciceN1: 0 },
      { code: '72', libelle: 'Production vendue', exerciceN: creditNet(['72']), exerciceN1: 0 },
      { code: '74', libelle: 'Subventions d\'exploitation', exerciceN: creditNet(['74']), exerciceN1: 0 },
      { code: '75', libelle: 'Autres produits de gestion', exerciceN: creditNet(['75']), exerciceN1: 0 },
      { code: '77', libelle: 'Revenus financiers', exerciceN: creditNet(['77']), exerciceN1: 0 },
      { code: '78', libelle: 'Reprises de provisions', exerciceN: creditNet(['78']), exerciceN1: 0 },
    ],
    charges: [
      { code: '60', libelle: 'Achats de marchandises', exerciceN: net(['60']), exerciceN1: 0 },
      { code: '61', libelle: 'Transports', exerciceN: net(['61']), exerciceN1: 0 },
      { code: '62', libelle: 'Services extérieurs A', exerciceN: net(['62']), exerciceN1: 0 },
      { code: '63', libelle: 'Services extérieurs B', exerciceN: net(['63']), exerciceN1: 0 },
      { code: '64', libelle: 'Impôts et taxes', exerciceN: net(['64']), exerciceN1: 0 },
      { code: '66', libelle: 'Charges de personnel', exerciceN: net(['66']), exerciceN1: 0 },
      { code: '68', libelle: 'Dotations aux amortissements', exerciceN: net(['68']), exerciceN1: 0 },
      { code: '67', libelle: 'Charges financières', exerciceN: net(['67']), exerciceN1: 0 },
    ],
  }), [rawEntries]);

  // Bilan Fonctionnel
  const bilanFonctionnelData = useMemo(() => {
    const emploisStables = Math.max(0, net(['2']) + net(['28']));
    const aceVal = Math.max(0, net(['3'])) + Math.max(0, net(['41']));
    const acheVal = Math.max(0, net(['46']));
    const atVal = Math.max(0, net(['5']));
    const totalEmplois = emploisStables + aceVal + acheVal + atVal;

    const rs = creditNet(['10', '11', '12']) + creditNet(['16', '17']);
    const pce = creditNet(['40']);
    const pche = creditNet(['42', '43', '44', '47']);
    const totalRessources = rs + pce + pche;

    return {
      emplois: [
        { code: 'ES', libelle: 'Emplois stables', valeur: emploisStables, pourcentage: totalEmplois ? (emploisStables / totalEmplois) * 100 : 0 },
        { code: 'ACE', libelle: 'Actif circulant d\'exploitation', valeur: aceVal, pourcentage: totalEmplois ? (aceVal / totalEmplois) * 100 : 0 },
        { code: 'ACHE', libelle: 'Actif circulant hors exploitation', valeur: acheVal, pourcentage: totalEmplois ? (acheVal / totalEmplois) * 100 : 0 },
        { code: 'AT', libelle: 'Actif de trésorerie', valeur: atVal, pourcentage: totalEmplois ? (atVal / totalEmplois) * 100 : 0 },
      ],
      ressources: [
        { code: 'RS', libelle: 'Ressources stables', valeur: rs, pourcentage: totalRessources ? (rs / totalRessources) * 100 : 0 },
        { code: 'PCE', libelle: 'Passif circulant d\'exploitation', valeur: pce, pourcentage: totalRessources ? (pce / totalRessources) * 100 : 0 },
        { code: 'PCHE', libelle: 'Passif circulant hors exploitation', valeur: pche, pourcentage: totalRessources ? (pche / totalRessources) * 100 : 0 },
        { code: 'PT', libelle: 'Passif de trésorerie', valeur: 0, pourcentage: 0 },
      ],
    };
  }, [rawEntries]);

  // SIG
  const sigData = useMemo(() => {
    const ventesMarc = creditNet(['701']);
    const achatsMarc = net(['601']);
    const mc = ventesMarc - achatsMarc;
    const prodExercice = creditNet(['70', '71', '72', '73']);
    const va = mc + prodExercice - net(['60', '61', '62', '63']);
    const ebe = va + creditNet(['74']) - net(['66']) - net(['64']);
    const re = ebe - net(['68']) + creditNet(['75', '78', '79']) - net(['65']);
    const rc = re + creditNet(['77']) - net(['67']);
    const rn = rc - net(['89']);
    return [
      { libelle: 'Marge commerciale', exerciceN: mc, exerciceN1: 0, variation: '—' },
      { libelle: 'Production de l\'exercice', exerciceN: prodExercice, exerciceN1: 0, variation: '—' },
      { libelle: 'Valeur ajoutée', exerciceN: va, exerciceN1: 0, variation: '—' },
      { libelle: 'Excédent brut d\'exploitation', exerciceN: ebe, exerciceN1: 0, variation: '—' },
      { libelle: 'Résultat d\'exploitation', exerciceN: re, exerciceN1: 0, variation: '—' },
      { libelle: 'Résultat courant avant impôt', exerciceN: rc, exerciceN1: 0, variation: '—' },
      { libelle: 'Résultat net', exerciceN: rn, exerciceN1: 0, variation: '—' },
    ];
  }, [rawEntries]);

  // Flux de trésorerie
  const fluxTresorerieData = useMemo(() => {
    const rn = creditNet(['7']) - net(['6']);
    const dotAmort = net(['68']);
    return {
      activitesOperationnelles: [
        { code: 'FO1', libelle: 'Résultat net de l\'exercice', montant: rn },
        { code: 'FO2', libelle: 'Dotations aux amortissements', montant: dotAmort },
        { code: 'FO3', libelle: 'Dotations aux provisions', montant: net(['69']) },
        { code: 'FO4', libelle: 'Plus/moins-values de cessions', montant: 0 },
        { code: 'FO5', libelle: 'Variation des créances clients', montant: -net(['41']) },
        { code: 'FO6', libelle: 'Variation des stocks', montant: -net(['3']) },
        { code: 'FO7', libelle: 'Variation des dettes fournisseurs', montant: creditNet(['40']) },
        { code: 'FO8', libelle: 'Variation autres créances et dettes', montant: 0 },
      ],
      activitesInvestissement: [
        { code: 'FI1', libelle: 'Acquisitions d\'immobilisations corporelles', montant: -Math.max(0, net(['24', '245', '246', '247'])) },
        { code: 'FI2', libelle: 'Acquisitions d\'immobilisations incorporelles', montant: -Math.max(0, net(['21'])) },
        { code: 'FI3', libelle: 'Cessions d\'immobilisations', montant: 0 },
        { code: 'FI4', libelle: 'Acquisitions de participations', montant: -Math.max(0, net(['26'])) },
      ],
      activitesFinancement: [
        { code: 'FF1', libelle: 'Augmentation de capital', montant: creditNet(['10']) },
        { code: 'FF2', libelle: 'Nouveaux emprunts contractés', montant: creditNet(['16']) },
        { code: 'FF3', libelle: 'Remboursements d\'emprunts', montant: -net(['16']) },
        { code: 'FF4', libelle: 'Dividendes versés', montant: -net(['465']) },
        { code: 'FF5', libelle: 'Intérêts versés', montant: -net(['67']) },
      ],
    };
  }, [rawEntries]);

  // Tableau de Financement
  const tableauFinancementData = useMemo(() => {
    const caf = (creditNet(['7']) - net(['6'])) + net(['68']);
    return {
      emplois: [
        { code: 'TF1', libelle: 'Distributions mises en paiement', montant: net(['465']) },
        { code: 'TF2', libelle: 'Acquisitions d\'éléments de l\'actif immobilisé', montant: Math.max(0, net(['2']) + net(['28'])) },
        { code: 'TF3', libelle: 'Charges à répartir sur plusieurs exercices', montant: net(['20']) },
        { code: 'TF4', libelle: 'Réduction des capitaux propres', montant: 0 },
        { code: 'TF5', libelle: 'Remboursements de dettes financières', montant: net(['16']) > 0 ? net(['16']) : 0 },
      ],
      ressources: [
        { code: 'TF6', libelle: 'Capacité d\'autofinancement de l\'exercice', montant: caf },
        { code: 'TF7', libelle: 'Cessions ou réductions d\'éléments de l\'actif immobilisé', montant: 0 },
        { code: 'TF8', libelle: 'Augmentation des capitaux propres', montant: creditNet(['10']) },
        { code: 'TF9', libelle: 'Augmentation des dettes financières', montant: creditNet(['16']) },
      ],
      variationFdr: [
        { code: 'TF10', libelle: 'Variation du fonds de roulement net global', montant: caf - Math.max(0, net(['2']) + net(['28'])) },
      ],
    };
  }, [rawEntries]);

  // Ratios — computed from bilan/CR data
  const ratiosData = useMemo(() => {
    const totalActif = bilanData.actif.reduce((s, r) => s + r.exerciceN, 0);
    const cp = bilanData.passif.filter(r => ['10','11','12','13'].includes(r.code)).reduce((s, r) => s + r.exerciceN, 0);
    const emprunts = bilanData.passif.find(r => r.code === '16')?.exerciceN || 0;
    const detteCT = bilanData.passif.filter(r => ['40','42','43','44','47'].includes(r.code)).reduce((s, r) => s + r.exerciceN, 0);
    const actifCirculant = bilanData.actif.filter(r => ['31','32','41','46','50','52','53'].includes(r.code)).reduce((s, r) => s + r.exerciceN, 0);
    const creancesTreso = bilanData.actif.filter(r => ['41','50','52','53'].includes(r.code)).reduce((s, r) => s + r.exerciceN, 0);
    const treso = bilanData.actif.filter(r => ['52','53'].includes(r.code)).reduce((s, r) => s + r.exerciceN, 0);
    const ca = compteResultatData.produits.find(r => r.code === '70')?.exerciceN || 0;
    const rn = sigData[sigData.length - 1]?.exerciceN || 0;

    const safe = (a: number, b: number) => b === 0 ? 0 : a / b;

    return [
      {
        categorie: 'Ratios de Structure',
        ratios: [
          { nom: 'Ratio d\'autonomie financière', calcul: 'Capitaux propres / Total passif', valeur: safe(cp, totalActif), norme: '> 0.5', status: safe(cp, totalActif) > 0.5 ? 'bon' : 'moyen' },
          { nom: 'Ratio de financement des immobilisations', calcul: 'Capitaux permanents / Immobilisations', valeur: safe(cp + emprunts, bilanData.actif.slice(0, 7).reduce((s, r) => s + r.exerciceN, 0) || 1), norme: '> 1', status: 'moyen' },
          { nom: 'Ratio d\'endettement', calcul: 'Dettes / Capitaux propres', valeur: safe(emprunts, cp), norme: '< 1', status: safe(emprunts, cp) < 1 ? 'bon' : 'moyen' },
        ],
      },
      {
        categorie: 'Ratios de Liquidité',
        ratios: [
          { nom: 'Ratio de liquidité générale', calcul: 'Actif circulant / Dettes CT', valeur: safe(actifCirculant, detteCT), norme: '> 1.5', status: safe(actifCirculant, detteCT) > 1.5 ? 'bon' : 'moyen' },
          { nom: 'Ratio de liquidité réduite', calcul: '(Créances + Disponibilités) / Dettes CT', valeur: safe(creancesTreso, detteCT), norme: '> 1', status: safe(creancesTreso, detteCT) > 1 ? 'bon' : 'moyen' },
          { nom: 'Ratio de liquidité immédiate', calcul: 'Disponibilités / Dettes CT', valeur: safe(treso, detteCT), norme: '> 0.3', status: safe(treso, detteCT) > 0.3 ? 'excellent' : 'moyen' },
        ],
      },
      {
        categorie: 'Ratios de Rentabilité',
        ratios: [
          { nom: 'Rentabilité économique', calcul: 'Résultat net / Total actif', valeur: safe(rn, totalActif), norme: '> 0.05', status: safe(rn, totalActif) > 0.05 ? 'excellent' : 'moyen' },
          { nom: 'Rentabilité financière', calcul: 'Résultat net / Capitaux propres', valeur: safe(rn, cp), norme: '> 0.10', status: safe(rn, cp) > 0.10 ? 'excellent' : 'moyen' },
          { nom: 'Taux de marge nette', calcul: 'Résultat net / CA', valeur: safe(rn, ca), norme: '> 0.05', status: safe(rn, ca) > 0.05 ? 'excellent' : 'moyen' },
        ],
      },
    ];
  }, [bilanData, compteResultatData, sigData]);

  // TODO: wire to Dexie query for real transaction details
  const generateTransactionDetails = (_accountCode: string, _period: string, _amount: number) => {
    return [] as Array<{ id: string; date: string; reference: string; libelle: string; montant: number; tiers: string; piece: string }>;
  };

  const getTransactionLibelle = (_accountCode: string) => {
    return 'Transaction';
  };

  const getTiers = (_accountCode: string) => {
    return 'Tiers';
  };

  // Génération des sous-comptes pour un compte principal
  const generateSubAccounts = (mainAccountCode: string, amount: number) => {
    const subAccountsConfig = {
      '21': [
        { code: '211', libelle: 'Frais de développement', pourcentage: 0.4 },
        { code: '213', libelle: 'Brevets, licences, logiciels', pourcentage: 0.35 },
        { code: '218', libelle: 'Autres immobilisations incorporelles', pourcentage: 0.25 }
      ],
      '24': [
        { code: '241', libelle: 'Bâtiments industriels', pourcentage: 0.6 },
        { code: '242', libelle: 'Bâtiments commerciaux', pourcentage: 0.25 },
        { code: '248', libelle: 'Autres bâtiments', pourcentage: 0.15 }
      ],
      '245': [
        { code: '2451', libelle: 'Matériel industriel', pourcentage: 0.5 },
        { code: '2452', libelle: 'Matériel de transport', pourcentage: 0.3 },
        { code: '2458', libelle: 'Autres matériels', pourcentage: 0.2 }
      ],
      '31': [
        { code: '311', libelle: 'Marchandises A', pourcentage: 0.45 },
        { code: '312', libelle: 'Marchandises B', pourcentage: 0.35 },
        { code: '318', libelle: 'Autres marchandises', pourcentage: 0.2 }
      ],
      '41': [
        { code: '411', libelle: 'Clients ordinaires', pourcentage: 0.7 },
        { code: '413', libelle: 'Clients douteux', pourcentage: 0.15 },
        { code: '416', libelle: 'Clients créditeurs', pourcentage: 0.15 }
      ],
      '40': [
        { code: '401', libelle: 'Fournisseurs ordinaires', pourcentage: 0.8 },
        { code: '403', libelle: 'Fournisseurs d\'immobilisations', pourcentage: 0.15 },
        { code: '408', libelle: 'Fournisseurs factures non parvenues', pourcentage: 0.05 }
      ],
      '66': [
        { code: '661', libelle: 'Rémunérations directes', pourcentage: 0.65 },
        { code: '664', libelle: 'Charges sociales', pourcentage: 0.25 },
        { code: '668', libelle: 'Autres charges de personnel', pourcentage: 0.1 }
      ],
      '70': [
        { code: '701', libelle: 'Ventes produits finis', pourcentage: 0.6 },
        { code: '702', libelle: 'Ventes produits intermédiaires', pourcentage: 0.25 },
        { code: '708', libelle: 'Autres ventes', pourcentage: 0.15 }
      ]
    };

    const config = subAccountsConfig[mainAccountCode];
    if (!config) {
      return [
        { code: `${mainAccountCode}1`, libelle: `Sous-compte ${mainAccountCode}1`, montant: Math.round(amount * 0.6) },
        { code: `${mainAccountCode}2`, libelle: `Sous-compte ${mainAccountCode}2`, montant: Math.round(amount * 0.4) }
      ];
    }

    return config.map(sub => ({
      code: sub.code,
      libelle: sub.libelle,
      montant: Math.round(amount * sub.pourcentage)
    }));
  };

  // Fonction pour ouvrir la modal de détails
  const openDetailModal = (accountCode: string, accountName: string, period: string, amount: number) => {
    if (period === 'sous-comptes') {
      const subAccounts = generateSubAccounts(accountCode, amount);
      setSelectedDetail({
        type: 'sous-comptes',
        title: `Sous-comptes de ${accountCode} - ${accountName}`,
        data: subAccounts
      });
    } else {
      const transactions = generateTransactionDetails(accountCode, period, amount);
      setSelectedDetail({
        type: 'transactions',
        title: `Transactions ${accountCode} - ${accountName} (${period})`,
        data: transactions,
        total: amount
      });
    }
    setSelectedPeriod(period);
    setSelectedAccount(accountCode);
    setIsModalOpen(true);
  };

  // Fonction pour fermer la modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDetail(null);
    setSelectedPeriod('');
    setSelectedAccount('');
  };

  return (
    <div className="min-h-screen bg-[#e5e5e5] ">
      <PrintableArea
        ref={printRef}
        orientation="landscape"
        pageSize="A4"
        showPrintButton={false}
        headerContent={
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">États Financiers SYSCOHADA</h2>
            <p className="text-sm text-gray-600">{tabs.find(t => t.id === activeTab)?.label || 'Bilan'}</p>
          </div>
        }
      >
      {/* En-tête */}
      <div className="bg-white border-b border-[#e5e5e5] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/financial-analysis-advanced')}
              className="flex items-center space-x-2 px-4 py-2 text-[#737373] hover:text-[#525252] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Retour à l'analyse financière</span>
            </button>
            <div className="h-6 w-px bg-[#e5e5e5]" />
            <div>
              <h1 className="text-lg font-bold text-[#171717]">États Financiers SYSCOHADA</h1>
              <p className="text-sm text-[#737373]">Présentation normalisée selon le référentiel SYSCOHADA</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="px-4 py-2 border border-[#d4d4d4] rounded-lg text-sm focus:ring-2 focus:ring-[#525252]/20"
            >
              <option value="current">Exercice 2024</option>
              <option value="previous">Exercice 2023</option>
              <option value="comparison">Comparaison</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm">
        <div className="px-6 border-b border-[#e5e5e5]">
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
                      ? 'border-[#525252] text-[#525252]'
                      : 'border-transparent text-[#737373] hover:text-[#404040]'
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
          {/* BILAN SYSCOHADA */}
          {activeTab === 'bilan' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#171717] mb-2">BILAN SYSCOHADA</h2>
                <p className="text-[#737373]">Exercice du 01/01/2024 au 31/12/2024</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ACTIF */}
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5]">
                  <h3 className="text-lg font-bold text-[#171717] mb-4 text-center">ACTIF</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#e5e5e5]">
                          <th className="text-left p-2 text-[#171717]">Réf</th>
                          <th className="text-left p-2 text-[#171717]">{t('accounting.label')}</th>
                          <th className="text-right p-2 text-[#171717]">N</th>
                          <th className="text-right p-2 text-[#171717]">N-1</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-gray-50">
                          <td className="p-2 font-bold">AD</td>
                          <td className="p-2 font-bold">ACTIF IMMOBILISE</td>
                          <td className="p-2 text-right font-bold">9 620 000</td>
                          <td className="p-2 text-right font-bold">9 380 000</td>
                        </tr>
                        {bilanData.actif.slice(0, 7).map((item, index) => (
                          <tr key={index} className="border-b border-[#e5e5e5] hover:bg-gray-50">
                            <td className="p-2 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.exerciceN)}
                                  className="p-1 hover:bg-[#525252] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-2">{item.libelle}</td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.exerciceN)}
                              title="Cliquer pour voir les transactions de l'exercice N"
                            >
                              {formatCurrency(item.exerciceN)}
                            </td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN1', item.exerciceN1)}
                              title="Cliquer pour voir les transactions de l'exercice N-1"
                            >
                              {formatCurrency(item.exerciceN1)}
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-gray-50">
                          <td className="p-2 font-bold">AE</td>
                          <td className="p-2 font-bold">ACTIF CIRCULANT</td>
                          <td className="p-2 text-right font-bold">3 455 000</td>
                          <td className="p-2 text-right font-bold">3 085 000</td>
                        </tr>
                        {bilanData.actif.slice(7).map((item, index) => (
                          <tr key={index} className="border-b border-[#e5e5e5] hover:bg-gray-50">
                            <td className="p-2 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.exerciceN)}
                                  className="p-1 hover:bg-[#525252] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-2">{item.libelle}</td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.exerciceN)}
                              title="Cliquer pour voir les transactions de l'exercice N"
                            >
                              {formatCurrency(item.exerciceN)}
                            </td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN1', item.exerciceN1)}
                              title="Cliquer pour voir les transactions de l'exercice N-1"
                            >
                              {formatCurrency(item.exerciceN1)}
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-gray-100 font-bold">
                          <td className="p-3">TA</td>
                          <td className="p-3">TOTAL ACTIF</td>
                          <td className="p-3 text-right text-lg">13 075 000</td>
                          <td className="p-3 text-right text-lg">12 465 000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PASSIF */}
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5]">
                  <h3 className="text-lg font-bold text-[#171717] mb-4 text-center">PASSIF</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#e5e5e5]">
                          <th className="text-left p-2 text-[#171717]">Réf</th>
                          <th className="text-left p-2 text-[#171717]">{t('accounting.label')}</th>
                          <th className="text-right p-2 text-[#171717]">N</th>
                          <th className="text-right p-2 text-[#171717]">N-1</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-gray-50">
                          <td className="p-2 font-bold">CP</td>
                          <td className="p-2 font-bold">CAPITAUX PROPRES</td>
                          <td className="p-2 text-right font-bold">8 850 000</td>
                          <td className="p-2 text-right font-bold">8 250 000</td>
                        </tr>
                        {bilanData.passif.slice(0, 4).map((item, index) => (
                          <tr key={index} className="border-b border-[#e5e5e5] hover:bg-gray-50">
                            <td className="p-2 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.exerciceN)}
                                  className="p-1 hover:bg-[#525252] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-2">{item.libelle}</td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.exerciceN)}
                              title="Cliquer pour voir les transactions de l'exercice N"
                            >
                              {formatCurrency(item.exerciceN)}
                            </td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN1', item.exerciceN1)}
                              title="Cliquer pour voir les transactions de l'exercice N-1"
                            >
                              {formatCurrency(item.exerciceN1)}
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-gray-50">
                          <td className="p-2 font-bold">DT</td>
                          <td className="p-2 font-bold">DETTES</td>
                          <td className="p-2 text-right font-bold">4 225 000</td>
                          <td className="p-2 text-right font-bold">4 215 000</td>
                        </tr>
                        {bilanData.passif.slice(4).map((item, index) => (
                          <tr key={index} className="border-b border-[#e5e5e5] hover:bg-gray-50">
                            <td className="p-2 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.exerciceN)}
                                  className="p-1 hover:bg-[#525252] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-2">{item.libelle}</td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.exerciceN)}
                              title="Cliquer pour voir les transactions de l'exercice N"
                            >
                              {formatCurrency(item.exerciceN)}
                            </td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN1', item.exerciceN1)}
                              title="Cliquer pour voir les transactions de l'exercice N-1"
                            >
                              {formatCurrency(item.exerciceN1)}
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-gray-100 font-bold">
                          <td className="p-3">TP</td>
                          <td className="p-3">TOTAL PASSIF</td>
                          <td className="p-3 text-right text-lg">13 075 000</td>
                          <td className="p-3 text-right text-lg">12 465 000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPTE DE RESULTAT */}
          {activeTab === 'compte-resultat' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#171717] mb-2">COMPTE DE RÉSULTAT SYSCOHADA</h2>
                <p className="text-[#737373]">Exercice du 01/01/2024 au 31/12/2024</p>
              </div>

              <div className="space-y-8">
                {/* PRODUITS EN HAUT */}
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5]">
                  <h3 className="text-lg font-bold text-[#171717] mb-4 text-center">PRODUITS</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-[#e5e5e5]">
                          <th className="text-left p-3 text-[#171717] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#171717] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[#171717] font-semibold">Exercice N</th>
                          <th className="text-right p-3 text-[#171717] font-semibold">Exercice N-1</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compteResultatData.produits.map((item, index) => (
                          <tr key={index} className="border-b border-[#e5e5e5]">
                            <td className="p-3 text-[#404040]">{item.code}</td>
                            <td className="p-3 text-[#404040]">{item.libelle}</td>
                            <td className="p-3 text-right font-mono text-[#171717]">{formatCurrency(item.exerciceN)}</td>
                            <td className="p-3 text-right font-mono text-[#171717]">{formatCurrency(item.exerciceN1)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#e5e5e5] bg-gray-50">
                          <td className="p-3 font-bold text-[#171717]">TP</td>
                          <td className="p-3 font-bold text-[#171717]">TOTAL PRODUITS</td>
                          <td className="p-3 text-right text-lg font-bold text-[#171717]">11 620 000</td>
                          <td className="p-3 text-right text-lg font-bold text-[#171717]">10 685 000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CHARGES EN BAS */}
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5]">
                  <h3 className="text-lg font-bold text-[#171717] mb-4 text-center">CHARGES</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-[#e5e5e5]">
                          <th className="text-left p-3 text-[#171717] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#171717] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[#171717] font-semibold">Exercice N</th>
                          <th className="text-right p-3 text-[#171717] font-semibold">Exercice N-1</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compteResultatData.charges.map((item, index) => (
                          <tr key={index} className="border-b border-[#e5e5e5]">
                            <td className="p-3 text-[#404040]">{item.code}</td>
                            <td className="p-3 text-[#404040]">{item.libelle}</td>
                            <td className="p-3 text-right font-mono text-[#171717]">{formatCurrency(item.exerciceN)}</td>
                            <td className="p-3 text-right font-mono text-[#171717]">{formatCurrency(item.exerciceN1)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#e5e5e5] bg-gray-50">
                          <td className="p-3 font-bold text-[#171717]">TC</td>
                          <td className="p-3 font-bold text-[#171717]">TOTAL CHARGES</td>
                          <td className="p-3 text-right text-lg font-bold text-[#171717]">10 480 000</td>
                          <td className="p-3 text-right text-lg font-bold text-[#171717]">9 750 000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RÉSULTAT NET */}
                <div className="bg-white rounded-lg p-6 border-2 border-[#e5e5e5] text-center">
                  <h3 className="text-lg font-bold text-[#171717] mb-4">RÉSULTAT NET DE L'EXERCICE</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 border border-[#e5e5e5] rounded">
                      <p className="text-[#737373] font-medium mb-2">Exercice N</p>
                      <p className="text-lg font-bold text-[#171717]">1 140 000 €</p>
                      <p className="text-sm text-[#737373] mt-1">(Bénéfice)</p>
                    </div>
                    <div className="p-4 border border-[#e5e5e5] rounded">
                      <p className="text-[#737373] font-medium mb-2">Exercice N-1</p>
                      <p className="text-lg font-bold text-[#171717]">935 000 €</p>
                      <p className="text-sm text-[#737373] mt-1">(Bénéfice)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BILAN FONCTIONNEL */}
          {activeTab === 'bilan-fonctionnel' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#171717] mb-2">BILAN FONCTIONNEL</h2>
                <p className="text-[#737373]">Analyse par fonction économique</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* EMPLOIS */}
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5]">
                  <h3 className="text-lg font-bold text-[#171717] mb-4 text-center">EMPLOIS</h3>
                  <div className="space-y-3">
                    {bilanFonctionnelData.emplois.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border border-[#e5e5e5] rounded hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-[#525252] font-medium text-sm">{item.code}</span>
                            <button
                              onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.valeur)}
                              className="p-1 hover:bg-[#525252] hover:text-white rounded transition-colors"
                              title={`Voir les sous-comptes de ${item.code}`}
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-medium">{item.libelle}</span>
                        </div>
                        <div className="text-right">
                          <div
                            className="font-mono font-bold hover:bg-blue-50 cursor-pointer px-2 py-1 rounded"
                            onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.valeur)}
                            title="Cliquer pour voir les transactions"
                          >
                            {formatCurrency(item.valeur)}
                          </div>
                          <div className="text-sm text-[#737373]">{item.pourcentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RESSOURCES */}
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5]">
                  <h3 className="text-lg font-bold text-[#171717] mb-4 text-center">RESSOURCES</h3>
                  <div className="space-y-3">
                    {bilanFonctionnelData.ressources.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border border-[#e5e5e5] rounded hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-[#525252] font-medium text-sm">{item.code}</span>
                            <button
                              onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.valeur)}
                              className="p-1 hover:bg-[#525252] hover:text-white rounded transition-colors"
                              title={`Voir les sous-comptes de ${item.code}`}
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-medium">{item.libelle}</span>
                        </div>
                        <div className="text-right">
                          <div
                            className="font-mono font-bold hover:bg-blue-50 cursor-pointer px-2 py-1 rounded"
                            onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.valeur)}
                            title="Cliquer pour voir les transactions"
                          >
                            {formatCurrency(item.valeur)}
                          </div>
                          <div className="text-sm text-[#737373]">{item.pourcentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Indicateurs de l'équilibre financier */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5]">
                <h3 className="text-lg font-bold text-[#171717] mb-4">Indicateurs de l'Équilibre Financier</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border border-[#e5e5e5] rounded text-center">
                    <h4 className="font-semibold text-[#171717] mb-2">Fonds de Roulement Net Global</h4>
                    <p className="text-lg font-bold text-[#171717]">770 000 €</p>
                    <p className="text-sm text-[#737373]">Ressources stables - Emplois stables</p>
                  </div>
                  <div className="p-4 border border-[#e5e5e5] rounded text-center">
                    <h4 className="font-semibold text-[#171717] mb-2">Besoin en Fonds de Roulement</h4>
                    <p className="text-lg font-bold text-[#171717]">1 265 000 €</p>
                    <p className="text-sm text-[#737373]">AC exploitation - PC exploitation</p>
                  </div>
                  <div className="p-4 border border-[#e5e5e5] rounded text-center">
                    <h4 className="font-semibold text-[#171717] mb-2">Trésorerie Nette</h4>
                    <p className="text-lg font-bold text-red-600">-495 000 €</p>
                    <p className="text-sm text-[#737373]">FRNG - BFR</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SIG - SOLDES INTERMÉDIAIRES DE GESTION */}
          {activeTab === 'sig' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#171717] mb-2">SOLDES INTERMÉDIAIRES DE GESTION</h2>
                <p className="text-[#737373]">Analyse de la formation du résultat</p>
              </div>

              <div className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4">Soldes intermédiaires</th>
                      <th className="text-right p-4">Exercice N</th>
                      <th className="text-right p-4">Exercice N-1</th>
                      <th className="text-right p-4">Variation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sigData.map((sig, index) => (
                      <tr key={index} className={`border-b border-[#e5e5e5] ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="p-4 font-medium text-[#171717]">{sig.libelle}</td>
                        <td className="p-4 text-right font-mono text-[#171717]">{formatCurrency(sig.exerciceN)}</td>
                        <td className="p-4 text-right font-mono text-[#737373]">{formatCurrency(sig.exerciceN1)}</td>
                        <td className={`p-4 text-right font-medium ${sig.variation.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                          {sig.variation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
                  <h4 className="font-bold text-[#171717] mb-2">Taux de marge commerciale</h4>
                  <p className="text-lg font-bold text-[#171717]">38.8%</p>
                  <p className="text-sm text-[#737373]">Marge / CA marchandises</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
                  <h4 className="font-bold text-[#171717] mb-2">Taux de valeur ajoutée</h4>
                  <p className="text-lg font-bold text-[#171717]">38.6%</p>
                  <p className="text-sm text-[#737373]">VA / Production</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
                  <h4 className="font-bold text-[#171717] mb-2">Taux de rentabilité</h4>
                  <p className="text-lg font-bold text-[#171717]">4.1%</p>
                  <p className="text-sm text-[#737373]">Résultat / CA total</p>
                </div>
              </div>
            </div>
          )}

          {/* RATIOS FINANCIERS */}
          {activeTab === 'ratios' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#171717] mb-2">RATIOS FINANCIERS</h2>
                <p className="text-[#737373]">Analyse de la situation financière</p>
              </div>

              {ratiosData.map((categorie, catIndex) => (
                <div key={catIndex} className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden">
                  <div className="bg-gray-50 p-4">
                    <h3 className="text-lg font-bold text-[#171717]">{categorie.categorie}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-4">Ratio</th>
                          <th className="text-left p-4">Mode de calcul</th>
                          <th className="text-right p-4">Valeur</th>
                          <th className="text-center p-4">Norme</th>
                          <th className="text-center p-4">Appréciation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categorie.ratios.map((ratio, ratioIndex) => (
                          <tr key={ratioIndex} className="border-b border-[#e5e5e5]">
                            <td className="p-4 font-medium text-[#171717]">{ratio.nom}</td>
                            <td className="p-4 text-[#737373] text-sm">{ratio.calcul}</td>
                            <td className="p-4 text-right font-mono text-[#171717]">
                              {ratio.valeur < 1 ? ratio.valeur.toFixed(3) : ratio.valeur.toFixed(2)}
                            </td>
                            <td className="p-4 text-center text-[#737373]">{ratio.norme}</td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                ratio.status === 'excellent' ? 'bg-green-100 text-green-800' :
                                ratio.status === 'bon' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {ratio.status === 'excellent' ? 'Excellent' :
                                 ratio.status === 'bon' ? 'Bon' : 'Moyen'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TABLEAU DE FINANCEMENT */}
          {activeTab === 'tableau-financement' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#171717] mb-2">TABLEAU DE FINANCEMENT SYSCOHADA</h2>
                <p className="text-[#737373]">Analyse des ressources et emplois de fonds</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* EMPLOIS */}
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5]">
                  <h3 className="text-lg font-bold text-[#171717] mb-4 text-center">EMPLOIS</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#e5e5e5]">
                          <th className="text-left p-3 text-[#171717] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#171717] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[#171717] font-semibold">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableauFinancementData.emplois.map((item, index) => (
                          <tr key={index} className="border-b border-[#e5e5e5] hover:bg-gray-50">
                            <td className="p-3 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.montant)}
                                  className="p-1 hover:bg-[#525252] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#404040]">{item.libelle}</td>
                            <td
                              className="p-3 text-right font-mono text-[#171717] hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.montant)}
                              title="Cliquer pour voir les transactions"
                            >
                              {formatCurrency(item.montant)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#e5e5e5] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[#171717]">TOTAL EMPLOIS</td>
                          <td className="p-3 text-right text-lg font-bold text-[#171717]">1 600 000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RESSOURCES */}
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5]">
                  <h3 className="text-lg font-bold text-[#171717] mb-4 text-center">RESSOURCES</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#e5e5e5]">
                          <th className="text-left p-3 text-[#171717] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#171717] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[#171717] font-semibold">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableauFinancementData.ressources.map((item, index) => (
                          <tr key={index} className="border-b border-[#e5e5e5] hover:bg-gray-50">
                            <td className="p-3 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.montant)}
                                  className="p-1 hover:bg-[#525252] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#404040]">{item.libelle}</td>
                            <td
                              className="p-3 text-right font-mono text-[#171717] hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.montant)}
                              title="Cliquer pour voir les transactions"
                            >
                              {formatCurrency(item.montant)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#e5e5e5] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[#171717]">TOTAL RESSOURCES</td>
                          <td className="p-3 text-right text-lg font-bold text-[#171717]">1 725 000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Variation du Fonds de Roulement */}
              <div className="bg-white rounded-lg p-6 border-2 border-[#e5e5e5] text-center">
                <h3 className="text-lg font-bold text-[#171717] mb-4">VARIATION DU FONDS DE ROULEMENT NET GLOBAL</h3>
                <div className="flex justify-center">
                  <div className="p-6 border border-[#e5e5e5] rounded-lg">
                    <p className="text-[#737373] font-medium mb-2">Ressources - Emplois</p>
                    <p className="text-lg font-bold text-[#171717]">+125 000 €</p>
                    <p className="text-sm text-[#737373] mt-2">Augmentation du fonds de roulement</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TABLEAU DE FLUX DE TRÉSORERIE */}
          {activeTab === 'flux-tresorerie' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#171717] mb-2">TABLEAU DE FLUX DE TRÉSORERIE</h2>
                <p className="text-[#737373]">Flux de trésorerie par activité selon SYSCOHADA</p>
              </div>

              <div className="space-y-6">
                {/* ACTIVITÉS OPÉRATIONNELLES */}
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5]">
                  <h3 className="text-lg font-bold text-[#171717] mb-4">FLUX DE TRÉSORERIE DES ACTIVITÉS OPÉRATIONNELLES</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#e5e5e5]">
                          <th className="text-left p-3 text-[#171717] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#171717] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[#171717] font-semibold">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fluxTresorerieData.activitesOperationnelles.map((item, index) => (
                          <tr key={index} className="border-b border-[#e5e5e5] hover:bg-gray-50">
                            <td className="p-3 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', Math.abs(item.montant))}
                                  className="p-1 hover:bg-[#525252] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#404040]">{item.libelle}</td>
                            <td
                              className={`p-3 text-right font-mono hover:bg-blue-50 cursor-pointer ${item.montant >= 0 ? 'text-[#171717]' : 'text-red-600'}`}
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', Math.abs(item.montant))}
                              title="Cliquer pour voir les transactions"
                            >
                              {item.montant >= 0 ? '' : '('}{formatCurrency(Math.abs(item.montant))}{item.montant >= 0 ? '' : ')'}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#e5e5e5] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[#171717]">FLUX NET DE TRÉSORERIE DES ACTIVITÉS OPÉRATIONNELLES</td>
                          <td className="p-3 text-right text-lg font-bold text-[#171717]">1 660 000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ACTIVITÉS D'INVESTISSEMENT */}
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5]">
                  <h3 className="text-lg font-bold text-[#171717] mb-4">FLUX DE TRÉSORERIE DES ACTIVITÉS D'INVESTISSEMENT</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#e5e5e5]">
                          <th className="text-left p-3 text-[#171717] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#171717] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[#171717] font-semibold">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fluxTresorerieData.activitesInvestissement.map((item, index) => (
                          <tr key={index} className="border-b border-[#e5e5e5] hover:bg-gray-50">
                            <td className="p-3 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', Math.abs(item.montant))}
                                  className="p-1 hover:bg-[#525252] hover:text-white rounded transition-colors"
                                  title={`Voir les sous-comptes de ${item.code}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#404040]">{item.libelle}</td>
                            <td
                              className={`p-3 text-right font-mono hover:bg-blue-50 cursor-pointer ${item.montant >= 0 ? 'text-[#171717]' : 'text-red-600'}`}
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', Math.abs(item.montant))}
                              title="Cliquer pour voir les transactions"
                            >
                              {item.montant >= 0 ? '' : '('}{formatCurrency(Math.abs(item.montant))}{item.montant >= 0 ? '' : ')'}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#e5e5e5] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[#171717]">FLUX NET DE TRÉSORERIE DES ACTIVITÉS D'INVESTISSEMENT</td>
                          <td className="p-3 text-right text-lg font-bold text-red-600">(1 095 000)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ACTIVITÉS DE FINANCEMENT */}
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5]">
                  <h3 className="text-lg font-bold text-[#171717] mb-4">FLUX DE TRÉSORERIE DES ACTIVITÉS DE FINANCEMENT</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#e5e5e5]">
                          <th className="text-left p-3 text-[#171717] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[#171717] font-semibold">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fluxTresorerieData.activitesFinancement.map((item, index) => (
                          <tr key={index} className="border-b border-[#e5e5e5]">
                            <td className="p-3 text-[#404040]">{item.libelle}</td>
                            <td className={`p-3 text-right font-mono ${item.montant >= 0 ? 'text-[#171717]' : 'text-red-600'}`}>
                              {item.montant >= 0 ? '' : '('}{formatCurrency(Math.abs(item.montant))}{item.montant >= 0 ? '' : ')'}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#e5e5e5] bg-gray-50">
                          <td className="p-3 font-bold text-[#171717]">FLUX NET DE TRÉSORERIE DES ACTIVITÉS DE FINANCEMENT</td>
                          <td className="p-3 text-right text-lg font-bold text-red-600">(280 000)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* VARIATION NETTE DE TRÉSORERIE */}
                <div className="bg-white rounded-lg p-6 border-2 border-[#e5e5e5]">
                  <h3 className="text-lg font-bold text-[#171717] mb-4 text-center">VARIATION NETTE DE LA TRÉSORERIE</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 border border-[#e5e5e5] rounded">
                      <p className="text-[#737373] font-medium mb-2">Trésorerie début d'exercice</p>
                      <p className="text-lg font-bold text-[#171717]">600 000 €</p>
                    </div>
                    <div className="p-4 border border-[#e5e5e5] rounded">
                      <p className="text-[#737373] font-medium mb-2">Variation nette</p>
                      <p className="text-lg font-bold text-[#171717]">+285 000 €</p>
                    </div>
                    <div className="p-4 border border-[#e5e5e5] rounded">
                      <p className="text-[#737373] font-medium mb-2">Trésorerie fin d'exercice</p>
                      <p className="text-lg font-bold text-[#171717]">885 000 €</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[#171717] mb-2">EXPORT DES ÉTATS FINANCIERS</h2>
                <p className="text-[#737373]">Téléchargement et impression des documents</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tabs.slice(0, -1).map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <div key={tab.id} className="bg-white rounded-lg p-6 border border-[#e5e5e5] hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[#525252]/10 flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-[#525252]" />
                        </div>
                        <h3 className="font-semibold text-[#171717]">{tab.label}</h3>
                      </div>
                      <div className="space-y-3">
                        <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-[#525252] text-white rounded-lg hover:bg-[#404040] transition-colors">
                          <Download className="w-4 h-4" />
                          <span>PDF</span>
                        </button>
                        <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-[#e5e5e5] text-[#404040] rounded-lg hover:bg-gray-50 transition-colors">
                          <FileText className="w-4 h-4" />
                          <span>Excel</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5]">
                <h3 className="text-lg font-bold text-[#171717] mb-4">Export Complet</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-[#525252] text-white rounded-lg hover:bg-[#404040] transition-colors">
                    <Download className="w-5 h-5" />
                    <span>Télécharger tous les états (PDF)</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 border border-[#e5e5e5] text-[#404040] rounded-lg hover:bg-gray-50 transition-colors">
                    <FileText className="w-5 h-5" />
                    <span>Télécharger tous les états (Excel)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de détails */}
      {isModalOpen && selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#e5e5e5]">
              <h2 className="text-lg font-bold text-[#171717]">{selectedDetail.title}</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Fermer">
                <X className="w-5 h-5 text-[#737373]" />
              </button>
            </div>

            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              {selectedDetail.type === 'sous-comptes' ? (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-[#171717] mb-2">Détail des sous-comptes</h3>
                    <p className="text-[#737373] text-sm">Répartition par sous-compte selon le plan SYSCOHADA</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 border-b border-[#e5e5e5]">Code</th>
                          <th className="text-left p-3 border-b border-[#e5e5e5]">{t('accounting.label')}</th>
                          <th className="text-right p-3 border-b border-[#e5e5e5]">Montant</th>
                          <th className="text-center p-3 border-b border-[#e5e5e5]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetail.data.map((subAccount: Record<string, unknown>, index: number) => (
                          <tr key={index} className="border-b border-[#e5e5e5] hover:bg-gray-50">
                            <td className="p-3 font-medium text-[#525252]">{subAccount.code}</td>
                            <td className="p-3 text-[#171717]">{subAccount.libelle}</td>
                            <td className="p-3 text-right font-mono">{formatCurrency(subAccount.montant)}</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => openDetailModal(subAccount.code, subAccount.libelle, selectedPeriod, subAccount.montant)}
                                className="text-[#525252] hover:text-[#404040] p-1 rounded"
                                title="Voir les transactions"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-[#171717] mb-2">Détail des transactions</h3>
                    <div className="flex justify-between items-center">
                      <p className="text-[#737373] text-sm">Liste des écritures comptables</p>
                      <p className="text-sm font-semibold text-[#525252]">
                        Total: {formatCurrency(selectedDetail.total)}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 border-b border-[#e5e5e5]">{t('common.date')}</th>
                          <th className="text-left p-3 border-b border-[#e5e5e5]">Référence</th>
                          <th className="text-left p-3 border-b border-[#e5e5e5]">{t('accounting.label')}</th>
                          <th className="text-left p-3 border-b border-[#e5e5e5]">Tiers</th>
                          <th className="text-right p-3 border-b border-[#e5e5e5]">Montant</th>
                          <th className="text-left p-3 border-b border-[#e5e5e5]">{t('accounting.piece')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetail.data.map((transaction: Record<string, unknown>, index: number) => (
                          <tr key={index} className="border-b border-[#e5e5e5] hover:bg-gray-50">
                            <td className="p-3 text-[#737373]">{transaction.date}</td>
                            <td className="p-3 font-medium text-[#525252]">{transaction.reference}</td>
                            <td className="p-3 text-[#171717]">{transaction.libelle}</td>
                            <td className="p-3 text-[#737373] text-xs">{transaction.tiers}</td>
                            <td className="p-3 text-right font-mono text-[#171717]">{formatCurrency(transaction.montant)}</td>
                            <td className="p-3 text-[#737373] text-xs">{transaction.piece}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PrintableArea>
  </div>
  );
};

export default BilanSYSCOHADAPage;