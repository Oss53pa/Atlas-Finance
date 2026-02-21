/**
 * Module Appels de Fonds Atlas Finance
 * Interface complète avec workflow de validation selon cahier des charges
 */
import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  CreditCard,
  Plus,
  Download,
  Upload,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Edit3,
  Trash2,
  Filter,
  Search,
  Send,
  FileText,
  User,
  Building2,
  DollarSign,
  Percent,
  Target,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine
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
  TabsTrigger,
  Textarea
} from '../../components/ui';

interface PayableItem {
  id: string;
  vendor: string;
  vendorCode: string;
  documentDate: Date;
  documentNumber: string;
  reference: string;
  description: string;
  dueAmount: number;
  outstanding: number;
  invoiceType: 'ACHAT' | 'PRESTATION' | 'IMMOBILISATION' | 'AUTRE';
  arrearsAging: number; // jours de retard
  dueDate: Date;
  paymentTerms: string;
  selected?: boolean;
  recommendation?: 'PAIEMENT_COMPLET' | 'PAIEMENT_PARTIEL' | 'REPORTER' | 'URGENT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  account: string;
}

interface FundCall {
  id: string;
  reference: string;
  date: Date;
  requestedBy: string;
  totalAmount: number;
  status: 'BROUILLON' | 'SOUMIS' | 'APPROUVE' | 'REJETE' | 'PAYE';
  workflowStep: 'CREATION' | 'VALIDATION_COMPTABLE' | 'VALIDATION_FINANCIERE' | 'VALIDATION_DIRECTION' | 'EXECUTION';
  approvers: {
    comptable?: { name: string; date?: Date; comment?: string };
    financier?: { name: string; date?: Date; comment?: string };
    direction?: { name: string; date?: Date; comment?: string };
  };
  items: PayableItem[];
  justification: string;
  paymentDate?: Date;
  bankAccount?: string;
}

