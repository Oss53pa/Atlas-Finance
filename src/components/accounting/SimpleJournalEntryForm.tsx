import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ShoppingCartIcon,
  ReceiptRefundIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalculatorIcon,
  Squares2X2Icon,
  PaperClipIcon,
  UserIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface JournalEntryLine {
  id: string;
  account: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  thirdParty?: string;
  costCenter?: string;
  project?: string;
  lineNotes?: string;
  isVentilated: boolean;
  ventilationLines: VentilationLine[];
}

interface VentilationLine {
  id: string;
  account: string;
  description: string;
  amount: number;
  percentage?: number;
  costCenter?: string;
  project?: string;
}

interface JournalEntryForm {
  // Données générales
  entryDate: string;
  journal: string;
  reference: string;
  externalReference: string;
  description: string;
  notes: string;
  attachments: string[];
  preparedBy: string;
  approvedBy: string;
  
  // Type de transaction
  transactionType: 'PURCHASE' | 'SALE' | 'PAYMENT' | 'GENERAL';
  
  // Données spécialisées
  purchaseData?: {
    supplier: string;
    supplierInvoiceNumber: string;
    invoiceDate: string;
    paymentTerms: number;
    notes: string;
  };
  
  saleData?: {
    customer: string;
    invoiceNumber: string;
    invoiceDate: string;
    paymentTerms: number;
    notes: string;
  };
  
  paymentData?: {
    paymentMethod: string;
    bankAccount: string;
    amount: number;
    currency: string;
    thirdPartyType: 'CUSTOMER' | 'SUPPLIER';
    thirdParty: string;
    relatedInvoice: string;
    notes: string;
  };
  
  generalData?: {
    entryType: string;
    notes: string;
  };
  
  // Lignes d'écriture
  lines: JournalEntryLine[];
}

