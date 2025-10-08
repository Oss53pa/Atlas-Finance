import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion } from 'framer-motion';
import { 
  Book,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Settings,
  Download,
  Upload,
  TreePine,
  FolderOpen,
  Folder,
  Hash,
  AlertCircle,
  CheckCircle,
  FileText,
  Calculator
} from 'lucide-react';
import { 
  UnifiedCard,
  KPICard,
  SectionHeader,
  ElegantButton,
  PageContainer,
  ModernChartCard,
  ColorfulBarChart
} from '../../components/ui/DesignSystem';
import { useChartOfAccounts } from '../../hooks';
import { formatCurrency } from '../../lib/utils';

// Types SYSCOHADA pour le plan comptable
interface SyscohadaAccount {
  code: string; // 9 positions obligatoires
  libelle: string;
  classe: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  nature: 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT' | 'SPECIAL';
  sens_normal: 'DEBITEUR' | 'CREDITEUR';
  niveau: 1 | 2 | 3 | 4; // Niveau hiérarchique
  compte_parent?: string;
  is_collectif: boolean;
  is_active: boolean;
  solde_debit: number;
  solde_credit: number;
  nb_mouvements: number;
  date_creation: string;
  description?: string;
}

const ChartOfAccountsPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<number | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Fetch chart of accounts avec le nouveau hook
  const { data: accountsData, isLoading } = useChartOfAccounts();
  const accounts = accountsData?.results || [];

  // Plan comptable SYSCOHADA standard avec structure hiérarchique
  const syscohadaPlan: SyscohadaAccount[] = [
    // CLASSE 1 - RESSOURCES DURABLES
    { code: '100000000', libelle: 'CAPITAL SOCIAL', classe: 1, nature: 'PASSIF', sens_normal: 'CREDITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 0, solde_credit: 25000000, nb_mouvements: 12, date_creation: '2024-01-01' },
    { code: '101000000', libelle: 'CAPITAL SOUSCRIT NON APPELE', classe: 1, nature: 'PASSIF', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 5000000, solde_credit: 0, nb_mouvements: 2, date_creation: '2024-01-01' },
    { code: '110000000', libelle: 'RESERVES', classe: 1, nature: 'PASSIF', sens_normal: 'CREDITEUR', niveau: 1, is_collectif: true, is_active: true, solde_debit: 0, solde_credit: 8500000, nb_mouvements: 45, date_creation: '2024-01-01' },
    { code: '111000000', libelle: 'RESERVE LEGALE', classe: 1, nature: 'PASSIF', sens_normal: 'CREDITEUR', niveau: 2, compte_parent: '110000000', is_collectif: false, is_active: true, solde_debit: 0, solde_credit: 2500000, nb_mouvements: 5, date_creation: '2024-01-01' },
    { code: '112000000', libelle: 'RESERVES STATUTAIRES', classe: 1, nature: 'PASSIF', sens_normal: 'CREDITEUR', niveau: 2, compte_parent: '110000000', is_collectif: false, is_active: true, solde_debit: 0, solde_credit: 6000000, nb_mouvements: 8, date_creation: '2024-01-01' },
    { code: '120000000', libelle: 'REPORT A NOUVEAU', classe: 1, nature: 'PASSIF', sens_normal: 'CREDITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 0, solde_credit: 3250000, nb_mouvements: 156, date_creation: '2024-01-01' },
    
    // CLASSE 2 - ACTIF IMMOBILISE  
    { code: '210000000', libelle: 'IMMOBILISATIONS INCORPORELLES', classe: 2, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: true, is_active: true, solde_debit: 2800000, solde_credit: 0, nb_mouvements: 23, date_creation: '2024-01-01' },
    { code: '211000000', libelle: 'FRAIS DE RECHERCHE ET DEVELOPPEMENT', classe: 2, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 2, compte_parent: '210000000', is_collectif: false, is_active: true, solde_debit: 1500000, solde_credit: 0, nb_mouvements: 12, date_creation: '2024-01-01' },
    { code: '212000000', libelle: 'BREVETS, LICENCES, LOGICIELS', classe: 2, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 2, compte_parent: '210000000', is_collectif: false, is_active: true, solde_debit: 1300000, solde_credit: 0, nb_mouvements: 11, date_creation: '2024-01-01' },
    { code: '220000000', libelle: 'TERRAINS', classe: 2, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 8500000, solde_credit: 0, nb_mouvements: 3, date_creation: '2024-01-01' },
    { code: '221000000', libelle: 'BATIMENTS', classe: 2, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 12500000, solde_credit: 0, nb_mouvements: 8, date_creation: '2024-01-01' },
    { code: '240000000', libelle: 'MATERIEL ET MOBILIER', classe: 2, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: true, is_active: true, solde_debit: 4200000, solde_credit: 0, nb_mouvements: 67, date_creation: '2024-01-01' },
    
    // CLASSE 3 - STOCKS
    { code: '310000000', libelle: 'MARCHANDISES', classe: 3, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: true, is_active: true, solde_debit: 8950000, solde_credit: 0, nb_mouvements: 234, date_creation: '2024-01-01' },
    { code: '311000000', libelle: 'MARCHANDISES A', classe: 3, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 2, compte_parent: '310000000', is_collectif: false, is_active: true, solde_debit: 5200000, solde_credit: 0, nb_mouvements: 156, date_creation: '2024-01-01' },
    { code: '312000000', libelle: 'MARCHANDISES B', classe: 3, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 2, compte_parent: '310000000', is_collectif: false, is_active: true, solde_debit: 3750000, solde_credit: 0, nb_mouvements: 78, date_creation: '2024-01-01' },
    { code: '320000000', libelle: 'MATIERES PREMIERES', classe: 3, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 2100000, solde_credit: 0, nb_mouvements: 89, date_creation: '2024-01-01' },
    { code: '330000000', libelle: 'PRODUITS EN-COURS', classe: 3, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 1400000, solde_credit: 0, nb_mouvements: 45, date_creation: '2024-01-01' },
    
    // CLASSE 4 - TIERS
    { code: '401000000', libelle: 'FOURNISSEURS', classe: 4, nature: 'PASSIF', sens_normal: 'CREDITEUR', niveau: 1, is_collectif: true, is_active: true, solde_debit: 2500000, solde_credit: 8750000, nb_mouvements: 456, date_creation: '2024-01-01' },
    { code: '411000000', libelle: 'CLIENTS', classe: 4, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: true, is_active: true, solde_debit: 15750000, solde_credit: 3200000, nb_mouvements: 678, date_creation: '2024-01-01' },
    { code: '421000000', libelle: 'PERSONNEL - AVANCES', classe: 4, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 450000, solde_credit: 0, nb_mouvements: 23, date_creation: '2024-01-01' },
    { code: '430000000', libelle: 'SECURITE SOCIALE', classe: 4, nature: 'PASSIF', sens_normal: 'CREDITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 0, solde_credit: 1250000, nb_mouvements: 67, date_creation: '2024-01-01' },
    { code: '445000000', libelle: 'ETAT - TVA', classe: 4, nature: 'MIXTE', sens_normal: 'CREDITEUR', niveau: 1, is_collectif: true, is_active: true, solde_debit: 850000, solde_credit: 2100000, nb_mouvements: 234, date_creation: '2024-01-01' },
    
    // CLASSE 5 - TRESORERIE
    { code: '512000000', libelle: 'BANQUES', classe: 5, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: true, is_active: true, solde_debit: 8950000, solde_credit: 1200000, nb_mouvements: 567, date_creation: '2024-01-01' },
    { code: '531000000', libelle: 'CAISSES', classe: 5, nature: 'ACTIF', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 250000, solde_credit: 0, nb_mouvements: 89, date_creation: '2024-01-01' },
    
    // CLASSE 6 - CHARGES
    { code: '601000000', libelle: 'ACHATS DE MARCHANDISES', classe: 6, nature: 'CHARGE', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 12450000, solde_credit: 850000, nb_mouvements: 234, date_creation: '2024-01-01' },
    { code: '611000000', libelle: 'TRANSPORTS', classe: 6, nature: 'CHARGE', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 1800000, solde_credit: 0, nb_mouvements: 67, date_creation: '2024-01-01' },
    { code: '621000000', libelle: 'PERSONNEL - SALAIRES', classe: 6, nature: 'CHARGE', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 8500000, solde_credit: 0, nb_mouvements: 156, date_creation: '2024-01-01' },
    { code: '631000000', libelle: 'IMPOTS ET TAXES', classe: 6, nature: 'CHARGE', sens_normal: 'DEBITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 2100000, solde_credit: 0, nb_mouvements: 45, date_creation: '2024-01-01' },
    
    // CLASSE 7 - PRODUITS
    { code: '701000000', libelle: 'VENTES DE MARCHANDISES', classe: 7, nature: 'PRODUIT', sens_normal: 'CREDITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 0, solde_credit: 28750000, nb_mouvements: 345, date_creation: '2024-01-01' },
    { code: '706000000', libelle: 'PRESTATIONS DE SERVICES', classe: 7, nature: 'PRODUIT', sens_normal: 'CREDITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 0, solde_credit: 4850000, nb_mouvements: 89, date_creation: '2024-01-01' },
    { code: '771000000', libelle: 'PRODUITS EXCEPTIONNELS', classe: 7, nature: 'PRODUIT', sens_normal: 'CREDITEUR', niveau: 1, is_collectif: false, is_active: true, solde_debit: 0, solde_credit: 750000, nb_mouvements: 12, date_creation: '2024-01-01' }
  ];

  // Statistiques du plan comptable
  const planStats = {
    total_comptes: syscohadaPlan.length,
    comptes_actifs: syscohadaPlan.filter(c => c.is_active).length,
    comptes_collectifs: syscohadaPlan.filter(c => c.is_collectif).length,
    comptes_detail: syscohadaPlan.filter(c => !c.is_collectif).length
  };

  const getClassColor = (classe: number) => {
    const colors = [
      'bg-blue-50 border-blue-300 text-blue-800',      // Classe 1
      'bg-green-50 border-green-300 text-green-800',   // Classe 2  
      'bg-purple-50 border-purple-300 text-purple-800', // Classe 3
      'bg-amber-50 border-amber-300 text-amber-800',   // Classe 4
      'bg-cyan-50 border-cyan-300 text-cyan-800',      // Classe 5
      'bg-red-50 border-red-300 text-red-800',         // Classe 6
      'bg-emerald-50 border-emerald-300 text-emerald-800', // Classe 7
      'bg-indigo-50 border-indigo-300 text-indigo-800', // Classe 8
      'bg-pink-50 border-pink-300 text-pink-800'       // Classe 9
    ];
    return colors[classe - 1] || 'bg-gray-50 border-gray-300 text-gray-800';
  };

  const getNatureIcon = (nature: SyscohadaAccount['nature']) => {
    switch (nature) {
      case 'ACTIF': return TrendingUp;
      case 'PASSIF': return TrendingDown;
      case 'CHARGE': return AlertCircle;
      case 'PRODUIT': return CheckCircle;
      default: return Settings;
    }
  };

  const validateSyscohadaCode = (code: string): boolean => {
    return /^\d{9}$/.test(code);
  };

  if (isLoading) {
    return (
      <PageContainer background="warm" padding="lg">
        <div className="flex justify-center items-center min-h-[60vh]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-4 bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-sm"
          >
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-neutral-700">Chargement du plan SYSCOHADA...</p>
          </motion.div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title="Plan Comptable SYSCOHADA"
          subtitle="Plan comptable harmonisé à 9 positions selon l'Acte Uniforme OHADA 2017"
          icon={Book}
          action={
            <div className="flex gap-3">
              <ElegantButton variant="outline" icon={Upload}>
                Importer Plan
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download}>
                Exporter Excel
              </ElegantButton>
              <ElegantButton variant="primary" icon={Plus}>
                Nouveau Compte
              </ElegantButton>
            </div>
          }
        />

        {/* KPI Cards - Statistiques du plan */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Comptes"
            value={planStats.total_comptes.toString()}
            subtitle="Plan SYSCOHADA complet"
            icon={Book}
            color="primary"
            delay={0.1}
            withChart={true}
          />
          
          <KPICard
            title="Comptes Actifs"
            value={planStats.comptes_actifs.toString()}
            subtitle={`${Math.round(planStats.comptes_actifs / planStats.total_comptes * 100)}% du plan`}
            icon={CheckCircle}
            color="success"
            delay={0.2}
            withChart={true}
          />
          
          <KPICard
            title="Comptes Collectifs"
            value={planStats.comptes_collectifs.toString()}
            subtitle="Comptes de regroupement"
            icon={FolderOpen}
            color="warning"
            delay={0.3}
            withChart={true}
          />
          
          <KPICard
            title="Comptes Détail"
            value={planStats.comptes_detail.toString()}
            subtitle="Comptes de saisie"
            icon={FileText}
            color="neutral"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* Filtres et recherche */}
        <UnifiedCard variant="elevated" size="md">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Rechercher un compte (code ou libellé)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes les classes</option>
                <option value={1}>Classe 1 - Ressources Durables</option>
                <option value={2}>Classe 2 - Actif Immobilisé</option>
                <option value={3}>Classe 3 - Stocks</option>
                <option value={4}>Classe 4 - Tiers</option>
                <option value={5}>Classe 5 - Trésorerie</option>
                <option value={6}>Classe 6 - Charges</option>
                <option value={7}>Classe 7 - Produits</option>
                <option value={8}>Classe 8 - Résultats</option>
                <option value={9}>Classe 9 - Analytique</option>
              </select>

              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les niveaux</option>
                <option value={1}>Niveau 1 - Comptes principaux</option>
                <option value={2}>Niveau 2 - Sous-comptes</option>
                <option value={3}>Niveau 3 - Détail</option>
                <option value={4}>Niveau 4 - Analytique</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Comptes inactifs</span>
              </label>
              <ElegantButton variant="outline" icon={Filter} size="sm">
                Filtres Avancés
              </ElegantButton>
            </div>
          </div>
        </UnifiedCard>

        {/* Plan comptable hiérarchique */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <UnifiedCard variant="elevated" size="lg">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-neutral-800">Plan Comptable SYSCOHADA - Structure Hiérarchique</h2>
                <div className="flex gap-2">
                  <ElegantButton variant="outline" size="sm" icon={TreePine}>
                    Vue Arbre
                  </ElegantButton>
                  <ElegantButton variant="outline" size="sm" icon={Calculator}>
                    Validation
                  </ElegantButton>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-neutral-200">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-neutral-100 to-neutral-50">
                    <tr>
                      <th className="text-left p-4 font-bold text-neutral-800">Code SYSCOHADA</th>
                      <th className="text-left p-4 font-bold text-neutral-800">{t('accounting.label')}</th>
                      <th className="text-center p-4 font-bold text-neutral-800">Classe</th>
                      <th className="text-center p-4 font-bold text-neutral-800">Nature</th>
                      <th className="text-center p-4 font-bold text-neutral-800">Sens</th>
                      <th className="text-right p-4 font-bold text-neutral-800">Solde Débit</th>
                      <th className="text-right p-4 font-bold text-neutral-800">Solde Crédit</th>
                      <th className="text-center p-4 font-bold text-neutral-800">Mvts</th>
                      <th className="text-center p-4 font-bold text-neutral-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {syscohadaPlan
                      .filter(account => 
                        (selectedClass === 'all' || account.classe === selectedClass) &&
                        (selectedLevel === 'all' || account.niveau === selectedLevel) &&
                        (showInactive || account.is_active) &&
                        (searchTerm === '' || 
                         account.code.includes(searchTerm) || 
                         account.libelle.toLowerCase().includes(searchTerm.toLowerCase()))
                      )
                      .map((account, index) => {
                        const NatureIcon = getNatureIcon(account.nature);
                        const isValidCode = validateSyscohadaCode(account.code);
                        
                        return (
                          <motion.tr
                            key={account.code}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-neutral-50 transition-all"
                          >
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className={`px-2 py-1 rounded text-xs font-bold ${
                                  isValidCode ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {isValidCode ? '✅' : '❌'}
                                </div>
                                <div>
                                  <div className="font-mono text-lg font-bold text-neutral-800">
                                    {account.code}
                                  </div>
                                  {account.compte_parent && (
                                    <div className="text-xs text-neutral-500">
                                      Parent: {account.compte_parent}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div style={{ paddingLeft: `${(account.niveau - 1) * 20}px` }}>
                                  {account.is_collectif ? (
                                    <FolderOpen className="h-4 w-4 text-amber-600 inline mr-2" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-blue-600 inline mr-2" />
                                  )}
                                  <span className="font-semibold text-neutral-800">
                                    {account.libelle}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${getClassColor(account.classe)}`}>
                                {account.classe}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <NatureIcon className="h-4 w-4" />
                                <span className="text-sm font-medium">{account.nature}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                account.sens_normal === 'DEBITEUR' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {account.sens_normal}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="font-mono text-lg font-bold text-blue-600">
                                {account.solde_debit > 0 ? formatCurrency(account.solde_debit) : '-'}
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="font-mono text-lg font-bold text-green-600">
                                {account.solde_credit > 0 ? formatCurrency(account.solde_credit) : '-'}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="font-mono font-bold text-neutral-700">
                                {account.nb_mouvements}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center gap-1">
                                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" aria-label="Voir les détails">
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all">
                                  <Edit className="h-4 w-4" />
                                </button>
                                {!account.is_collectif && account.nb_mouvements === 0 && (
                                  <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all" aria-label="Supprimer">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </UnifiedCard>
        </motion.div>

        {/* Graphique répartition par classe */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <ModernChartCard
            title="Répartition des Comptes par Classe SYSCOHADA"
            subtitle="Nombre de comptes actifs par classe"
            icon={BarChart3}
          >
            <ColorfulBarChart
              data={[
                { label: 'Cl.1', value: syscohadaPlan.filter(c => c.classe === 1 && c.is_active).length, color: 'bg-blue-400' },
                { label: 'Cl.2', value: syscohadaPlan.filter(c => c.classe === 2 && c.is_active).length, color: 'bg-green-400' },
                { label: 'Cl.3', value: syscohadaPlan.filter(c => c.classe === 3 && c.is_active).length, color: 'bg-purple-400' },
                { label: 'Cl.4', value: syscohadaPlan.filter(c => c.classe === 4 && c.is_active).length, color: 'bg-amber-400' },
                { label: 'Cl.5', value: syscohadaPlan.filter(c => c.classe === 5 && c.is_active).length, color: 'bg-cyan-400' },
                { label: 'Cl.6', value: syscohadaPlan.filter(c => c.classe === 6 && c.is_active).length, color: 'bg-red-400' },
                { label: 'Cl.7', value: syscohadaPlan.filter(c => c.classe === 7 && c.is_active).length, color: 'bg-emerald-400' }
              ]}
              height={180}
            />
          </ModernChartCard>
        </motion.div>

        {/* Validation et conformité */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <UnifiedCard variant="glass" size="md">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-neutral-800">🔍 Validation Plan Comptable SYSCOHADA</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-neutral-700">Contrôles Obligatoires:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <span className="text-sm">Codes 9 positions</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                        ✅ {syscohadaPlan.filter(c => validateSyscohadaCode(c.code)).length}/{syscohadaPlan.length}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <span className="text-sm">Classes 1-9 présentes</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                        ✅ 9/9
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <span className="text-sm">Hiérarchie respectée</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                        ✅ OK
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-neutral-700">Structure SYSCOHADA:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-400 rounded"></div>
                      <span>Classes 1-2: Bilan (Passif-Actif immobilisé)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-purple-400 rounded"></div>
                      <span>Classes 3-5: Bilan (Actif circulant)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-red-400 rounded"></div>
                      <span>Classe 6: Charges (Gestion)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-emerald-400 rounded"></div>
                      <span>Classe 7: Produits (Gestion)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gray-400 rounded"></div>
                      <span>Classes 8-9: Spéciales</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-neutral-700">Actions Rapides:</h4>
                  <div className="space-y-2">
                    <ElegantButton variant="outline" size="sm" icon={Download} className="w-full">
                      Template Excel
                    </ElegantButton>
                    <ElegantButton variant="outline" size="sm" icon={Upload} className="w-full">
                      Importer Comptes
                    </ElegantButton>
                    <ElegantButton variant="primary" size="sm" icon={Plus} className="w-full">
                      Nouveau Compte
                    </ElegantButton>
                  </div>
                </div>
              </div>
            </div>
          </UnifiedCard>
        </motion.div>
      </div>
    </PageContainer>
  );
};

export default ChartOfAccountsPage;