const FundCallsPage: React.FC = () => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'payables' | 'fund-calls' | 'workflow'>('payables');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [proposedPayments, setProposedPayments] = useState<PayableItem[]>([]);
  const [groupBy, setGroupBy] = useState<'vendor' | 'type' | 'priority' | 'none'>('vendor');
  const [showFutureTransactions, setShowFutureTransactions] = useState(false);

  // Récupération des comptes à payer
  const { data: payables, isLoading } = useQuery({
    queryKey: ['payables', 'outstanding'],
    queryFn: async (): Promise<PayableItem[]> => [
      {
        id: '1',
        vendor: 'CAMTEL SERVICES',
        vendorCode: 'F001',
        documentDate: new Date(2024, 6, 15),
        documentNumber: 'FACT-2024-0156',
        reference: 'TEL-INTERNET-Q3',
        description: 'Facture téléphonie et internet Q3 2024',
        dueAmount: 450000,
        outstanding: 450000,
        invoiceType: 'PRESTATION',
        arrearsAging: 25,
        dueDate: new Date(2024, 7, 15),
        paymentTerms: '30 jours',
        priority: 'MEDIUM',
        account: '401100',
        recommendation: 'PAIEMENT_COMPLET'
      },
      {
        id: '2',
        vendor: 'ENEO CAMEROUN',
        vendorCode: 'F002',
        documentDate: new Date(2024, 6, 20),
        documentNumber: 'ELEC-2024-789',
        reference: 'ELEC-JUILLET-2024',
        description: 'Facture électricité juillet 2024',
        dueAmount: 1250000,
        outstanding: 1250000,
        invoiceType: 'PRESTATION',
        arrearsAging: 15,
        dueDate: new Date(2024, 7, 20),
        paymentTerms: '15 jours',
        priority: 'HIGH',
        account: '401100',
        recommendation: 'URGENT'
      },
      {
        id: '3',
        vendor: 'SOCIÉTÉ GÉNÉRALE',
        vendorCode: 'F015',
        documentDate: new Date(2024, 6, 1),
        documentNumber: 'AGI-2024-Q2',
        reference: 'AGIOS-T2-2024',
        description: 'Agios et commissions T2 2024',
        dueAmount: 180000,
        outstanding: 180000,
        invoiceType: 'AUTRE',
        arrearsAging: 45,
        dueDate: new Date(2024, 6, 31),
        paymentTerms: 'Immédiat',
        priority: 'CRITICAL',
        account: '627000',
        recommendation: 'URGENT'
      },
      {
        id: '4',
        vendor: 'MATÉRIEL BUREAU SARL',
        vendorCode: 'F025',
        documentDate: new Date(2024, 7, 5),
        documentNumber: 'MAT-2024-145',
        reference: 'FOURNITURES-AOUT',
        description: 'Fournitures de bureau août 2024',
        dueAmount: 320000,
        outstanding: 320000,
        invoiceType: 'ACHAT',
        arrearsAging: 10,
        dueDate: new Date(2024, 8, 5),
        paymentTerms: '30 jours',
        priority: 'LOW',
        account: '401100',
        recommendation: 'REPORTER'
      },
      {
        id: '5',
        vendor: 'TRACTEURS & ÉQUIPEMENTS',
        vendorCode: 'F030',
        documentDate: new Date(2024, 5, 10),
        documentNumber: 'TRAC-2024-012',
        reference: 'EQUIPEMENT-PRODUCTION',
        description: 'Acquisition équipement production',
        dueAmount: 8500000,
        outstanding: 8500000,
        invoiceType: 'IMMOBILISATION',
        arrearsAging: 65,
        dueDate: new Date(2024, 6, 10),
        paymentTerms: '30 jours',
        priority: 'CRITICAL',
        account: '404100',
        recommendation: 'PAIEMENT_PARTIEL'
      }
    ]
  });

  // Appels de fonds existants
  const { data: fundCalls } = useQuery({
    queryKey: ['fund-calls'],
    queryFn: async (): Promise<FundCall[]> => [
      {
        id: 'FC-2024-001',
        reference: 'AF-AOÛT-2024-001',
        date: new Date(2024, 7, 1),
        requestedBy: 'Marie DUPONT',
        totalAmount: 2750000,
        status: 'APPROUVE',
        workflowStep: 'EXECUTION',
        approvers: {
          comptable: { name: 'Pierre MARTIN', date: new Date(2024, 7, 2), comment: 'Factures vérifiées' },
          financier: { name: 'Sophie BERNARD', date: new Date(2024, 7, 3), comment: 'Trésorerie disponible' },
          direction: { name: 'Jean KOUAM', date: new Date(2024, 7, 4), comment: 'Validé pour paiement' }
        },
        items: [],
        justification: 'Paiement fournisseurs critiques et charges courantes',
        paymentDate: new Date(2024, 7, 5),
        bankAccount: '521100'
      }
    ]
  });

  const handleItemSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
      setProposedPayments(prev => prev.filter(p => p.id !== itemId));
    } else {
      newSelected.add(itemId);
      const item = payables?.find(p => p.id === itemId);
      if (item) {
        setProposedPayments(prev => [...prev, item]);
      }
    }
    setSelectedItems(newSelected);
  };

  const groupedPayables = useMemo(() => {
    if (!payables || groupBy === 'none') return { 'Tous': payables || [] };
    
    return payables.reduce((groups, item) => {
      let groupKey = '';
      switch (groupBy) {
        case 'vendor':
          groupKey = item.vendor;
          break;
        case 'type':
          groupKey = item.invoiceType;
          break;
        case 'priority':
          groupKey = item.priority;
          break;
        default:
          groupKey = 'Tous';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, PayableItem[]>);
  }, [payables, groupBy]);

  const totalOutstanding = useMemo(() => {
    return payables?.reduce((sum, item) => sum + item.outstanding, 0) || 0;
  }, [payables]);

  const selectedAmount = useMemo(() => {
    return proposedPayments.reduce((sum, item) => sum + item.outstanding, 0);
  }, [proposedPayments]);


  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Critique</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Haute</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Moyenne</Badge>;
      case 'LOW':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Basse</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BROUILLON':
        return <Badge className="bg-gray-100 text-gray-800">{t('accounting.draft')}</Badge>;
      case 'SOUMIS':
        return <Badge className="bg-[#6A8A82]/10 text-[#6A8A82]">Soumis</Badge>;
      case 'APPROUVE':
        return <Badge className="bg-green-100 text-green-800">Approuvé</Badge>;
      case 'REJETE':
        return <Badge className="bg-red-100 text-red-800">Rejeté</Badge>;
      case 'PAYE':
        return <Badge className="bg-[#B87333]/10 text-[#B87333]">Payé</Badge>;
      default:
        return null;
    }
  };

  const renderPayablesTable = () => (
    <div className="space-y-6">
      {/* Résumé et filtres */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total à Payer</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(totalOutstanding)}
                </p>
                <p className="text-sm text-gray-700">{payables?.length} factures</p>
              </div>
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sélectionné</p>
                <p className="text-lg font-bold text-[#6A8A82]">
                  {formatCurrency(selectedAmount)}
                </p>
                <p className="text-sm text-gray-700">{proposedPayments.length} éléments</p>
              </div>
              <ArrowDownToLine className="h-8 w-8 text-[#6A8A82]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Retard</p>
                <p className="text-lg font-bold text-orange-600">
                  {payables?.filter(p => p.arrearsAging > 0).length || 0}
                </p>
                <p className="text-sm text-gray-700">
                  {formatCurrency(payables?.filter(p => p.arrearsAging > 0)
                    .reduce((sum, p) => sum + p.outstanding, 0) || 0)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critiques</p>
                <p className="text-lg font-bold text-red-600">
                  {payables?.filter(p => p.priority === 'CRITICAL').length || 0}
                </p>
                <p className="text-sm text-gray-700">Paiement urgent</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et contrôles */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-700" />
                <Input
                  placeholder="Rechercher fournisseur ou facture..."
                  className="pl-10 w-80"
                />
              </div>
              
              <Select value={groupBy} onValueChange={(value: string) => setGroupBy(value as 'vendor' | 'type' | 'priority' | 'none')}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendor">Grouper par fournisseur</SelectItem>
                  <SelectItem value="type">Grouper par type</SelectItem>
                  <SelectItem value="priority">Grouper par priorité</SelectItem>
                  <SelectItem value="none">Pas de groupement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="futureTransactions"
                checked={showFutureTransactions}
                onCheckedChange={(checked) => setShowFutureTransactions(checked as boolean)}
              />
              <Label htmlFor="futureTransactions" className="text-sm">
                Inclure transactions futures
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau 1: Comptes à payer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Comptes à Payer (Total Outstanding)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={selectedItems.size === payables?.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems(new Set(payables?.map(p => p.id) || []));
                          setProposedPayments(payables || []);
                        } else {
                          setSelectedItems(new Set());
                          setProposedPayments([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Date Document</TableHead>
                  <TableHead>N° Document</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Montant Dû</TableHead>
                  <TableHead className="text-right">{t('accounting.balance')}</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Retard (jours)</TableHead>
                  <TableHead>Priorité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedPayables).map(([groupName, items]) => (
                  <React.Fragment key={groupName}>
                    {groupBy !== 'none' && (
                      <TableRow className="bg-slate-50 border-t-2">
                        <TableCell colSpan={11}>
                          <div className="flex items-center justify-between font-semibold">
                            <span>{groupName}</span>
                            <span>
                              {items.length} facture{items.length > 1 ? 's' : ''} • {' '}
                              {formatCurrency(items.reduce((sum, item) => sum + item.outstanding, 0))}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {items.map((item) => (
                      <TableRow 
                        key={item.id} 
                        className={`hover:bg-slate-50 ${
                          item.priority === 'CRITICAL' ? 'bg-red-50' :
                          item.arrearsAging > 30 ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => handleItemSelect(item.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.vendor}</div>
                          <div className="text-sm text-gray-700">{item.vendorCode}</div>
                        </TableCell>
                        <TableCell>{item.documentDate.toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell className="font-mono text-sm">{item.documentNumber}</TableCell>
                        <TableCell className="font-mono text-sm">{item.reference}</TableCell>
                        <TableCell className="max-w-48 truncate">{item.description}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.dueAmount)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(item.outstanding)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.invoiceType}</Badge>
                        </TableCell>
                        <TableCell className={`text-right ${
                          item.arrearsAging > 60 ? 'text-red-600 font-bold' :
                          item.arrearsAging > 30 ? 'text-orange-600 font-semibold' :
                          item.arrearsAging > 0 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {item.arrearsAging > 0 ? `+${item.arrearsAging}` : '0'}
                        </TableCell>
                        <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tableau 2: Paiements proposés */}
      {proposedPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpFromLine className="h-5 w-5" />
                Paiements Proposés (Amount Required)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#6A8A82]">
                  {formatCurrency(selectedAmount)}
                </span>
                <Button onClick={() => setViewMode('workflow')}>
                  <Send className="h-4 w-4 mr-2" />
                  Créer Appel de Fonds
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Retard</TableHead>
                  <TableHead>Recommandation</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposedPayments.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.vendor}</div>
                      <div className="text-sm text-gray-700">{item.vendorCode}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{item.documentNumber}</div>
                      <div className="text-xs text-gray-700">{item.documentDate.toLocaleDateString('fr-FR')}</div>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{item.description}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(item.outstanding)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.arrearsAging > 0 ? (
                        <span className="text-red-600 font-semibold">+{item.arrearsAging}j</span>
                      ) : (
                        <span className="text-green-600">À jour</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={item.recommendation} 
                        onValueChange={(value: string) => {
                          setProposedPayments(prev =>
                            prev.map(p => p.id === item.id ? { ...p, recommendation: value } : p)
                          );
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PAIEMENT_COMPLET">Paiement complet</SelectItem>
                          <SelectItem value="PAIEMENT_PARTIEL">Paiement partiel</SelectItem>
                          <SelectItem value="REPORTER">Reporter</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleItemSelect(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderFundCallsList = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Historique des Appels de Fonds
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>{t('common.date')}</TableHead>
              <TableHead>Demandeur</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Étape Workflow</TableHead>
              <TableHead>Date Paiement</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fundCalls?.map((fundCall) => (
              <TableRow key={fundCall.id} className="hover:bg-slate-50">
                <TableCell>
                  <div className="font-mono font-medium">{fundCall.reference}</div>
                  <div className="text-sm text-gray-700">{fundCall.items.length} éléments</div>
                </TableCell>
                <TableCell>{fundCall.date.toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-700" />
                    {fundCall.requestedBy}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrency(fundCall.totalAmount)}
                </TableCell>
                <TableCell>{getStatusBadge(fundCall.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {fundCall.workflowStep === 'EXECUTION' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-orange-600" />
                    )}
                    <span className="text-sm">{fundCall.workflowStep.replace('_', ' ')}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {fundCall.paymentDate?.toLocaleDateString('fr-FR') || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderWorkflow = () => (
    <div className="space-y-6">
      <Alert>
        <Send className="h-4 w-4" />
        <AlertDescription>
          Le workflow d'approbation garantit le contrôle des paiements selon la matrice de délégation définie.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Résumé de l'appel de fonds */}
        <Card>
          <CardHeader>
            <CardTitle>Résumé de l'Appel de Fonds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Date de demande</Label>
                <p className="font-medium">{new Date().toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Nombre de paiements</Label>
                <p className="font-medium">{proposedPayments.length}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Montant total</Label>
                <p className="font-mono font-bold text-[#6A8A82]">
                  {formatCurrency(selectedAmount)}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Priorité moyenne</Label>
                <p className="font-medium">Haute</p>
              </div>
            </div>

            <div>
              <Label htmlFor="justification">Justification *</Label>
              <Textarea
                id="justification"
                placeholder="Motif de l'appel de fonds et justification des paiements..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-sm text-gray-600">Répartition par type</Label>
              <div className="space-y-2 mt-2">
                {['ACHAT', 'PRESTATION', 'IMMOBILISATION', 'AUTRE'].map(type => {
                  const items = proposedPayments.filter(p => p.invoiceType === type);
                  const amount = items.reduce((sum, p) => sum + p.outstanding, 0);
                  if (amount === 0) return null;
                  
                  return (
                    <div key={type} className="flex justify-between text-sm">
                      <span>{type}</span>
                      <span className="font-mono">{formatCurrency(amount)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow de validation */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow de Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  step: 'CREATION',
                  label: 'Création',
                  user: 'Demandeur',
                  status: 'completed',
                  icon: FileText
                },
                {
                  step: 'VALIDATION_COMPTABLE',
                  label: 'Validation Comptable',
                  user: 'Chef Comptable',
                  status: 'pending',
                  icon: Calculator
                },
                {
                  step: 'VALIDATION_FINANCIERE',
                  label: 'Validation Financière',
                  user: 'Directeur Financier',
                  status: 'waiting',
                  icon: DollarSign
                },
                {
                  step: 'VALIDATION_DIRECTION',
                  label: 'Validation Direction',
                  user: 'Directeur Général',
                  status: 'waiting',
                  icon: Building2
                },
                {
                  step: 'EXECUTION',
                  label: 'Exécution Paiement',
                  user: 'Trésorier',
                  status: 'waiting',
                  icon: Send
                }
              ].map((stage, index) => {
                const Icon = stage.icon;
                
                return (
                  <div key={stage.step} className="flex items-center gap-4">
                    <div className={`rounded-full p-2 border-2 ${
                      stage.status === 'completed' ? 'bg-green-600 border-green-600 text-white' :
                      stage.status === 'pending' ? 'bg-blue-600 border-blue-600 text-white' :
                      'bg-white border-gray-300 text-gray-700'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium">{stage.label}</div>
                      <div className="text-sm text-gray-600">{stage.user}</div>
                    </div>
                    
                    <div>
                      {stage.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {stage.status === 'pending' && (
                        <Clock className="h-5 w-5 text-[#6A8A82]" />
                      )}
                      {stage.status === 'waiting' && (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-between">
                <Button variant="outline">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Enregistrer Brouillon
                </Button>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Soumettre Appel de Fonds
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-8 mb-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-3">
              <CreditCard className="h-10 w-10" />
              Appels de Fonds
            </h1>
            <p className="text-slate-200 text-lg mt-2">
              Gestion des demandes de paiement avec workflow de validation
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button className="bg-white text-slate-800 hover:bg-slate-100">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-slate-800">
              <Download className="h-4 w-4 mr-2" />
              Templates
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-xl shadow-sm mb-8 p-1">
        <div className="flex gap-1">
          {[
            { key: 'payables', label: 'Comptes à Payer', icon: FileText },
            { key: 'fund-calls', label: 'Historique', icon: Send },
            { key: 'workflow', label: 'Workflow', icon: Target },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key as 'payables' | 'fund-calls' | 'workflow')}
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

      {/* Contenu */}
      {viewMode === 'payables' && renderPayablesTable()}
      {viewMode === 'fund-calls' && renderFundCallsList()}
      {viewMode === 'workflow' && renderWorkflow()}
    </div>
  );
};

export default FundCallsPage;