const SimpleJournalEntryForm: React.FC = () => {
  const [showPreview, setShowPreview] = useState(false);
  const [selectedLineForVentilation, setSelectedLineForVentilation] = useState<string | null>(null);
  const [autoCalculateVAT, setAutoCalculateVAT] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<JournalEntryForm>({
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

  const { fields: lines, append: appendLine, remove: removeLine } = useFieldArray({
    control,
    name: 'lines'
  });

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

  const onSubmit = (data: JournalEntryForm) => {
    // TODO: Process journal entry submission
    alert('Écriture enregistrée avec succès !');
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE': return <ShoppingCartIcon className="h-6 w-6 text-blue-600" />;
      case 'SALE': return <ReceiptRefundIcon className="h-6 w-6 text-green-600" />;
      case 'PAYMENT': return <BanknotesIcon className="h-6 w-6 text-purple-600" />;
      case 'GENERAL': return <DocumentTextIcon className="h-6 w-6 text-gray-600" />;
      default: return <DocumentTextIcon className="h-6 w-6 text-gray-600" />;
    }
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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {getTransactionIcon(watchedTransactionType)}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Saisie d'Écriture Avancée</h1>
              <p className="text-gray-600">Formulaire multi-types avec ventilation sophistiquée</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Indicateur d'équilibre */}
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isBalanced ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, 100 - (Math.abs(totalDebit - totalCredit) / Math.max(totalDebit, totalCredit, 1) * 100)))}%` }}
                ></div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isBalanced ? 'Équilibrée' : `Écart: ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
              </span>
            </div>
          </div>
        </div>

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
                    ? `border-${type.color}-300 bg-${type.color}-50`
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
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informations Générales</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  {...register('entryDate', { required: 'Date obligatoire' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.entryDate && (
                  <p className="text-red-600 text-xs mt-1">{errors.entryDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Journal *</label>
                <select
                  {...register('journal', { required: 'Journal obligatoire' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Sélectionner un journal</option>
                  <option value="ACH">ACH - Journal des Achats</option>
                  <option value="VTE">VTE - Journal des Ventes</option>
                  <option value="BQ1">BQ1 - Banque SGBC</option>
                  <option value="OD">OD - Opérations Diverses</option>
                </select>
                {errors.journal && (
                  <p className="text-red-600 text-xs mt-1">{errors.journal.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Référence externe</label>
                <input
                  type="text"
                  placeholder="N° facture, chèque..."
                  {...register('externalReference')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  placeholder="Description de l'opération"
                  {...register('description', { required: 'Description obligatoire' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.description && (
                  <p className="text-red-600 text-xs mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  placeholder="Notes internes..."
                  {...register('notes')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Options avancées */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoVAT"
                      checked={autoCalculateVAT}
                      onChange={(e) => setAutoCalculateVAT(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="autoVAT" className="text-sm text-gray-700">Auto-calcul TVA</label>
                  </div>
                  <button
                    type="button"
                    className="flex items-center space-x-2 px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <PaperClipIcon className="h-4 w-4" />
                    <span className="text-sm">Pièces jointes</span>
                  </button>
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
          </div>

          {/* Formulaires spécialisés selon le type */}
          {watchedTransactionType === 'PURCHASE' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
                <ShoppingCartIcon className="h-5 w-5 mr-2" />
                Données Facture d'Achat
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
                  <select
                    {...register('purchaseData.supplier')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    <option value="supplier1">F001 - Fournisseur ABC SARL</option>
                    <option value="supplier2">F002 - Fournisseur XYZ SA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° Facture Fournisseur</label>
                  <input
                    type="text"
                    placeholder="FA-2024-001"
                    {...register('purchaseData.supplierInvoiceNumber')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Facture</label>
                  <input
                    type="date"
                    {...register('purchaseData.invoiceDate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes Achat</label>
                  <textarea
                    placeholder="Notes spécifiques à cet achat..."
                    {...register('purchaseData.notes')}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {watchedTransactionType === 'SALE' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-green-900 mb-4 flex items-center">
                <ReceiptRefundIcon className="h-5 w-5 mr-2" />
                Données Facture de Vente
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select
                    {...register('saleData.customer')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sélectionner un client</option>
                    <option value="customer1">C001 - Client XYZ SA</option>
                    <option value="customer2">C002 - Client ABC SARL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° Facture</label>
                  <input
                    type="text"
                    placeholder="FV-2024-001"
                    {...register('saleData.invoiceNumber')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Échéance (jours)</label>
                  <input
                    type="number"
                    placeholder="30"
                    {...register('saleData.paymentTerms')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {watchedTransactionType === 'PAYMENT' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-purple-900 mb-4 flex items-center">
                <BanknotesIcon className="h-5 w-5 mr-2" />
                Données Règlement
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode de Règlement</label>
                  <select
                    {...register('paymentData.paymentMethod')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sélectionner un mode</option>
                    <option value="TRANSFER">Virement</option>
                    <option value="CHECK">Chèque</option>
                    <option value="CASH">Espèces</option>
                    <option value="CARD">Carte</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compte Bancaire</label>
                  <select
                    {...register('paymentData.bankAccount')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sélectionner un compte</option>
                    <option value="bank1">512 - Banque SGBC</option>
                    <option value="bank2">513 - Banque UBA</option>
                    <option value="cash">530 - Caisse</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('paymentData.amount')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Lignes d'écriture */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Lignes d'Écriture</h2>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Total Débit: <span className="font-bold text-blue-600">{formatCurrency(totalDebit)}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Total Crédit: <span className="font-bold text-green-600">{formatCurrency(totalCredit)}</span>
                </div>
                <button
                  type="button"
                  onClick={addLine}
                  className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Ajouter Ligne</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Compte</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Description</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Débit</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Crédit</th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Ventilation</th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <select
                          {...register(`lines.${index}.account`)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Sélectionner un compte</option>
                          <option value="101">101 - Capital social</option>
                          <option value="401">401 - Fournisseurs</option>
                          <option value="411">411 - Clients</option>
                          <option value="601">601 - Achats marchandises</option>
                          <option value="701">701 - Ventes marchandises</option>
                          <option value="4456">4456 - TVA déductible</option>
                          <option value="4457">4457 - TVA collectée</option>
                          <option value="512">512 - Banque</option>
                          <option value="530">530 - Caisse</option>
                        </select>
                      </td>

                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="Description de la ligne"
                          {...register(`lines.${index}.description`)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...register(`lines.${index}.debitAmount`, { valueAsNumber: true })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...register(`lines.${index}.creditAmount`, { valueAsNumber: true })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {line.isVentilated && (
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                              Ventilé ({line.ventilationLines?.length || 0})
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedLineForVentilation(line.id)}
                            className="p-1 text-purple-600 hover:text-purple-700 transition-colors"
                            title="Ventilation par comptes"
                          >
                            <Squares2X2Icon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="p-1 text-red-600 hover:text-red-700 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
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
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    isBalanced ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ 
                    width: `${Math.min(100, Math.max(0, 100 - (Math.abs(totalDebit - totalCredit) / Math.max(totalDebit, totalCredit, 1) * 100)))}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Aperçu du grand livre */}
          {showPreview && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Aperçu Grand Livre</h2>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <GeneralLedgerPreview lines={watchedLines} />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => reset()}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Réinitialiser
              </button>
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sauvegarder Brouillon
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <EyeIcon className="h-4 w-4" />
                <span>{showPreview ? 'Masquer' : 'Afficher'} Aperçu</span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="submit"
                disabled={!isBalanced}
                className={`flex items-center space-x-2 px-6 py-2 rounded-md font-medium transition-colors ${
                  isBalanced 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Enregistrer & Valider</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Dialog de ventilation simplifié */}
      {selectedLineForVentilation && (
        <VentilationModal
          isOpen={true}
          onClose={() => setSelectedLineForVentilation(null)}
          lineId={selectedLineForVentilation}
        />
      )}
    </div>
  );
};

// Aperçu du grand livre simplifié
const GeneralLedgerPreview: React.FC<{ lines: JournalEntryLine[] }> = ({ lines }) => {
  const accountSummary = useMemo(() => {
    const summary: Record<string, { debit: number; credit: number; lines: any[] }> = {};

    lines.forEach(line => {
      if (!line.account) return;

      if (!summary[line.account]) {
        summary[line.account] = { debit: 0, credit: 0, lines: [] };
      }

      summary[line.account].debit += line.debitAmount || 0;
      summary[line.account].credit += line.creditAmount || 0;
      summary[line.account].lines.push(line);
    });

    return Object.entries(summary).filter(([_, data]) => data.debit > 0 || data.credit > 0);
  }, [lines]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
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
          {accountSummary.map(([accountCode, data], index) => {
            const balance = data.debit - data.credit;
            return (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{accountCode}</td>
                <td className="px-4 py-3 text-sm text-right">
                  {data.debit > 0 && (
                    <span className="font-medium text-blue-600">
                      {formatCurrency(data.debit)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {data.credit > 0 && (
                    <span className="font-medium text-green-600">
                      {formatCurrency(data.credit)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right">
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
  );
};

// Modal de ventilation simplifiée
const VentilationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lineId: string;
}> = ({ isOpen, onClose, lineId }) => {
  const [ventilationLines, setVentilationLines] = useState([
    { id: crypto.randomUUID(), account: '', description: '', amount: 0, percentage: 0 }
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Squares2X2Icon className="h-5 w-5 mr-2 text-purple-600" />
              Ventilation par Comptes
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="text-center text-gray-500 py-8">
              <CalculatorIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Fonctionnalité de ventilation en cours de développement...</p>
              <p className="text-sm mt-2">Permettra la répartition par montants ou pourcentages</p>
            </div>
            
            <div className="flex items-center justify-end space-x-4">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Appliquer Ventilation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleJournalEntryForm;