import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowRight as ArrowRightIcon,
  ArrowLeft as ArrowLeftIcon,
  Wand2 as MagicWandIcon,
  Calculator as CalculatorIcon,
  Check as CheckIcon,
  AlertTriangle as AlertTriangleIcon,
  Copy as DocumentDuplicateIcon,
  Sparkles as SparklesIcon,
  Link as LinkIcon,
  CreditCard as CreditCardIcon,
  Building as BuildingIcon,
  Tag as TagIcon
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  ToggleLeft,
  Progress,
  Separator,
  Switch
} from '../ui';

// Schema de validation étendu
const smartEntrySchema = z.object({
  // Données générales
  generalInfo: z.object({
    entryDate: z.string().min(1),
    journal: z.string().min(1),
    reference: z.string().optional(),
    externalReference: z.string().optional(),
    description: z.string().min(1),
    globalNotes: z.string().optional(),
    preparedBy: z.string().optional(),
    approvedBy: z.string().optional(),
    documentAttachments: z.array(z.string()).default([]),
  }),
  
  // Configuration transaction
  transactionConfig: z.object({
    type: z.enum(['PURCHASE_INVOICE', 'SALE_INVOICE', 'PAYMENT_RECEIPT', 'GENERAL_ENTRY']),
    subType: z.string().optional(),
    autoCalculateVAT: z.boolean().default(true),
    autoLettrage: z.boolean().default(true),
    splitMode: z.enum(['MANUAL', 'PERCENTAGE', 'EQUAL']).default('MANUAL'),
  }),
  
  // Données métier spécialisées
  businessData: z.union([
    // Facture d'achat
    z.object({
      type: z.literal('PURCHASE_INVOICE'),
      supplier: z.string().min(1),
      supplierAccount: z.string().min(1),
      supplierInvoiceNumber: z.string().min(1),
      invoiceDate: z.string().min(1),
      dueDate: z.string().optional(),
      paymentTerms: z.number().default(30),
      currency: z.string().default('XAF'),
      exchangeRate: z.number().default(1),
      invoiceNotes: z.string().optional(),
      
      // Lignes de détail produits/services
      invoiceLines: z.array(z.object({
        id: z.string(),
        productCode: z.string().optional(),
        description: z.string().min(1),
        quantity: z.number().min(0).default(1),
        unitPrice: z.number().min(0),
        vatRate: z.number().min(0).default(19.25),
        vatAmount: z.number().min(0).default(0),
        totalHT: z.number().min(0).default(0),
        totalTTC: z.number().min(0).default(0),
        
        // Ventilation comptable de la ligne
        accountingSplit: z.array(z.object({
          account: z.string(),
          description: z.string(),
          amountHT: z.number(),
          percentage: z.number().optional(),
          costCenter: z.string().optional(),
          project: z.string().optional(),
          department: z.string().optional(),
        })).default([]),
      })).min(1),
    }),
    
    // Facture de vente
    z.object({
      type: z.literal('SALE_INVOICE'),
      customer: z.string().min(1),
      customerAccount: z.string().min(1),
      invoiceNumber: z.string().min(1),
      invoiceDate: z.string().min(1),
      dueDate: z.string().optional(),
      paymentTerms: z.number().default(30),
      currency: z.string().default('XAF'),
      exchangeRate: z.number().default(1),
      invoiceNotes: z.string().optional(),
      
      // Lignes de détail vente
      invoiceLines: z.array(z.object({
        id: z.string(),
        productCode: z.string().optional(),
        description: z.string().min(1),
        quantity: z.number().min(0).default(1),
        unitPrice: z.number().min(0),
        vatRate: z.number().min(0).default(19.25),
        vatAmount: z.number().min(0).default(0),
        totalHT: z.number().min(0).default(0),
        totalTTC: z.number().min(0).default(0),
        
        // Ventilation par comptes produits
        accountingSplit: z.array(z.object({
          account: z.string(),
          description: z.string(),
          amountHT: z.number(),
          percentage: z.number().optional(),
          analyticalAccount: z.string().optional(),
          salesPerson: z.string().optional(),
        })).default([]),
      })).min(1),
    }),
    
    // Règlement
    z.object({
      type: z.literal('PAYMENT_RECEIPT'),
      paymentMethod: z.enum(['TRANSFER', 'CHECK', 'CASH', 'CARD', 'MOBILE_MONEY']),
      bankAccount: z.string().min(1),
      amount: z.number().min(0.01),
      currency: z.string().default('XAF'),
      exchangeRate: z.number().default(1),
      paymentReference: z.string().optional(),
      paymentDate: z.string().min(1),
      paymentNotes: z.string().optional(),
      
      // Association tiers et factures
      thirdPartyPayments: z.array(z.object({
        id: z.string(),
        thirdPartyType: z.enum(['CUSTOMER', 'SUPPLIER']),
        thirdParty: z.string(),
        thirdPartyAccount: z.string(),
        
        // Factures associées
        invoiceAllocations: z.array(z.object({
          invoiceId: z.string(),
          invoiceNumber: z.string(),
          invoiceAmount: z.number(),
          remainingAmount: z.number(),
          allocatedAmount: z.number(),
          isFullPayment: z.boolean().default(false),
        })).default([]),
        
        // Ventilation par comptes tiers (401001, 401002, etc.)
        accountSplit: z.array(z.object({
          account: z.string(),
          amount: z.number(),
          percentage: z.number().optional(),
          description: z.string().optional(),
        })).default([]),
      })).min(1),
    }),
    
    // Opération diverse
    z.object({
      type: z.literal('GENERAL_ENTRY'),
      entrySubType: z.enum(['DEPRECIATION', 'PROVISION', 'RECLASSIFICATION', 'CUTOFF', 'ADJUSTMENT', 'OTHER']),
      entryNotes: z.string().optional(),
      
      // Lignes comptables libres avec ventilation
      accountingLines: z.array(z.object({
        id: z.string(),
        lineType: z.enum(['DEBIT', 'CREDIT']),
        account: z.string().min(1),
        description: z.string().min(1),
        amount: z.number().min(0),
        thirdParty: z.string().optional(),
        
        // Dimensions analytiques
        costCenter: z.string().optional(),
        project: z.string().optional(),
        department: z.string().optional(),
        analyticalAccount: z.string().optional(),
        lineNotes: z.string().optional(),
        
        // Ventilation avancée
        advancedSplit: z.object({
          isEnabled: z.boolean().default(false),
          splitMethod: z.enum(['MANUAL', 'PERCENTAGE', 'EQUAL']).default('MANUAL'),
          splitLines: z.array(z.object({
            account: z.string(),
            description: z.string(),
            amount: z.number(),
            percentage: z.number().optional(),
            costCenter: z.string().optional(),
            project: z.string().optional(),
            department: z.string().optional(),
          })).default([]),
        }).default({ isEnabled: false, splitMethod: 'MANUAL', splitLines: [] }),
      })).min(1),
    }),
  ]),
});

