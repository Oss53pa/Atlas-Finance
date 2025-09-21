import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus as PlusIcon,
  Trash2 as TrashIcon,
  FileText as DocumentTextIcon,
  Banknote as BanknotesIcon,
  ShoppingCart as ShoppingCartIcon,
  Receipt as ReceiptRefundIcon,
  Settings as CogIcon,
  CheckCircle as CheckCircleIcon,
  AlertTriangle as ExclamationTriangleIcon,
  Calculator as CalculatorIcon,
  SplitSquareHorizontal as SplitSquareHorizontalIcon,
  Paperclip as AttachmentIcon,
  User as UserIcon,
  Clock as ClockIcon,
  Save as SaveIcon,
  Eye as EyeIcon
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Switch,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Textarea
} from '../../components/ui';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';

// Schémas de validation Zod
const journalEntrySchema = z.object({
  entryDate: z.string().min(1, 'Date obligatoire'),
  journal: z.string().min(1, 'Journal obligatoire'),
  reference: z.string().optional(),
  externalReference: z.string().optional(),
  description: z.string().min(1, 'Description obligatoire'),
  notes: z.string().optional(),
  attachments: z.array(z.string()).default([]),
  preparedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  transactionType: z.enum(['PURCHASE', 'SALE', 'PAYMENT', 'GENERAL']),
  
  // Données spécifiques selon le type
  purchaseData: z.object({
    supplier: z.string().optional(),
    supplierInvoiceNumber: z.string().optional(),
    invoiceDate: z.string().optional(),
    paymentTerms: z.number().optional(),
    notes: z.string().optional(),
  }).optional(),
  
  saleData: z.object({
    customer: z.string().optional(),
    invoiceNumber: z.string().optional(),
    invoiceDate: z.string().optional(),
    paymentTerms: z.number().optional(),
    notes: z.string().optional(),
  }).optional(),
  
  paymentData: z.object({
    paymentMethod: z.string().optional(),
    bankAccount: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().default('XAF'),
    exchangeRate: z.number().default(1),
    thirdPartyType: z.enum(['CUSTOMER', 'SUPPLIER']).optional(),
    thirdParty: z.string().optional(),
    relatedInvoice: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  
  generalData: z.object({
    entryType: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  
  // Lignes d'écriture avec ventilation
  lines: z.array(z.object({
    id: z.string(),
    account: z.string().min(1, 'Compte obligatoire'),
    description: z.string().min(1, 'Description obligatoire'),
    debitAmount: z.number().min(0).default(0),
    creditAmount: z.number().min(0).default(0),
    thirdParty: z.string().optional(),
    costCenter: z.string().optional(),
    project: z.string().optional(),
    department: z.string().optional(),
    analyticalAccount: z.string().optional(),
    lineNotes: z.string().optional(),
    
    // Ventilation (subdivision)
    isVentilated: z.boolean().default(false),
    ventilationLines: z.array(z.object({
      id: z.string(),
      account: z.string(),
      description: z.string(),
      amount: z.number(),
      percentage: z.number().optional(),
      costCenter: z.string().optional(),
      project: z.string().optional(),
    })).default([]),
  })).min(1, 'Au moins une ligne obligatoire'),
});

type JournalEntryFormData = z.infer<typeof journalEntrySchema>;

interface Account {
  id: string;
  code: string;
  name: string;
  accountClass: string;
  allowedThirdParties: boolean;
  vatRate?: number;
}

interface ThirdParty {
  id: string;
  code: string;
  name: string;
  type: 'CUSTOMER' | 'SUPPLIER';
  accountCode: string;
}

interface Journal {
  id: string;
  code: string;
  name: string;
  type: string;
  sequence: number;
}

interface UnpaidInvoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  remainingAmount: number;
  dueDate: string;
}

const AdvancedJournalEntryForm: React.FC = () => {
  const [showPreview, setShowPreview] = useState(false);
  const [selectedLineForVentilation, setSelectedLineForVentilation] = useState<string | null>(null);
  const [autoCalculateVAT, setAutoCalculateVAT] = useState(true);
  const [showAttachments, setShowAttachments] = useState(false);

  const queryClient = useQueryClient();

  // Données de référence
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => [
      { id: '1', code: '101', name: 'Capital social', accountClass: '1', allowedThirdParties: false },
      { id: '2', code: '401001', name: 'Fournisseur ABC', accountClass: '4', allowedThirdParties: true },
      { id: '3', code: '411001', name: 'Client XYZ', accountClass: '4', allowedThirdParties: true },
      { id: '4', code: '601', name: 'Achats de marchandises', accountClass: '6', allowedThirdParties: false, vatRate: 19.25 },
      { id: '5', code: '701', name: 'Ventes de marchandises', accountClass: '7', allowedThirdParties: false, vatRate: 19.25 },
      { id: '6', code: '4456', name: 'TVA déductible', accountClass: '4', allowedThirdParties: false },
      { id: '7', code: '4457', name: 'TVA collectée', accountClass: '4', allowedThirdParties: false },
      { id: '8', code: '512', name: 'Banque SGBC', accountClass: '5', allowedThirdParties: false },
      { id: '9', code: '530', name: 'Caisse', accountClass: '5', allowedThirdParties: false },
    ]
  });

  const { data: thirdParties = [] } = useQuery<ThirdParty[]>({
    queryKey: ['third-parties'],
    queryFn: async () => [
      { id: '1', code: 'F001', name: 'Fournisseur ABC SARL', type: 'SUPPLIER', accountCode: '401001' },
      { id: '2', code: 'C001', name: 'Client XYZ SA', type: 'CUSTOMER', accountCode: '411001' },
    ]
  });

  const { data: journals = [] } = useQuery<Journal[]>({
    queryKey: ['journals'],
    queryFn: async () => [
      { id: '1', code: 'ACH', name: 'Journal des Achats', type: 'PURCHASE', sequence: 1 },
      { id: '2', code: 'VTE', name: 'Journal des Ventes', type: 'SALE', sequence: 1 },
      { id: '3', code: 'BQ1', name: 'Banque SGBC', type: 'BANK', sequence: 1 },
      { id: '4', code: 'OD', name: 'Opérations Diverses', type: 'GENERAL', sequence: 1 },
    ]
  });

  // Formulaire principal
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset
  } = useForm<JournalEntryFormData>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      entryDate: new Date().toISOString().split('T')[0],
      transactionType: 'GENERAL',
      lines: [
        {
          id: crypto.randomUUID(),
          account: '',
          description: '',
          debitAmount: 0,
          creditAmount: 0,
          isVentilated: false,
          ventilationLines: []
        }
      ]
    }
  });

  const { fields: lines, append: appendLine, remove: removeLine, update: updateLine } = useFieldArray({
    control,
    name: 'lines'
  });

  // Surveillance des changements
  const watchedTransactionType = watch('transactionType');
  const watchedLines = watch('lines');

  // Calculs dérivés
  const totalDebit = useMemo(() => {
    return watchedLines.reduce((sum, line) => {
      if (line.isVentilated) {
        return sum + (line.ventilationLines?.reduce((vSum, vLine) => vSum + (vLine.amount || 0), 0) || 0);
      }
      return sum + (line.debitAmount || 0);
    }, 0);
  }, [watchedLines]);

  const totalCredit = useMemo(() => {
    return watchedLines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
  }, [watchedLines]);

  const isBalanced = useMemo(() => {
    return Math.abs(totalDebit - totalCredit) < 0.01;
  }, [totalDebit, totalCredit]);

  const balancePercentage = useMemo(() => {
    const total = Math.max(totalDebit, totalCredit);
    if (total === 0) return 100;
    return Math.max(0, 100 - (Math.abs(totalDebit - totalCredit) / total * 100));
  }, [totalDebit, totalCredit]);

  // Mutation pour sauvegarder
  const saveEntryMutation = useMutation({
    mutationFn: async (data: JournalEntryFormData) => {
      // TODO: Send data to backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      reset();
    }
  });

  // Handlers
  const onSubmit = (data: JournalEntryFormData) => {
    saveEntryMutation.mutate(data);
  };

  const addLine = () => {
    appendLine({
      id: crypto.randomUUID(),
      account: '',
      description: '',
      debitAmount: 0,
      creditAmount: 0,
      isVentilated: false,
      ventilationLines: []
    });
  };

  const openVentilationDialog = (lineIndex: number) => {
    setSelectedLineForVentilation(lines[lineIndex].id);
  };

  const autoCalculateVATForLine = useCallback((lineIndex: number, amount: number, isDebit: boolean) => {
    const line = watchedLines[lineIndex];
    const account = accounts.find(acc => acc.id === line.account);
    
    if (account?.vatRate && autoCalculateVAT) {
      const vatAmount = amount * (account.vatRate / 100);
      const vatAccountCode = isDebit ? '4456' : '4457'; // TVA déductible/collectée
      const vatAccount = accounts.find(acc => acc.code === vatAccountCode);
      
      if (vatAccount) {
        // Ajouter automatiquement une ligne de TVA
        appendLine({
          id: crypto.randomUUID(),
          account: vatAccount.id,
          description: `TVA ${account.vatRate}% - ${line.description}`,
          debitAmount: isDebit ? vatAmount : 0,
          creditAmount: isDebit ? 0 : vatAmount,
          isVentilated: false,
          ventilationLines: []
        });
      }
    }
  }, [watchedLines, accounts, autoCalculateVAT, appendLine]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE': return <ShoppingCartIcon className="h-5 w-5 text-blue-600" />;
      case 'SALE': return <ReceiptRefundIcon className="h-5 w-5 text-green-600" />;
      case 'PAYMENT': return <BanknotesIcon className="h-5 w-5 text-purple-600" />;
      case 'GENERAL': return <DocumentTextIcon className="h-5 w-5 text-gray-600" />;
      default: return <DocumentTextIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'PURCHASE': return 'border-blue-200 bg-blue-50';
      case 'SALE': return 'border-green-200 bg-green-50';
      case 'PAYMENT': return 'border-purple-200 bg-purple-50';
      case 'GENERAL': return 'border-gray-200 bg-gray-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  // formatCurrency importé depuis ../../lib/utils

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header avec sélection du type */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getTransactionIcon(watchedTransactionType)}
              <div>
                <CardTitle className="text-xl">Saisie d'Écriture Avancée</CardTitle>
                <p className="text-gray-600">Formulaire multi-types avec ventilation sophistiquée</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Indicateur d'équilibre */}
              <div className="flex items-center space-x-2">
                <div className="w-32">
                  <Progress 
                    value={balancePercentage} 
                    className={`h-2 ${isBalanced ? 'bg-green-200' : 'bg-red-200'}`}
                  />
                </div>
                <Badge className={isBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {isBalanced ? 'Équilibrée' : `Écart: ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Sélection du type de transaction */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { value: 'PURCHASE', label: 'Facture d\'Achat', icon: ShoppingCartIcon, color: 'blue' },
                { value: 'SALE', label: 'Facture de Vente', icon: ReceiptRefundIcon, color: 'green' },
                { value: 'PAYMENT', label: 'Règlement', icon: BanknotesIcon, color: 'purple' },
                { value: 'GENERAL', label: 'Opération Diverse', icon: DocumentTextIcon, color: 'gray' }
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setValue('transactionType', type.value as any)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    watchedTransactionType === type.value
                      ? getTransactionColor(type.value) + ' border-opacity-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <type.icon className={`h-6 w-6 text-${type.color}-600`} />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{type.label}</p>
                      <p className="text-sm text-gray-600">
                        {type.value === 'PURCHASE' && 'Avec TVA auto-calculée'}
                        {type.value === 'SALE' && 'Avec ventilation produits'}
                        {type.value === 'PAYMENT' && 'Avec lettrage auto'}
                        {type.value === 'GENERAL' && 'Saisie libre'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations Générales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <Controller
                      name="entryDate"
                      control={control}
                      render={({ field }) => (
                        <Input 
                          type="date" 
                          {...field} 
                          className={errors.entryDate ? 'border-red-300' : ''}
                        />
                      )}
                    />
                    {errors.entryDate && (
                      <p className="text-red-600 text-xs mt-1">{errors.entryDate.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Journal *</label>
                    <Controller
                      name="journal"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className={errors.journal ? 'border-red-300' : ''}>
                            <SelectValue placeholder="Sélectionner un journal" />
                          </SelectTrigger>
                          <SelectContent>
                            {journals.map((journal) => (
                              <SelectItem key={journal.id} value={journal.id}>
                                {journal.code} - {journal.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Référence externe</label>
                    <Controller
                      name="externalReference"
                      control={control}
                      render={({ field }) => (
                        <Input 
                          placeholder="N° facture, chèque..."
                          {...field} 
                        />
                      )}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => (
                        <Input 
                          placeholder="Description de l'opération"
                          {...field}
                          className={errors.description ? 'border-red-300' : ''}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <Controller
                      name="notes"
                      control={control}
                      render={({ field }) => (
                        <Textarea 
                          placeholder="Notes internes..."
                          {...field}
                          rows={2}
                        />
                      )}
                    />
                  </div>
                </div>

                {/* Options avancées */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={autoCalculateVAT}
                          onCheckedChange={setAutoCalculateVAT}
                        />
                        <label className="text-sm text-gray-700">Auto-calcul TVA</label>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAttachments(true)}
                      >
                        <AttachmentIcon className="h-4 w-4 mr-2" />
                        Pièces jointes
                      </Button>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <UserIcon className="h-4 w-4" />
                        <span>Préparé par: Admin</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Formulaires spécialisés selon le type */}
            {watchedTransactionType === 'PURCHASE' && (
              <PurchaseSpecificForm control={control} errors={errors} />
            )}
            {watchedTransactionType === 'SALE' && (
              <SaleSpecificForm control={control} errors={errors} />
            )}
            {watchedTransactionType === 'PAYMENT' && (
              <PaymentSpecificForm control={control} errors={errors} thirdParties={thirdParties} />
            )}
            {watchedTransactionType === 'GENERAL' && (
              <GeneralSpecificForm control={control} errors={errors} />
            )}

            {/* Lignes d'écriture avec ventilation */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Lignes d'Écriture</CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600">
                      Total Débit: <span className="font-bold text-blue-600">{formatCurrency(totalDebit)}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Total Crédit: <span className="font-bold text-green-600">{formatCurrency(totalCredit)}</span>
                    </div>
                    <Button
                      type="button"
                      onClick={addLine}
                      variant="outline"
                      size="sm"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Ajouter Ligne
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Compte</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Description</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Débit</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Crédit</th>
                        <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Analytique</th>
                        <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, index) => (
                        <JournalEntryLineRow
                          key={line.id}
                          line={line}
                          index={index}
                          control={control}
                          accounts={accounts}
                          onRemove={() => removeLine(index)}
                          onVentilate={() => openVentilationDialog(index)}
                          onAmountChange={(amount, isDebit) => autoCalculateVATForLine(index, amount, isDebit)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Indicateur d'équilibre visuel */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Équilibre de l'écriture</span>
                    <div className="flex items-center space-x-2">
                      {isBalanced ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                        {isBalanced ? 'Équilibrée' : `Écart: ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={balancePercentage} 
                    className={`h-3 ${isBalanced ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Aperçu du grand livre */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Aperçu Grand Livre</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    {showPreview ? 'Masquer' : 'Afficher'} Aperçu
                  </Button>
                </div>
              </CardHeader>
              {showPreview && (
                <CardContent>
                  <GeneralLedgerPreview lines={watchedLines} accounts={accounts} />
                </CardContent>
              )}
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => reset()}
                >
                  Réinitialiser
                </Button>
                <Button
                  type="button"
                  variant="outline"
                >
                  Sauvegarder Brouillon
                </Button>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  type="submit"
                  disabled={!isValid || !isBalanced || saveEntryMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <SaveIcon className="h-4 w-4 mr-2" />
                  {saveEntryMutation.isPending ? 'Enregistrement...' : 'Enregistrer & Valider'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Dialog de ventilation */}
      <VentilationDialog
        isOpen={selectedLineForVentilation !== null}
        onClose={() => setSelectedLineForVentilation(null)}
        lineId={selectedLineForVentilation}
        accounts={accounts}
        onSave={(ventilationData) => {
          // TODO: Process ventilation data
          setSelectedLineForVentilation(null);
        }}
      />
    </div>
  );
};

// Composant pour les lignes d'écriture
const JournalEntryLineRow: React.FC<{
  line: any;
  index: number;
  control: any;
  accounts: Account[];
  onRemove: () => void;
  onVentilate: () => void;
  onAmountChange: (amount: number, isDebit: boolean) => void;
}> = ({ line, index, control, accounts, onRemove, onVentilate, onAmountChange }) => {
  const selectedAccount = accounts.find(acc => acc.id === line.account);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-3">
        <Controller
          name={`lines.${index}.account`}
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un compte" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </td>

      <td className="py-3 px-3">
        <Controller
          name={`lines.${index}.description`}
          control={control}
          render={({ field }) => (
            <Input 
              placeholder="Description de la ligne"
              {...field}
              className="w-full"
            />
          )}
        />
      </td>

      <td className="py-3 px-3">
        <Controller
          name={`lines.${index}.debitAmount`}
          control={control}
          render={({ field }) => (
            <Input 
              type="number"
              step="0.01"
              placeholder="0.00"
              {...field}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                field.onChange(value);
                if (value > 0) {
                  onAmountChange(value, true);
                }
              }}
              className="w-full text-right"
            />
          )}
        />
      </td>

      <td className="py-3 px-3">
        <Controller
          name={`lines.${index}.creditAmount`}
          control={control}
          render={({ field }) => (
            <Input 
              type="number"
              step="0.01"
              placeholder="0.00"
              {...field}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                field.onChange(value);
                if (value > 0) {
                  onAmountChange(value, false);
                }
              }}
              className="w-full text-right"
            />
          )}
        />
      </td>

      <td className="py-3 px-3 text-center">
        <div className="flex items-center justify-center space-x-2">
          {line.isVentilated && (
            <Badge variant="outline" className="text-xs">
              Ventilé ({line.ventilationLines?.length || 0})
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onVentilate}
            title="Ventilation par comptes"
          >
            <SplitSquareHorizontalIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>

      <td className="py-3 px-3 text-center">
        <div className="flex items-center justify-center space-x-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

// Formulaire spécialisé pour les achats
const PurchaseSpecificForm: React.FC<{ control: any; errors: any }> = ({ control, errors }) => (
  <Card className="border-blue-200 bg-blue-50">
    <CardHeader>
      <CardTitle className="text-lg flex items-center">
        <ShoppingCartIcon className="h-5 w-5 mr-2 text-blue-600" />
        Données Facture d'Achat
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
          <Controller
            name="purchaseData.supplier"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier1">F001 - Fournisseur ABC SARL</SelectItem>
                  <SelectItem value="supplier2">F002 - Fournisseur XYZ SA</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">N° Facture Fournisseur</label>
          <Controller
            name="purchaseData.supplierInvoiceNumber"
            control={control}
            render={({ field }) => <Input placeholder="FA-2024-001" {...field} />}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Facture</label>
          <Controller
            name="purchaseData.invoiceDate"
            control={control}
            render={({ field }) => <Input type="date" {...field} />}
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes Achat</label>
          <Controller
            name="purchaseData.notes"
            control={control}
            render={({ field }) => (
              <Textarea 
                placeholder="Notes spécifiques à cet achat..."
                {...field}
                rows={2}
              />
            )}
          />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Formulaire spécialisé pour les ventes
const SaleSpecificForm: React.FC<{ control: any; errors: any }> = ({ control, errors }) => (
  <Card className="border-green-200 bg-green-50">
    <CardHeader>
      <CardTitle className="text-lg flex items-center">
        <ReceiptRefundIcon className="h-5 w-5 mr-2 text-green-600" />
        Données Facture de Vente
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <Controller
            name="saleData.customer"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer1">C001 - Client XYZ SA</SelectItem>
                  <SelectItem value="customer2">C002 - Client ABC SARL</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">N° Facture</label>
          <Controller
            name="saleData.invoiceNumber"
            control={control}
            render={({ field }) => <Input placeholder="FV-2024-001" {...field} />}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Échéance (jours)</label>
          <Controller
            name="saleData.paymentTerms"
            control={control}
            render={({ field }) => (
              <Input 
                type="number" 
                placeholder="30"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
              />
            )}
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes Vente</label>
          <Controller
            name="saleData.notes"
            control={control}
            render={({ field }) => (
              <Textarea 
                placeholder="Notes spécifiques à cette vente..."
                {...field}
                rows={2}
              />
            )}
          />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Formulaire spécialisé pour les règlements
const PaymentSpecificForm: React.FC<{ 
  control: any; 
  errors: any; 
  thirdParties: ThirdParty[];
}> = ({ control, errors, thirdParties }) => {
  const [selectedThirdParty, setSelectedThirdParty] = useState<string>('');
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <BanknotesIcon className="h-5 w-5 mr-2 text-purple-600" />
          Données Règlement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode de Règlement</label>
              <Controller
                name="paymentData.paymentMethod"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRANSFER">Virement</SelectItem>
                      <SelectItem value="CHECK">Chèque</SelectItem>
                      <SelectItem value="CASH">Espèces</SelectItem>
                      <SelectItem value="CARD">Carte</SelectItem>
                      <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compte Bancaire</label>
              <Controller
                name="paymentData.bankAccount"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un compte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank1">512 - Banque SGBC</SelectItem>
                      <SelectItem value="bank2">513 - Banque UBA</SelectItem>
                      <SelectItem value="cash">530 - Caisse</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
              <Controller
                name="paymentData.amount"
                control={control}
                render={({ field }) => (
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de Tiers</label>
              <Controller
                name="paymentData.thirdPartyType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Client ou Fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUSTOMER">Client</SelectItem>
                      <SelectItem value="SUPPLIER">Fournisseur</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiers</label>
              <Controller
                name="paymentData.thirdParty"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un tiers" />
                    </SelectTrigger>
                    <SelectContent>
                      {thirdParties.map((party) => (
                        <SelectItem key={party.id} value={party.id}>
                          {party.code} - {party.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facture Associée</label>
              <Controller
                name="paymentData.relatedInvoice"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une facture" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inv1">FA-2024-001 - 850,000 XAF</SelectItem>
                      <SelectItem value="inv2">FA-2024-002 - 1,200,000 XAF</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes Règlement</label>
          <Controller
            name="paymentData.notes"
            control={control}
            render={({ field }) => (
              <Textarea 
                placeholder="Notes spécifiques au règlement..."
                {...field}
                rows={2}
              />
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

// Formulaire spécialisé pour les OD
const GeneralSpecificForm: React.FC<{ control: any; errors: any }> = ({ control, errors }) => (
  <Card className="border-gray-200 bg-gray-50">
    <CardHeader>
      <CardTitle className="text-lg flex items-center">
        <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-600" />
        Opération Diverse
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type d'OD</label>
          <Controller
            name="generalData.entryType"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEPRECIATION">Amortissement</SelectItem>
                  <SelectItem value="PROVISION">Provision</SelectItem>
                  <SelectItem value="RECLASSIFICATION">Reclassement</SelectItem>
                  <SelectItem value="CUTOFF">Cut-off</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajustement</SelectItem>
                  <SelectItem value="OTHER">Autre</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes OD</label>
          <Controller
            name="generalData.notes"
            control={control}
            render={({ field }) => (
              <Textarea 
                placeholder="Notes spécifiques à cette OD..."
                {...field}
                rows={3}
              />
            )}
          />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Aperçu du grand livre
const GeneralLedgerPreview: React.FC<{ 
  lines: any[]; 
  accounts: Account[];
}> = ({ lines, accounts }) => {
  const previewData = useMemo(() => {
    const accountSummary: Record<string, { account: Account; debit: number; credit: number; lines: any[] }> = {};

    lines.forEach(line => {
      const account = accounts.find(acc => acc.id === line.account);
      if (!account) return;

      if (!accountSummary[account.code]) {
        accountSummary[account.code] = {
          account,
          debit: 0,
          credit: 0,
          lines: []
        };
      }

      if (line.isVentilated && line.ventilationLines?.length > 0) {
        line.ventilationLines.forEach((vLine: any) => {
          const vAccount = accounts.find(acc => acc.id === vLine.account);
          if (vAccount) {
            if (!accountSummary[vAccount.code]) {
              accountSummary[vAccount.code] = {
                account: vAccount,
                debit: 0,
                credit: 0,
                lines: []
              };
            }
            accountSummary[vAccount.code].debit += vLine.amount || 0;
            accountSummary[vAccount.code].lines.push({
              description: vLine.description,
              amount: vLine.amount,
              type: 'DEBIT'
            });
          }
        });
      } else {
        accountSummary[account.code].debit += line.debitAmount || 0;
        accountSummary[account.code].credit += line.creditAmount || 0;
        accountSummary[account.code].lines.push({
          description: line.description,
          debitAmount: line.debitAmount || 0,
          creditAmount: line.creditAmount || 0
        });
      }
    });

    return Object.values(accountSummary).filter(summary => 
      summary.debit > 0 || summary.credit > 0
    );
  }, [lines, accounts]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Impact sur le Grand Livre</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Compte
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Débit
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Crédit
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Solde
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {previewData.map((summary, index) => {
              const balance = summary.debit - summary.credit;
              return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {summary.account.code}
                      </div>
                      <div className="text-sm text-gray-500">
                        {summary.account.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {summary.debit > 0 && (
                      <span className="font-medium text-blue-600">
                        {formatCurrency(summary.debit)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {summary.credit > 0 && (
                      <span className="font-medium text-green-600">
                        {formatCurrency(summary.credit)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <span className={`font-medium ${
                      balance > 0 ? 'text-blue-600' : 
                      balance < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {balance !== 0 ? formatCurrency(Math.abs(balance)) : '-'}
                      {balance > 0 && ' D'}
                      {balance < 0 && ' C'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Dialog de ventilation par comptes
const VentilationDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lineId: string | null;
  accounts: Account[];
  onSave: (ventilationData: any) => void;
}> = ({ isOpen, onClose, lineId, accounts, onSave }) => {
  const [ventilationLines, setVentilationLines] = useState([
    { id: crypto.randomUUID(), account: '', description: '', amount: 0, percentage: 0 }
  ]);
  const [ventilationMode, setVentilationMode] = useState<'AMOUNT' | 'PERCENTAGE'>('AMOUNT');
  const [totalToVentilate, setTotalToVentilate] = useState(1000000);

  const addVentilationLine = () => {
    setVentilationLines([
      ...ventilationLines,
      { id: crypto.randomUUID(), account: '', description: '', amount: 0, percentage: 0 }
    ]);
  };

  const removeVentilationLine = (index: number) => {
    setVentilationLines(ventilationLines.filter((_, i) => i !== index));
  };

  const updateVentilationLine = (index: number, field: string, value: any) => {
    const updated = [...ventilationLines];
    updated[index] = { ...updated[index], [field]: value };

    if (ventilationMode === 'PERCENTAGE' && field === 'percentage') {
      // Recalculer les montants basés sur les pourcentages
      updated[index].amount = (totalToVentilate * value) / 100;
    } else if (ventilationMode === 'AMOUNT' && field === 'amount') {
      // Recalculer les pourcentages basés sur les montants
      updated[index].percentage = totalToVentilate > 0 ? (value / totalToVentilate) * 100 : 0;
    }

    setVentilationLines(updated);
  };

  const totalVentilated = ventilationLines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const totalPercentage = ventilationLines.reduce((sum, line) => sum + (line.percentage || 0), 0);
  const isVentilationBalanced = Math.abs(totalVentilated - totalToVentilate) < 0.01;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <SplitSquareHorizontalIcon className="h-5 w-5 mr-2" />
            Ventilation par Comptes
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Configuration de la ventilation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant Total</label>
                <Input
                  type="number"
                  step="0.01"
                  value={totalToVentilate}
                  onChange={(e) => setTotalToVentilate(parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <Select value={ventilationMode} onValueChange={(value: any) => setVentilationMode(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AMOUNT">Par Montant</SelectItem>
                    <SelectItem value="PERCENTAGE">Par Pourcentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="button"
              onClick={addVentilationLine}
              variant="outline"
              size="sm"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Ajouter Ligne
            </Button>
          </div>

          {/* Lignes de ventilation */}
          <div className="space-y-3">
            {ventilationLines.map((line, index) => (
              <div key={line.id} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Compte</label>
                  <Select 
                    value={line.account} 
                    onValueChange={(value) => updateVentilationLine(index, 'account', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <Input
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => updateVentilationLine(index, 'description', e.target.value)}
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {ventilationMode === 'PERCENTAGE' ? 'Pourcentage' : 'Montant'}
                  </label>
                  {ventilationMode === 'PERCENTAGE' ? (
                    <Input
                      type="number"
                      step="0.01"
                      max="100"
                      placeholder="0.00"
                      value={line.percentage}
                      onChange={(e) => updateVentilationLine(index, 'percentage', parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={line.amount}
                      onChange={(e) => updateVentilationLine(index, 'amount', parseFloat(e.target.value) || 0)}
                    />
                  )}
                </div>
                
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {ventilationMode === 'PERCENTAGE' ? 'Montant' : '%'}
                  </label>
                  <div className="text-sm text-gray-600 py-2 text-center">
                    {ventilationMode === 'PERCENTAGE' 
                      ? formatCurrency(line.amount)
                      : `${line.percentage.toFixed(1)}%`
                    }
                  </div>
                </div>
                
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVentilationLine(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Résumé de la ventilation */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Résumé de la Ventilation</span>
              <div className="flex items-center space-x-2">
                {isVentilationBalanced ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                )}
                <span className={`text-sm font-medium ${isVentilationBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {isVentilationBalanced ? 'Équilibrée' : 'Déséquilibrée'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total à ventiler:</span>
                <span className="ml-2 font-medium">{formatCurrency(totalToVentilate)}</span>
              </div>
              <div>
                <span className="text-gray-600">Total ventilé:</span>
                <span className="ml-2 font-medium">{formatCurrency(totalVentilated)}</span>
              </div>
              <div>
                <span className="text-gray-600">Écart:</span>
                <span className={`ml-2 font-medium ${isVentilationBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(totalVentilated - totalToVentilate))}
                </span>
              </div>
            </div>
            {ventilationMode === 'PERCENTAGE' && (
              <div className="mt-2 text-sm">
                <span className="text-gray-600">Total pourcentage:</span>
                <span className={`ml-2 font-medium ${Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalPercentage.toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => onSave(ventilationLines)}
              disabled={!isVentilationBalanced}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <SaveIcon className="h-4 w-4 mr-2" />
              Appliquer Ventilation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvancedJournalEntryForm;