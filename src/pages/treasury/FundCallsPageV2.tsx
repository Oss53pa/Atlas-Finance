import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { 
  Target, DollarSign, Calendar, Users, BarChart3, ArrowLeft, Home,
  Plus, CheckCircle, Clock, AlertCircle, Download, Eye, Edit,
  TrendingUp, Activity, Building2, CreditCard, ArrowUpRight
} from 'lucide-react';

const FundCallsPageV2: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('historique');
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [expandedProposalVendors, setExpandedProposalVendors] = useState<Set<string>>(new Set());
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showNewFundCallModal, setShowNewFundCallModal] = useState(false);
  const [newExpenses, setNewExpenses] = useState([]);
  const [formDocDate, setFormDocDate] = useState('');

  // Onglets appels de fonds
  const tabs = [
    { id: 'historique', label: 'Historique', icon: BarChart3, badge: '3' },
    { id: 'transfers', label: 'Transferts', icon: CreditCard },
    { id: 'rapports', label: 'Rapports', icon: TrendingUp },
  ];

  // Fonctions pour gérer les groupes de fournisseurs
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

  // Données des factures regroupées par fournisseur
  const vendorInvoices = {
    'Puissance 6 sis-p6': [
      { id: 'P6-001', docDate: '15/01/2025', docNumber: 'DOC-0001', reference: 'REF-001', description: 'Label', dueAmount: 187776468, outstanding: 187776468, type: 'Invoice', days: 45 }
    ],
    'Flash vehicles': [
      { id: 'FV-001', docDate: '10/01/2025', docNumber: 'DOC-0002', reference: 'REF-002', description: 'Véhicules service', dueAmount: 5941105, outstanding: 5941105, type: 'Invoice', days: 60 },
      { id: 'FV-002', docDate: '12/01/2025', docNumber: 'DOC-0003', reference: 'REF-003', description: 'Maintenance', dueAmount: 4000000, outstanding: 4000000, type: 'Invoice', days: 58 }
    ],
    'Asepro': [
      { id: 'AS-001', docDate: '20/01/2025', docNumber: 'DOC-0004', reference: 'REF-004', description: 'Matériel bureautique', dueAmount: 40092200, outstanding: 40092200, type: 'Invoice', days: 20 },
      { id: 'AS-002', docDate: '22/01/2025', docNumber: 'DOC-0005', reference: 'REF-005', description: 'Fournitures', dueAmount: 34000000, outstanding: 34000000, type: 'Invoice', days: 18 }
    ],
    'Cie': [
      { id: 'CIE-001', docDate: '05/01/2025', docNumber: 'DOC-0006', reference: 'REF-006', description: 'Électricité janvier', dueAmount: 95975192, outstanding: 95975192, type: 'Invoice', days: 90 },
      { id: 'CIE-002', docDate: '08/01/2025', docNumber: 'DOC-0007', reference: 'REF-007', description: 'Électricité février', dueAmount: 90000000, outstanding: 90000000, type: 'Invoice', days: 87 }
    ],
    'Lav\'net': [
      { id: 'LN-001', docDate: '15/12/2024', docNumber: 'DOC-0008', reference: 'REF-008', description: 'Nettoyage décembre', dueAmount: 70598165, outstanding: 70598165, type: 'Invoice', days: 75 },
      { id: 'LN-002', docDate: '18/12/2024', docNumber: 'DOC-0009', reference: 'REF-009', description: 'Nettoyage spécialisé', dueAmount: 64000000, outstanding: 64000000, type: 'Invoice', days: 72 }
    ],
    'HCCP': [
      { id: 'HC-001', docDate: '01/01/2025', docNumber: 'DOC-0010', reference: 'REF-010', description: 'Services consulting Q1', dueAmount: 150350605, outstanding: 150350605, type: 'Invoice', days: 95 },
      { id: 'HC-002', docDate: '03/01/2025', docNumber: 'DOC-0011', reference: 'REF-011', description: 'Formation équipes', dueAmount: 139000000, outstanding: 139000000, type: 'Invoice', days: 93 }
    ],
    'Orange CI': [
      { id: 'OR-001', docDate: '25/12/2024', docNumber: 'DOC-0012', reference: 'REF-012', description: 'Télécom décembre', dueAmount: 20479101, outstanding: 20479101, type: 'Invoice', days: 80 },
      { id: 'OR-002', docDate: '28/12/2024', docNumber: 'DOC-0013', reference: 'REF-013', description: 'Internet + Mobile', dueAmount: 16000000, outstanding: 16000000, type: 'Invoice', days: 77 }
    ],
    'Bloomfield Investment': [
      { id: 'BI-001', docDate: '15/11/2024', docNumber: 'DOC-0014', reference: 'REF-014', description: 'Investissement immobilier', dueAmount: 49560000, outstanding: 49560000, type: 'Invoice', days: 120 }
    ]
  };

  // Calcul des agrégats par fournisseur
  const getVendorAggregate = (vendor: string) => {
    const invoices = vendorInvoices[vendor] || [];
    return {
      count: invoices.length,
      totalDue: invoices.reduce((sum, inv) => sum + inv.dueAmount, 0),
      totalOutstanding: invoices.reduce((sum, inv) => sum + inv.outstanding, 0),
      avgDays: Math.round(invoices.reduce((sum, inv) => sum + inv.days, 0) / invoices.length)
    };
  };

  // Obtenir toutes les factures sélectionnées avec leurs détails
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

  // Calculer le montant total des factures sélectionnées
  const getTotalSelectedAmount = () => {
    return getAllProposals().reduce((sum, inv) => sum + inv.outstanding, 0);
  };

  // Ajouter une nouvelle dépense
  const addNewExpense = (expenseData) => {
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
    setFormDocDate(''); // Reset form
  };

  // Supprimer une facture de Payment Proposal
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

  // Calculer l'âge automatiquement
  const calculateAge = (docDate: string) => {
    if (!docDate) return 0;
    const today = new Date();
    const documentDate = new Date(docDate);
    const diffTime = Math.abs(today - documentDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Obtenir toutes les propositions (sélectionnées + ajoutées manuellement)
  const getAllProposals = () => {
    const selectedFromTable = getSelectedInvoicesDetails().map(inv => ({
      ...inv,
      source: 'account_payable',
      sourceType: 'Sélectionné'
    }));

    const manuallyAdded = newExpenses.map(exp => ({
      ...exp,
      vendor: exp.vendor,
      source: 'manual',
      sourceType: 'Manuel'
    }));

    return [...selectedFromTable, ...manuallyAdded];
  };

  // Regrouper les propositions par fournisseur
  const getGroupedProposals = () => {
    const proposals = getAllProposals();
    const grouped = {};

    proposals.forEach(proposal => {
      if (!grouped[proposal.vendor]) {
        grouped[proposal.vendor] = [];
      }
      grouped[proposal.vendor].push(proposal);
    });

    return grouped;
  };

  // Calculer les agrégats pour Payment Proposal
  const getProposalVendorAggregate = (vendor: string, proposals: any[]) => {
    return {
      count: proposals.length,
      totalDue: proposals.reduce((sum, prop) => sum + prop.dueAmount, 0),
      totalOutstanding: proposals.reduce((sum, prop) => sum + prop.outstanding, 0),
      avgDays: Math.round(proposals.reduce((sum, prop) => sum + prop.days, 0) / proposals.length),
      hasManual: proposals.some(p => p.source === 'manual'),
      hasSelected: proposals.some(p => p.source === 'account_payable')
    };
  };

  // Appels de fonds initiés
  const fundCallsInitiated = [
    {
      id: 1,
      date: '17/05/2025',
      reference: 'FC0006',
      status: 'En Cours',
      banqueDepart: 'B1 nsia domiciliation',
      banqueArrivee: 'B2 nsia charges d\'exploitations',
      montant: 0,
      initiePar: 'Atokouna Pamela',
      commentaires: 'Transfert pour charges opérationnelles'
    },
    {
      id: 2,
      date: '20/05/2025',
      reference: 'FC0007',
      status: 'Approuvé',
      banqueDepart: 'Compte Principal BCA',
      banqueArrivee: 'Compte Charges UBA',
      montant: 2500000,
      initiePar: 'Jean Dupont',
      commentaires: 'Financement projet Alpha'
    },
    {
      id: 3,
      date: '25/05/2025',
      reference: 'FC0008',
      status: 'En Attente',
      banqueDepart: 'Caisse Centrale',
      banqueArrivee: 'Banque Atlantique',
      montant: 1800000,
      initiePar: 'Marie Martin',
      commentaires: 'Équipements Beta - Urgent'
    }
  ];

  // Comptes de nivelement disponibles
  const nivelingAccounts = [
    { id: 1, label: '5211 - Banque BCA Principal' },
    { id: 2, label: '5212 - Banque UBA Secondaire' },
    { id: 3, label: '5200 - Caisse Centrale' },
    { id: 4, label: '5213 - Banque Atlantique' },
    { id: 5, label: '5220 - Banque Populaire' },
    { id: 6, label: '5230 - Crédit Lyonnais' }
  ];

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/treasury')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">{t('navigation.treasury')}</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#B87333] to-[#A86323] flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Appels de Fonds</h1>
                <p className="text-sm text-[#767676]">Gestion des levées de capitaux</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/dashboard/manager')}
              className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Manager</span>
            </button>
            
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        <div className="px-6 border-b border-[#E8E8E8]">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id 
                      ? 'border-[#B87333] text-[#B87333]' 
                      : 'border-transparent text-[#767676] hover:text-[#444444]'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`
                      px-2 py-0.5 text-xs font-medium rounded-full
                      ${activeTab === tab.id ? 'bg-[#B87333] text-white' : 'bg-orange-100 text-orange-600'}
                    `}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu organisé */}
        <div className="p-6">
          {activeTab === 'historique' && (
            <div className="space-y-6">
              {/* Table des appels de fonds initiés */}
              <div className="bg-white rounded-lg border border-[#E8E8E8]">
                <div className="p-4 border-b border-[#E8E8E8] bg-[#6A8A82]/5">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-[#191919]">📋 Appels de Fonds Initiés</h3>
                    <button
                      onClick={() => setShowNewFundCallModal(true)}
                      className="flex items-center space-x-1 bg-[#B87333] hover:bg-[#A86323] text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nouvel Appel</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-auto" style={{maxHeight: '400px'}}>
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('common.date')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Référence</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Statut</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Banque départ</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Banque arrivée</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Montant</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Initié par</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Commentaires</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {fundCallsInitiated.map((fundCall) => (
                        <tr key={fundCall.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{fundCall.date}</td>
                          <td className="px-4 py-3 text-sm font-medium text-[#B87333]">{fundCall.reference}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              fundCall.status === 'En Cours' ? 'bg-yellow-100 text-yellow-800' :
                              fundCall.status === 'Approuvé' ? 'bg-green-100 text-green-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {fundCall.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{fundCall.banqueDepart}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{fundCall.banqueArrivee}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {fundCall.montant > 0 ? new Intl.NumberFormat('fr-FR').format(fundCall.montant) + ' FCFA' : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{fundCall.initiePar}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{fundCall.commentaires}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button className="text-[#6A8A82] hover:text-[#5A7A72] p-1 rounded transition-colors" title="Détails" aria-label="Voir les détails">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => navigate(`/treasury/fund-calls/${fundCall.id}`)}
                                className="text-[#B87333] hover:text-[#A86323] p-1 rounded transition-colors"
                                title={t('common.edit')}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transfers' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="font-semibold text-[#191919] mb-4">💳 Transferts Inter-Comptes</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      reference: 'FC0006',
                      compteSource: 'Compte Principal (521006)',
                      compteDestination: 'Compte Charges (521007)',
                      montant: 75000000,
                      status: 'PENDING',
                      dateTransfert: '2025-09-14'
                    },
                    {
                      reference: 'FC0007',
                      compteSource: 'Compte Épargne (521010)',
                      compteDestination: 'Compte Principal (521006)',
                      montant: 50000000,
                      status: 'APPROVED',
                      dateTransfert: '2025-09-15'
                    },
                    {
                      reference: 'FC0008',
                      compteSource: 'Ligne de Crédit',
                      compteDestination: 'Compte Exploitation',
                      montant: 25000000,
                      status: 'DRAFT',
                      dateTransfert: '2025-09-16'
                    }
                  ].map((transfer, index) => (
                    <div key={index} className="p-4 rounded-lg border border-[#E8E8E8] hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-[#B87333] text-white flex items-center justify-center font-bold text-xs">
                          {transfer.reference}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          transfer.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          transfer.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {transfer.status}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-[#767676]">De:</span>
                          <p className="text-sm font-medium text-[#191919]">{transfer.compteSource}</p>
                        </div>
                        <div className="flex items-center justify-center py-1">
                          <ArrowUpRight className="h-4 w-4 text-[#B87333]" />
                        </div>
                        <div>
                          <span className="text-xs text-[#767676]">Vers:</span>
                          <p className="text-sm font-medium text-[#191919]">{transfer.compteDestination}</p>
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <div className="flex justify-between text-xs">
                            <span className="text-[#767676]">Montant</span>
                            <span className="text-[#444444] font-bold">{(transfer.montant / 1000000).toFixed(1)}M XOF</span>
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-[#767676]">Date transfert</span>
                            <span className="text-[#444444]">{transfer.dateTransfert}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

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
                type: formData.get('type'),
                days: formData.get('days')
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
                    value={formDocDate}
                    onChange={(e) => setFormDocDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                  />
                  {formDocDate && (
                    <p className="text-xs text-gray-700 mt-1">
                      Âge calculé: {calculateAge(formDocDate)} jours
                    </p>
                  )}
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

      {/* Modal Nouvel Appel de Fonds */}
      {showNewFundCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#191919]">💰 Fund Call Request</h3>
              <button
                onClick={() => setShowNewFundCallModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              // Logique de création d'appel de fonds
              console.log('Nouvel appel créé:', {
                date: formData.get('date'),
                compteFrom: formData.get('compteFrom'),
                compteTo: formData.get('compteTo'),
                commentaire: formData.get('commentaire')
              });
              setShowNewFundCallModal(false);
            }}>
              <div className="space-y-4">
                <fieldset className="border border-gray-200 rounded p-4">
                  <legend className="px-2 text-sm font-medium text-gray-700">Information</legend>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')}</label>
                      <input
                        name="date"
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Compte de nivelement</label>
                      <select
                        name="compteFrom"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                      >
                        <option value="">Sélectionnez...</option>
                        {nivelingAccounts.map(account => (
                          <option key={account.id} value={account.id}>{account.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="text-center text-gray-700 font-medium">à</div>

                    <div>
                      <select
                        name="compteTo"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                      >
                        <option value="">Sélectionnez...</option>
                        {nivelingAccounts.map(account => (
                          <option key={account.id} value={account.id}>{account.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
                      <textarea
                        name="commentaire"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                        placeholder="Raison de l'appel de fonds..."
                      />
                    </div>
                  </div>
                </fieldset>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewFundCallModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors"
                >
                  Créer l'Appel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundCallsPageV2;