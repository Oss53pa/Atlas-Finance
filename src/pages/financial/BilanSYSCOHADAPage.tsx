import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  Building2, TrendingUp, BarChart3, Download, ArrowLeft, Home,
  DollarSign, Target, Activity, FileText, Calculator, PieChart,
  ArrowUpRight, Eye, Filter, RefreshCw, ChevronRight, X
} from 'lucide-react';
import PrintableArea from '../../components/ui/PrintableArea';
import { usePrintReport } from '../../hooks/usePrint';

const BilanSYSCOHADAPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bilan');
  const [periode, setPeriode] = useState('current');

  // États pour la modal de détails
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
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

  // Données Bilan SYSCOHADA
  const bilanData = {
    actif: [
      { code: '20', libelle: 'Charges immobilisées', exerciceN: 150000, exerciceN1: 120000 },
      { code: '21', libelle: 'Immobilisations incorporelles', exerciceN: 850000, exerciceN1: 750000 },
      { code: '22/23', libelle: 'Terrains', exerciceN: 2500000, exerciceN1: 2500000 },
      { code: '24', libelle: 'Bâtiments', exerciceN: 3200000, exerciceN1: 3400000 },
      { code: '245', libelle: 'Matériel et outillage', exerciceN: 1850000, exerciceN1: 1650000 },
      { code: '246', libelle: 'Matériel de transport', exerciceN: 650000, exerciceN1: 580000 },
      { code: '247', libelle: 'Matériel et mobilier', exerciceN: 420000, exerciceN1: 380000 },
      { code: '31', libelle: 'Stocks de marchandises', exerciceN: 680000, exerciceN1: 620000 },
      { code: '32', libelle: 'Stocks de matières premières', exerciceN: 450000, exerciceN1: 420000 },
      { code: '41', libelle: 'Clients et comptes rattachés', exerciceN: 1250000, exerciceN1: 1100000 },
      { code: '46', libelle: 'Débiteurs divers', exerciceN: 180000, exerciceN1: 160000 },
      { code: '50', libelle: 'Valeurs mobilières de placement', exerciceN: 350000, exerciceN1: 300000 },
      { code: '52', libelle: 'Banques', exerciceN: 890000, exerciceN1: 750000 },
      { code: '53', libelle: 'Caisses', exerciceN: 45000, exerciceN1: 35000 }
    ],
    passif: [
      { code: '10', libelle: 'Capital social', exerciceN: 5000000, exerciceN1: 5000000 },
      { code: '11', libelle: 'Réserves', exerciceN: 2850000, exerciceN1: 2450000 },
      { code: '12', libelle: 'Report à nouveau', exerciceN: 320000, exerciceN1: 180000 },
      { code: '13', libelle: 'Résultat de l\'exercice', exerciceN: 680000, exerciceN1: 620000 },
      { code: '16', libelle: 'Emprunts et dettes financières', exerciceN: 2800000, exerciceN1: 3200000 },
      { code: '40', libelle: 'Fournisseurs et comptes rattachés', exerciceN: 950000, exerciceN1: 850000 },
      { code: '42', libelle: 'Personnel', exerciceN: 180000, exerciceN1: 160000 },
      { code: '43', libelle: 'Organismes sociaux', exerciceN: 120000, exerciceN1: 110000 },
      { code: '44', libelle: 'État et collectivités', exerciceN: 265000, exerciceN1: 235000 },
      { code: '47', libelle: 'Créditeurs divers', exerciceN: 300000, exerciceN1: 280000 }
    ]
  };

  // Données Compte de Résultat SYSCOHADA
  const compteResultatData = {
    produits: [
      { code: '70', libelle: 'Ventes de marchandises', exerciceN: 8500000, exerciceN1: 7800000 },
      { code: '72', libelle: 'Production vendue', exerciceN: 2400000, exerciceN1: 2200000 },
      { code: '74', libelle: 'Subventions d\'exploitation', exerciceN: 150000, exerciceN1: 120000 },
      { code: '75', libelle: 'Autres produits de gestion', exerciceN: 280000, exerciceN1: 250000 },
      { code: '77', libelle: 'Revenus financiers', exerciceN: 190000, exerciceN1: 215000 },
      { code: '78', libelle: 'Reprises de provisions', exerciceN: 100000, exerciceN1: 100000 }
    ],
    charges: [
      { code: '60', libelle: 'Achats de marchandises', exerciceN: 5200000, exerciceN1: 4800000 },
      { code: '61', libelle: 'Transports', exerciceN: 380000, exerciceN1: 350000 },
      { code: '62', libelle: 'Services extérieurs A', exerciceN: 420000, exerciceN1: 390000 },
      { code: '63', libelle: 'Services extérieurs B', exerciceN: 520000, exerciceN1: 480000 },
      { code: '64', libelle: 'Impôts et taxes', exerciceN: 280000, exerciceN1: 260000 },
      { code: '66', libelle: 'Charges de personnel', exerciceN: 2850000, exerciceN1: 2650000 },
      { code: '68', libelle: 'Dotations aux amortissements', exerciceN: 650000, exerciceN1: 620000 },
      { code: '67', libelle: 'Charges financières', exerciceN: 180000, exerciceN1: 200000 }
    ]
  };

  // Données Bilan Fonctionnel
  const bilanFonctionnelData = {
    emplois: [
      { code: 'ES', libelle: 'Emplois stables', valeur: 9620000, pourcentage: 73.6 },
      { code: 'ACE', libelle: 'Actif circulant d\'exploitation', valeur: 2480000, pourcentage: 19.0 },
      { code: 'ACHE', libelle: 'Actif circulant hors exploitation', valeur: 520000, pourcentage: 4.0 },
      { code: 'AT', libelle: 'Actif de trésorerie', valeur: 455000, pourcentage: 3.4 }
    ],
    ressources: [
      { code: 'RS', libelle: 'Ressources stables', valeur: 8850000, pourcentage: 67.7 },
      { code: 'PCE', libelle: 'Passif circulant d\'exploitation', valeur: 1350000, pourcentage: 10.3 },
      { code: 'PCHE', libelle: 'Passif circulant hors exploitation', valeur: 385000, pourcentage: 2.9 },
      { code: 'PT', libelle: 'Passif de trésorerie', valeur: 2490000, pourcentage: 19.1 }
    ]
  };

  // Données SIG
  const sigData = [
    { libelle: 'Marge commerciale', exerciceN: 3300000, exerciceN1: 3000000, variation: '+10.0%' },
    { libelle: 'Production de l\'exercice', exerciceN: 2400000, exerciceN1: 2200000, variation: '+9.1%' },
    { libelle: 'Valeur ajoutée', exerciceN: 4180000, exerciceN1: 3820000, variation: '+9.4%' },
    { libelle: 'Excédent brut d\'exploitation', exerciceN: 1050000, exerciceN1: 910000, variation: '+15.4%' },
    { libelle: 'Résultat d\'exploitation', exerciceN: 400000, exerciceN1: 290000, variation: '+37.9%' },
    { libelle: 'Résultat courant avant impôt', exerciceN: 410000, exerciceN1: 305000, variation: '+34.4%' },
    { libelle: 'Résultat net', exerciceN: 1140000, exerciceN1: 935000, variation: '+21.9%' }
  ];

  // Données Tableau de Flux de Trésorerie SYSCOHADA
  const fluxTresorerieData = {
    activitesOperationnelles: [
      { code: 'FO1', libelle: 'Résultat net de l\'exercice', montant: 1140000 },
      { code: 'FO2', libelle: 'Dotations aux amortissements', montant: 650000 },
      { code: 'FO3', libelle: 'Dotations aux provisions', montant: 85000 },
      { code: 'FO4', libelle: 'Plus/moins-values de cessions', montant: -25000 },
      { code: 'FO5', libelle: 'Variation des créances clients', montant: -150000 },
      { code: 'FO6', libelle: 'Variation des stocks', montant: -90000 },
      { code: 'FO7', libelle: 'Variation des dettes fournisseurs', montant: 100000 },
      { code: 'FO8', libelle: 'Variation autres créances et dettes', montant: -50000 }
    ],
    activitesInvestissement: [
      { code: 'FI1', libelle: 'Acquisitions d\'immobilisations corporelles', montant: -850000 },
      { code: 'FI2', libelle: 'Acquisitions d\'immobilisations incorporelles', montant: -120000 },
      { code: 'FI3', libelle: 'Cessions d\'immobilisations', montant: 75000 },
      { code: 'FI4', libelle: 'Acquisitions de participations', montant: -200000 }
    ],
    activitesFinancement: [
      { code: 'FF1', libelle: 'Augmentation de capital', montant: 0 },
      { code: 'FF2', libelle: 'Nouveaux emprunts contractés', montant: 500000 },
      { code: 'FF3', libelle: 'Remboursements d\'emprunts', montant: -400000 },
      { code: 'FF4', libelle: 'Dividendes versés', montant: -200000 },
      { code: 'FF5', libelle: 'Intérêts versés', montant: -180000 }
    ]
  };

  // Données Tableau de Financement
  const tableauFinancementData = {
    emplois: [
      { code: 'TF1', libelle: 'Distributions mises en paiement au cours de l\'exercice', montant: 200000 },
      { code: 'TF2', libelle: 'Acquisitions d\'éléments de l\'actif immobilisé', montant: 970000 },
      { code: 'TF3', libelle: 'Charges à répartir sur plusieurs exercices', montant: 30000 },
      { code: 'TF4', libelle: 'Réduction des capitaux propres', montant: 0 },
      { code: 'TF5', libelle: 'Remboursements de dettes financières', montant: 400000 }
    ],
    ressources: [
      { code: 'TF6', libelle: 'Capacité d\'autofinancement de l\'exercice', montant: 1150000 },
      { code: 'TF7', libelle: 'Cessions ou réductions d\'éléments de l\'actif immobilisé', montant: 75000 },
      { code: 'TF8', libelle: 'Augmentation des capitaux propres', montant: 0 },
      { code: 'TF9', libelle: 'Augmentation des dettes financières', montant: 500000 }
    ],
    variationFdr: [
      { code: 'TF10', libelle: 'Variation du fonds de roulement net global', montant: 125000 }
    ]
  };

  // Données Ratios
  const ratiosData = [
    {
      categorie: 'Ratios de Structure',
      ratios: [
        { nom: 'Ratio d\'autonomie financière', calcul: 'Capitaux propres / Total passif', valeur: 0.668, norme: '> 0.5', status: 'bon' },
        { nom: 'Ratio de financement des immobilisations', calcul: 'Capitaux permanents / Immobilisations', valeur: 0.920, norme: '> 1', status: 'moyen' },
        { nom: 'Ratio d\'endettement', calcul: 'Dettes / Capitaux propres', valeur: 0.497, norme: '< 1', status: 'excellent' }
      ]
    },
    {
      categorie: 'Ratios de Liquidité',
      ratios: [
        { nom: 'Ratio de liquidité générale', calcul: 'Actif circulant / Dettes CT', valeur: 1.89, norme: '> 1.5', status: 'bon' },
        { nom: 'Ratio de liquidité réduite', calcul: '(Créances + Disponibilités) / Dettes CT', valeur: 1.42, norme: '> 1', status: 'bon' },
        { nom: 'Ratio de liquidité immédiate', calcul: 'Disponibilités / Dettes CT', valeur: 0.51, norme: '> 0.3', status: 'excellent' }
      ]
    },
    {
      categorie: 'Ratios de Rentabilité',
      ratios: [
        { nom: 'Rentabilité économique', calcul: 'Résultat net / Total actif', valeur: 0.087, norme: '> 0.05', status: 'excellent' },
        { nom: 'Rentabilité financière', calcul: 'Résultat net / Capitaux propres', valeur: 0.131, norme: '> 0.10', status: 'excellent' },
        { nom: 'Taux de marge nette', calcul: 'Résultat net / CA', valeur: 0.134, norme: '> 0.05', status: 'excellent' }
      ]
    }
  ];

  // Génération des détails de transactions pour un compte
  const generateTransactionDetails = (accountCode: string, period: string, amount: number) => {
    const transactions = [];
    const numTransactions = Math.floor(Math.random() * 8) + 3; // 3-10 transactions
    let remainingAmount = amount;

    for (let i = 0; i < numTransactions; i++) {
      const isLast = i === numTransactions - 1;
      const transactionAmount = isLast ? remainingAmount : Math.floor(remainingAmount * (0.1 + Math.random() * 0.4));
      remainingAmount -= transactionAmount;

      transactions.push({
        id: `TR-${period}-${accountCode}-${i + 1}`,
        date: `${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}/12/2024`,
        reference: `REF${period}${String(i + 1).padStart(3, '0')}`,
        libelle: getTransactionLibelle(accountCode),
        montant: transactionAmount,
        tiers: getTiers(accountCode),
        piece: `PC${period}${String(i + 1).padStart(4, '0')}`
      });
    }

    return transactions.sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime());
  };

  const getTransactionLibelle = (accountCode: string) => {
    const libelles = {
      '20': ['Frais de recherche', 'Frais de développement', 'Brevets et licences'],
      '21': ['Logiciels', 'Droit au bail', 'Fonds commercial'],
      '22': ['Terrain commercial', 'Terrain industriel'],
      '23': ['Terrain bâti', 'Terrain nu'],
      '24': ['Bâtiment industriel', 'Bâtiment commercial', 'Rénovation locaux'],
      '245': ['Machine production', 'Outillage spécialisé', 'Équipement technique'],
      '246': ['Véhicule utilitaire', 'Camion livraison', 'Voiture société'],
      '247': ['Mobilier bureau', 'Matériel informatique', 'Équipement divers'],
      '31': ['Achat marchandises', 'Stock produits finis', 'Marchandises diverses'],
      '32': ['Matières premières', 'Fournitures', 'Composants'],
      '41': ['Vente client', 'Facture client', 'Avance client'],
      '46': ['Débiteur divers', 'Créance exceptionnelle', 'Avance personnel'],
      '50': ['Placement bancaire', 'Titre participation', 'SICAV'],
      '52': ['Virement bancaire', 'Chèque encaissé', 'Prélèvement'],
      '53': ['Espèces', 'Petite caisse', 'Fonds de caisse'],
      '10': ['Capital initial', 'Augmentation capital', 'Apport associé'],
      '11': ['Réserve légale', 'Réserve facultative', 'Report bénéfice'],
      '12': ['Report bénéfice', 'Report déficit', 'Résultat reporté'],
      '13': ['Bénéfice exercice', 'Perte exercice', 'Résultat courant'],
      '16': ['Emprunt bancaire', 'Crédit équipement', 'Prêt participatif'],
      '40': ['Achat fournisseur', 'Facture fournisseur', 'Avoir fournisseur'],
      '42': ['Salaire', 'Charges sociales', 'Avance personnel'],
      '43': ['URSSAF', 'Caisse retraite', 'Mutuelle'],
      '44': ['TVA collectée', 'IS à payer', 'Taxe professionnelle'],
      '47': ['Créditeur divers', 'Dette exceptionnelle', 'Caution reçue'],
      '70': ['Vente marchandise', 'Prestation service', 'Commission'],
      '72': ['Production vendue', 'Travaux', 'Études'],
      '74': ['Subvention État', 'Aide région', 'Prime équipement'],
      '75': ['Produit accessoire', 'Location', 'Plus-value'],
      '77': ['Produit financier', 'Intérêt bancaire', 'Dividende'],
      '78': ['Reprise provision', 'Transfert charge', 'Annulation'],
      '60': ['Achat matière', 'Marchandise', 'Fourniture'],
      '61': ['Transport', 'Livraison', 'Expédition'],
      '62': ['Loyer', 'Assurance', 'Entretien'],
      '63': ['Publicité', 'Téléphone', 'Formation'],
      '64': ['Impôt local', 'Taxe', 'Contribution'],
      '66': ['Salaire brut', 'Charges patron', 'Formation'],
      '67': ['Intérêt emprunt', 'Agios', 'Commission bancaire'],
      '68': ['Amortissement', 'Provision', 'Dépréciation']
    };

    const accountLibelles = libelles[accountCode] || ['Opération diverse', 'Transaction courante', 'Mouvement comptable'];
    return accountLibelles[Math.floor(Math.random() * accountLibelles.length)];
  };

  const getTiers = (accountCode: string) => {
    const tiers = {
      '41': ['SARL Martin', 'SAS Dupont', 'EI Bernard', 'EURL Petit'],
      '40': ['Fournisseur A', 'Fournisseur B', 'Prestataire C'],
      '42': ['Dupont Jean', 'Martin Claire', 'Bernard Paul'],
      '43': ['URSSAF', 'AGIRC-ARRCO', 'Pôle Emploi'],
      '44': ['Trésor Public', 'SIE', 'Centre des Impôts'],
      '16': ['Banque Crédit', 'BNP Paribas', 'Société Générale'],
      '52': ['Banque Crédit', 'BNP Paribas', 'LCL'],
      '70': ['Client Premium', 'Client Standard', 'Client Particulier']
    };

    const accountTiers = tiers[accountCode] || ['Tiers divers', 'Organisme', 'Partenaire'];
    return accountTiers[Math.floor(Math.random() * accountTiers.length)];
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
    <div className="min-h-screen bg-[#ECECEC] ">
      <PrintableArea
        ref={printRef}
        orientation="landscape"
        pageSize="A4"
        showPrintButton={false}
        headerContent={
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold">États Financiers SYSCOHADA</h2>
            <p className="text-sm text-gray-600">{tabs.find(t => t.id === activeTab)?.label || 'Bilan'}</p>
          </div>
        }
      >
      {/* En-tête */}
      <div className="bg-white border-b border-[#E8E8E8] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/financial-analysis-advanced')}
              className="flex items-center space-x-2 px-4 py-2 text-[#767676] hover:text-[#B87333] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Retour à l'analyse financière</span>
            </button>
            <div className="h-6 w-px bg-[#E8E8E8]" />
            <div>
              <h1 className="text-2xl font-bold text-[#191919]">États Financiers SYSCOHADA</h1>
              <p className="text-sm text-[#767676]">Présentation normalisée selon le référentiel SYSCOHADA</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="px-4 py-2 border border-[#D9D9D9] rounded-lg text-sm focus:ring-2 focus:ring-[#B87333]/20"
            >
              <option value="current">Exercice 2024</option>
              <option value="previous">Exercice 2023</option>
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
          {/* BILAN SYSCOHADA */}
          {activeTab === 'bilan' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-[#191919] mb-2">BILAN SYSCOHADA</h2>
                <p className="text-[#767676]">Exercice du 01/01/2024 au 31/12/2024</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ACTIF */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-bold text-[#191919] mb-4 text-center">ACTIF</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E8E8E8]">
                          <th className="text-left p-2 text-[#191919]">Réf</th>
                          <th className="text-left p-2 text-[#191919]">{t('accounting.label')}</th>
                          <th className="text-right p-2 text-[#191919]">N</th>
                          <th className="text-right p-2 text-[#191919]">N-1</th>
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
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-2 text-[#444444]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.exerciceN)}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
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
                              {item.exerciceN.toLocaleString()}
                            </td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN1', item.exerciceN1)}
                              title="Cliquer pour voir les transactions de l'exercice N-1"
                            >
                              {item.exerciceN1.toLocaleString()}
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
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-2 text-[#444444]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.exerciceN)}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
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
                              {item.exerciceN.toLocaleString()}
                            </td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN1', item.exerciceN1)}
                              title="Cliquer pour voir les transactions de l'exercice N-1"
                            >
                              {item.exerciceN1.toLocaleString()}
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
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-bold text-[#191919] mb-4 text-center">PASSIF</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E8E8E8]">
                          <th className="text-left p-2 text-[#191919]">Réf</th>
                          <th className="text-left p-2 text-[#191919]">{t('accounting.label')}</th>
                          <th className="text-right p-2 text-[#191919]">N</th>
                          <th className="text-right p-2 text-[#191919]">N-1</th>
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
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-2 text-[#444444]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.exerciceN)}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
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
                              {item.exerciceN.toLocaleString()}
                            </td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN1', item.exerciceN1)}
                              title="Cliquer pour voir les transactions de l'exercice N-1"
                            >
                              {item.exerciceN1.toLocaleString()}
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
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-2 text-[#444444]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.exerciceN)}
                                  className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
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
                              {item.exerciceN.toLocaleString()}
                            </td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN1', item.exerciceN1)}
                              title="Cliquer pour voir les transactions de l'exercice N-1"
                            >
                              {item.exerciceN1.toLocaleString()}
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
                <h2 className="text-2xl font-bold text-[#191919] mb-2">COMPTE DE RÉSULTAT SYSCOHADA</h2>
                <p className="text-[#767676]">Exercice du 01/01/2024 au 31/12/2024</p>
              </div>

              <div className="space-y-8">
                {/* PRODUITS EN HAUT */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-bold text-[#191919] mb-4 text-center">PRODUITS</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-[#E8E8E8]">
                          <th className="text-left p-3 text-[#191919] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#191919] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[#191919] font-semibold">Exercice N</th>
                          <th className="text-right p-3 text-[#191919] font-semibold">Exercice N-1</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compteResultatData.produits.map((item, index) => (
                          <tr key={index} className="border-b border-[#E8E8E8]">
                            <td className="p-3 text-[#444444]">{item.code}</td>
                            <td className="p-3 text-[#444444]">{item.libelle}</td>
                            <td className="p-3 text-right font-mono text-[#191919]">{item.exerciceN.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-[#191919]">{item.exerciceN1.toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#E8E8E8] bg-gray-50">
                          <td className="p-3 font-bold text-[#191919]">TP</td>
                          <td className="p-3 font-bold text-[#191919]">TOTAL PRODUITS</td>
                          <td className="p-3 text-right text-lg font-bold text-[#191919]">11 620 000</td>
                          <td className="p-3 text-right text-lg font-bold text-[#191919]">10 685 000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CHARGES EN BAS */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-bold text-[#191919] mb-4 text-center">CHARGES</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-[#E8E8E8]">
                          <th className="text-left p-3 text-[#191919] font-semibold">Réf</th>
                          <th className="text-left p-3 text-[#191919] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[#191919] font-semibold">Exercice N</th>
                          <th className="text-right p-3 text-[#191919] font-semibold">Exercice N-1</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compteResultatData.charges.map((item, index) => (
                          <tr key={index} className="border-b border-[#E8E8E8]">
                            <td className="p-3 text-[#444444]">{item.code}</td>
                            <td className="p-3 text-[#444444]">{item.libelle}</td>
                            <td className="p-3 text-right font-mono text-[#191919]">{item.exerciceN.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-[#191919]">{item.exerciceN1.toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#E8E8E8] bg-gray-50">
                          <td className="p-3 font-bold text-[#191919]">TC</td>
                          <td className="p-3 font-bold text-[#191919]">TOTAL CHARGES</td>
                          <td className="p-3 text-right text-lg font-bold text-[#191919]">10 480 000</td>
                          <td className="p-3 text-right text-lg font-bold text-[#191919]">9 750 000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RÉSULTAT NET */}
                <div className="bg-white rounded-lg p-6 border-2 border-[#E8E8E8] text-center">
                  <h3 className="text-lg font-bold text-[#191919] mb-4">RÉSULTAT NET DE L'EXERCICE</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 border border-[#E8E8E8] rounded">
                      <p className="text-[#767676] font-medium mb-2">Exercice N</p>
                      <p className="text-2xl font-bold text-[#191919]">1 140 000 €</p>
                      <p className="text-sm text-[#767676] mt-1">(Bénéfice)</p>
                    </div>
                    <div className="p-4 border border-[#E8E8E8] rounded">
                      <p className="text-[#767676] font-medium mb-2">Exercice N-1</p>
                      <p className="text-2xl font-bold text-[#191919]">935 000 €</p>
                      <p className="text-sm text-[#767676] mt-1">(Bénéfice)</p>
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
                <h2 className="text-2xl font-bold text-[#191919] mb-2">BILAN FONCTIONNEL</h2>
                <p className="text-[#767676]">Analyse par fonction économique</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* EMPLOIS */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-bold text-[#191919] mb-4 text-center">EMPLOIS</h3>
                  <div className="space-y-3">
                    {bilanFonctionnelData.emplois.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border border-[#E8E8E8] rounded hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-[#B87333] font-medium text-sm">{item.code}</span>
                            <button
                              onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.valeur)}
                              className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
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
                            {item.valeur.toLocaleString()}
                          </div>
                          <div className="text-sm text-[#767676]">{item.pourcentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RESSOURCES */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-bold text-[#191919] mb-4 text-center">RESSOURCES</h3>
                  <div className="space-y-3">
                    {bilanFonctionnelData.ressources.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border border-[#E8E8E8] rounded hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-[#B87333] font-medium text-sm">{item.code}</span>
                            <button
                              onClick={() => openDetailModal(item.code, `Sous-comptes de ${item.libelle}`, 'sous-comptes', item.valeur)}
                              className="p-1 hover:bg-[#B87333] hover:text-white rounded transition-colors"
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
                            {item.valeur.toLocaleString()}
                          </div>
                          <div className="text-sm text-[#767676]">{item.pourcentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Indicateurs de l'équilibre financier */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="text-lg font-bold text-[#191919] mb-4">Indicateurs de l'Équilibre Financier</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border border-[#E8E8E8] rounded text-center">
                    <h4 className="font-semibold text-[#191919] mb-2">Fonds de Roulement Net Global</h4>
                    <p className="text-2xl font-bold text-[#191919]">770 000 €</p>
                    <p className="text-sm text-[#767676]">Ressources stables - Emplois stables</p>
                  </div>
                  <div className="p-4 border border-[#E8E8E8] rounded text-center">
                    <h4 className="font-semibold text-[#191919] mb-2">Besoin en Fonds de Roulement</h4>
                    <p className="text-2xl font-bold text-[#191919]">1 265 000 €</p>
                    <p className="text-sm text-[#767676]">AC exploitation - PC exploitation</p>
                  </div>
                  <div className="p-4 border border-[#E8E8E8] rounded text-center">
                    <h4 className="font-semibold text-[#191919] mb-2">Trésorerie Nette</h4>
                    <p className="text-2xl font-bold text-red-600">-495 000 €</p>
                    <p className="text-sm text-[#767676]">FRNG - BFR</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SIG - SOLDES INTERMÉDIAIRES DE GESTION */}
          {activeTab === 'sig' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-[#191919] mb-2">SOLDES INTERMÉDIAIRES DE GESTION</h2>
                <p className="text-[#767676]">Analyse de la formation du résultat</p>
              </div>

              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
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
                      <tr key={index} className={`border-b border-[#E8E8E8] ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="p-4 font-medium text-[#191919]">{sig.libelle}</td>
                        <td className="p-4 text-right font-mono text-[#191919]">{sig.exerciceN.toLocaleString()}</td>
                        <td className="p-4 text-right font-mono text-[#767676]">{sig.exerciceN1.toLocaleString()}</td>
                        <td className={`p-4 text-right font-medium ${sig.variation.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                          {sig.variation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h4 className="font-bold text-[#191919] mb-2">Taux de marge commerciale</h4>
                  <p className="text-2xl font-bold text-[#191919]">38.8%</p>
                  <p className="text-sm text-[#767676]">Marge / CA marchandises</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h4 className="font-bold text-[#191919] mb-2">Taux de valeur ajoutée</h4>
                  <p className="text-2xl font-bold text-[#191919]">38.6%</p>
                  <p className="text-sm text-[#767676]">VA / Production</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h4 className="font-bold text-[#191919] mb-2">Taux de rentabilité</h4>
                  <p className="text-2xl font-bold text-[#191919]">4.1%</p>
                  <p className="text-sm text-[#767676]">Résultat / CA total</p>
                </div>
              </div>
            </div>
          )}

          {/* RATIOS FINANCIERS */}
          {activeTab === 'ratios' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-[#191919] mb-2">RATIOS FINANCIERS</h2>
                <p className="text-[#767676]">Analyse de la situation financière</p>
              </div>

              {ratiosData.map((categorie, catIndex) => (
                <div key={catIndex} className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                  <div className="bg-gray-50 p-4">
                    <h3 className="text-lg font-bold text-[#191919]">{categorie.categorie}</h3>
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
                          <tr key={ratioIndex} className="border-b border-[#E8E8E8]">
                            <td className="p-4 font-medium text-[#191919]">{ratio.nom}</td>
                            <td className="p-4 text-[#767676] text-sm">{ratio.calcul}</td>
                            <td className="p-4 text-right font-mono text-[#191919]">
                              {ratio.valeur < 1 ? ratio.valeur.toFixed(3) : ratio.valeur.toFixed(2)}
                            </td>
                            <td className="p-4 text-center text-[#767676]">{ratio.norme}</td>
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
                          <th className="text-left p-3 text-[#191919] font-semibold">{t('accounting.label')}</th>
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
                          <th className="text-left p-3 text-[#191919] font-semibold">{t('accounting.label')}</th>
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
                          <th className="text-left p-3 text-[#191919] font-semibold">{t('accounting.label')}</th>
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
                          <td className="p-3 text-right text-lg font-bold text-[#191919]">1 660 000</td>
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
                          <th className="text-left p-3 text-[#191919] font-semibold">{t('accounting.label')}</th>
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
                          <th className="text-left p-3 text-[#191919] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[#191919] font-semibold">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fluxTresorerieData.activitesFinancement.map((item, index) => (
                          <tr key={index} className="border-b border-[#E8E8E8]">
                            <td className="p-3 text-[#444444]">{item.libelle}</td>
                            <td className={`p-3 text-right font-mono ${item.montant >= 0 ? 'text-[#191919]' : 'text-red-600'}`}>
                              {item.montant >= 0 ? '' : '('}{Math.abs(item.montant).toLocaleString()}{item.montant >= 0 ? '' : ')'}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#E8E8E8] bg-gray-50">
                          <td className="p-3 font-bold text-[#191919]">FLUX NET DE TRÉSORERIE DES ACTIVITÉS DE FINANCEMENT</td>
                          <td className="p-3 text-right text-lg font-bold text-red-600">(280 000)</td>
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
                      <p className="text-xl font-bold text-[#191919]">+285 000 €</p>
                    </div>
                    <div className="p-4 border border-[#E8E8E8] rounded">
                      <p className="text-[#767676] font-medium mb-2">Trésorerie fin d'exercice</p>
                      <p className="text-xl font-bold text-[#191919]">885 000 €</p>
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
                <h2 className="text-2xl font-bold text-[#191919] mb-2">EXPORT DES ÉTATS FINANCIERS</h2>
                <p className="text-[#767676]">Téléchargement et impression des documents</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tabs.slice(0, -1).map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <div key={tab.id} className="bg-white rounded-lg p-6 border border-[#E8E8E8] hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[#B87333]/10 flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-[#B87333]" />
                        </div>
                        <h3 className="font-semibold text-[#191919]">{tab.label}</h3>
                      </div>
                      <div className="space-y-3">
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
                  );
                })}
              </div>

              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="text-lg font-bold text-[#191919] mb-4">Export Complet</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors">
                    <Download className="w-5 h-5" />
                    <span>Télécharger tous les états (PDF)</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 border border-[#E8E8E8] text-[#444444] rounded-lg hover:bg-gray-50 transition-colors">
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
            <div className="flex items-center justify-between p-6 border-b border-[#E8E8E8]">
              <h2 className="text-xl font-bold text-[#191919]">{selectedDetail.title}</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Fermer">
                <X className="w-5 h-5 text-[#767676]" />
              </button>
            </div>

            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              {selectedDetail.type === 'sous-comptes' ? (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-[#191919] mb-2">Détail des sous-comptes</h3>
                    <p className="text-[#767676] text-sm">Répartition par sous-compte selon le plan SYSCOHADA</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 border-b border-[#E8E8E8]">Code</th>
                          <th className="text-left p-3 border-b border-[#E8E8E8]">{t('accounting.label')}</th>
                          <th className="text-right p-3 border-b border-[#E8E8E8]">Montant</th>
                          <th className="text-center p-3 border-b border-[#E8E8E8]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetail.data.map((subAccount: any, index: number) => (
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-3 font-medium text-[#B87333]">{subAccount.code}</td>
                            <td className="p-3 text-[#191919]">{subAccount.libelle}</td>
                            <td className="p-3 text-right font-mono">{subAccount.montant.toLocaleString()} €</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => openDetailModal(subAccount.code, subAccount.libelle, selectedPeriod, subAccount.montant)}
                                className="text-[#B87333] hover:text-[#A86323] p-1 rounded"
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
                    <h3 className="text-lg font-semibold text-[#191919] mb-2">Détail des transactions</h3>
                    <div className="flex justify-between items-center">
                      <p className="text-[#767676] text-sm">Liste des écritures comptables</p>
                      <p className="text-sm font-semibold text-[#B87333]">
                        Total: {selectedDetail.total?.toLocaleString()} €
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 border-b border-[#E8E8E8]">{t('common.date')}</th>
                          <th className="text-left p-3 border-b border-[#E8E8E8]">Référence</th>
                          <th className="text-left p-3 border-b border-[#E8E8E8]">{t('accounting.label')}</th>
                          <th className="text-left p-3 border-b border-[#E8E8E8]">Tiers</th>
                          <th className="text-right p-3 border-b border-[#E8E8E8]">Montant</th>
                          <th className="text-left p-3 border-b border-[#E8E8E8]">{t('accounting.piece')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetail.data.map((transaction: any, index: number) => (
                          <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                            <td className="p-3 text-[#767676]">{transaction.date}</td>
                            <td className="p-3 font-medium text-[#B87333]">{transaction.reference}</td>
                            <td className="p-3 text-[#191919]">{transaction.libelle}</td>
                            <td className="p-3 text-[#767676] text-xs">{transaction.tiers}</td>
                            <td className="p-3 text-right font-mono text-[#191919]">{transaction.montant.toLocaleString()} €</td>
                            <td className="p-3 text-[#767676] text-xs">{transaction.piece}</td>
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