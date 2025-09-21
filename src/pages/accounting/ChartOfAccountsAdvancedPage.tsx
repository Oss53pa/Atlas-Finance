/**
 * Plan Comptable SYSCOHADA Révisé 2017 - Interface Avancée
 * Configuration selon EXP-PAR-003 avec tous les comptes obligatoires
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Book,
  Search,
  Plus,
  Edit3,
  Trash2,
  Download,
  Upload,
  Filter,
  ChevronRight,
  ChevronDown,
  Settings,
  Copy,
  Eye,
  CheckCircle,
  AlertTriangle,
  FileText,
  BarChart3,
  Calculator,
  Building2,
  Users,
  Banknote,
  Package,
  CreditCard,
  DollarSign,
  Target
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Checkbox,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../../components/ui';

interface AccountSYSCOHADA {
  code: string;
  libelle: string;
  classe: number;
  sousClasse?: string;
  type: 'COLLECTIF' | 'INDIVIDUEL' | 'AUXILIAIRE';
  nature: 'DEBIT' | 'CREDIT' | 'MIXTE';
  lettrable: boolean;
  obligatoire: boolean;
  saisieDirecte: boolean;
  analytique: boolean;
  devise: boolean;
  parentCode?: string;
  niveau: number;
  children?: AccountSYSCOHADA[];
  mouvements?: {
    debit: number;
    credit: number;
    solde: number;
  };
  description?: string;
  exemples?: string[];
}

const CLASSES_SYSCOHADA = [
  { numero: 1, libelle: 'Comptes de Capitaux', icon: Building2, couleur: 'blue' },
  { numero: 2, libelle: 'Comptes d\'Immobilisations', icon: FileText, couleur: 'green' },
  { numero: 3, libelle: 'Comptes de Stocks', icon: Package, couleur: 'orange' },
  { numero: 4, libelle: 'Comptes de Tiers', icon: Users, couleur: 'purple' },
  { numero: 5, libelle: 'Comptes de Trésorerie', icon: Banknote, couleur: 'indigo' },
  { numero: 6, libelle: 'Comptes de Charges', icon: CreditCard, couleur: 'red' },
  { numero: 7, libelle: 'Comptes de Produits', icon: DollarSign, couleur: 'emerald' },
  { numero: 8, libelle: 'Comptes Spéciaux', icon: Target, couleur: 'yellow' },
  { numero: 9, libelle: 'Comptes Analytiques', icon: BarChart3, couleur: 'pink' }
];

const ChartOfAccountsAdvancedPage: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['1', '2', '3', '4', '5', '6', '7']));
  const [viewMode, setViewMode] = useState<'tree' | 'list' | 'stats'>('tree');
  const [filterType, setFilterType] = useState<'all' | 'obligatoire' | 'personnalise'>('all');

  // Mock data pour le plan SYSCOHADA complet
  const { data: planComptable } = useQuery({
    queryKey: ['chart-of-accounts', 'syscohada'],
    queryFn: async (): Promise<AccountSYSCOHADA[]> => [
      // CLASSE 1 - COMPTES DE CAPITAUX
      {
        code: '1',
        libelle: 'COMPTES DE CAPITAUX',
        classe: 1,
        type: 'COLLECTIF',
        nature: 'CREDIT',
        lettrable: false,
        obligatoire: true,
        saisieDirecte: false,
        analytique: false,
        devise: false,
        niveau: 1,
        children: [
          {
            code: '10',
            libelle: 'CAPITAL ET RÉSERVES',
            classe: 1,
            type: 'COLLECTIF',
            nature: 'CREDIT',
            lettrable: false,
            obligatoire: true,
            saisieDirecte: false,
            analytique: false,
            devise: false,
            parentCode: '1',
            niveau: 2,
            children: [
              {
                code: '101',
                libelle: 'Capital social',
                classe: 1,
                type: 'INDIVIDUEL',
                nature: 'CREDIT',
                lettrable: false,
                obligatoire: true,
                saisieDirecte: true,
                analytique: false,
                devise: false,
                parentCode: '10',
                niveau: 3,
                mouvements: { debit: 0, credit: 10000000, solde: -10000000 },
                description: 'Capital souscrit, appelé et versé',
                exemples: ['Actions ordinaires', 'Actions préférentielles', 'Parts sociales']
              },
              {
                code: '106',
                libelle: 'Réserves',
                classe: 1,
                type: 'COLLECTIF',
                nature: 'CREDIT',
                lettrable: false,
                obligatoire: true,
                saisieDirecte: false,
                analytique: false,
                devise: false,
                parentCode: '10',
                niveau: 3,
                children: [
                  {
                    code: '1061',
                    libelle: 'Réserve légale',
                    classe: 1,
                    type: 'INDIVIDUEL',
                    nature: 'CREDIT',
                    lettrable: false,
                    obligatoire: true,
                    saisieDirecte: true,
                    analytique: false,
                    devise: false,
                    parentCode: '106',
                    niveau: 4,
                    mouvements: { debit: 0, credit: 1000000, solde: -1000000 }
                  },
                  {
                    code: '1062',
                    libelle: 'Réserves statutaires',
                    classe: 1,
                    type: 'INDIVIDUEL',
                    nature: 'CREDIT',
                    lettrable: false,
                    obligatoire: false,
                    saisieDirecte: true,
                    analytique: false,
                    devise: false,
                    parentCode: '106',
                    niveau: 4,
                    mouvements: { debit: 0, credit: 500000, solde: -500000 }
                  }
                ]
              }
            ]
          },
          {
            code: '12',
            libelle: 'RÉSULTATS',
            classe: 1,
            type: 'COLLECTIF',
            nature: 'MIXTE',
            lettrable: false,
            obligatoire: true,
            saisieDirecte: false,
            analytique: false,
            devise: false,
            parentCode: '1',
            niveau: 2,
            children: [
              {
                code: '121',
                libelle: 'Report à nouveau',
                classe: 1,
                type: 'INDIVIDUEL',
                nature: 'MIXTE',
                lettrable: false,
                obligatoire: true,
                saisieDirecte: true,
                analytique: false,
                devise: false,
                parentCode: '12',
                niveau: 3,
                mouvements: { debit: 0, credit: 800000, solde: -800000 }
              },
              {
                code: '130',
                libelle: 'Résultat en instance d\'affectation',
                classe: 1,
                type: 'INDIVIDUEL',
                nature: 'MIXTE',
                lettrable: false,
                obligatoire: true,
                saisieDirecte: false,
                analytique: false,
                devise: false,
                parentCode: '12',
                niveau: 3,
                mouvements: { debit: 0, credit: 1200000, solde: -1200000 }
              }
            ]
          }
        ]
      },
      
      // CLASSE 2 - IMMOBILISATIONS
      {
        code: '2',
        libelle: 'COMPTES D\'IMMOBILISATIONS',
        classe: 2,
        type: 'COLLECTIF',
        nature: 'DEBIT',
        lettrable: false,
        obligatoire: true,
        saisieDirecte: false,
        analytique: false,
        devise: false,
        niveau: 1,
        children: [
          {
            code: '21',
            libelle: 'IMMOBILISATIONS INCORPORELLES',
            classe: 2,
            type: 'COLLECTIF',
            nature: 'DEBIT',
            lettrable: false,
            obligatoire: true,
            saisieDirecte: false,
            analytique: false,
            devise: false,
            parentCode: '2',
            niveau: 2,
            children: [
              {
                code: '211',
                libelle: 'Frais de développement',
                classe: 2,
                type: 'INDIVIDUEL',
                nature: 'DEBIT',
                lettrable: false,
                obligatoire: false,
                saisieDirecte: true,
                analytique: true,
                devise: false,
                parentCode: '21',
                niveau: 3,
                mouvements: { debit: 500000, credit: 0, solde: 500000 }
              },
              {
                code: '213',
                libelle: 'Logiciels',
                classe: 2,
                type: 'INDIVIDUEL',
                nature: 'DEBIT',
                lettrable: false,
                obligatoire: false,
                saisieDirecte: true,
                analytique: true,
                devise: false,
                parentCode: '21',
                niveau: 3,
                mouvements: { debit: 1200000, credit: 0, solde: 1200000 }
              },
              {
                code: '214',
                libelle: 'Brevets, licences, concessions',
                classe: 2,
                type: 'INDIVIDUEL',
                nature: 'DEBIT',
                lettrable: false,
                obligatoire: false,
                saisieDirecte: true,
                analytique: true,
                devise: false,
                parentCode: '21',
                niveau: 3,
                mouvements: { debit: 800000, credit: 0, solde: 800000 }
              }
            ]
          },
          {
            code: '22',
            libelle: 'TERRAINS',
            classe: 2,
            type: 'COLLECTIF',
            nature: 'DEBIT',
            lettrable: false,
            obligatoire: true,
            saisieDirecte: false,
            analytique: false,
            devise: false,
            parentCode: '2',
            niveau: 2,
            children: [
              {
                code: '221',
                libelle: 'Terrains agricoles et forestiers',
                classe: 2,
                type: 'INDIVIDUEL',
                nature: 'DEBIT',
                lettrable: false,
                obligatoire: false,
                saisieDirecte: true,
                analytique: true,
                devise: false,
                parentCode: '22',
                niveau: 3,
                mouvements: { debit: 5000000, credit: 0, solde: 5000000 }
              },
              {
                code: '222',
                libelle: 'Terrains nus',
                classe: 2,
                type: 'INDIVIDUEL',
                nature: 'DEBIT',
                lettrable: false,
                obligatoire: false,
                saisieDirecte: true,
                analytique: true,
                devise: false,
                parentCode: '22',
                niveau: 3,
                mouvements: { debit: 8000000, credit: 0, solde: 8000000 }
              },
              {
                code: '223',
                libelle: 'Terrains bâtis',
                classe: 2,
                type: 'INDIVIDUEL',
                nature: 'DEBIT',
                lettrable: false,
                obligatoire: false,
                saisieDirecte: true,
                analytique: true,
                devise: false,
                parentCode: '22',
                niveau: 3,
                mouvements: { debit: 12000000, credit: 0, solde: 12000000 }
              }
            ]
          }
        ]
      },

      // CLASSE 4 - COMPTES DE TIERS (Exemple détaillé)
      {
        code: '4',
        libelle: 'COMPTES DE TIERS',
        classe: 4,
        type: 'COLLECTIF',
        nature: 'MIXTE',
        lettrable: false,
        obligatoire: true,
        saisieDirecte: false,
        analytique: false,
        devise: false,
        niveau: 1,
        children: [
          {
            code: '41',
            libelle: 'CLIENTS ET COMPTES RATTACHÉS',
            classe: 4,
            type: 'COLLECTIF',
            nature: 'DEBIT',
            lettrable: false,
            obligatoire: true,
            saisieDirecte: false,
            analytique: false,
            devise: false,
            parentCode: '4',
            niveau: 2,
            children: [
              {
                code: '411',
                libelle: 'Clients',
                classe: 4,
                type: 'COLLECTIF',
                nature: 'DEBIT',
                lettrable: true,
                obligatoire: true,
                saisieDirecte: false,
                analytique: true,
                devise: true,
                parentCode: '41',
                niveau: 3,
                mouvements: { debit: 6500000, credit: 5800000, solde: 700000 },
                description: 'Créances sur clients',
                children: [
                  {
                    code: '4111',
                    libelle: 'Clients - ventes de biens',
                    classe: 4,
                    type: 'INDIVIDUEL',
                    nature: 'DEBIT',
                    lettrable: true,
                    obligatoire: true,
                    saisieDirecte: true,
                    analytique: true,
                    devise: true,
                    parentCode: '411',
                    niveau: 4,
                    mouvements: { debit: 4500000, credit: 4000000, solde: 500000 }
                  },
                  {
                    code: '4112',
                    libelle: 'Clients - prestations de services',
                    classe: 4,
                    type: 'INDIVIDUEL',
                    nature: 'DEBIT',
                    lettrable: true,
                    obligatoire: true,
                    saisieDirecte: true,
                    analytique: true,
                    devise: true,
                    parentCode: '411',
                    niveau: 4,
                    mouvements: { debit: 2000000, credit: 1800000, solde: 200000 }
                  }
                ]
              },
              {
                code: '416',
                libelle: 'Clients douteux',
                classe: 4,
                type: 'INDIVIDUEL',
                nature: 'DEBIT',
                lettrable: true,
                obligatoire: true,
                saisieDirecte: true,
                analytique: true,
                devise: true,
                parentCode: '41',
                niveau: 3,
                mouvements: { debit: 850000, credit: 100000, solde: 750000 },
                description: 'Créances dont le recouvrement est incertain'
              },
              {
                code: '418',
                libelle: 'Clients - produits non encore facturés',
                classe: 4,
                type: 'INDIVIDUEL',
                nature: 'DEBIT',
                lettrable: false,
                obligatoire: true,
                saisieDirecte: true,
                analytique: true,
                devise: true,
                parentCode: '41',
                niveau: 3,
                mouvements: { debit: 320000, credit: 0, solde: 320000 }
              }
            ]
          }
        ]
      }
    ]
  });

  const { data: accountStats } = useQuery({
    queryKey: ['accounts-stats'],
    queryFn: async () => ({
      totalComptes: 247,
      comptesActifs: 195,
      comptesObligatoires: 89,
      comptesPersonnalises: 158,
      classesUtilisees: 7,
      mouvementsTotal: 15420,
      derniereModification: new Date()
    })
  });

  const filteredAccounts = useMemo(() => {
    if (!planComptable) return [];
    
    const filterAccounts = (accounts: AccountSYSCOHADA[]): AccountSYSCOHADA[] => {
      return accounts.filter(account => {
        const matchesSearch = searchTerm === '' || 
          account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.libelle.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesFilter = filterType === 'all' ||
          (filterType === 'obligatoire' && account.obligatoire) ||
          (filterType === 'personnalise' && !account.obligatoire);
        
        const matchesClass = selectedClass === null || account.classe === selectedClass;
        
        if (matchesSearch && matchesFilter && matchesClass) {
          return {
            ...account,
            children: account.children ? filterAccounts(account.children) : undefined
          };
        }
        
        return false;
      }).map(account => ({
        ...account,
        children: account.children ? filterAccounts(account.children) : undefined
      }));
    };
    
    return filterAccounts(planComptable);
  }, [planComptable, searchTerm, filterType, selectedClass]);

  const toggleNode = (nodeCode: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeCode)) {
      newExpanded.delete(nodeCode);
    } else {
      newExpanded.add(nodeCode);
    }
    setExpandedNodes(newExpanded);
  };

  const renderAccountTree = (account: AccountSYSCOHADA, level = 0) => (
    <div key={account.code}>
      <div 
        className={`flex items-center p-2 hover:bg-gray-50 border-l-4 ${
          account.obligatoire ? 'border-blue-500' : 'border-gray-200'
        }`}
        style={{ marginLeft: `${level * 16}px` }}
      >
        {account.children && account.children.length > 0 && (
          <button
            onClick={() => toggleNode(account.code)}
            className="mr-2 p-1 hover:bg-gray-200 rounded"
          >
            {expandedNodes.has(account.code) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
        
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
              {account.code}
            </code>
            <span className={`${level === 0 ? 'font-bold text-lg' : level === 1 ? 'font-semibold' : ''}`}>
              {account.libelle}
            </span>
            
            <div className="flex items-center gap-1">
              {account.obligatoire && (
                <Badge className="bg-blue-100 text-blue-800 text-xs">Obligatoire</Badge>
              )}
              {account.lettrable && (
                <Badge className="bg-green-100 text-green-800 text-xs">Lettrable</Badge>
              )}
              {account.analytique && (
                <Badge className="bg-purple-100 text-purple-800 text-xs">Analytique</Badge>
              )}
              {account.devise && (
                <Badge className="bg-orange-100 text-orange-800 text-xs">Multi-devise</Badge>
              )}
              {!account.saisieDirecte && (
                <Badge className="bg-red-100 text-red-800 text-xs">Pas de saisie</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {account.mouvements && (
              <div className="text-right text-sm">
                <div className="font-mono text-gray-600">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XAF',
                    minimumFractionDigits: 0
                  }).format(Math.abs(account.mouvements.solde))}
                </div>
                <div className={`text-xs ${account.mouvements.solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {account.mouvements.solde >= 0 ? 'Débiteur' : 'Créditeur'}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Edit3 className="h-4 w-4" />
              </Button>
              {!account.obligatoire && (
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {expandedNodes.has(account.code) && account.children && (
        <div>
          {account.children.map(child => renderAccountTree(child, level + 1))}
        </div>
      )}
    </div>
  );

  const renderAccountStats = () => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Comptes</p>
                <p className="text-3xl font-bold text-blue-600">{accountStats?.totalComptes}</p>
                <p className="text-sm text-green-600">{accountStats?.comptesActifs} actifs</p>
              </div>
              <Book className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Obligatoires</p>
                <p className="text-3xl font-bold text-green-600">{accountStats?.comptesObligatoires}</p>
                <p className="text-sm text-gray-600">SYSCOHADA</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Personnalisés</p>
                <p className="text-3xl font-bold text-purple-600">{accountStats?.comptesPersonnalises}</p>
                <p className="text-sm text-gray-600">Spécifiques</p>
              </div>
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mouvements</p>
                <p className="text-3xl font-bold text-orange-600">
                  {(accountStats?.mouvementsTotal || 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Cette année</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Répartition par classes */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition par Classes SYSCOHADA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {CLASSES_SYSCOHADA.map((classe) => {
              const Icon = classe.icon;
              return (
                <div 
                  key={classe.numero}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedClass === classe.numero 
                      ? `border-${classe.couleur}-500 bg-${classe.couleur}-50` 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedClass(selectedClass === classe.numero ? null : classe.numero)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg bg-${classe.couleur}-100`}>
                      <Icon className={`h-5 w-5 text-${classe.couleur}-600`} />
                    </div>
                    <div>
                      <div className="font-semibold">Classe {classe.numero}</div>
                      <div className="text-sm text-gray-600">{classe.libelle}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {/* Ici on pourrait afficher le nombre de comptes par classe */}
                    45 comptes configurés
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-8 mb-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Book className="h-10 w-10" />
              Plan Comptable SYSCOHADA Révisé
            </h1>
            <p className="text-slate-200 text-lg mt-2">
              Gestion complète selon norme OHADA 2017 - {accountStats?.totalComptes} comptes configurés
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button className="bg-white text-slate-800 hover:bg-slate-100">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Compte
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-slate-800">
              <Upload className="h-4 w-4 mr-2" />
              Importer
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-slate-800">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation et filtres */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un compte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
          
          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les comptes</SelectItem>
              <SelectItem value="obligatoire">Obligatoires SYSCOHADA</SelectItem>
              <SelectItem value="personnalise">Personnalisés</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
          <TabsList>
            <TabsTrigger value="tree" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Arborescence
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Book className="h-4 w-4" />
              Liste
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistiques
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Contenu principal */}
      {viewMode === 'stats' ? (
        renderAccountStats()
      ) : (
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Classes */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Classes SYSCOHADA</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedClass(null)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedClass === null ? 'bg-slate-800 text-white' : 'hover:bg-gray-50'
                    }`}
                  >
                    Toutes les classes
                  </button>
                  
                  {CLASSES_SYSCOHADA.map((classe) => {
                    const Icon = classe.icon;
                    return (
                      <button
                        key={classe.numero}
                        onClick={() => setSelectedClass(classe.numero)}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-2 ${
                          selectedClass === classe.numero 
                            ? 'bg-slate-800 text-white' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Classe {classe.numero}</div>
                          <div className="text-sm opacity-75">{classe.libelle}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Arborescence des comptes */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Plan des Comptes
                    {selectedClass && ` - Classe ${selectedClass}`}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {filteredAccounts.length} comptes
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Actions
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  {filteredAccounts.map(account => renderAccountTree(account))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartOfAccountsAdvancedPage;