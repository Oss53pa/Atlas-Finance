import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalculatorIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  FolderOpenIcon,
  FolderIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  CogIcon,
  LockClosedIcon,
  LockOpenIcon,
  CurrencyDollarIcon,
  TagIcon
} from '@heroicons/react/24/outline';

interface SYSCOHADAAccount {
  id: string;
  code: string;
  name: string;
  accountClass: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
  level: number;
  parentCode: string;
  isHeader: boolean;
  isActive: boolean;
  allowDirectEntry: boolean;
  requireThirdParty: boolean;
  allowForeignCurrency: boolean;
  isReconcilable: boolean;
  
  // Paramètres avancés
  defaultVATRate?: number;
  accountingNature: 'DEBIT' | 'CREDIT';
  balanceType: 'DEBIT' | 'CREDIT' | 'BOTH';
  
  // Contrôles et restrictions
  entryRestrictions: string[];
  mandatoryFields: string[];
  validationRules: string[];
  
  // Analytique
  requireCostCenter: boolean;
  requireProject: boolean;
  analyticAxes: number[];
  
  // Collectifs et auxiliaires
  isCollectiveAccount: boolean;
  auxiliaryAccountPattern?: string;
  auxiliaryAccounts?: SYSCOHADAAccount[];
  
  // Métadonnées
  syscohadaCode: string;
  syscohadaDescription: string;
  isStandard: boolean;
  isCustom: boolean;
  
  // Statistiques
  stats: {
    totalEntries: number;
    currentBalance: number;
    lastEntryDate: string;
  };
}

interface AccountClass {
  class: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  mandatory: boolean;
  accountCount: number;
}

