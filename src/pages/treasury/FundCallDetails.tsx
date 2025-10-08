import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Calendar, DollarSign, Users, CheckCircle, BarChart3,
  Plus, Eye, Edit, Target
} from 'lucide-react';

const FundCallDetails: React.FC = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('position_avant');
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [expandedProposalVendors, setExpandedProposalVendors] = useState<Set<string>>(new Set());
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [accountPayableData, setAccountPayableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedAggregateRows, setExpandedAggregateRows] = useState<Set<string>>(new Set());
  const [expandedPaymentDetails, setExpandedPaymentDetails] = useState<Set<string>>(new Set());
  const [showValidatorConfig, setShowValidatorConfig] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [workflowComment, setWorkflowComment] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedInvoiceForNote, setSelectedInvoiceForNote] = useState(null);
  const [invoiceNotes, setInvoiceNotes] = useState<Record<string, string>>({});
  const [newExpenses, setNewExpenses] = useState([]);

  // Données de l'appel de fonds
  const fundCallData = {
    id: id,
    reference: `FC000${id}`,
    date: '17/05/2025',
    status: 'En Cours',
    banqueDepart: 'B1 nsia domiciliation',
    banqueArrivee: 'B2 nsia charges d\'exploitations',
    montant: 0,
    initiePar: 'Atokouna Pamela',
    commentaires: 'Transfert pour charges opérationnelles'
  };

  // Onglets de détails d'appel
  const detailTabs = [
    { id: 'position_avant', label: 'Position Avant', icon: BarChart3 },
    { id: 'planification', label: 'Planification', icon: Calendar },
    { id: 'workflow', label: 'Workflow d\'Approbation', icon: CheckCircle },
    { id: 'position_apres', label: 'Position Après', icon: Target },
    { id: 'resume', label: 'Résumé', icon: DollarSign },
    { id: 'attachements', label: 'Attachements', icon: Plus },
  ];

  // Fonctions de gestion (reprises du code précédent)
  const toggleVendorExpansion = (vendor: string) => {
    const newExpanded = new Set(expandedVendors);
    if (newExpanded.has(vendor)) {
      newExpanded.delete(vendor);
    } else {
      newExpanded.add(vendor);
    }
    setExpandedVendors(newExpanded);
  };

  const toggleProposalVendorExpansion = (vendor: string) => {
    const newExpanded = new Set(expandedProposalVendors);
    if (newExpanded.has(vendor)) {
      newExpanded.delete(vendor);
    } else {
      newExpanded.add(vendor);
    }
    setExpandedProposalVendors(newExpanded);
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const toggleAggregateRowExpansion = (rowType: string) => {
    const newExpanded = new Set(expandedAggregateRows);
    if (newExpanded.has(rowType)) {
      newExpanded.delete(rowType);
    } else {
      newExpanded.add(rowType);
    }
    setExpandedAggregateRows(newExpanded);
  };

  const togglePaymentDetailsExpansion = (detailType: string) => {
    const newExpanded = new Set(expandedPaymentDetails);
    if (newExpanded.has(detailType)) {
      newExpanded.delete(detailType);
    } else {
      newExpanded.add(detailType);
    }
    setExpandedPaymentDetails(newExpanded);
  };

  // Charger les données du Grand Livre
  useEffect(() => {
    const fetchAccountPayableData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://127.0.0.1:8888/accounting/account-payable/grand-livre/');
        setAccountPayableData(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement du Grand Livre:', error);
        setLoading(false);
      }
    };

    fetchAccountPayableData();
  }, []);

  // Transformer les données du Grand Livre pour l'affichage
  const vendorInvoices = accountPayableData ?
    Object.fromEntries(
      Object.entries(accountPayableData.vendors).map(([vendor, data]: [string, any]) => [
        vendor,
        data.invoices.map((invoice: any) => ({
          id: invoice.id,
          docDate: invoice.date_piece,
          docNumber: invoice.numero_piece,
          reference: invoice.reference,
          description: invoice.libelle,
          dueAmount: invoice.montant_du,
          outstanding: invoice.montant_impaye,
          type: 'Invoice',
          days: invoice.age_jours
        }))
      ])
    ) : {};

  const getVendorAggregate = (vendor: string) => {
    const invoices = vendorInvoices[vendor] || [];
    return {
      count: invoices.length,
      totalDue: invoices.reduce((sum, inv) => sum + inv.dueAmount, 0),
      totalOutstanding: invoices.reduce((sum, inv) => sum + inv.outstanding, 0),
      avgDays: Math.round(invoices.reduce((sum, inv) => sum + inv.days, 0) / invoices.length)
    };
  };

  const getSelectedInvoicesDetails = () => {
    const selected = [];
    for (const [vendor, invoices] of Object.entries(vendorInvoices)) {
      for (const invoice of invoices) {
        if (selectedInvoices.has(invoice.id)) {
          selected.push({ ...invoice, vendor });
        }
      }
    }
    return selected;
  };

  const getTotalSelectedAmount = () => {
    const selectedAmount = getSelectedInvoicesDetails().reduce((sum, inv) => sum + inv.outstanding, 0);
    const manualAmount = newExpenses.reduce((sum, exp) => sum + exp.outstanding, 0);
    return selectedAmount + manualAmount;
  };

  const removeFromPaymentProposal = (invoiceId: string) => {
    // Si c'est une facture sélectionnée depuis Account Payable
    if (!invoiceId.startsWith('NEW-')) {
      const newSelected = new Set(selectedInvoices);
      newSelected.delete(invoiceId);
      setSelectedInvoices(newSelected);
    } else {
      // Si c'est une dépense ajoutée manuellement
      setNewExpenses(prev => prev.filter(exp => exp.id !== invoiceId));
    }
  };

  const openNoteModal = (invoice: any) => {
    setSelectedInvoiceForNote(invoice);
    setShowNoteModal(true);
  };

  const saveInvoiceNote = (note: string) => {
    if (selectedInvoiceForNote) {
      setInvoiceNotes(prev => ({
        ...prev,
        [selectedInvoiceForNote.id]: note
      }));
      setShowNoteModal(false);
      setSelectedInvoiceForNote(null);
    }
  };

  // Fonction pour calculer l'âge automatiquement
  const calculateAge = (docDate: string) => {
    if (!docDate) return 0;
    const today = new Date();
    const documentDate = new Date(docDate);
    const diffTime = Math.abs(today - documentDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Ajouter une nouvelle dépense
  const addNewExpense = (expenseData: any) => {
    const calculatedAge = calculateAge(expenseData.docDate);
    const newExpense = {
      id: `NEW-${Date.now()}`,
      vendor: expenseData.vendor,
      docDate: expenseData.docDate,
      docNumber: expenseData.docNumber,
      reference: expenseData.reference,
      description: expenseData.description,
      dueAmount: parseFloat(expenseData.dueAmount),
      outstanding: parseFloat(expenseData.outstanding),
      type: expenseData.type,
      days: calculatedAge
    };
    setNewExpenses(prev => [...prev, newExpense]);
    setShowAddExpenseModal(false);
  };

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header de l'appel de fonds */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/treasury/fund-calls')}
              className="flex items-center space-x-2 px-3 py-2 text-[#767676] hover:text-[#444444] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Retour</span>
            </button>

            <div className="h-6 w-px bg-[#E8E8E8]"></div>

            <div>
              <h1 className="text-xl font-bold text-[#191919]">
                📋 Appel de Fonds {fundCallData.reference}
              </h1>
              <p className="text-sm text-[#767676]">
                Initié par {fundCallData.initiePar} le {fundCallData.date}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
              fundCallData.status === 'En Cours' ? 'bg-yellow-100 text-yellow-800' :
              fundCallData.status === 'Approuvé' ? 'bg-green-100 text-green-800' :
              'bg-orange-100 text-orange-800'
            }`}>
              {fundCallData.status}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation par sous-onglets */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        <div className="border-b border-[#E8E8E8]">
          <nav className="flex space-x-8 px-6">
            {detailTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-[#B87333] text-[#B87333]'
                      : 'border-transparent text-[#767676] hover:text-[#444444]'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu des sous-onglets */}
        <div className="p-6">
          {activeTab === 'position_avant' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-[#E8E8E8] p-6">
                <h3 className="font-semibold text-[#191919] mb-6">📊 Position des Comptes Avant l'Appel de Fonds</h3>

                {/* Informations de l'appel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#6A8A82]/10 p-4 rounded-lg">
                    <h4 className="font-medium text-[#6A8A82] mb-2">📅 Issue Date</h4>
                    <p className="text-lg font-bold text-[#191919]">{fundCallData.date}</p>
                  </div>
                  <div className="bg-[#B87333]/10 p-4 rounded-lg">
                    <h4 className="font-medium text-[#B87333] mb-2">⏰ Due Date</h4>
                    <p className="text-lg font-bold text-[#191919]">23/05/2025</p>
                  </div>
                </div>

                {/* Position des comptes sollicités */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700 mb-4">🏦 NSIA Expense Bank Account Statement</h4>

                  <div className="bg-gray-50 rounded-lg p-6" style={{maxHeight: '400px', overflowY: 'auto'}}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Compte de départ */}
                      <div className="space-y-3">
                        <h5 className="font-medium text-gray-800 border-b border-gray-300 pb-2">
                          {fundCallData.banqueDepart}
                        </h5>

                        <div className="space-y-2">
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-[#767676]">Current balance to date</span>
                            <span className="font-medium text-[#B87333]">-64,051,588 FCFA</span>
                          </div>
                          <div
                            className="flex justify-between py-2 cursor-pointer hover:bg-white/50 rounded"
                            onClick={() => togglePaymentDetailsExpansion('ongoing_payment_source')}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-bold text-[#6A8A82]">
                                {expandedPaymentDetails.has('ongoing_payment_source') ? '−' : '+'}
                              </span>
                              <span className="text-sm text-[#767676]">Ongoing payment (check)</span>
                            </div>
                            <span className="font-medium text-[#444444]">0 FCFA</span>
                          </div>
                          {expandedPaymentDetails.has('ongoing_payment_source') && (
                            <div className="ml-6 bg-white/30 rounded p-2 text-xs text-[#767676]">
                              <p>• Aucun chèque en cours de traitement</p>
                              <p>• Aucun virement en attente</p>
                            </div>
                          )}
                          <div
                            className="flex justify-between py-2 cursor-pointer hover:bg-white/50 rounded"
                            onClick={() => togglePaymentDetailsExpansion('ongoing_expenses_source')}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-bold text-[#6A8A82]">
                                {expandedPaymentDetails.has('ongoing_expenses_source') ? '−' : '+'}
                              </span>
                              <span className="text-sm text-[#767676]">Ongoing expenses (outgoing cash)</span>
                            </div>
                            <span className="font-medium text-[#444444]">0 FCFA</span>
                          </div>
                          {expandedPaymentDetails.has('ongoing_expenses_source') && (
                            <div className="ml-6 bg-white/30 rounded p-2 text-xs text-[#767676]">
                              <p>• Aucune dépense programmée</p>
                              <p>• Aucun engagement ferme</p>
                            </div>
                          )}
                          <div className="border-t border-[#E8E8E8] pt-2">
                            <div className="flex justify-between py-2">
                              <span className="text-sm font-bold text-[#191919]">Theorical Balance to date</span>
                              <span className="font-bold text-[#B87333]">-64,051,588 FCFA</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Compte de destination */}
                      <div className="space-y-3">
                        <h5 className="font-medium text-gray-800 border-b border-gray-300 pb-2">
                          {fundCallData.banqueArrivee}
                        </h5>

                        <div className="space-y-2">
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-[#767676]">Current balance to date</span>
                            <span className="font-medium text-[#6A8A82]">12,340,000 FCFA</span>
                          </div>
                          <div
                            className="flex justify-between py-2 cursor-pointer hover:bg-white/50 rounded"
                            onClick={() => togglePaymentDetailsExpansion('ongoing_payment_dest')}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-bold text-[#6A8A82]">
                                {expandedPaymentDetails.has('ongoing_payment_dest') ? '−' : '+'}
                              </span>
                              <span className="text-sm text-[#767676]">Ongoing payment (check)</span>
                            </div>
                            <span className="font-medium text-[#444444]">0 FCFA</span>
                          </div>
                          {expandedPaymentDetails.has('ongoing_payment_dest') && (
                            <div className="ml-6 bg-white/30 rounded p-2 text-xs text-[#767676]">
                              <p>• Aucun chèque en attente d'encaissement</p>
                              <p>• Aucun virement attendu</p>
                            </div>
                          )}
                          <div
                            className="flex justify-between py-2 cursor-pointer hover:bg-white/50 rounded"
                            onClick={() => togglePaymentDetailsExpansion('ongoing_expenses_dest')}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-bold text-[#6A8A82]">
                                {expandedPaymentDetails.has('ongoing_expenses_dest') ? '−' : '+'}
                              </span>
                              <span className="text-sm text-[#767676]">Ongoing expenses (outgoing cash)</span>
                            </div>
                            <span className="font-medium text-[#B87333]">2,500,000 FCFA</span>
                          </div>
                          {expandedPaymentDetails.has('ongoing_expenses_dest') && (
                            <div className="ml-6 bg-white/30 rounded p-2 text-xs text-[#767676]">
                              <p>• Charges sociales programmées: 1,500,000 FCFA</p>
                              <p>• Loyers trimestriels: 1,000,000 FCFA</p>
                            </div>
                          )}
                          <div className="border-t border-[#E8E8E8] pt-2">
                            <div className="flex justify-between py-2">
                              <span className="text-sm font-bold text-[#191919]">Theorical Balance to date</span>
                              <span className="font-bold text-[#6A8A82]">9,840,000 FCFA</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Analyse de faisabilité */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-[#B87333]/10 rounded-lg text-center">
                      <h5 className="font-medium text-[#B87333] mb-1">⚠️ Découvert Source</h5>
                      <p className="text-xl font-bold text-[#B87333]">-64,051,588 FCFA</p>
                      <p className="text-xs text-[#767676]">Nécessite couverture</p>
                    </div>

                    <div className="p-4 bg-[#6A8A82]/10 rounded-lg text-center">
                      <h5 className="font-medium text-[#6A8A82] mb-1">✅ Solde Destination</h5>
                      <p className="text-xl font-bold text-[#6A8A82]">9,840,000 FCFA</p>
                      <p className="text-xs text-[#767676]">Après dépenses prévues</p>
                    </div>

                    <div className="p-4 bg-[#7A99AC]/10 rounded-lg text-center">
                      <h5 className="font-medium text-[#7A99AC] mb-1">📊 Délai Restant</h5>
                      <p className="text-xl font-bold text-[#7A99AC]">6 jours</p>
                      <p className="text-xs text-[#767676]">Jusqu'à l'échéance</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {activeTab === 'planification' && (
            <div className="space-y-6">
              {/* Ici on reprend le contenu des deux tables de planification */}
              {/* Table 1: Account Payable */}
              <div className="bg-white rounded-lg border border-[#E8E8E8]">
                <div className="p-4 border-b border-[#E8E8E8] bg-[#B87333]/5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-[#191919]">📋 Account Payable</h3>
                      <p className="text-xs text-gray-600">
                        Source: Grand Livre Comptable - Comptes Classe 4 (Fournisseurs)
                        {accountPayableData && (
                          <> • Extraction du {new Date(accountPayableData.date_extraction).toLocaleDateString('fr-FR')}</>
                        )}
                      </p>
                    </div>
                    <div className="bg-[#B87333] text-white px-3 py-1 rounded-lg text-sm font-medium">
                      Total Outstanding: {accountPayableData ?
                        new Intl.NumberFormat('fr-FR').format(accountPayableData.total_outstanding) :
                        '...'
                      } FCFA
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto" style={{maxHeight: '400px', overflowY: 'auto'}}>
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Select</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vendor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Document Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Document Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reference</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Due Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Outstanding</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Invoice Type</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Arrears Aging (Days)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-gray-700">
                            <div className="flex flex-col items-center space-y-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B87333]"></div>
                              <p>Chargement des données du Grand Livre...</p>
                            </div>
                          </td>
                        </tr>
                      ) : Object.entries(vendorInvoices).map(([vendor, invoices]) => {
                        const aggregate = getVendorAggregate(vendor);
                        const isExpanded = expandedVendors.has(vendor);

                        return (
                          <React.Fragment key={vendor}>
                            {/* Ligne agrégat du fournisseur */}
                            <tr
                              className="bg-[#B87333]/5 hover:bg-[#B87333]/10 cursor-pointer border-l-4 border-[#B87333]"
                              onClick={() => toggleVendorExpansion(vendor)}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg font-bold text-[#B87333]">{isExpanded ? '−' : '+'}</span>
                                  <span className="bg-[#B87333] text-white px-2 py-1 rounded text-xs font-bold">
                                    {aggregate.count}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-[#B87333]">
                                {vendor}
                                <div className="text-xs text-gray-700">{aggregate.count} factures</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">Multiple</td>
                              <td className="px-4 py-3 text-sm text-gray-700">Agrégat</td>
                              <td className="px-4 py-3 text-sm text-gray-700">-</td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <span className="bg-[#6A8A82]/10 text-[#6A8A82] px-2 py-1 rounded text-xs">
                                  Total fournisseur
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                                {new Intl.NumberFormat('fr-FR').format(aggregate.totalDue)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-bold text-red-600">
                                {new Intl.NumberFormat('fr-FR').format(aggregate.totalOutstanding)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-[#6A8A82]/10 text-[#6A8A82]">
                                  Agrégat
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  aggregate.avgDays > 60 ? 'bg-red-100 text-red-800' :
                                  aggregate.avgDays > 30 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {aggregate.avgDays} moy
                                </span>
                              </td>
                            </tr>

                            {/* Lignes détail des factures (si expanded) */}
                            {isExpanded && invoices.map((invoice) => (
                              <tr key={invoice.id} className="bg-gray-50 hover:bg-gray-100">
                                <td className="px-4 py-2 pl-8">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-[#B87333] border-gray-300 rounded focus:ring-[#B87333]"
                                    checked={selectedInvoices.has(invoice.id)}
                                    onChange={() => toggleInvoiceSelection(invoice.id)}
                                  />
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-700 pl-8">
                                  <div className="flex items-center">
                                    <span className="text-gray-700 mr-2">└</span>
                                    {vendor}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">{invoice.docDate}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{invoice.docNumber}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{invoice.reference}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{invoice.description}</td>
                                <td className="px-4 py-2 text-sm text-right text-gray-900">
                                  {new Intl.NumberFormat('fr-FR').format(invoice.dueAmount)}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-red-600">
                                  {new Intl.NumberFormat('fr-FR').format(invoice.outstanding)}
                                </td>
                                <td className="px-4 py-2">
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                    {invoice.type}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-sm text-right">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    invoice.days > 60 ? 'bg-red-100 text-red-800' :
                                    invoice.days > 30 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {invoice.days}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 2: Payment Proposal */}
              <div className="bg-white rounded-lg border border-[#E8E8E8]">
                <div className="p-4 border-b border-[#E8E8E8] bg-green-50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold text-[#191919]">💳 Payment Proposal</h3>
                      <button
                        onClick={() => setShowAddExpenseModal(true)}
                        className="flex items-center space-x-1 bg-[#6A8A82] hover:bg-[#6A8A82]/80 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{t('common.add')}</span>
                      </button>
                    </div>
                    <div className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                      Amount Required: {new Intl.NumberFormat('fr-FR').format(getTotalSelectedAmount())} FCFA
                    </div>
                  </div>
                </div>

                <div className="overflow-auto" style={{maxHeight: '400px'}}>
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vendor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Document Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Document Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reference</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Due Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Outstanding</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Invoice Type</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Arrears Aging (Days)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Recommendation</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(getSelectedInvoicesDetails().length + newExpenses.length) === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-8 text-center text-gray-700">
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                📋
                              </div>
                              <p>Aucune proposition de paiement sélectionnée</p>
                              <p className="text-sm">Sélectionnez des éléments dans le tableau ci-dessus</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        [...getSelectedInvoicesDetails().map(inv => ({...inv, source: 'selected'})),
                         ...newExpenses.map(exp => ({...exp, source: 'manual'}))].map((invoice) => (
                          <tr key={invoice.id} className="bg-green-50 hover:bg-green-100">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{invoice.vendor}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{invoice.docDate}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{invoice.docNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{invoice.reference}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{invoice.description}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">
                              {new Intl.NumberFormat('fr-FR').format(invoice.dueAmount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                              {new Intl.NumberFormat('fr-FR').format(invoice.outstanding)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                {invoice.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                invoice.days > 60 ? 'bg-red-100 text-red-800' :
                                invoice.days > 30 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {invoice.days}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <select className="text-xs border border-gray-300 rounded px-2 py-1">
                                <option value="TBP">To be Paid</option>
                                <option value="CFB">Critical for Business</option>
                                <option value="CW">Can Wait</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => openNoteModal(invoice)}
                                  className={`${
                                    invoiceNotes[invoice.id]
                                      ? 'text-[#B87333] hover:text-[#A86323] hover:bg-[#B87333]/10'
                                      : 'text-[#7A99AC] hover:text-[#6A89AC] hover:bg-[#7A99AC]/10'
                                  } p-1 rounded transition-colors`}
                                  title={invoiceNotes[invoice.id] ? "Modifier le commentaire" : "Ajouter un commentaire"}
                                >
                                  📝
                                </button>
                                <button
                                  onClick={() => removeFromPaymentProposal(invoice.id)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                                  title="Supprimer de la proposition"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'position_avant' && (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold text-gray-600 mb-2">📊 Position des Comptes Avant Appel</h3>
              <p className="text-gray-700">Contenu à développer - Balances avant l'appel de fonds</p>
            </div>
          )}

          {activeTab === 'position_apres' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-[#E8E8E8] p-6">
                <h3 className="font-semibold text-[#191919] mb-6">🎯 Position des Comptes Après l'Appel de Fonds</h3>

                {/* Position des comptes après impact */}
                <div className="space-y-4 mb-6">
                  <div className="bg-[#ECECEC] rounded-lg p-6" style={{maxHeight: '400px', overflowY: 'auto'}}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Compte de départ après impact */}
                      <div className="space-y-3">
                        <h5 className="font-medium text-[#191919] border-b border-[#E8E8E8] pb-2">
                          {fundCallData.banqueDepart}
                        </h5>

                        <div className="space-y-2">
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-[#767676]">Current balance to date</span>
                            <span className="font-medium text-[#B87333]">-64,051,588 FCFA</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-[#767676]">Fund asked</span>
                            <span className="font-medium text-[#7A99AC]">0 FCFA</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-[#767676]">Fund approved</span>
                            <span className="font-medium text-[#6A8A82]">0 FCFA</span>
                          </div>
                          <div className="border-t border-[#E8E8E8] pt-2">
                            <div className="flex justify-between py-2">
                              <span className="text-sm font-bold text-[#191919]">Theorical balance after approved funds transferred</span>
                              <span className="font-bold text-[#B87333]">-64,051,588 FCFA</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Compte de destination après impact */}
                      <div className="space-y-3">
                        <h5 className="font-medium text-[#191919] border-b border-[#E8E8E8] pb-2">
                          {fundCallData.banqueArrivee}
                        </h5>

                        <div className="space-y-2">
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-[#767676]">Current balance to date</span>
                            <span className="font-medium text-[#6A8A82]">9,840,000 FCFA</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-[#767676]">Expected inflow from fund call</span>
                            <span className="font-medium text-[#6A8A82]">0 FCFA</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-[#767676]">Planned outflows</span>
                            <span className="font-medium text-[#B87333]">0 FCFA</span>
                          </div>
                          <div className="border-t border-[#E8E8E8] pt-2">
                            <div className="flex justify-between py-2">
                              <span className="text-sm font-bold text-[#191919]">Theorical balance after transfers</span>
                              <span className="font-bold text-[#6A8A82]">9,840,000 FCFA</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Fund Call Aggregate / Distribution */}
                <div>
                  <h4 className="font-medium text-[#B87333] mb-4">📊 Fund Call Aggregate / Distribution</h4>

                  <div className="overflow-auto" style={{maxHeight: '400px'}}>
                    <table className="w-full bg-white border border-[#E8E8E8] rounded-lg">
                      <thead className="bg-[#6A8A82]/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-[#191919]">Expand</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-[#191919]">Category</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-[#191919]">Requested</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-[#191919]">Approved</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E8]">
                        {[
                          {
                            id: 'previous_arrears',
                            label: 'Previous arrears (Aging +)',
                            requested: 0,
                            approved: 0,
                            details: [
                              { vendor: 'Label', amount: 247800, description: 'Assistance technique janvier 2024' },
                              { vendor: 'CIE', amount: 95975192, description: 'Électricité janvier 2025' }
                            ]
                          },
                          {
                            id: 'critical_expenses',
                            label: 'Critical expenses',
                            requested: 0,
                            approved: 0,
                            details: [
                              { vendor: 'Flash vehicles', amount: 5941105, description: 'Location véhicules urgent' }
                            ]
                          },
                          {
                            id: 'current_arrears',
                            label: 'Current arrears (Aging -)',
                            requested: 0,
                            approved: 0,
                            details: [
                              { vendor: 'Asepro', amount: 40092200, description: 'Matériel bureautique' }
                            ]
                          }
                        ].map((category) => {
                          const isExpanded = expandedAggregateRows.has(category.id);
                          return (
                            <React.Fragment key={category.id}>
                              <tr
                                className="hover:bg-[#F8F9FA] cursor-pointer"
                                onClick={() => toggleAggregateRowExpansion(category.id)}
                              >
                                <td className="px-4 py-3">
                                  <span className="text-lg font-bold text-[#B87333]">
                                    {isExpanded ? '−' : '+'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-[#444444]">{category.label}</td>
                                <td className="px-4 py-3 text-sm text-right text-[#7A99AC]">{category.requested} FCFA</td>
                                <td className="px-4 py-3 text-sm text-right text-[#6A8A82]">{category.approved} FCFA</td>
                              </tr>

                              {/* Détails des factures dans cette catégorie */}
                              {isExpanded && category.details.map((detail, index) => (
                                <tr key={`${category.id}-${index}`} className="bg-[#F8F9FA]">
                                  <td className="px-4 py-2 pl-8">
                                    <span className="text-[#767676]">└</span>
                                  </td>
                                  <td className="px-4 py-2 text-sm text-[#767676] pl-4">
                                    <div>
                                      <span className="font-medium">{detail.vendor}</span>
                                      <div className="text-xs text-[#767676]">{detail.description}</div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right text-[#7A99AC]">
                                    {new Intl.NumberFormat('fr-FR').format(detail.amount)} FCFA
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right text-[#6A8A82]">
                                    0 FCFA
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}

                        <tr className="bg-[#B87333]/10 font-bold">
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 text-sm text-[#191919]">Total</td>
                          <td className="px-4 py-3 text-sm text-right text-[#B87333]">0 FCFA</td>
                          <td className="px-4 py-3 text-sm text-right text-[#B87333]">0 FCFA</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-[#E8E8E8] p-6">
                <h3 className="font-semibold text-[#191919] mb-6">✅ Workflow d'Approbation Séquentiel</h3>

                {/* Informations de l'appel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-[#7A99AC]/10 p-4 rounded-lg">
                    <h5 className="font-medium text-[#7A99AC] mb-1">📋 Référence</h5>
                    <p className="font-bold text-[#191919]">{fundCallData.reference}</p>
                  </div>
                  <div className="bg-[#6A8A82]/10 p-4 rounded-lg">
                    <h5 className="font-medium text-[#6A8A82] mb-1">💰 Montant Total</h5>
                    <p className="font-bold text-[#191919]">0 FCFA</p>
                  </div>
                  <div className="bg-[#B87333]/10 p-4 rounded-lg">
                    <h5 className="font-medium text-[#B87333] mb-1">⏰ Délai Restant</h5>
                    <p className="font-bold text-[#191919]">6 jours</p>
                  </div>
                </div>

                {/* Timeline du workflow */}
                <div className="mb-6">
                  <h4 className="font-medium text-[#444444] mb-4">🔄 Étapes de Validation</h4>

                  <div className="space-y-4" style={{maxHeight: '400px', overflowY: 'auto'}}>
                    {[
                      {
                        id: 1,
                        etape: 'Demandeur',
                        validateur: 'Atokouna Pamela',
                        type: 'interne',
                        statut: 'completed',
                        date: '17/05/2025 10:30',
                        commentaire: 'Demande initiale soumise',
                        montant: 0
                      },
                      {
                        id: 2,
                        etape: 'Chef Comptable',
                        validateur: 'Jean Dupont',
                        type: 'interne',
                        statut: 'pending',
                        date: null,
                        commentaire: null,
                        montant: null
                      },
                      {
                        id: 3,
                        etape: 'Directeur Financier',
                        validateur: 'Marie Martin',
                        type: 'interne',
                        statut: 'waiting',
                        date: null,
                        commentaire: null,
                        montant: null
                      },
                      {
                        id: 4,
                        etape: 'Conseil Administration',
                        validateur: 'conseil.admin@company.com',
                        type: 'externe',
                        statut: 'waiting',
                        date: null,
                        commentaire: null,
                        montant: null
                      },
                      {
                        id: 5,
                        etape: 'Validation Finale',
                        validateur: 'Direction Générale',
                        type: 'interne',
                        statut: 'waiting',
                        date: null,
                        commentaire: null,
                        montant: null
                      }
                    ].map((etape) => (
                      <div key={etape.id} className={`flex items-start space-x-4 p-4 rounded-lg border ${
                        etape.statut === 'completed' ? 'bg-[#6A8A82]/10 border-[#6A8A82]' :
                        etape.statut === 'pending' ? 'bg-[#B87333]/10 border-[#B87333]' :
                        'bg-gray-50 border-gray-200'
                      }`}>
                        {/* Icône de statut */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          etape.statut === 'completed' ? 'bg-[#6A8A82]' :
                          etape.statut === 'pending' ? 'bg-[#B87333]' :
                          'bg-gray-400'
                        }`}>
                          {etape.statut === 'completed' ? '✓' :
                           etape.statut === 'pending' ? '⏳' :
                           etape.id}
                        </div>

                        {/* Contenu de l'étape */}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h5 className="font-medium text-[#191919]">{etape.etape}</h5>
                              <p className="text-sm text-[#767676]">{etape.validateur}</p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                etape.type === 'interne' ? 'bg-[#6A8A82]/10 text-[#6A8A82]' : 'bg-[#B87333]/10 text-[#B87333]'
                              }`}>
                                {etape.type === 'interne' ? 'Interne' : 'Externe'}
                              </span>
                            </div>
                          </div>

                          {etape.date && (
                            <p className="text-xs text-[#767676] mb-1">
                              <strong>Date:</strong> {etape.date}
                            </p>
                          )}

                          {etape.commentaire && (
                            <p className="text-sm text-[#444444] bg-white/50 p-2 rounded">
                              <strong>Commentaire:</strong> {etape.commentaire}
                            </p>
                          )}

                          {etape.montant !== null && (
                            <p className="text-sm text-[#6A8A82] font-medium">
                              <strong>Montant accordé:</strong> {etape.montant} FCFA
                            </p>
                          )}

                          {etape.statut === 'pending' && (
                            <div className="mt-3 flex space-x-2">
                              <button className="px-3 py-1 bg-[#6A8A82] text-white rounded text-xs hover:bg-[#5A7A72] transition-colors">
                                ✓ Approuver
                              </button>
                              <button className="px-3 py-1 bg-[#B87333] text-white rounded text-xs hover:bg-[#A86323] transition-colors">
                                ✗ Rejeter
                              </button>
                              <button className="px-3 py-1 bg-[#7A99AC] text-white rounded text-xs hover:bg-[#6A89AC] transition-colors">
                                📧 Relancer
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>


                {/* Actions du workflow */}
                <div className="flex justify-between items-center">
                  <div className="text-sm text-[#767676]">
                    💡 <strong>Prochaine étape:</strong> En attente de validation du Chef Comptable
                  </div>
                  <div className="space-x-3">
                    <button className="px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors">
                      📧 Envoyer Relance
                    </button>
                    <button
                      onClick={() => setShowValidatorConfig(true)}
                      className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors"
                    >
                      ⚙️ Modifier Workflow
                    </button>
                  </div>
                </div>

                {/* Liens d'aperçu pour les validateurs */}
                <div className="mt-6 bg-[#6A8A82]/5 border border-[#6A8A82] rounded-lg p-4">
                  <h5 className="font-medium text-[#6A8A82] mb-3">👁️ Aperçus pour Validateurs</h5>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`/treasury/fund-calls/${id}/email-template`}
                      target="_blank"
                      className="flex items-center space-x-2 px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors"
                    >
                      <span>📧</span>
                      <span>Modèle de Mail HTML</span>
                      <span className="text-xs opacity-75">↗</span>
                    </a>
                    <a
                      href={`/treasury/fund-calls/${id}/validator-preview`}
                      target="_blank"
                      className="flex items-center space-x-2 px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors"
                    >
                      <span>👁️</span>
                      <span>Aperçu Validateur</span>
                      <span className="text-xs opacity-75">↗</span>
                    </a>
                  </div>
                  <p className="text-xs text-[#767676] mt-2">
                    💡 Ces liens s'ouvrent dans un nouvel onglet pour prévisualiser l'expérience des validateurs
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resume' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-[#E8E8E8] p-6">
                <h3 className="font-semibold text-[#191919] mb-6">📋 Résumé des Paiements Approuvés</h3>

                {/* Statut général de l'appel */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-[#B87333]/10 p-4 rounded-lg text-center">
                    <h5 className="font-medium text-[#B87333] mb-1">💰 Total Demandé</h5>
                    <p className="text-xl font-bold text-[#B87333]">0 FCFA</p>
                  </div>
                  <div className="bg-[#6A8A82]/10 p-4 rounded-lg text-center">
                    <h5 className="font-medium text-[#6A8A82] mb-1">✅ Total Approuvé</h5>
                    <p className="text-xl font-bold text-[#6A8A82]">0 FCFA</p>
                  </div>
                  <div className="bg-[#7A99AC]/10 p-4 rounded-lg text-center">
                    <h5 className="font-medium text-[#7A99AC] mb-1">📊 Taux d'Approbation</h5>
                    <p className="text-xl font-bold text-[#7A99AC]">0%</p>
                  </div>
                  <div className="bg-[#444444]/10 p-4 rounded-lg text-center">
                    <h5 className="font-medium text-[#444444] mb-1">🏷️ Nombre de Factures</h5>
                    <p className="text-xl font-bold text-[#444444]">0</p>
                  </div>
                </div>

                {/* Table des paiements approuvés */}
                <div className="bg-white rounded-lg border border-[#E8E8E8]">
                  <div className="p-4 border-b border-[#E8E8E8] bg-[#6A8A82]/5">
                    <h4 className="font-semibold text-[#191919]">💳 État des Paiements Approuvés</h4>
                  </div>

                  <div className="overflow-auto" style={{maxHeight: '400px'}}>
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vendor</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reference</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Montant Demandé</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Montant Approuvé</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Statut</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Catégorie</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Recommendation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-700">
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                📋
                              </div>
                              <p>Aucun paiement approuvé pour cet appel de fonds</p>
                              <p className="text-sm">Les approbations apparaîtront ici après validation du workflow</p>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Synthèse par catégorie */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#B87333]/5 p-4 rounded-lg">
                    <h5 className="font-medium text-[#B87333] mb-2">📅 Previous Arrears</h5>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#767676]">Demandé:</span>
                        <span className="text-[#7A99AC]">0 FCFA</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#767676]">Approuvé:</span>
                        <span className="text-[#6A8A82] font-medium">0 FCFA</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#6A8A82]/5 p-4 rounded-lg">
                    <h5 className="font-medium text-[#6A8A82] mb-2">🚨 Critical Expenses</h5>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#767676]">Demandé:</span>
                        <span className="text-[#7A99AC]">0 FCFA</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#767676]">Approuvé:</span>
                        <span className="text-[#6A8A82] font-medium">0 FCFA</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#7A99AC]/5 p-4 rounded-lg">
                    <h5 className="font-medium text-[#7A99AC] mb-2">📊 Current Arrears</h5>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#767676]">Demandé:</span>
                        <span className="text-[#7A99AC]">0 FCFA</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#767676]">Approuvé:</span>
                        <span className="text-[#6A8A82] font-medium">0 FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'attachements' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-[#E8E8E8] p-6">
                <h3 className="font-semibold text-[#191919] mb-6">📎 Attachements de l'Appel de Fonds</h3>

                {/* Zone d'upload */}
                <div className="mb-6">
                  <div className="border-2 border-dashed border-[#B87333]/30 rounded-lg p-6 text-center hover:border-[#B87333]/50 transition-colors">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-12 h-12 bg-[#B87333]/10 rounded-full flex items-center justify-center">
                        <Plus className="w-6 h-6 text-[#B87333]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#191919]">Ajouter des fichiers</p>
                        <p className="text-xs text-[#767676]">Glissez-déposez ou cliquez pour sélectionner</p>
                      </div>
                      <input
                        type="file"
                        multiple
                        className="w-full max-w-xs text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-[#B87333] file:text-white hover:file:bg-[#A86323]"
                      />
                    </div>
                  </div>
                </div>

                {/* Liste des fichiers attachés */}
                <div>
                  <h4 className="font-medium text-[#444444] mb-4">📋 Fichiers Attachés</h4>

                  <div className="space-y-3">
                    {[
                      { name: 'Justificatif_FC0006.pdf', size: '2.3 MB', type: 'PDF', date: '17/05/2025' },
                      { name: 'Budget_previsionnel.xlsx', size: '1.8 MB', type: 'Excel', date: '17/05/2025' },
                      { name: 'Factures_fournisseurs.zip', size: '5.2 MB', type: 'Archive', date: '18/05/2025' }
                    ].map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-[#6A8A82]/5 rounded-lg border border-[#E8E8E8]">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-[#6A8A82] rounded flex items-center justify-center text-white text-xs font-bold">
                            {file.type === 'PDF' ? '📄' : file.type === 'Excel' ? '📊' : '📦'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#191919]">{file.name}</p>
                            <p className="text-xs text-[#767676]">{file.size} • Ajouté le {file.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-1 text-[#6A8A82] hover:text-[#5A7A72] transition-colors" aria-label="Voir les détails">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-[#7A99AC] hover:text-[#6A89AC] transition-colors">
                            <Target className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-[#B87333] hover:text-[#A86323] transition-colors">
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Informations sur les attachements */}
                  <div className="mt-6 p-4 bg-[#7A99AC]/10 border border-[#7A99AC] rounded-lg">
                    <h5 className="font-medium text-[#7A99AC] mb-2">📋 Informations</h5>
                    <div className="text-sm text-[#444444] space-y-1">
                      <p>• <strong>Types acceptés:</strong> PDF, Excel, Word, Images (JPG, PNG)</p>
                      <p>• <strong>Taille maximum:</strong> 10 MB par fichier</p>
                      <p>• <strong>Total autorisé:</strong> 50 MB par appel de fonds</p>
                      <p>• <strong>Sécurité:</strong> Fichiers chiffrés et versionnés</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Configuration des Validateurs */}
      {showValidatorConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-[#191919]">⚙️ Configuration du Workflow</h3>
              <button
                onClick={() => setShowValidatorConfig(false)}
                className="text-gray-700 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              console.log('Configuration workflow mise à jour');
              setShowValidatorConfig(false);
            }}>
              {/* Informations de la tâche */}
              <div className="bg-[#6A8A82]/10 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-[#6A8A82] mb-3">📋 Validation Tâche</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Tâche:</label>
                    <input
                      type="text"
                      value="Appel de fond"
                      disabled
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg bg-gray-50 text-[#444444]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Date d'Émission:</label>
                    <input
                      type="text"
                      value={fundCallData.date}
                      disabled
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg bg-gray-50 text-[#444444]"
                    />
                  </div>
                </div>


                <div className="mt-4">
                  <label className="block text-sm font-medium text-[#444444] mb-1">Statut:</label>
                  <select className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]">
                    <option>En Cours</option>
                    <option>Approuvé</option>
                    <option>Rejeté</option>
                    <option>En Attente</option>
                  </select>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-[#444444] mb-1">Commentaire:</label>
                  <textarea
                    value={workflowComment}
                    onChange={(e) => setWorkflowComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                    placeholder="Ajouter un commentaire..."
                  />
                </div>
              </div>

              {/* Section Transmission */}
              <div className="mb-6">
                <h4 className="font-medium text-[#B87333] mb-3">📤 Transmission</h4>
                <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#B87333]/10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Etape Circuit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Nom et prénoms</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-[#E8E8E8]">
                        <td className="px-4 py-3 text-sm text-[#444444]">1</td>
                        <td className="px-4 py-3 text-sm text-[#444444]">Interne</td>
                        <td className="px-4 py-3 text-sm text-[#444444]">Atokouna Pamela</td>
                        <td className="px-4 py-3 text-sm text-[#444444]">patokouna@praedium-tech.com</td>
                        <td className="px-4 py-3 text-sm text-[#444444]">-</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-[#6A8A82]/20 text-[#6A8A82]">
                            Transmis
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section Vérification */}
              <div className="mb-6">
                <h4 className="font-medium text-[#7A99AC] mb-3">🔍 Vérification</h4>
                <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#7A99AC]/10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Etape Circuit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Nom et prénoms</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-[#E8E8E8]">
                        <td className="px-4 py-3 text-sm text-[#444444]">2</td>
                        <td className="px-4 py-3">
                          <select className="text-sm border border-[#E8E8E8] rounded px-2 py-1">
                            <option>Interne</option>
                            <option>Externe</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select className="text-sm border border-[#E8E8E8] rounded px-2 py-1 w-full">
                            <option>Sélectionner</option>
                            <option>Jean Dupont</option>
                            <option>Marie Martin</option>
                            <option>Paul Durand</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#444444]">-</td>
                        <td className="px-4 py-3 text-sm text-[#444444]">-</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            En attente config
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section Validation */}
              <div className="mb-6">
                <h4 className="font-medium text-[#6A8A82] mb-3">✅ Validation</h4>
                <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#6A8A82]/10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Etape Circuit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Nom et prénoms</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#191919] uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-[#E8E8E8]">
                        <td className="px-4 py-3 text-sm text-[#444444]">3</td>
                        <td className="px-4 py-3">
                          <select className="text-sm border border-[#E8E8E8] rounded px-2 py-1">
                            <option>Interne</option>
                            <option>Externe</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select className="text-sm border border-[#E8E8E8] rounded px-2 py-1 w-full">
                            <option>Sélectionner</option>
                            <option>Direction Générale</option>
                            <option>Conseil Administration</option>
                            <option>Auditeur Externe</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#444444]">-</td>
                        <td className="px-4 py-3 text-sm text-[#444444]">-</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            En attente config
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions de configuration */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowValidatorConfig(false)}
                  className="px-4 py-2 text-[#767676] border border-[#E8E8E8] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors"
                >
                  Sauvegarder Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajouter Nouvelle Dépense */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#191919]">➕ Ajouter Nouvelle Dépense</h3>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addNewExpense({
                vendor: formData.get('vendor'),
                docDate: formData.get('docDate'),
                docNumber: formData.get('docNumber'),
                reference: formData.get('reference'),
                description: formData.get('description'),
                dueAmount: formData.get('dueAmount'),
                outstanding: formData.get('outstanding'),
                type: formData.get('type')
              });
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiers (Fournisseur/Employé/Autre)</label>
                  <input
                    name="vendor"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                    placeholder="Nom du tiers (ex: Fournisseur ABC, Employé Jean, etc.)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Document</label>
                  <input
                    name="docDate"
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° Document</label>
                  <input
                    name="docNumber"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                    placeholder="DOC-0001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
                  <input
                    name="reference"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                    placeholder="REF-001"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    name="description"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                    placeholder="Description de la dépense"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant Dû (FCFA)</label>
                  <input
                    name="dueAmount"
                    type="number"
                    required
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Impayé (FCFA)</label>
                  <input
                    name="outstanding"
                    type="number"
                    required
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                    placeholder="0"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    name="type"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                  >
                    <option value="Invoice">Facture</option>
                    <option value="Credit Note">Note de Crédit</option>
                    <option value="Service">Service</option>
                    <option value="Salary">Salaire</option>
                    <option value="Expense">Frais</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors"
                >
                  Ajouter Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pour ajouter/modifier une note */}
      {showNoteModal && selectedInvoiceForNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#191919]">📝 Note sur la Facture</h3>
              <button
                onClick={() => setShowNoteModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 bg-[#6A8A82]/10 rounded-lg">
              <p className="text-sm font-medium text-[#191919]">{selectedInvoiceForNote.vendor}</p>
              <p className="text-xs text-[#767676]">{selectedInvoiceForNote.reference} - {new Intl.NumberFormat('fr-FR').format(selectedInvoiceForNote.outstanding)} FCFA</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              saveInvoiceNote(formData.get('note') as string);
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#444444] mb-2">Commentaire:</label>
                <textarea
                  name="note"
                  rows={4}
                  defaultValue={invoiceNotes[selectedInvoiceForNote.id] || ''}
                  className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                  placeholder="Ajoutez votre commentaire sur cette facture..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 text-[#767676] border border-[#E8E8E8] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors"
                >
                  Sauvegarder Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundCallDetails;