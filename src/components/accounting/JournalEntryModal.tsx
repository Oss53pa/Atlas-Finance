import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X,
  FileText,
  StickyNote,
  Paperclip,
  Calculator,
  ShoppingCart,
  CreditCard,
  Settings,
  Plus,
  Trash2,
  Upload,
  Download,
  Target,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { ElegantButton } from '../ui/DesignSystem';

interface JournalEntry {
  account: string;
  label: string;
  debit: number;
  credit: number;
}

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type EntryType = 'purchase' | 'sale' | 'payment' | 'other';

const JournalEntryModal: React.FC<JournalEntryModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('entry');
  const [entryType, setEntryType] = useState<EntryType>('purchase');
  const [entries, setEntries] = useState<JournalEntry[]>([
    { account: '', label: '', debit: 0, credit: 0 }
  ]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  
  // État pour les différents types d'écritures
  const [purchaseData, setPurchaseData] = useState({
    supplier: '',
    invoiceNumber: '',
    amount: 0,
    vatAmount: 0,
    vatRate: 20,
    dueDate: '',
    description: ''
  });

  const [saleData, setSaleData] = useState({
    customer: '',
    invoiceNumber: '',
    products: [{ name: '', quantity: 0, unitPrice: 0, vatRate: 20 }],
    description: ''
  });

  const [paymentData, setPaymentData] = useState({
    paymentType: 'customer_receipt', // 'customer_receipt' | 'supplier_payment'
    thirdParty: '',
    amount: 0,
    paymentMethod: 'bank', // 'bank' | 'cash' | 'check'
    reference: '',
    description: '',
    invoiceToMatch: '', // Pour le lettrage automatique
    autoLettering: true
  });

  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  const entryTypes = [
    { value: 'purchase', label: 'Facture d\'Achat', icon: ShoppingCart, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'sale', label: 'Facture de Vente', icon: CreditCard, color: 'bg-green-50 text-green-700 border-green-200' },
    { value: 'payment', label: 'Règlement', icon: CreditCard, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'other', label: 'Opération Diverse', icon: Settings, color: 'bg-gray-50 text-gray-700 border-gray-200' }
  ];

  const addEntry = () => {
    setEntries([...entries, { account: '', label: '', debit: 0, credit: 0 }]);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof JournalEntry, value: string | number) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
    
    // Recalcul des totaux
    const newTotalDebit = newEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const newTotalCredit = newEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    setTotalDebit(newTotalDebit);
    setTotalCredit(newTotalCredit);
  };

  // Auto-génération d'écritures selon le type
  const generateEntries = () => {
    if (entryType === 'purchase') {
      const { amount, vatAmount } = purchaseData;
      const htAmount = amount - vatAmount;
      
      setEntries([
        { account: '601000', label: 'Achats marchandises', debit: htAmount, credit: 0 },
        { account: '445510', label: 'TVA déductible', debit: vatAmount, credit: 0 },
        { account: '401000', label: 'Fournisseurs', debit: 0, credit: amount }
      ]);
    } else if (entryType === 'sale') {
      const totalSale = saleData.products.reduce((sum, product) => 
        sum + (product.quantity * product.unitPrice * (1 + product.vatRate / 100)), 0
      );
      const totalHT = saleData.products.reduce((sum, product) => 
        sum + (product.quantity * product.unitPrice), 0
      );
      const totalVAT = totalSale - totalHT;
      
      setEntries([
        { account: '411000', label: 'Clients', debit: totalSale, credit: 0 },
        { account: '701000', label: 'Ventes marchandises', debit: 0, credit: totalHT },
        { account: '445710', label: 'TVA collectée', debit: 0, credit: totalVAT }
      ]);
    } else if (entryType === 'payment') {
      const { amount, paymentType, paymentMethod, reference, invoiceToMatch } = paymentData;
      
      // Compte de trésorerie selon le mode de paiement
      const treasuryAccount = paymentMethod === 'bank' ? '512000' : 
                             paymentMethod === 'cash' ? '531000' : 
                             paymentMethod === 'check' ? '515000' :
                             paymentMethod === 'card' ? '512100' : '512200';
      
      const paymentLabel = paymentMethod === 'bank' ? 'virement bancaire' : 
                          paymentMethod === 'cash' ? 'espèces' : 
                          paymentMethod === 'check' ? 'chèque' :
                          paymentMethod === 'card' ? 'carte bancaire' : 'prélèvement';
      
      if (paymentType === 'customer_receipt') {
        // 💰 ENTRÉE D'ARGENT - Encaissement client
        const lettrageInfo = invoiceToMatch && invoiceToMatch !== 'multiple' ? ` - Lettrage ${invoiceToMatch}` : '';
        setEntries([
          { 
            account: treasuryAccount, 
            label: `💰 ENTRÉE - Encaissement client par ${paymentLabel}${reference ? ` (${reference})` : ''}`, 
            debit: amount, 
            credit: 0 
          },
          { 
            account: '411000', 
            label: `Clients - Règlement${lettrageInfo}`, 
            debit: 0, 
            credit: amount 
          }
        ]);
      } else {
        // 💸 SORTIE D'ARGENT - Paiement fournisseur
        const lettrageInfo = invoiceToMatch && invoiceToMatch !== 'multiple' ? ` - Lettrage ${invoiceToMatch}` : '';
        setEntries([
          { 
            account: '401000', 
            label: `Fournisseurs - Règlement${lettrageInfo}`, 
            debit: amount, 
            credit: 0 
          },
          { 
            account: treasuryAccount, 
            label: `💸 SORTIE - Paiement fournisseur par ${paymentLabel}${reference ? ` (${reference})` : ''}`, 
            debit: 0, 
            credit: amount 
          }
        ]);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-neutral-800">Nouvelle Écriture Comptable</h2>
                <p className="text-sm text-neutral-600">Saisie guidée avec calculs automatiques</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Type d'écriture */}
          <div className="p-6 border-b border-neutral-100">
            <div className="flex items-center space-x-4">
              <label className="text-lg font-semibold text-neutral-800">Type d'opération</label>
              <div className="flex-1 max-w-md">
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as EntryType)}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-neutral-800 font-medium"
                >
                  <option value="purchase">Facture d'Achat</option>
                  <option value="sale">Facture de Vente</option>
                  <option value="payment">Règlement</option>
                  <option value="other">Opération Diverse</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contenu avec onglets */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="px-6 pt-4">
                <TabsList className="bg-neutral-100 rounded-lg p-1">
                  <TabsTrigger value="entry" className="flex items-center space-x-2">
                    <Calculator className="h-4 w-4" />
                    <span>Enregistrement</span>
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="flex items-center space-x-2">
                    <StickyNote className="h-4 w-4" />
                    <span>Notes</span>
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="flex items-center space-x-2">
                    <Paperclip className="h-4 w-4" />
                    <span>Pièces jointes</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6 h-96 overflow-y-auto">
                {/* Onglet 1: Enregistrement */}
                <TabsContent value="entry">
                  <div className="space-y-6">
                    {/* FORMULAIRE FACTURE D'ACHAT - TVA auto-calculée */}
                    {entryType === 'purchase' && (
                      <div className="space-y-6 p-6 bg-blue-50/30 rounded-xl border border-blue-200">
                        <div className="flex items-center space-x-3 mb-4">
                          <ShoppingCart className="h-6 w-6 text-blue-600" />
                          <h4 className="text-xl font-bold text-blue-800">Facture d'Achat - TVA Auto-calculée</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-blue-700 mb-2">Fournisseur *</label>
                            <select className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                              <option>Sélectionner un fournisseur...</option>
                              <option>SARL Tech Solutions (F001)</option>
                              <option>Entreprise ABC (F002)</option>
                              <option>Fournisseur XYZ (F003)</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-blue-700 mb-2">N° Facture *</label>
                            <input
                              type="text"
                              value={purchaseData.invoiceNumber}
                              onChange={(e) => setPurchaseData({...purchaseData, invoiceNumber: e.target.value})}
                              className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="FAC-2024-001"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-blue-700 mb-2">Date d'échéance</label>
                            <input
                              type="date"
                              value={purchaseData.dueDate}
                              onChange={(e) => setPurchaseData({...purchaseData, dueDate: e.target.value})}
                              className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-semibold text-blue-700 mb-2">Montant TTC *</label>
                              <input
                                type="number"
                                step="0.01"
                                value={purchaseData.amount}
                                onChange={(e) => {
                                  const amount = parseFloat(e.target.value) || 0;
                                  const vatAmount = amount * purchaseData.vatRate / (100 + purchaseData.vatRate);
                                  setPurchaseData({...purchaseData, amount, vatAmount});
                                }}
                                className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-mono"
                                placeholder="0.00"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-blue-700 mb-2">Taux TVA</label>
                              <select
                                value={purchaseData.vatRate}
                                onChange={(e) => {
                                  const vatRate = parseFloat(e.target.value);
                                  const vatAmount = purchaseData.amount * vatRate / (100 + vatRate);
                                  setPurchaseData({...purchaseData, vatRate, vatAmount});
                                }}
                                className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              >
                                <option value={0}>0% - Exonéré TVA</option>
                                <option value={10}>10% - Taux réduit</option>
                                <option value={20}>20% - Taux normal</option>
                              </select>
                            </div>
                          </div>

                          <div className="bg-blue-100/50 p-4 rounded-lg space-y-3">
                            <h5 className="font-semibold text-blue-800">💰 Calculs automatiques</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-blue-700">Montant HT:</span>
                                <span className="font-bold text-blue-900">{(purchaseData.amount - purchaseData.vatAmount).toFixed(2)} €</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700">TVA ({purchaseData.vatRate}%):</span>
                                <span className="font-bold text-blue-900">{purchaseData.vatAmount.toFixed(2)} €</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="font-bold text-blue-800">Montant TTC:</span>
                                <span className="font-bold text-blue-900 text-lg">{purchaseData.amount.toFixed(2)} €</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-blue-700 mb-2">Description</label>
                          <input
                            type="text"
                            value={purchaseData.description}
                            onChange={(e) => setPurchaseData({...purchaseData, description: e.target.value})}
                            className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Description de l'achat..."
                          />
                        </div>
                        
                        <div>
                          <ElegantButton onClick={generateEntries} icon={Calculator} variant="primary">
                            🧮 Générer les Écritures Comptables
                          </ElegantButton>
                        </div>
                      </div>
                    )}

                    {/* FORMULAIRE FACTURE DE VENTE - Ventilation produits */}
                    {entryType === 'sale' && (
                      <div className="space-y-6 p-6 bg-green-50/30 rounded-xl border border-green-200">
                        <div className="flex items-center space-x-3 mb-4">
                          <CreditCard className="h-6 w-6 text-green-600" />
                          <h4 className="text-xl font-bold text-green-800">Facture de Vente - Ventilation Produits</h4>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-green-700 mb-2">Client *</label>
                            <select className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white">
                              <option>Sélectionner un client...</option>
                              <option>Client Premium SARL (C001)</option>
                              <option>Société XYZ (C002)</option>
                              <option>Entreprise DEF (C003)</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-green-700 mb-2">N° Facture *</label>
                            <input
                              type="text"
                              value={saleData.invoiceNumber}
                              onChange={(e) => setSaleData({...saleData, invoiceNumber: e.target.value})}
                              className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                              placeholder="VTE-2024-001"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-green-700 mb-4">🛒 Ventilation Produits/Services</label>
                          <div className="border border-green-300 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-green-100">
                                <tr>
                                  <th className="text-left p-3 text-sm font-semibold text-green-800">Produit/Service</th>
                                  <th className="text-center p-3 text-sm font-semibold text-green-800">Qté</th>
                                  <th className="text-right p-3 text-sm font-semibold text-green-800">Prix Unit. HT</th>
                                  <th className="text-center p-3 text-sm font-semibold text-green-800">TVA</th>
                                  <th className="text-right p-3 text-sm font-semibold text-green-800">Total TTC</th>
                                  <th className="text-center p-3 text-sm font-semibold text-green-800">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {saleData.products.map((product, index) => {
                                  const totalHT = product.quantity * product.unitPrice;
                                  const vatAmount = totalHT * product.vatRate / 100;
                                  const totalTTC = totalHT + vatAmount;
                                  
                                  return (
                                    <tr key={index} className="border-t border-green-200">
                                      <td className="p-3">
                                        <input
                                          type="text"
                                          value={product.name}
                                          onChange={(e) => {
                                            const newProducts = [...saleData.products];
                                            newProducts[index].name = e.target.value;
                                            setSaleData({...saleData, products: newProducts});
                                          }}
                                          className="w-full px-3 py-2 border border-green-300 rounded text-sm"
                                          placeholder="Nom du produit/service"
                                        />
                                      </td>
                                      <td className="p-3">
                                        <input
                                          type="number"
                                          value={product.quantity}
                                          onChange={(e) => {
                                            const newProducts = [...saleData.products];
                                            newProducts[index].quantity = parseFloat(e.target.value) || 0;
                                            setSaleData({...saleData, products: newProducts});
                                          }}
                                          className="w-full px-3 py-2 border border-green-300 rounded text-sm text-center"
                                          placeholder="1"
                                        />
                                      </td>
                                      <td className="p-3">
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={product.unitPrice}
                                          onChange={(e) => {
                                            const newProducts = [...saleData.products];
                                            newProducts[index].unitPrice = parseFloat(e.target.value) || 0;
                                            setSaleData({...saleData, products: newProducts});
                                          }}
                                          className="w-full px-3 py-2 border border-green-300 rounded text-sm text-right font-mono"
                                          placeholder="0.00"
                                        />
                                      </td>
                                      <td className="p-3">
                                        <select
                                          value={product.vatRate}
                                          onChange={(e) => {
                                            const newProducts = [...saleData.products];
                                            newProducts[index].vatRate = parseFloat(e.target.value);
                                            setSaleData({...saleData, products: newProducts});
                                          }}
                                          className="w-full px-3 py-2 border border-green-300 rounded text-sm text-center"
                                        >
                                          <option value={0}>0%</option>
                                          <option value={10}>10%</option>
                                          <option value={20}>20%</option>
                                        </select>
                                      </td>
                                      <td className="p-3 text-right font-mono text-sm font-semibold text-green-700">
                                        {totalTTC.toFixed(2)} €
                                      </td>
                                      <td className="p-3 text-center">
                                        {saleData.products.length > 1 && (
                                          <button
                                            onClick={() => {
                                              const newProducts = saleData.products.filter((_, i) => i !== index);
                                              setSaleData({...saleData, products: newProducts});
                                            }}
                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="bg-green-100 border-t-2 border-green-300">
                                <tr>
                                  <td colSpan={4} className="p-3 text-right font-bold text-green-800">TOTAL FACTURE:</td>
                                  <td className="p-3 text-right font-bold text-green-900 text-lg font-mono">
                                    {saleData.products.reduce((sum, p) => sum + (p.quantity * p.unitPrice * (1 + p.vatRate/100)), 0).toFixed(2)} €
                                  </td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                            
                            <div className="p-3 bg-green-50">
                              <button
                                onClick={() => setSaleData({
                                  ...saleData,
                                  products: [...saleData.products, { name: '', quantity: 1, unitPrice: 0, vatRate: 20 }]
                                })}
                                className="flex items-center space-x-2 text-green-600 hover:bg-green-100 p-2 rounded-lg transition-all"
                              >
                                <Plus className="h-4 w-4" />
                                <span className="font-medium">Ajouter une ligne produit</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div>
                          <ElegantButton onClick={generateEntries} icon={Calculator} variant="primary">
                            💚 Générer Facture avec Ventilation
                          </ElegantButton>
                        </div>
                      </div>
                    )}

                    {/* FORMULAIRE RÈGLEMENT - Entrées/Sorties + Lettrage automatique */}
                    {entryType === 'payment' && (
                      <div className="space-y-6 p-6 bg-purple-50/30 rounded-xl border border-purple-200">
                        <div className="flex items-center space-x-3 mb-4">
                          <CreditCard className="h-6 w-6 text-purple-600" />
                          <h4 className="text-xl font-bold text-purple-800">Règlement - Lettrage Automatique</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Section 1: Type et direction */}
                          <div className="space-y-4">
                            <h5 className="font-semibold text-purple-800">💸 Type de mouvement</h5>
                            
                            <div>
                              <label className="block text-sm font-semibold text-purple-700 mb-3">Direction du flux *</label>
                              <div className="space-y-2">
                                <label className="flex items-center space-x-3 p-3 border border-purple-300 rounded-lg bg-white cursor-pointer hover:bg-purple-50">
                                  <input
                                    type="radio"
                                    name="paymentDirection"
                                    value="customer_receipt"
                                    checked={paymentData.paymentType === 'customer_receipt'}
                                    onChange={(e) => setPaymentData({...paymentData, paymentType: e.target.value as any})}
                                    className="text-green-600 focus:ring-green-500"
                                  />
                                  <div className="flex items-center space-x-2">
                                    <span className="text-2xl">💰</span>
                                    <div>
                                      <p className="font-medium text-green-700">ENTRÉE D'ARGENT</p>
                                      <p className="text-xs text-green-600">Encaissement client</p>
                                    </div>
                                  </div>
                                </label>
                                
                                <label className="flex items-center space-x-3 p-3 border border-purple-300 rounded-lg bg-white cursor-pointer hover:bg-purple-50">
                                  <input
                                    type="radio"
                                    name="paymentDirection"
                                    value="supplier_payment"
                                    checked={paymentData.paymentType === 'supplier_payment'}
                                    onChange={(e) => setPaymentData({...paymentData, paymentType: e.target.value as any})}
                                    className="text-red-600 focus:ring-red-500"
                                  />
                                  <div className="flex items-center space-x-2">
                                    <span className="text-2xl">💸</span>
                                    <div>
                                      <p className="font-medium text-red-700">SORTIE D'ARGENT</p>
                                      <p className="text-xs text-red-600">Paiement fournisseur</p>
                                    </div>
                                  </div>
                                </label>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-purple-700 mb-2">Mode de paiement *</label>
                              <select
                                value={paymentData.paymentMethod}
                                onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value as any})}
                                className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                              >
                                <option value="bank">🏦 Virement bancaire</option>
                                <option value="cash">💵 Espèces</option>
                                <option value="check">📄 Chèque</option>
                                <option value="card">💳 Carte bancaire</option>
                                <option value="direct_debit">🔄 Prélèvement</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-purple-700 mb-2">Référence/N°</label>
                              <input
                                type="text"
                                value={paymentData.reference}
                                onChange={(e) => setPaymentData({...paymentData, reference: e.target.value})}
                                className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder={
                                  paymentData.paymentMethod === 'bank' ? 'Réf. virement' :
                                  paymentData.paymentMethod === 'check' ? 'N° chèque' :
                                  paymentData.paymentMethod === 'cash' ? 'N° reçu' :
                                  'Référence'
                                }
                              />
                            </div>
                          </div>

                          {/* Section 2: Sélection tiers et ses factures */}
                          <div className="space-y-4">
                            <h5 className="font-semibold text-purple-800">
                              {paymentData.paymentType === 'customer_receipt' ? '👤 Sélection Client' : '🏢 Sélection Fournisseur'}
                            </h5>
                            
                            <div>
                              <label className="block text-sm font-semibold text-purple-700 mb-2">
                                {paymentData.paymentType === 'customer_receipt' ? 'Client à encaisser *' : 'Fournisseur à payer *'}
                              </label>
                              <select 
                                value={paymentData.thirdParty}
                                onChange={(e) => setPaymentData({...paymentData, thirdParty: e.target.value, invoiceToMatch: ''})}
                                className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-lg font-medium"
                              >
                                <option value="">Sélectionner...</option>
                                {paymentData.paymentType === 'customer_receipt' ? (
                                  <>
                                    <option value="C001">🏢 Client Premium SARL - Solde: 15,250 €</option>
                                    <option value="C002">🏢 Société XYZ - Solde: 8,420 €</option>
                                    <option value="C003">🏢 Entreprise DEF - Solde: 12,890 €</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="F001">🏭 SARL Tech Solutions - Solde: 5,200 €</option>
                                    <option value="F002">🏭 Entreprise ABC - Solde: 18,750 €</option>
                                    <option value="F003">🏭 Fournisseur XYZ - Solde: 3,450 €</option>
                                  </>
                                )}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-purple-700 mb-2">
                                Montant total du règlement *
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={paymentData.amount}
                                  onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                                  className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-xl font-mono pr-12"
                                  placeholder="0.00"
                                />
                                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-600 font-bold">€</span>
                              </div>
                            </div>

                            <div className="bg-purple-100 p-3 rounded-lg">
                              <p className="text-sm text-purple-700">
                                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                                  paymentData.paymentType === 'customer_receipt' ? 'bg-green-500' : 'bg-red-500'
                                }`}></span>
                                {paymentData.paymentType === 'customer_receipt' 
                                  ? '💰 ENTRÉE: Argent qui arrive en trésorerie' 
                                  : '💸 SORTIE: Argent qui sort de la trésorerie'
                                }
                              </p>
                            </div>
                          </div>

                          {/* Section 3: Factures du tiers sélectionné + Lettrage/Ventilation */}
                          <div className="bg-purple-100/50 p-4 rounded-lg space-y-4">
                            <h5 className="font-bold text-purple-800 flex items-center space-x-2">
                              <Target className="h-5 w-5" />
                              <span>📋 Factures & Ventilation</span>
                            </h5>
                            
                            {!paymentData.thirdParty && (
                              <div className="text-center p-6 text-purple-600">
                                <p className="text-sm">👆 Sélectionnez d'abord un tiers pour voir ses factures</p>
                              </div>
                            )}
                            
                            {paymentData.thirdParty && (
                              <div className="space-y-4">
                                <div className="bg-white p-4 rounded border border-purple-200">
                                  <p className="text-sm font-semibold text-purple-700 mb-3">
                                    {paymentData.paymentType === 'customer_receipt' 
                                      ? `📊 Factures en attente du client ${paymentData.thirdParty}:` 
                                      : `📊 Factures en attente du fournisseur ${paymentData.thirdParty}:`
                                    }
                                  </p>
                                  
                                  {/* Liste des factures spécifiques au tiers */}
                                  <div className="space-y-2">
                                    <div className="bg-gray-50 p-3 rounded text-xs font-medium text-gray-600 grid grid-cols-4">
                                      <span>Facture</span>
                                      <span>Date</span>
                                      <span>Montant</span>
                                      <span>Lettrer</span>
                                    </div>
                                    
                                    {/* Factures dynamiques selon le tiers */}
                                    {paymentData.thirdParty === 'C001' && (
                                      <>
                                        <label className="grid grid-cols-4 items-center p-2 hover:bg-purple-50 rounded cursor-pointer">
                                          <span className="text-sm">FAC-VTE-2024-156</span>
                                          <span className="text-xs text-gray-600">15/08/2024</span>
                                          <span className="text-sm font-mono">2,500.00 €</span>
                                          <input 
                                            type="checkbox" 
                                            className="text-purple-600 rounded focus:ring-purple-500"
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setPaymentData({...paymentData, amount: 2500});
                                              }
                                            }}
                                          />
                                        </label>
                                        <label className="grid grid-cols-4 items-center p-2 hover:bg-purple-50 rounded cursor-pointer">
                                          <span className="text-sm">FAC-VTE-2024-189</span>
                                          <span className="text-xs text-gray-600">22/08/2024</span>
                                          <span className="text-sm font-mono">1,750.00 €</span>
                                          <input 
                                            type="checkbox" 
                                            className="text-purple-600 rounded focus:ring-purple-500"
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setPaymentData({...paymentData, amount: paymentData.amount + 1750});
                                              }
                                            }}
                                          />
                                        </label>
                                        <label className="grid grid-cols-4 items-center p-2 hover:bg-purple-50 rounded cursor-pointer">
                                          <span className="text-sm">FAC-VTE-2024-201</span>
                                          <span className="text-xs text-gray-600">28/08/2024</span>
                                          <span className="text-sm font-mono">3,200.00 €</span>
                                          <input 
                                            type="checkbox" 
                                            className="text-purple-600 rounded focus:ring-purple-500"
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setPaymentData({...paymentData, amount: paymentData.amount + 3200});
                                              }
                                            }}
                                          />
                                        </label>
                                      </>
                                    )}

                                    {paymentData.thirdParty === 'F001' && (
                                      <>
                                        <label className="grid grid-cols-4 items-center p-2 hover:bg-purple-50 rounded cursor-pointer">
                                          <span className="text-sm">FAC-ACH-2024-78</span>
                                          <span className="text-xs text-gray-600">12/08/2024</span>
                                          <span className="text-sm font-mono">1,850.00 €</span>
                                          <input 
                                            type="checkbox" 
                                            className="text-purple-600 rounded focus:ring-purple-500"
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setPaymentData({...paymentData, amount: 1850});
                                              }
                                            }}
                                          />
                                        </label>
                                        <label className="grid grid-cols-4 items-center p-2 hover:bg-purple-50 rounded cursor-pointer">
                                          <span className="text-sm">FAC-ACH-2024-92</span>
                                          <span className="text-xs text-gray-600">18/08/2024</span>
                                          <span className="text-sm font-mono">3,350.00 €</span>
                                          <input 
                                            type="checkbox" 
                                            className="text-purple-600 rounded focus:ring-purple-500"
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setPaymentData({...paymentData, amount: paymentData.amount + 3350});
                                              }
                                            }}
                                          />
                                        </label>
                                      </>
                                    )}

                                    {(paymentData.thirdParty === 'C002' || paymentData.thirdParty === 'C003' || 
                                      paymentData.thirdParty === 'F002' || paymentData.thirdParty === 'F003') && (
                                      <div className="p-3 text-center text-purple-600">
                                        <p className="text-sm">📋 Factures disponibles pour ce tiers...</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="mt-3 pt-3 border-t border-purple-200">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-semibold text-purple-700">Montant à ventiler:</span>
                                      <span className="font-bold text-lg text-purple-800">{paymentData.amount.toFixed(2)} €</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="bg-purple-200/50 p-3 rounded border-l-4 border-purple-500">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <CheckCircle className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-bold text-purple-800">🎯 Lettrage automatique activé</span>
                                  </div>
                                  <p className="text-xs text-purple-700">
                                    ✅ Les factures sélectionnées seront automatiquement lettrées avec ce règlement
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <ElegantButton onClick={generateEntries} icon={Calculator} variant="primary">
                            {paymentData.paymentType === 'customer_receipt' 
                              ? '💰 Générer Encaissement Client' 
                              : '💸 Générer Paiement Fournisseur'
                            }
                          </ElegantButton>
                        </div>
                      </div>
                    )}

                    {/* FORMULAIRE OPÉRATION DIVERSE - Saisie libre */}
                    {entryType === 'other' && (
                      <div className="space-y-6 p-6 bg-gray-50/30 rounded-xl border border-gray-200">
                        <div className="flex items-center space-x-3 mb-4">
                          <Settings className="h-6 w-6 text-gray-600" />
                          <h4 className="text-xl font-bold text-gray-800">Opération Diverse - Saisie Libre</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Journal</label>
                            <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 bg-white">
                              <option value="OD">OD - Opérations Diverses</option>
                              <option value="AN">AN - À Nouveaux</option>
                              <option value="EX">EX - Extourne</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Date d'opération</label>
                            <input
                              type="date"
                              defaultValue={new Date().toISOString().split('T')[0]}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Libellé général</label>
                          <input
                            type="text"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                            placeholder="Description de l'opération diverse..."
                          />
                        </div>
                        
                        <div className="bg-gray-100 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">
                            💡 <strong>Saisie libre:</strong> Utilisez le tableau ci-dessous pour saisir manuellement vos écritures comptables.
                            Veillez à l'équilibre débit = crédit.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Table des écritures */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-neutral-800">Écritures comptables</h4>
                        <ElegantButton onClick={addEntry} icon={Plus} size="sm" variant="outline">
                          Ajouter une ligne
                        </ElegantButton>
                      </div>

                      <div className="border border-neutral-200 rounded-xl overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-neutral-50">
                            <tr>
                              <th className="text-left p-4 font-medium text-neutral-700">Compte</th>
                              <th className="text-left p-4 font-medium text-neutral-700">Libellé</th>
                              <th className="text-right p-4 font-medium text-neutral-700">Débit</th>
                              <th className="text-right p-4 font-medium text-neutral-700">Crédit</th>
                              <th className="text-center p-4 font-medium text-neutral-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map((entry, index) => (
                              <tr key={index} className="border-t border-neutral-100">
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={entry.account}
                                    onChange={(e) => updateEntry(index, 'account', e.target.value)}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                                    placeholder="Numéro de compte"
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={entry.label}
                                    onChange={(e) => updateEntry(index, 'label', e.target.value)}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                                    placeholder="Libellé de l'écriture"
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={entry.debit || ''}
                                    onChange={(e) => updateEntry(index, 'debit', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm text-right"
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={entry.credit || ''}
                                    onChange={(e) => updateEntry(index, 'credit', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm text-right"
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => removeEntry(index)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-neutral-50 border-t border-neutral-200">
                            <tr>
                              <td colSpan={2} className="p-4 font-semibold text-neutral-800">Totaux</td>
                              <td className="p-4 text-right font-bold text-blue-600">{totalDebit.toFixed(2)} €</td>
                              <td className="p-4 text-right font-bold text-green-600">{totalCredit.toFixed(2)} €</td>
                              <td className="p-4 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  Math.abs(totalDebit - totalCredit) < 0.01 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {Math.abs(totalDebit - totalCredit) < 0.01 ? 'Équilibrée' : 'Déséquilibrée'}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Onglet 2: Notes */}
                <TabsContent value="notes">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-neutral-800">Notes et commentaires</h4>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Ajoutez des notes, commentaires ou précisions sur cette écriture..."
                    />
                    <div className="text-sm text-neutral-500">
                      {notes.length} caractères
                    </div>
                  </div>
                </TabsContent>

                {/* Onglet 3: Pièces jointes */}
                <TabsContent value="attachments">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-neutral-800">Pièces justificatives</h4>
                    
                    <div className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center">
                      <Upload className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                      <p className="text-neutral-600 mb-4">Glissez vos fichiers ici ou cliquez pour sélectionner</p>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <ElegantButton as="span" variant="outline" icon={Upload} size="sm">
                          Sélectionner des fichiers
                        </ElegantButton>
                      </label>
                    </div>

                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-neutral-700">Fichiers attachés ({attachments.length})</h5>
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Paperclip className="h-4 w-4 text-neutral-500" />
                              <span className="text-sm text-neutral-700">{file.name}</span>
                              <span className="text-xs text-neutral-500">({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <button
                              onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-neutral-200 bg-neutral-50">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-neutral-600">
                Équilibre: {Math.abs(totalDebit - totalCredit) < 0.01 ? '✅ Équilibrée' : '❌ Déséquilibrée'}
              </span>
            </div>
            
            <div className="flex gap-3">
              <ElegantButton variant="outline" onClick={onClose}>
                Annuler
              </ElegantButton>
              <ElegantButton 
                variant="primary" 
                disabled={Math.abs(totalDebit - totalCredit) > 0.01}
                icon={FileText}
              >
                Enregistrer l'Écriture
              </ElegantButton>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default JournalEntryModal;