const SYSCOHADAAccountsConfig: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [viewMode, setViewMode] = useState<'tree' | 'list' | 'config'>('tree');
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  const queryClient = useQueryClient();

  // Classes de comptes SYSCOHADA
  const accountClasses: AccountClass[] = [
    {
      class: '1',
      title: 'Classe 1 - Comptes de Capitaux',
      description: 'Capital, réserves, emprunts, provisions',
      color: 'blue',
      icon: BuildingOfficeIcon,
      mandatory: true,
      accountCount: 156
    },
    {
      class: '2',
      title: 'Classe 2 - Comptes d\'Immobilisations',
      description: 'Immobilisations incorporelles, corporelles, financières',
      color: 'green',
      icon: FolderIcon,
      mandatory: true,
      accountCount: 89
    },
    {
      class: '3',
      title: 'Classe 3 - Comptes de Stocks',
      description: 'Marchandises, matières, produits, en-cours',
      color: 'purple',
      icon: CogIcon,
      mandatory: true,
      accountCount: 45
    },
    {
      class: '4',
      title: 'Classe 4 - Comptes de Tiers',
      description: 'Clients, fournisseurs, personnel, État',
      color: 'orange',
      icon: UsersIcon,
      mandatory: true,
      accountCount: 234
    },
    {
      class: '5',
      title: 'Classe 5 - Comptes de Trésorerie',
      description: 'Banques, caisse, valeurs mobilières',
      color: 'indigo',
      icon: CurrencyDollarIcon,
      mandatory: true,
      accountCount: 67
    },
    {
      class: '6',
      title: 'Classe 6 - Comptes de Charges',
      description: 'Achats, services, personnel, amortissements',
      color: 'red',
      icon: DocumentTextIcon,
      mandatory: true,
      accountCount: 312
    },
    {
      class: '7',
      title: 'Classe 7 - Comptes de Produits',
      description: 'Ventes, production, subventions, reprises',
      color: 'emerald',
      icon: ChartBarIcon,
      mandatory: true,
      accountCount: 178
    },
    {
      class: '8',
      title: 'Classe 8 - Comptes Spéciaux',
      description: 'Engagements, contreparties',
      color: 'gray',
      icon: ShieldCheckIcon,
      mandatory: false,
      accountCount: 23
    },
    {
      class: '9',
      title: 'Classe 9 - Comptabilité Analytique',
      description: 'Centres de coûts, sections analytiques',
      color: 'pink',
      icon: TargetIcon,
      mandatory: false,
      accountCount: 156
    }
  ];

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['syscohada-accounts', selectedClass],
    queryFn: async (): Promise<SYSCOHADAAccount[]> => {
      // Mock data avec structure hiérarchique SYSCOHADA
      const mockAccounts: SYSCOHADAAccount[] = [
        // Classe 1 - Capitaux
        {
          id: '1',
          code: '10',
          name: 'CAPITAL ET RESERVES',
          accountClass: '1',
          level: 1,
          parentCode: '1',
          isHeader: true,
          isActive: true,
          allowDirectEntry: false,
          requireThirdParty: false,
          allowForeignCurrency: false,
          isReconcilable: false,
          accountingNature: 'CREDIT',
          balanceType: 'CREDIT',
          entryRestrictions: ['NO_DIRECT_ENTRY'],
          mandatoryFields: [],
          validationRules: [],
          requireCostCenter: false,
          requireProject: false,
          analyticAxes: [],
          isCollectiveAccount: false,
          syscohadaCode: '10',
          syscohadaDescription: 'Capital et réserves',
          isStandard: true,
          isCustom: false,
          stats: {
            totalEntries: 25,
            currentBalance: 3000000,
            lastEntryDate: '2024-08-25'
          }
        },
        {
          id: '2',
          code: '101',
          name: 'Capital social',
          accountClass: '1',
          level: 2,
          parentCode: '10',
          isHeader: false,
          isActive: true,
          allowDirectEntry: true,
          requireThirdParty: false,
          allowForeignCurrency: false,
          isReconcilable: false,
          accountingNature: 'CREDIT',
          balanceType: 'CREDIT',
          entryRestrictions: ['VALIDATION_REQUIRED'],
          mandatoryFields: ['DESCRIPTION', 'REFERENCE'],
          validationRules: ['AMOUNT_POSITIVE'],
          requireCostCenter: false,
          requireProject: false,
          analyticAxes: [],
          isCollectiveAccount: false,
          syscohadaCode: '101',
          syscohadaDescription: 'Capital social ou personnel',
          isStandard: true,
          isCustom: false,
          stats: {
            totalEntries: 8,
            currentBalance: 3000000,
            lastEntryDate: '2024-01-15'
          }
        },
        // Classe 4 - Tiers (exemple avec comptes collectifs)
        {
          id: '3',
          code: '40',
          name: 'FOURNISSEURS ET COMPTES RATTACHES',
          accountClass: '4',
          level: 1,
          parentCode: '4',
          isHeader: true,
          isActive: true,
          allowDirectEntry: false,
          requireThirdParty: true,
          allowForeignCurrency: true,
          isReconcilable: true,
          accountingNature: 'CREDIT',
          balanceType: 'CREDIT',
          entryRestrictions: ['NO_DIRECT_ENTRY'],
          mandatoryFields: ['THIRD_PARTY'],
          validationRules: [],
          requireCostCenter: false,
          requireProject: false,
          analyticAxes: [],
          isCollectiveAccount: true,
          auxiliaryAccountPattern: '401{NNN}',
          syscohadaCode: '40',
          syscohadaDescription: 'Fournisseurs et comptes rattachés',
          isStandard: true,
          isCustom: false,
          stats: {
            totalEntries: 1250,
            currentBalance: 2850000,
            lastEntryDate: '2024-08-29'
          }
        },
        {
          id: '4',
          code: '401',
          name: 'Fournisseurs',
          accountClass: '4',
          level: 2,
          parentCode: '40',
          isHeader: false,
          isActive: true,
          allowDirectEntry: false,
          requireThirdParty: true,
          allowForeignCurrency: true,
          isReconcilable: true,
          accountingNature: 'CREDIT',
          balanceType: 'CREDIT',
          entryRestrictions: ['THIRD_PARTY_REQUIRED'],
          mandatoryFields: ['THIRD_PARTY', 'DESCRIPTION'],
          validationRules: ['THIRD_PARTY_TYPE_SUPPLIER'],
          requireCostCenter: false,
          requireProject: false,
          analyticAxes: [],
          isCollectiveAccount: true,
          auxiliaryAccountPattern: '401{NNNN}',
          syscohadaCode: '401',
          syscohadaDescription: 'Fournisseurs - dettes d\'exploitation',
          isStandard: true,
          isCustom: false,
          stats: {
            totalEntries: 890,
            currentBalance: 1850000,
            lastEntryDate: '2024-08-29'
          },
          auxiliaryAccounts: [
            {
              id: '5',
              code: '4010001',
              name: 'Fournisseur ABC SARL',
              accountClass: '4',
              level: 3,
              parentCode: '401',
              isHeader: false,
              isActive: true,
              allowDirectEntry: true,
              requireThirdParty: true,
              allowForeignCurrency: false,
              isReconcilable: true,
              accountingNature: 'CREDIT',
              balanceType: 'CREDIT',
              entryRestrictions: [],
              mandatoryFields: ['DESCRIPTION'],
              validationRules: [],
              requireCostCenter: false,
              requireProject: false,
              analyticAxes: [],
              isCollectiveAccount: false,
              syscohadaCode: '401',
              syscohadaDescription: 'Compte auxiliaire fournisseur',
              isStandard: false,
              isCustom: true,
              stats: {
                totalEntries: 45,
                currentBalance: 850000,
                lastEntryDate: '2024-08-28'
              }
            }
          ]
        },
        // Classe 6 - Charges (exemple avec analytique)
        {
          id: '6',
          code: '60',
          name: 'ACHATS ET VARIATIONS DE STOCKS',
          accountClass: '6',
          level: 1,
          parentCode: '6',
          isHeader: true,
          isActive: true,
          allowDirectEntry: false,
          requireThirdParty: false,
          allowForeignCurrency: false,
          isReconcilable: false,
          accountingNature: 'DEBIT',
          balanceType: 'DEBIT',
          entryRestrictions: ['NO_DIRECT_ENTRY'],
          mandatoryFields: [],
          validationRules: [],
          requireCostCenter: true,
          requireProject: false,
          analyticAxes: [1, 2],
          isCollectiveAccount: false,
          syscohadaCode: '60',
          syscohadaDescription: 'Achats et variations de stocks',
          isStandard: true,
          isCustom: false,
          stats: {
            totalEntries: 2340,
            currentBalance: 8950000,
            lastEntryDate: '2024-08-29'
          }
        },
        {
          id: '7',
          code: '601',
          name: 'Achats de marchandises',
          accountClass: '6',
          level: 2,
          parentCode: '60',
          isHeader: false,
          isActive: true,
          allowDirectEntry: true,
          requireThirdParty: false,
          allowForeignCurrency: false,
          isReconcilable: false,
          defaultVATRate: 19.25,
          accountingNature: 'DEBIT',
          balanceType: 'DEBIT',
          entryRestrictions: [],
          mandatoryFields: ['DESCRIPTION'],
          validationRules: ['AMOUNT_POSITIVE', 'VAT_APPLICABLE'],
          requireCostCenter: true,
          requireProject: true,
          analyticAxes: [1, 2, 3],
          isCollectiveAccount: false,
          syscohadaCode: '601',
          syscohadaDescription: 'Achats de marchandises',
          isStandard: true,
          isCustom: false,
          stats: {
            totalEntries: 567,
            currentBalance: 4200000,
            lastEntryDate: '2024-08-29'
          }
        }
      ];
      
      if (selectedClass && selectedClass !== 'all') {
        return mockAccounts.filter(acc => acc.accountClass === selectedClass);
      }
      
      return mockAccounts;
    }
  });

  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      const matchesSearch = searchTerm === '' || 
        account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = showInactive || account.isActive;
      
      return matchesSearch && matchesStatus;
    });
  }, [accounts, searchTerm, showInactive]);

  const createAccountMutation = useMutation({
    mutationFn: async (accountData: Partial<SYSCOHADAAccount>) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return accountData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syscohada-accounts'] });
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getClassIcon = (accountClass: string) => {
    switch (accountClass) {
      case '1': return BuildingOfficeIcon;
      case '2': return FolderIcon;
      case '3': return CogIcon;
      case '4': return UsersIcon;
      case '5': return CurrencyDollarIcon;
      case '6': return DocumentTextIcon;
      case '7': return ChartBarIcon;
      case '8': return ShieldCheckIcon;
      case '9': return TargetIcon;
      default: return FolderIcon;
    }
  };

  const renderAccountTree = (account: SYSCOHADAAccount, level: number = 0) => {
    const Icon = getClassIcon(account.accountClass);
    const hasChildren = account.auxiliaryAccounts && account.auxiliaryAccounts.length > 0;

    return (
      <div key={account.id} className="space-y-1">
        <div 
          className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
            selectedAccount === account.id 
              ? 'border-indigo-300 bg-indigo-50' 
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => setSelectedAccount(account.id)}
        >
          {/* Niveau et expansion */}
          <div className="flex items-center space-x-1">
            {hasChildren ? (
              <FolderOpenIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <div className="w-4"></div>
            )}
            <Icon className={`h-5 w-5 text-${accountClasses.find(c => c.class === account.accountClass)?.color}-600`} />
          </div>

          {/* Code et nom */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-mono font-medium text-gray-900">{account.code}</span>
              <span className="text-gray-900 truncate">{account.name}</span>
              
              {/* Badges */}
              {account.isHeader && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                  En-tête
                </span>
              )}
              {account.requireThirdParty && (
                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                  Tiers
                </span>
              )}
              {account.isReconcilable && (
                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                  Lettrable
                </span>
              )}
              {account.defaultVATRate && (
                <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full">
                  TVA {account.defaultVATRate}%
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              SYSCOHADA: {account.syscohadaCode} • {account.stats.totalEntries} écritures • 
              Solde: {formatCurrency(account.stats.currentBalance)}
            </div>
          </div>

          {/* Statut et actions */}
          <div className="flex items-center space-x-2">
            {account.allowDirectEntry ? (
              <LockOpenIcon className="h-4 w-4 text-green-500" title="Saisie autorisée" />
            ) : (
              <LockClosedIcon className="h-4 w-4 text-red-500" title="Saisie interdite" />
            )}
            
            <div className={`w-2 h-2 rounded-full ${
              account.isActive ? 'bg-green-400' : 'bg-gray-400'
            }`}></div>
          </div>
        </div>

        {/* Comptes auxiliaires */}
        {hasChildren && account.auxiliaryAccounts!.map(aux => 
          renderAccountTree(aux, level + 1)
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <CalculatorIcon className="h-8 w-8 mr-3 text-indigo-600" />
              Configuration Plan SYSCOHADA Révisé
            </h1>
            <p className="text-gray-600 mt-2">
              Plan comptable OHADA 2017 • {accounts.length} comptes configurés • 
              Conforme référentiel {selectedClass === 'all' ? 'complet' : `classe ${selectedClass}`}
            </p>
          </div>
          <div className="flex space-x-4">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="tree">Vue Arbre</option>
              <option value="list">Vue Liste</option>
              <option value="config">Configuration</option>
            </select>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
              <PlusIcon className="h-5 w-5" />
              <span>Nouveau Compte</span>
            </button>
          </div>
        </div>
      </div>

      {/* Classes SYSCOHADA */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Classes de Comptes SYSCOHADA</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <button
            onClick={() => setSelectedClass('all')}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedClass === 'all' 
                ? 'border-indigo-300 bg-indigo-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <FolderOpenIcon className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
              <div className="font-medium text-gray-900">Toutes</div>
              <div className="text-xs text-gray-500">{accounts.length} comptes</div>
            </div>
          </button>
          
          {accountClasses.slice(0, 4).map((accountClass) => {
            const Icon = getClassIcon(accountClass.class);
            return (
              <button
                key={accountClass.class}
                onClick={() => setSelectedClass(accountClass.class)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedClass === accountClass.class 
                    ? `border-${accountClass.color}-300 bg-${accountClass.color}-50` 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <Icon className={`h-8 w-8 mx-auto mb-2 text-${accountClass.color}-600`} />
                  <div className="font-medium text-gray-900">Classe {accountClass.class}</div>
                  <div className="text-xs text-gray-500">{accountClass.accountCount} comptes</div>
                  {accountClass.mandatory && (
                    <div className="text-xs text-green-600 font-medium mt-1">Obligatoire</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Deuxième ligne pour classes 5-9 */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
          {accountClasses.slice(4).map((accountClass) => {
            const Icon = getClassIcon(accountClass.class);
            return (
              <button
                key={accountClass.class}
                onClick={() => setSelectedClass(accountClass.class)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedClass === accountClass.class 
                    ? `border-${accountClass.color}-300 bg-${accountClass.color}-50` 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <Icon className={`h-8 w-8 mx-auto mb-2 text-${accountClass.color}-600`} />
                  <div className="font-medium text-gray-900">Classe {accountClass.class}</div>
                  <div className="text-xs text-gray-500">{accountClass.accountCount} comptes</div>
                  {!accountClass.mandatory && (
                    <div className="text-xs text-gray-600 mt-1">Optionnel</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par code ou nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors ${
                showInactive 
                  ? 'border-red-300 bg-red-50 text-red-700' 
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              <span>Afficher inactifs</span>
            </button>
          </div>
          <div className="flex space-x-2">
            <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span>Import Plan</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span>Export Plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste/Arbre des comptes */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {selectedClass === 'all' ? 'Plan Comptable Complet' : `Classe ${selectedClass}`}
            </h2>
            
            {viewMode === 'tree' ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredAccounts.map(account => renderAccountTree(account))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Solde
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAccounts.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono font-medium text-gray-900">{account.code}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{account.name}</div>
                          <div className="text-xs text-gray-500">{account.syscohadaDescription}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center space-y-1">
                            {account.isHeader && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                En-tête
                              </span>
                            )}
                            {account.isCollectiveAccount && (
                              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                                Collectif
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <span className={`font-medium ${
                            account.accountingNature === 'DEBIT' ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(account.stats.currentBalance)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {account.allowDirectEntry ? (
                              <LockOpenIcon className="h-4 w-4 text-green-500" />
                            ) : (
                              <LockClosedIcon className="h-4 w-4 text-red-500" />
                            )}
                            <span className={`text-xs ${
                              account.isActive ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {account.isActive ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex space-x-2 justify-center">
                            <button className="text-indigo-600 hover:text-indigo-900">
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button className="text-blue-600 hover:text-blue-900">
                              <CogIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Panel de configuration du compte sélectionné */}
        <div className="space-y-6">
          {selectedAccount && (() => {
            const account = accounts.find(acc => acc.id === selectedAccount);
            if (!account) return null;

            return (
              <>
                {/* Informations de base */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration du Compte</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="font-mono text-lg font-bold text-gray-900">{account.code}</div>
                      <div className="text-gray-700">{account.name}</div>
                      <div className="text-sm text-gray-500 mt-1">{account.syscohadaDescription}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Classe:</span>
                        <span className="ml-2 font-medium">Classe {account.accountClass}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Nature:</span>
                        <span className={`ml-2 font-medium ${
                          account.accountingNature === 'DEBIT' ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {account.accountingNature}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Niveau:</span>
                        <span className="ml-2 font-medium">{account.level}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Parent:</span>
                        <span className="ml-2 font-medium">{account.parentCode || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paramètres avancés */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Paramètres Avancés</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'allowDirectEntry', label: 'Saisie directe autorisée', icon: LockOpenIcon },
                      { key: 'requireThirdParty', label: 'Tiers obligatoire', icon: UsersIcon },
                      { key: 'allowForeignCurrency', label: 'Devises étrangères', icon: GlobeAltIcon },
                      { key: 'isReconcilable', label: 'Lettrable', icon: CheckCircleIcon },
                      { key: 'requireCostCenter', label: 'Centre de coût obligatoire', icon: TargetIcon },
                      { key: 'requireProject', label: 'Projet obligatoire', icon: FolderIcon }
                    ].map((param) => (
                      <div key={param.key} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <param.icon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{param.label}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {(account as any)[param.key] ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="h-4 w-4 border border-gray-300 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {account.defaultVATRate && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <TagIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">Taux TVA par défaut</span>
                        </div>
                        <span className="text-sm font-medium text-orange-600">
                          {account.defaultVATRate}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Statistiques d'utilisation */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Statistiques</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nombre d'écritures:</span>
                      <span className="font-medium">{account.stats.totalEntries.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Solde actuel:</span>
                      <span className={`font-medium ${
                        account.accountingNature === 'DEBIT' ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(account.stats.currentBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dernière écriture:</span>
                      <span className="font-medium">
                        {new Date(account.stats.lastEntryDate).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default SYSCOHADAAccountsConfig;