type SmartEntryFormData = z.infer<typeof smartEntrySchema>;

const SmartJournalEntryWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [autoSuggestions, setAutoSuggestions] = useState(true);
  const [templateMode, setTemplateMode] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset
  } = useForm<SmartEntryFormData>({
    resolver: zodResolver(smartEntrySchema),
    defaultValues: {
      generalInfo: {
        entryDate: new Date().toISOString().split('T')[0],
        journal: '',
        reference: '',
        externalReference: '',
        description: '',
        globalNotes: '',
        documentAttachments: [],
      },
      transactionConfig: {
        type: 'GENERAL_ENTRY',
        autoCalculateVAT: true,
        autoLettrage: true,
        splitMode: 'MANUAL',
      },
      businessData: {
        type: 'GENERAL_ENTRY',
        entrySubType: 'OTHER',
        accountingLines: [
          {
            id: crypto.randomUUID(),
            lineType: 'DEBIT',
            account: '',
            description: '',
            amount: 0,
            advancedSplit: { isEnabled: false, splitMethod: 'MANUAL', splitLines: [] }
          }
        ]
      }
    }
  });

  const watchedTransactionType = watch('transactionConfig.type');
  const watchedBusinessData = watch('businessData');

  // Calculs intelligents
  const calculatedTotals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    let vatTotal = 0;

    if (watchedBusinessData.type === 'PURCHASE_INVOICE' || watchedBusinessData.type === 'SALE_INVOICE') {
      const invoiceLines = (watchedBusinessData as any).invoiceLines || [];
      
      invoiceLines.forEach((line: any) => {
        const htAmount = (line.quantity || 0) * (line.unitPrice || 0);
        const vatAmount = htAmount * ((line.vatRate || 0) / 100);
        
        if (watchedBusinessData.type === 'PURCHASE_INVOICE') {
          totalDebit += htAmount + vatAmount;
          totalCredit += htAmount + vatAmount;
        } else {
          totalDebit += htAmount + vatAmount;
          totalCredit += htAmount + vatAmount;
        }
        
        vatTotal += vatAmount;
      });
    } else if (watchedBusinessData.type === 'GENERAL_ENTRY') {
      const accountingLines = (watchedBusinessData as any).accountingLines || [];
      
      accountingLines.forEach((line: any) => {
        if (line.lineType === 'DEBIT') {
          totalDebit += line.amount || 0;
        } else {
          totalCredit += line.amount || 0;
        }
      });
    }

    return {
      totalDebit,
      totalCredit,
      vatTotal,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      balance: totalDebit - totalCredit
    };
  }, [watchedBusinessData]);

  const steps = [
    {
      id: 1,
      title: 'Type & Configuration',
      description: 'Sélectionner le type de transaction',
      component: 'TypeSelection'
    },
    {
      id: 2,
      title: 'Données Métier',
      description: 'Saisir les informations spécialisées',
      component: 'BusinessData'
    },
    {
      id: 3,
      title: 'Ventilation Comptable',
      description: 'Configurer la ventilation par comptes',
      component: 'AccountingSplit'
    },
    {
      id: 4,
      title: 'Validation & Aperçu',
      description: 'Vérifier et valider l\'écriture',
      component: 'Validation'
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: SmartEntryFormData) => {
    // TODO: Process smart entry submission
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Progress Wizard */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <SparklesIcon className="h-6 w-6 mr-2 text-indigo-600" />
              Assistant de Saisie Intelligent
            </h1>
            <Badge className="bg-indigo-100 text-indigo-800">
              Étape {currentStep} / {steps.length}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    currentStep > step.id 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : currentStep === step.id
                      ? 'bg-indigo-500 border-indigo-500 text-white'
                      : 'bg-white border-gray-300 text-gray-500'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-medium">{step.id}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                )}
              </React.Fragment>
            ))}
          </div>
          
          <Progress value={(currentStep / steps.length) * 100} className="mt-4" />
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Étape 1: Type & Configuration */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Configuration de la Transaction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informations générales */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations Générales</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <Controller
                      name="generalInfo.entryDate"
                      control={control}
                      render={({ field }) => (
                        <Input type="date" {...field} />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Journal *</label>
                    <Controller
                      name="generalInfo.journal"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACH">ACH - Journal des Achats</SelectItem>
                            <SelectItem value="VTE">VTE - Journal des Ventes</SelectItem>
                            <SelectItem value="BQ1">BQ1 - Banque SGBC</SelectItem>
                            <SelectItem value="OD">OD - Opérations Diverses</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Référence externe</label>
                    <Controller
                      name="generalInfo.externalReference"
                      control={control}
                      render={({ field }) => (
                        <Input placeholder="N° facture, chèque..." {...field} />
                      )}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <Controller
                      name="generalInfo.description"
                      control={control}
                      render={({ field }) => (
                        <Input placeholder="Description de l'opération" {...field} />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes globales</label>
                    <Controller
                      name="generalInfo.globalNotes"
                      control={control}
                      render={({ field }) => (
                        <Textarea placeholder="Notes..." {...field} rows={2} />
                      )}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Type de transaction */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Type de Transaction</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      value: 'PURCHASE_INVOICE',
                      label: 'Facture d\'Achat',
                      description: 'Enregistrer une facture fournisseur avec TVA',
                      icon: BuildingIcon,
                      color: 'blue'
                    },
                    {
                      value: 'SALE_INVOICE',
                      label: 'Facture de Vente',
                      description: 'Enregistrer une facture client avec ventilation',
                      icon: CreditCardIcon,
                      color: 'green'
                    },
                    {
                      value: 'PAYMENT_RECEIPT',
                      label: 'Règlement',
                      description: 'Encaissement ou décaissement avec lettrage',
                      icon: CreditCardIcon,
                      color: 'purple'
                    },
                    {
                      value: 'GENERAL_ENTRY',
                      label: 'OD Avancée',
                      description: 'Écriture libre avec ventilation sophistiquée',
                      icon: DocumentDuplicateIcon,
                      color: 'gray'
                    }
                  ].map((transactionType) => (
                    <button
                      key={transactionType.value}
                      type="button"
                      onClick={() => setValue('transactionConfig.type', transactionType.value as any)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        watchedTransactionType === transactionType.value
                          ? `border-${transactionType.color}-300 bg-${transactionType.color}-50`
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <transactionType.icon className={`h-6 w-6 text-${transactionType.color}-600 mt-1`} />
                        <div>
                          <h4 className="font-medium text-gray-900">{transactionType.label}</h4>
                          <p className="text-sm text-gray-600 mt-1">{transactionType.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Options avancées */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Controller
                    name="transactionConfig.autoCalculateVAT"
                    control={control}
                    render={({ field }) => (
                      <Switch 
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <label className="text-sm text-gray-700">Auto-calcul TVA</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Controller
                    name="transactionConfig.autoLettrage"
                    control={control}
                    render={({ field }) => (
                      <Switch 
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <label className="text-sm text-gray-700">Lettrage automatique</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={autoSuggestions}
                    onCheckedChange={setAutoSuggestions}
                  />
                  <label className="text-sm text-gray-700">Suggestions intelligentes</label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 2: Données Métier Spécialisées */}
        {currentStep === 2 && (
          <BusinessDataStep 
            control={control} 
            errors={errors}
            transactionType={watchedTransactionType}
            autoSuggestions={autoSuggestions}
          />
        )}

        {/* Étape 3: Ventilation Comptable */}
        {currentStep === 3 && (
          <AccountingSplitStep 
            control={control}
            businessData={watchedBusinessData}
            calculatedTotals={calculatedTotals}
          />
        )}

        {/* Étape 4: Validation & Aperçu */}
        {currentStep === 4 && (
          <ValidationStep 
            formData={watch()}
            calculatedTotals={calculatedTotals}
          />
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-4">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={previousStep}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Précédent
              </Button>
            )}
            
            <Button
              type="button"
              variant="outline"
              onClick={() => setTemplateMode(!templateMode)}
            >
              <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
              {templateMode ? 'Quitter' : 'Mode'} Template
            </Button>
          </div>

          {/* Indicateur d'équilibre */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-600">
                D: <span className="font-bold text-blue-600">{formatCurrency(calculatedTotals.totalDebit)}</span>
              </div>
              <div className="text-sm text-gray-600">
                C: <span className="font-bold text-green-600">{formatCurrency(calculatedTotals.totalCredit)}</span>
              </div>
              <div className={`flex items-center space-x-1 ${
                calculatedTotals.isBalanced ? 'text-green-600' : 'text-red-600'
              }`}>
                {calculatedTotals.isBalanced ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <AlertTriangleIcon className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {calculatedTotals.isBalanced ? 'Équilibrée' : `Écart: ${formatCurrency(Math.abs(calculatedTotals.balance))}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {currentStep < steps.length ? (
              <Button
                type="button"
                onClick={nextStep}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Suivant
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!calculatedTotals.isBalanced}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Enregistrer & Valider
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

// Composant pour l'étape données métier
const BusinessDataStep: React.FC<{
  control: any;
  errors: any;
  transactionType: string;
  autoSuggestions: boolean;
}> = ({ control, errors, transactionType, autoSuggestions }) => {
  
  if (transactionType === 'PURCHASE_INVOICE') {
    return <PurchaseInvoiceForm control={control} errors={errors} autoSuggestions={autoSuggestions} />;
  }
  
  if (transactionType === 'SALE_INVOICE') {
    return <SaleInvoiceForm control={control} errors={errors} autoSuggestions={autoSuggestions} />;
  }
  
  if (transactionType === 'PAYMENT_RECEIPT') {
    return <PaymentReceiptForm control={control} errors={errors} autoSuggestions={autoSuggestions} />;
  }
  
  return <GeneralEntryForm control={control} errors={errors} />;
};

// Formulaire facture d'achat avec lignes détaillées
const PurchaseInvoiceForm: React.FC<{
  control: any;
  errors: any;
  autoSuggestions: boolean;
}> = ({ control, errors, autoSuggestions }) => {
  const { fields: invoiceLines, append, remove } = useFieldArray({
    control,
    name: 'businessData.invoiceLines'
  });

  const addInvoiceLine = () => {
    append({
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 19.25,
      vatAmount: 0,
      totalHT: 0,
      totalTTC: 0,
      accountingSplit: []
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <BuildingIcon className="h-5 w-5 mr-2 text-blue-600" />
          Facture d'Achat Détaillée
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* En-tête facture */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur *</label>
            <Controller
              name="businessData.supplier"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplier1">F001 - ABC SARL</SelectItem>
                    <SelectItem value="supplier2">F002 - XYZ SA</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">N° Facture Fournisseur *</label>
            <Controller
              name="businessData.supplierInvoiceNumber"
              control={control}
              render={({ field }) => (
                <Input placeholder="FA-2024-001" {...field} />
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Facture</label>
            <Controller
              name="businessData.invoiceDate"
              control={control}
              render={({ field }) => (
                <Input type="date" {...field} />
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Échéance (jours)</label>
            <Controller
              name="businessData.paymentTerms"
              control={control}
              render={({ field }) => (
                <Input 
                  type="number" 
                  placeholder="30"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                />
              )}
            />
          </div>
        </div>

        {/* Lignes de détail */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Lignes de Détail</h3>
            <Button
              type="button"
              onClick={addInvoiceLine}
              variant="outline"
              size="sm"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Ajouter Ligne
            </Button>
          </div>
          
          <div className="space-y-3">
            {invoiceLines.map((line, index) => (
              <PurchaseInvoiceLineForm 
                key={line.id}
                control={control}
                index={index}
                onRemove={() => remove(index)}
                autoSuggestions={autoSuggestions}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Ligne de facture d'achat
const PurchaseInvoiceLineForm: React.FC<{
  control: any;
  index: number;
  onRemove: () => void;
  autoSuggestions: boolean;
}> = ({ control, index, onRemove, autoSuggestions }) => {
  return (
    <div className="grid grid-cols-12 gap-3 items-end p-3 border border-gray-200 rounded-lg">
      <div className="col-span-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
        <Controller
          name={`businessData.invoiceLines.${index}.description`}
          control={control}
          render={({ field }) => (
            <Input placeholder="Description produit/service" {...field} />
          )}
        />
      </div>
      
      <div className="col-span-1">
        <label className="block text-xs font-medium text-gray-700 mb-1">Qté</label>
        <Controller
          name={`businessData.invoiceLines.${index}.quantity`}
          control={control}
          render={({ field }) => (
            <Input 
              type="number" 
              step="0.01"
              placeholder="1"
              {...field}
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
            />
          )}
        />
      </div>
      
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-700 mb-1">Prix Unit. HT</label>
        <Controller
          name={`businessData.invoiceLines.${index}.unitPrice`}
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
                // Auto-calcul du total HT
                const quantity = control._getWatch(`businessData.invoiceLines.${index}.quantity`) || 1;
                const totalHT = quantity * value;
                setValue(`businessData.invoiceLines.${index}.totalHT`, totalHT);
                
                // Auto-calcul TVA si activé
                const vatRate = control._getWatch(`businessData.invoiceLines.${index}.vatRate`) || 0;
                const vatAmount = totalHT * (vatRate / 100);
                setValue(`businessData.invoiceLines.${index}.vatAmount`, vatAmount);
                setValue(`businessData.invoiceLines.${index}.totalTTC`, totalHT + vatAmount);
              }}
            />
          )}
        />
      </div>
      
      <div className="col-span-1">
        <label className="block text-xs font-medium text-gray-700 mb-1">TVA %</label>
        <Controller
          name={`businessData.invoiceLines.${index}.vatRate`}
          control={control}
          render={({ field }) => (
            <Input 
              type="number" 
              step="0.01"
              placeholder="19.25"
              {...field}
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
            />
          )}
        />
      </div>
      
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-700 mb-1">Total HT</label>
        <Controller
          name={`businessData.invoiceLines.${index}.totalHT`}
          control={control}
          render={({ field }) => (
            <Input 
              type="number" 
              step="0.01"
              placeholder="0.00"
              {...field}
              readOnly
              className="bg-gray-50"
            />
          )}
        />
      </div>
      
      <div className="col-span-1">
        <label className="block text-xs font-medium text-gray-700 mb-1">TVA</label>
        <Controller
          name={`businessData.invoiceLines.${index}.vatAmount`}
          control={control}
          render={({ field }) => (
            <Input 
              type="number" 
              step="0.01"
              placeholder="0.00"
              {...field}
              readOnly
              className="bg-gray-50"
            />
          )}
        />
      </div>
      
      <div className="col-span-1">
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
    </div>
  );
};

// Autres composants pour les étapes...
const AccountingSplitStep: React.FC<{
  control: any;
  businessData: any;
  calculatedTotals: any;
}> = ({ control, businessData, calculatedTotals }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-xl">Ventilation Comptable Avancée</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-center text-gray-500 py-8">
        <CalculatorIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p>Configuration de la ventilation comptable selon le type de transaction</p>
        <p className="text-sm mt-2">Cette étape sera développée selon le type sélectionné</p>
      </div>
    </CardContent>
  </Card>
);

const ValidationStep: React.FC<{
  formData: any;
  calculatedTotals: any;
}> = ({ formData, calculatedTotals }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-xl">Validation & Aperçu Final</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        {/* Résumé de l'écriture */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Résumé de l'Écriture</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{formData.generalInfo?.entryDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">{formData.transactionConfig?.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Description:</span>
                <span className="font-medium">{formData.generalInfo?.description}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Équilibre Comptable</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Débit:</span>
                <span className="font-medium text-blue-600">{formatCurrency(calculatedTotals.totalDebit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Crédit:</span>
                <span className="font-medium text-green-600">{formatCurrency(calculatedTotals.totalCredit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Équilibre:</span>
                <span className={`font-medium ${calculatedTotals.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {calculatedTotals.isBalanced ? 'Équilibrée ✓' : `Écart: ${formatCurrency(Math.abs(calculatedTotals.balance))}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Aperçu des écritures générées */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Écritures Générées</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              Aperçu des écritures qui seront créées...
            </p>
            {/* Ici sera affiché l'aperçu détaillé */}
          </div>
        </div>

        {/* Validation finale */}
        {!calculatedTotals.isBalanced && (
          <Alert>
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              L'écriture n'est pas équilibrée. Veuillez vérifier la ventilation des montants.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </CardContent>
  </Card>
);

export default SmartJournalEntryWizard;