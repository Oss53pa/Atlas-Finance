/**
 * Gestion Multi-Sociétés WiseBook
 * Configuration selon EXP-PAR-002
 */
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Settings,
  Users,
  FileText,
  BarChart3,
  Shield,
  Globe,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Eye,
  Download
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription
} from '../../components/ui';

interface Company {
  id: string;
  code: string;
  raisonSociale: string;
  formeJuridique: string;
  rccm: string;
  nif: string;
  devise: string;
  exercice: {
    debut: Date;
    fin: Date;
  };
  type: 'HOLDING' | 'FILIALE' | 'ETABLISSEMENT';
  parentId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  etablissements?: Company[];
  config: {
    planComptablePartage: boolean;
    journauxPropres: boolean;
    numerotationPropre: boolean;
    workflowValidation: boolean;
    consolidationAuto: boolean;
  };
  stats: {
    utilisateurs: number;
    ecritures: number;
    ca: number;
  };
}

interface ConsolidationRule {
  id: string;
  fromCompany: string;
  toCompany: string;
  compteSource: string;
  compteDestination: string;
  type: 'CUMUL' | 'ELIMINATION' | 'RETRAITEMENT';
  coefficient: number;
  active: boolean;
}

const MultiCompanyPage: React.FC = () => {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'list' | 'consolidation'>('tree');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Mock data
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async (): Promise<Company[]> => [
      {
        id: '1',
        code: 'HOLD001',
        raisonSociale: 'GROUPE WISEBOOK HOLDING',
        formeJuridique: 'SA',
        rccm: 'RC/YAO/2020/B/12345',
        nif: 'H071234567890P',
        devise: 'XAF',
        exercice: { debut: new Date(2024, 0, 1), fin: new Date(2024, 11, 31) },
        type: 'HOLDING',
        status: 'ACTIVE',
        config: {
          planComptablePartage: true,
          journauxPropres: false,
          numerotationPropre: true,
          workflowValidation: true,
          consolidationAuto: true
        },
        stats: {
          utilisateurs: 15,
          ecritures: 2500,
          ca: 50000000
        },
        etablissements: [
          {
            id: '2',
            code: 'FIL001',
            raisonSociale: 'WISEBOOK CAMEROUN SA',
            formeJuridique: 'SA',
            rccm: 'RC/DLA/2021/B/67890',
            nif: 'F071234567891P',
            devise: 'XAF',
            exercice: { debut: new Date(2024, 0, 1), fin: new Date(2024, 11, 31) },
            type: 'FILIALE',
            parentId: '1',
            status: 'ACTIVE',
            config: {
              planComptablePartage: true,
              journauxPropres: true,
              numerotationPropre: false,
              workflowValidation: true,
              consolidationAuto: true
            },
            stats: {
              utilisateurs: 8,
              ecritures: 1200,
              ca: 25000000
            },
            etablissements: [
              {
                id: '3',
                code: 'ETB001',
                raisonSociale: 'WISEBOOK DOUALA',
                formeJuridique: 'Établissement',
                rccm: '',
                nif: '',
                devise: 'XAF',
                exercice: { debut: new Date(2024, 0, 1), fin: new Date(2024, 11, 31) },
                type: 'ETABLISSEMENT',
                parentId: '2',
                status: 'ACTIVE',
                config: {
                  planComptablePartage: true,
                  journauxPropres: true,
                  numerotationPropre: false,
                  workflowValidation: false,
                  consolidationAuto: true
                },
                stats: {
                  utilisateurs: 3,
                  ecritures: 800,
                  ca: 15000000
                }
              }
            ]
          },
          {
            id: '4',
            code: 'FIL002',
            raisonSociale: 'WISEBOOK GABON SA',
            formeJuridique: 'SA',
            rccm: 'RC/LBV/2022/B/11111',
            nif: 'G071234567892P',
            devise: 'XAF',
            exercice: { debut: new Date(2024, 0, 1), fin: new Date(2024, 11, 31) },
            type: 'FILIALE',
            parentId: '1',
            status: 'ACTIVE',
            config: {
              planComptablePartage: false,
              journauxPropres: true,
              numerotationPropre: true,
              workflowValidation: true,
              consolidationAuto: false
            },
            stats: {
              utilisateurs: 5,
              ecritures: 600,
              ca: 12000000
            }
          }
        ]
      }
    ]
  });

  const { data: consolidationRules } = useQuery({
    queryKey: ['consolidation-rules'],
    queryFn: async (): Promise<ConsolidationRule[]> => [
      {
        id: '1',
        fromCompany: '2',
        toCompany: '1',
        compteSource: '411100',
        compteDestination: '455100',
        type: 'ELIMINATION',
        coefficient: 1,
        active: true
      },
      {
        id: '2',
        fromCompany: '4',
        toCompany: '1',
        compteSource: '701000',
        compteDestination: '701000',
        type: 'CUMUL',
        coefficient: 1,
        active: true
      }
    ]
  });

  const createCompany = useMutation({
    mutationFn: async (companyData: Partial<Company>) => {
      // Simulation API
      return { success: true, id: Date.now().toString() };
    }
  });

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Actif</Badge>;
      case 'INACTIVE':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactif</Badge>;
      case 'SUSPENDED':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Suspendu</Badge>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'HOLDING':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Holding</Badge>;
      case 'FILIALE':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Filiale</Badge>;
      case 'ETABLISSEMENT':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Établissement</Badge>;
      default:
        return null;
    }
  };

  const renderCompanyTree = (company: Company, level = 0) => (
    <div key={company.id} className="w-full">
      <div 
        className={`flex items-center p-3 hover:bg-gray-50 border-l-4 ${
          selectedCompany === company.id ? 'bg-blue-50 border-blue-500' : 'border-transparent'
        } cursor-pointer`}
        style={{ marginLeft: `${level * 20}px` }}
        onClick={() => setSelectedCompany(company.id)}
      >
        {company.etablissements && company.etablissements.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleNode(company.id);
            }}
            className="mr-2 p-1 hover:bg-gray-200 rounded"
          >
            {expandedNodes.has(company.id) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
        
        <Building2 className="h-5 w-5 mr-3 text-gray-700" />
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">{company.raisonSociale}</span>
            {getTypeBadge(company.type)}
            {getStatusBadge(company.status)}
          </div>
          <div className="text-sm text-gray-600">
            {company.code} • {company.devise} • {company.stats.utilisateurs} utilisateurs
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {expandedNodes.has(company.id) && company.etablissements && (
        <div>
          {company.etablissements.map(child => renderCompanyTree(child, level + 1))}
        </div>
      )}
    </div>
  );

  const renderCompanyDetails = () => {
    const company = companies?.find(c => c.id === selectedCompany) || 
                    companies?.flatMap(c => c.etablissements || []).find(c => c.id === selectedCompany);
    
    if (!company) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {company.raisonSociale}
            </h3>
            <p className="text-gray-600">{company.code} • {company.formeJuridique}</p>
          </div>
          <div className="flex items-center gap-2">
            {getTypeBadge(company.type)}
            {getStatusBadge(company.status)}
          </div>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <TabsList>
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Identification</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>RCCM:</strong> {company.rccm || 'N/A'}</div>
                      <div><strong>NIF:</strong> {company.nif || 'N/A'}</div>
                      <div><strong>Code:</strong> {company.code}</div>
                      <div><strong>Devise:</strong> {company.devise}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Exercice Comptable</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Début:</strong> {company.exercice.debut.toLocaleDateString('fr-FR')}</div>
                      <div><strong>Fin:</strong> {company.exercice.fin.toLocaleDateString('fr-FR')}</div>
                      <div><strong>Type:</strong> {company.type}</div>
                      {company.parentId && <div><strong>Parent:</strong> {company.parentId}</div>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Configuration Comptable</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span>Plan comptable partagé</span>
                        {company.config.planComptablePartage ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span>Journaux propres</span>
                        {company.config.journauxPropres ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span>Numérotation propre</span>
                        {company.config.numerotationPropre ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span>Workflow validation</span>
                        {company.config.workflowValidation ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span>Consolidation auto</span>
                        {company.config.consolidationAuto ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Utilisateurs</p>
                      <p className="text-2xl font-bold">{company.stats.utilisateurs}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Écritures</p>
                      <p className="text-2xl font-bold">{company.stats.ecritures.toLocaleString()}</p>
                    </div>
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">CA (XAF)</p>
                      <p className="text-2xl font-bold">
                        {(company.stats.ca / 1000000).toFixed(1)}M
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-700 mb-4" />
                  <p className="text-gray-600">Gestion des utilisateurs en cours de développement</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  const renderConsolidationRules = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Règles de Consolidation</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Règle
        </Button>
      </div>

      <Alert>
        <BarChart3 className="h-4 w-4" />
        <AlertDescription>
          Les règles de consolidation définissent comment les données des filiales sont agrégées dans les comptes du groupe.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Société Source</TableHead>
                <TableHead>Société Destination</TableHead>
                <TableHead>Compte Source</TableHead>
                <TableHead>Compte Destination</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Coefficient</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consolidationRules?.map((rule) => {
                const sourceCompany = companies?.flatMap(c => [c, ...(c.etablissements || [])])
                  .find(c => c.id === rule.fromCompany);
                const destCompany = companies?.flatMap(c => [c, ...(c.etablissements || [])])
                  .find(c => c.id === rule.toCompany);
                
                return (
                  <TableRow key={rule.id}>
                    <TableCell>{sourceCompany?.raisonSociale}</TableCell>
                    <TableCell>{destCompany?.raisonSociale}</TableCell>
                    <TableCell className="font-mono">{rule.compteSource}</TableCell>
                    <TableCell className="font-mono">{rule.compteDestination}</TableCell>
                    <TableCell>
                      <Badge variant={
                        rule.type === 'CUMUL' ? 'default' : 
                        rule.type === 'ELIMINATION' ? 'destructive' : 'secondary'
                      }>
                        {rule.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{rule.coefficient}</TableCell>
                    <TableCell>
                      {rule.active ? (
                        <Badge className="bg-green-100 text-green-800">Actif</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">Inactif</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
              <Building2 className="h-10 w-10" />
              Gestion Multi-Sociétés
            </h1>
            <p className="text-slate-200 text-lg mt-2">
              Configuration et gestion des entités du groupe
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button className="bg-white text-slate-800 hover:bg-slate-100">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Société
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-slate-800">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-xl shadow-sm mb-8 p-1">
        <div className="flex gap-1">
          {[
            { key: 'tree', label: 'Arbre Organisationnel', icon: Building2 },
            { key: 'list', label: 'Liste Sociétés', icon: FileText },
            { key: 'consolidation', label: 'Consolidation', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-medium transition-all ${
                  viewMode === tab.key
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        {viewMode !== 'consolidation' && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Structure du Groupe
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {companies?.map(company => renderCompanyTree(company))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className={viewMode === 'consolidation' ? 'lg:col-span-3' : 'lg:col-span-2'}>
          {viewMode === 'tree' && selectedCompany && renderCompanyDetails()}
          {viewMode === 'consolidation' && renderConsolidationRules()}
          
          {viewMode === 'tree' && !selectedCompany && (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="h-16 w-16 mx-auto text-gray-700 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sélectionnez une société
                </h3>
                <p className="text-gray-600">
                  Choisissez une société dans l'arbre organisationnel pour voir ses détails
                </p>
              </CardContent>
            </Card>
          )}
          
          {viewMode === 'list' && (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-16 w-16 mx-auto text-gray-700 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Vue Liste
                </h3>
                <p className="text-gray-600">
                  Vue liste des sociétés en cours de développement
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiCompanyPage;