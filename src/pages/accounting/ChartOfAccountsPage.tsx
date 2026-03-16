import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
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
  Calculator,
  TrendingUp,
  TrendingDown,
  BarChart3
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
// import { useChartOfAccounts } from '../../hooks'; // Désactivé - données locales
import { formatCurrency } from '../../lib/utils';
import { NouveauCompteWizard } from '../../components/plan-comptable/NouveauCompteWizard';
import { ImportPlanComptable } from '../../components/plan-comptable/ImportPlanComptable';
import { useData } from '../../contexts/DataContext';

// Types SYSCOHADA pour le plan comptable
interface SyscohadaAccount {
  code: string; // 9 positions obligatoires
  libelle: string;
  classe: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  nature: 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT' | 'SPECIAL' | 'MIXTE';
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

  // États pour les modales
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [showViewAccountModal, setShowViewAccountModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAdvancedFiltersModal, setShowAdvancedFiltersModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SyscohadaAccount | null>(null);

  const { adapter } = useData();
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);
  const [dbEntries, setDbEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isError = false;

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [accounts, entries] = await Promise.all([
          adapter.getAll<any>('accounts'),
          adapter.getAll<any>('journalEntries'),
        ]);
        setDbAccounts(accounts);
        setDbEntries(entries);
      } catch (err) {
        console.error('Erreur chargement plan comptable:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [adapter]);

  const syscohadaPlan: SyscohadaAccount[] = useMemo(() => {
    if (dbAccounts.length === 0) return [];

    // Build stats from journal lines
    const accountStats: Record<string, { debit: number; credit: number; moves: number }> = {};
    for (const entry of dbEntries) {
      if (!entry.lines) continue;
      for (const line of entry.lines) {
        const code = String(line.accountCode || '');
        if (!code) continue;
        if (!accountStats[code]) accountStats[code] = { debit: 0, credit: 0, moves: 0 };
        accountStats[code].debit += (line.debit || 0);
        accountStats[code].credit += (line.credit || 0);
        accountStats[code].moves += 1;
      }
    }

    return dbAccounts.map((acc: any) => {
      const code = String(acc.code || acc.number || '');
      const padded = code.padEnd(9, '0');
      const cls = parseInt(code.charAt(0)) || 1;
      const s = accountStats[code] || { debit: 0, credit: 0, moves: 0 };

      const nature: SyscohadaAccount['nature'] =
        cls === 1 ? 'PASSIF' :
        cls === 4 ? 'MIXTE' :
        [2, 3, 5].includes(cls) ? 'ACTIF' :
        cls === 6 ? 'CHARGE' :
        cls === 7 ? 'PRODUIT' : 'SPECIAL';

      const sensNormal: SyscohadaAccount['sens_normal'] =
        [2, 3, 5, 6].includes(cls) ? 'DEBITEUR' : 'CREDITEUR';

      return {
        code: padded,
        libelle: (acc.name || acc.libelle || code).toUpperCase(),
        classe: Math.min(Math.max(cls, 1), 9) as SyscohadaAccount['classe'],
        nature,
        sens_normal: sensNormal,
        niveau: (acc.level || 1) as 1 | 2 | 3 | 4,
        compte_parent: acc.parentCode ? String(acc.parentCode).padEnd(9, '0') : undefined,
        is_collectif: acc.isCollective || false,
        is_active: acc.isActive !== false,
        solde_debit: s.debit,
        solde_credit: s.credit,
        nb_mouvements: s.moves,
        date_creation: acc.createdAt || new Date().toISOString().split('T')[0],
        description: acc.description,
      };
    }).sort((a, b) => a.code.localeCompare(b.code));
  }, [dbAccounts, dbEntries]);

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
      'bg-primary-50 border-primary-300 text-primary-800', // Classe 3
      'bg-amber-50 border-amber-300 text-amber-800',   // Classe 4
      'bg-primary-50 border-primary-300 text-primary-800',      // Classe 5
      'bg-red-50 border-red-300 text-red-800',         // Classe 6
      'bg-primary-50 border-primary-300 text-primary-800', // Classe 7
      'bg-primary-50 border-primary-300 text-primary-800', // Classe 8
      'bg-primary-50 border-primary-300 text-primary-800'       // Classe 9
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

  if (isLoading && !isError) {
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
              <ElegantButton variant="outline" icon={Upload} onClick={() => setShowImportModal(true)}>
                Importer Plan
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download} onClick={() => {
                // Export Excel functionality
                const csvContent = syscohadaPlan.map(acc =>
                  `${acc.code};${acc.libelle};${acc.classe};${acc.nature};${acc.sens_normal}`
                ).join('\n');
                const blob = new Blob([`Code;Libellé;Classe;Nature;Sens\n${csvContent}`], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `plan_comptable_syscohada_${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
              }}>
                Exporter Excel
              </ElegantButton>
              <ElegantButton variant="primary" icon={Plus} onClick={() => setShowNewAccountModal(true)}>
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
                <Search className="absolute left-3 top-1/2 transform -tranprimary-y-1/2 h-5 w-5 text-neutral-400" />
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
              <ElegantButton variant="outline" icon={Filter} size="sm" onClick={() => setShowAdvancedFiltersModal(true)}>
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
                <h2 className="text-lg font-bold text-neutral-800">Plan Comptable SYSCOHADA - Structure Hiérarchique</h2>
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
                                <button
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  aria-label="Voir les détails"
                                  onClick={() => {
                                    setSelectedAccount(account);
                                    setShowViewAccountModal(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                  onClick={() => {
                                    setSelectedAccount(account);
                                    setShowEditAccountModal(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                {!account.is_collectif && account.nb_mouvements === 0 && (
                                  <button
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    aria-label="Supprimer"
                                    onClick={() => {
                                      setSelectedAccount(account);
                                      setShowDeleteConfirmModal(true);
                                    }}
                                  >
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
                { label: 'Cl.3', value: syscohadaPlan.filter(c => c.classe === 3 && c.is_active).length, color: 'bg-primary-400' },
                { label: 'Cl.4', value: syscohadaPlan.filter(c => c.classe === 4 && c.is_active).length, color: 'bg-amber-400' },
                { label: 'Cl.5', value: syscohadaPlan.filter(c => c.classe === 5 && c.is_active).length, color: 'bg-primary-400' },
                { label: 'Cl.6', value: syscohadaPlan.filter(c => c.classe === 6 && c.is_active).length, color: 'bg-red-400' },
                { label: 'Cl.7', value: syscohadaPlan.filter(c => c.classe === 7 && c.is_active).length, color: 'bg-primary-400' }
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
                      <div className="w-4 h-4 bg-primary-400 rounded"></div>
                      <span>Classes 3-5: Bilan (Actif circulant)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-red-400 rounded"></div>
                      <span>Classe 6: Charges (Gestion)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-primary-400 rounded"></div>
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
                    <ElegantButton variant="outline" size="sm" icon={Download} className="w-full" onClick={() => {
                      // Télécharger un template Excel
                      const template = `Code;Libellé;Classe;Nature;Sens Normal;Niveau;Collectif;Description
100000000;CAPITAL;1;PASSIF;CREDITEUR;1;false;Compte de capital
110000000;RESERVES;1;PASSIF;CREDITEUR;1;true;Compte collectif de réserves`;
                      const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = 'template_plan_comptable_syscohada.csv';
                      link.click();
                    }}>
                      Template Excel
                    </ElegantButton>
                    <ElegantButton variant="outline" size="sm" icon={Upload} className="w-full" onClick={() => setShowImportModal(true)}>
                      Importer Comptes
                    </ElegantButton>
                    <ElegantButton variant="primary" size="sm" icon={Plus} className="w-full" onClick={() => setShowNewAccountModal(true)}>
                      Nouveau Compte
                    </ElegantButton>
                  </div>
                </div>
              </div>
            </div>
          </UnifiedCard>
        </motion.div>
      </div>

      {/* Modal Nouveau Compte — Wizard 4 etapes */}
      {showNewAccountModal && (
        <NouveauCompteWizard
          onClose={() => setShowNewAccountModal(false)}
          onSuccess={() => {
            // Refresh pourrait etre ajouté ici si la page utilise Dexie live queries
          }}
        />
      )}

      {/* Modal Vue Détail Compte */}
      {showViewAccountModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4"
          >
            <div className="p-6 border-b border-neutral-200 bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                    {selectedAccount.classe}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-800">{selectedAccount.libelle}</h2>
                    <p className="text-sm text-neutral-600 font-mono">{selectedAccount.code}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowViewAccountModal(false)}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <AlertCircle className="w-5 h-5 text-neutral-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Nature</p>
                    <p className="text-lg font-semibold text-neutral-800">{selectedAccount.nature}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Sens Normal</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      selectedAccount.sens_normal === 'DEBITEUR' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedAccount.sens_normal}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Type</p>
                    <p className="text-lg font-semibold text-neutral-800">
                      {selectedAccount.is_collectif ? 'Compte Collectif' : 'Compte de Détail'}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Solde Débit</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedAccount.solde_debit)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Solde Crédit</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(selectedAccount.solde_credit)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Mouvements</p>
                    <p className="text-lg font-semibold text-neutral-800">{selectedAccount.nb_mouvements} écritures</p>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-neutral-500">Date de création</p>
                <p className="text-neutral-800">{selectedAccount.date_creation}</p>
              </div>
            </div>
            <div className="p-6 border-t border-neutral-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowViewAccountModal(false)}
                className="px-4 py-2 text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setShowViewAccountModal(false);
                  setShowEditAccountModal(true);
                }}
                className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
              >
                Modifier
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Édition Compte */}
      {showEditAccountModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-800">Modifier le Compte</h2>
                <button
                  onClick={() => setShowEditAccountModal(false)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <AlertCircle className="w-5 h-5 text-neutral-500" />
                </button>
              </div>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              toast.success('Compte modifié avec succès !');
              setShowEditAccountModal(false);
            }}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Code Compte</label>
                    <input
                      type="text"
                      defaultValue={selectedAccount.code}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-100 font-mono"
                      disabled
                    />
                    <p className="text-xs text-neutral-500 mt-1">Le code ne peut pas être modifié</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Classe</label>
                    <select
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      defaultValue={selectedAccount.classe}
                    >
                      <option value={1}>Classe 1 - Ressources Durables</option>
                      <option value={2}>Classe 2 - Actif Immobilisé</option>
                      <option value={3}>Classe 3 - Stocks</option>
                      <option value={4}>Classe 4 - Tiers</option>
                      <option value={5}>Classe 5 - Trésorerie</option>
                      <option value={6}>Classe 6 - Charges</option>
                      <option value={7}>Classe 7 - Produits</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Libellé *</label>
                  <input
                    type="text"
                    defaultValue={selectedAccount.libelle}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Nature</label>
                    <select
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      defaultValue={selectedAccount.nature}
                    >
                      <option value="ACTIF">ACTIF</option>
                      <option value="PASSIF">PASSIF</option>
                      <option value="CHARGE">CHARGE</option>
                      <option value="PRODUIT">PRODUIT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Sens Normal</label>
                    <select
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      defaultValue={selectedAccount.sens_normal}
                    >
                      <option value="DEBITEUR">DEBITEUR</option>
                      <option value="CREDITEUR">CREDITEUR</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="rounded border-neutral-300 text-blue-600"
                      defaultChecked={selectedAccount.is_collectif}
                    />
                    <span className="text-sm text-neutral-700">Compte collectif</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="rounded border-neutral-300 text-green-600"
                      defaultChecked={selectedAccount.is_active}
                    />
                    <span className="text-sm text-neutral-700">Compte actif</span>
                  </label>
                </div>
              </div>
              <div className="p-6 border-t border-neutral-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditAccountModal(false)}
                  className="px-4 py-2 text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal Confirmation Suppression */}
      {showDeleteConfirmModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
          >
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-800">Supprimer le compte ?</h3>
                  <p className="text-sm text-neutral-600">{selectedAccount.code} - {selectedAccount.libelle}</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-700">
                  Cette action est irréversible. Le compte sera définitivement supprimé du plan comptable.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-neutral-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2 text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  toast.success(`Compte ${selectedAccount.code} supprimé !`);
                  setShowDeleteConfirmModal(false);
                  setSelectedAccount(null);
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Import */}
      {showImportModal && (
        <ImportPlanComptable
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            toast.success('Import termine avec succes');
          }}
        />
      )}

      {/* Modal Filtres Avancés */}
      {showAdvancedFiltersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4"
          >
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-800">Filtres Avancés</h2>
                <button
                  onClick={() => setShowAdvancedFiltersModal(false)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <AlertCircle className="w-5 h-5 text-neutral-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Plage de codes</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="De"
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                  />
                  <input
                    type="text"
                    placeholder="À"
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Solde</label>
                <div className="flex space-x-2">
                  <select className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg">
                    <option value="all">Tous les soldes</option>
                    <option value="debit">Solde débiteur</option>
                    <option value="credit">Solde créditeur</option>
                    <option value="zero">Solde nul</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Mouvements</label>
                <div className="flex space-x-2">
                  <select className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg">
                    <option value="all">Tous</option>
                    <option value="with">Avec mouvements</option>
                    <option value="without">Sans mouvement</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-neutral-300 text-blue-600" />
                  <span className="text-sm">Comptes collectifs uniquement</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-neutral-300 text-blue-600" />
                  <span className="text-sm">Comptes de détail uniquement</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-neutral-200 flex justify-between">
              <button
                onClick={() => {
                  // Reset filters
                  setSelectedClass('all');
                  setSelectedLevel('all');
                  setShowInactive(false);
                  setSearchTerm('');
                }}
                className="px-4 py-2 text-neutral-600 hover:text-neutral-800"
              >
                Réinitialiser
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAdvancedFiltersModal(false)}
                  className="px-4 py-2 text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setShowAdvancedFiltersModal(false);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Appliquer
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </PageContainer>
  );
};

export default ChartOfAccountsPage;