// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';

const TreasuryPlanDetails: React.FC = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { adapter } = useData();
  const [activeTab, setActiveTab] = useState('planification');
  const [selectedScenario, setSelectedScenario] = useState('realiste');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailModalData, setDetailModalData] = useState<{
    title: string;
    type: 'client' | 'fournisseur';
    category: string;
    invoices: Array<Record<string, unknown>>;
  } | null>(null);
  const [transactionType, setTransactionType] = useState('encaissement');
  const [expandedEncaissements, setExpandedEncaissements] = useState(false);
  const [expandedDecaissements, setExpandedDecaissements] = useState(false);
  const [expandedVentes, setExpandedVentes] = useState(false);
  const [expandedServices, setExpandedServices] = useState(false);
  const [expandedAutresProduits, setExpandedAutresProduits] = useState(false);
  const [expandedAchats, setExpandedAchats] = useState(false);
  const [expandedPersonnel, setExpandedPersonnel] = useState(false);
  const [expandedExploitation, setExpandedExploitation] = useState(false);
  const [expandedImpots, setExpandedImpots] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [dateDebut, setDateDebut] = useState('2025-01-01');
  const [dateFin, setDateFin] = useState('2025-12-31');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Données du plan — chargées dynamiquement
  const [planData, setPlanData] = useState({
    id: id,
    name: `Plan Trésorerie #${id}`,
    period: '',
    author: '',
    startDate: dateDebut,
    endDate: dateFin,
    initialBalance: 0,
  });

  const [invoiceData, setInvoiceData] = useState<Record<string, { title: string; type: 'client' | 'fournisseur'; invoices: any[] }>>({});

  useEffect(() => {
    const loadPlanData = async () => {
      try {
        // Charger la position de trésorerie initiale depuis les écritures
        const entries = await adapter.getAll('journalEntries') as Record<string, unknown>[];
        let treasuryBalance = 0;
        for (const e of entries) {
          if (new Date(e.date) <= new Date(dateDebut)) {
            for (const l of (e.lines || [])) {
              if ((l.accountCode || '').startsWith('5')) {
                treasuryBalance += (l.debit || 0) - (l.credit || 0);
              }
            }
          }
        }

        // Charger factures clients (comptes 411)
        const clientInvoices: any[] = [];
        const supplierInvoices: any[] = [];
        for (const e of entries) {
          if (new Date(e.date) >= new Date(dateDebut) && new Date(e.date) <= new Date(dateFin)) {
            for (const l of (e.lines || [])) {
              if ((l.accountCode || '').startsWith('411')) {
                clientInvoices.push({
                  numero: e.entryNumber || e.id,
                  client: l.accountName || l.label || 'Client',
                  date: e.date,
                  echeance: e.date,
                  montant: l.debit || 0,
                  statut: e.status === 'validated' ? 'Validée' : 'En cours',
                });
              }
              if ((l.accountCode || '').startsWith('401')) {
                supplierInvoices.push({
                  numero: e.entryNumber || e.id,
                  fournisseur: l.accountName || l.label || 'Fournisseur',
                  date: e.date,
                  echeance: e.date,
                  montant: l.credit || 0,
                  statut: e.status === 'validated' ? 'Validée' : 'À payer',
                });
              }
            }
          }
        }

        setPlanData(prev => ({ ...prev, initialBalance: treasuryBalance }));
        setInvoiceData({
          encaissements_clients: {
            title: 'Encaissements clients — Factures',
            type: 'client',
            invoices: clientInvoices,
          },
          decaissements_fournisseurs: {
            title: 'Décaissements fournisseurs — Factures',
            type: 'fournisseur',
            invoices: supplierInvoices,
          },
        });
      } catch (err) {
      }
    };
    loadPlanData();
  }, [adapter, dateDebut, dateFin]);

  // Scénarios de prévision
  const forecastScenarios = [
    { id: 'optimiste', name: '📈 Optimiste', multiplier: 1.3, color: 'text-green-600' },
    { id: 'realiste', name: '📊 Réaliste', multiplier: 1.0, color: 'text-[var(--color-primary)]' },
    { id: 'pessimiste', name: '📉 Pessimiste', multiplier: 0.7, color: 'text-red-600' }
  ];

  const getSelectedScenarioData = () => {
    const scenario = forecastScenarios.find(s => s.id === selectedScenario);
    return scenario || forecastScenarios[1]; // Default to 'realiste'
  };

  const getForecastValue = (baseValue: number) => {
    const scenarioData = getSelectedScenarioData();
    return Math.round(baseValue * scenarioData.multiplier);
  };

  // invoiceData est chargé dynamiquement dans le useEffect ci-dessus
  const invoiceDetails = invoiceData;

  const openDetailModal = (category: string) => {
    const data = invoiceDetails[category as keyof typeof invoiceDetails];
    if (data) {
      setDetailModalData({
        title: data.title,
        type: data.type,
        category: category,
        invoices: data.invoices
      });
      setShowDetailModal(true);
    }
  };

  // Catégories pour les formulaires
  const encaissementCategories = {
    'ventes': {
      label: 'Ventes de marchandises',
      subCategories: {
        'produits_locaux': 'Produits locaux',
        'produits_importes': 'Produits importés'
      }
    },
    'services': {
      label: 'Prestations de services',
      subCategories: {
        'conseil_formation': 'Conseil et formation',
        'maintenance': 'Maintenance'
      }
    },
    'autres_produits': {
      label: 'Autres produits',
      subCategories: {
        'produits_financiers': 'Produits financiers',
        'produits_exceptionnels': 'Produits exceptionnels'
      }
    }
  };

  const decaissementCategories = {
    'achats': {
      label: 'Achats de marchandises',
      subCategories: {
        'matieres_premieres': 'Matières premières',
        'marchandises': 'Marchandises'
      }
    },
    'personnel': {
      label: 'Charges de personnel',
      subCategories: {
        'salaires': 'Salaires et appointements',
        'charges_sociales': 'Charges sociales'
      }
    },
    'exploitation': {
      label: 'Charges d\'exploitation',
      subCategories: {
        'loyers': 'Loyers et charges',
        'entretien': 'Entretien et réparations',
        'autres_charges': 'Autres charges externes'
      }
    },
    'impots': {
      label: 'Impôts et taxes',
      subCategories: {
        'tva': 'TVA',
        'autres_impots': 'Autres impôts'
      }
    }
  };

  const detailTabs = [
    { id: 'planification', label: 'Planification' },
    { id: 'previsions', label: 'Prévisions' },
    { id: 'recap', label: 'Recap' },
    { id: 'analyse', label: 'Analyse' }
  ];

  const openTransactionModal = (type: 'encaissement' | 'decaissement') => {
    setTransactionType(type);
    setSelectedCategory('');
    setSelectedSubCategory('');
    setShowTransactionModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/treasury/cash-flow')}
              className="text-sm text-gray-600 hover:text-[var(--color-text-primary)] mb-2"
            >
              ← Retour aux Plans de Trésorerie
            </button>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">📋 {planData.name}</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Auteur: {planData.author} • Période: {planData.period}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Solde Initial</div>
            <div className="text-lg font-bold text-red-600">
              {new Intl.NumberFormat('fr-FR').format(planData.initialBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation onglets */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {detailTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Onglet Planification */}
      {activeTab === 'planification' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">📅 Planification des Flux de trésorerie</h3>
              <p className="text-sm text-gray-600 mt-1">
                Données des factures échues extraites du Grand Livre comptable
              </p>
            </div>
            <div className="p-6 space-y-6">

              {/* Table 1: Prévision des Encaissements */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-[var(--color-text-primary)]">📈 Prévision des Encaissements (Factures échues)</h4>
                  <button
                    onClick={() => openTransactionModal('encaissement')}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                  >
                    <span>+</span>
                    <span>{t('common.add')}</span>
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-green-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">{t('common.date')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">{t('accounting.journal')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">N° Piece</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Tiers</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Ref Facture</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">{t('accounting.label')}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase">Montant</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase">Pointage</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase">Scenario</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Date Prévisionelle</th>
                      </tr>
                    </thead>
                  </table>

                  <div style={{maxHeight: '300px', overflowY: 'auto'}} className="overflow-x-auto">
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-200">
                      {Array.from({length: 5}, (_, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm"></td>
                          <td className="px-3 py-2 text-sm"></td>
                          <td className="px-3 py-2 text-sm"></td>
                          <td className="px-3 py-2 text-sm"></td>
                          <td className="px-3 py-2 text-sm"></td>
                          <td className="px-3 py-2 text-sm"></td>
                          <td className="px-3 py-2 text-sm text-right"></td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <select className="text-xs px-2 py-1 border border-gray-300 rounded bg-[var(--color-primary)]/5">
                              <option>Optimiste</option>
                              <option>Réaliste</option>
                              <option>Pessimiste</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 text-sm"></td>
                        </tr>
                      ))}
                      {/* Ligne total */}
                      <tr className="bg-green-50 border-t-2 border-green-300">
                        <td colSpan={6} className="px-3 py-2 font-bold text-[var(--color-text-primary)]">Total</td>
                        <td className="px-3 py-2 text-right font-bold text-green-600"></td>
                        <td colSpan={3}></td>
                      </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Table 2: Prévision des Décaissements */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-[var(--color-text-primary)]">📉 Prévision des décaissements (Factures échues)</h4>
                  <button
                    onClick={() => openTransactionModal('decaissement')}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-1"
                  >
                    <span>+</span>
                    <span>{t('common.add')}</span>
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">{t('common.date')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">{t('accounting.journal')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">N° Piece</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Tiers</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Ref Facture</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">{t('accounting.label')}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase">Montant</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase">Pointage</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase">Priorité</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Date Prévisionelle</th>
                      </tr>
                    </thead>
                  </table>

                  <div style={{maxHeight: '300px', overflowY: 'auto'}} className="overflow-x-auto">
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-200">
                      {Array.from({length: 5}, (_, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm"></td>
                          <td className="px-3 py-2 text-sm"></td>
                          <td className="px-3 py-2 text-sm"></td>
                          <td className="px-3 py-2 text-sm"></td>
                          <td className="px-3 py-2 text-sm"></td>
                          <td className="px-3 py-2 text-sm"></td>
                          <td className="px-3 py-2 text-sm text-right"></td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <select className="text-xs px-2 py-1 border border-gray-300 rounded bg-red-50">
                              <option>Haute</option>
                              <option>Moyenne</option>
                              <option>Basse</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 text-sm"></td>
                        </tr>
                      ))}
                      {/* Ligne total */}
                      <tr className="bg-red-50 border-t-2 border-red-300">
                        <td colSpan={6} className="px-3 py-2 font-bold text-[var(--color-text-primary)]">Total</td>
                        <td className="px-3 py-2 text-right font-bold text-red-600"></td>
                        <td colSpan={3}></td>
                      </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Prévisions */}
      {activeTab === 'previsions' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[var(--color-text-secondary)]/10 to-[var(--color-text-tertiary)]/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">📊 Prévision de Trésorerie Globale</h3>
                <div>
                  <label className="block text-xs text-[#404040] mb-1">Scénario de prévision :</label>
                  <select
                    value={selectedScenario}
                    onChange={(e) => setSelectedScenario(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[var(--color-text-secondary)] focus:border-[var(--color-text-secondary)]"
                  >
                    {forecastScenarios.map(scenario => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[var(--color-primary)]/10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase border-r">{t('accounting.label')}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Montant (CFA)</th>
                    </tr>
                  </thead>
                </table>

                <div style={{maxHeight: '400px', overflowY: 'auto'}} className="overflow-x-auto">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-200">
                      {/* Trésorerie disponible */}
                      <tr className="bg-[var(--color-primary)]/5">
                        <td className="px-4 py-3 font-semibold text-[var(--color-primary)] border-r">Trésorerie disponible (début)</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold">-95,194,202</td>
                      </tr>

                      {/* Section Encaissements */}
                      <tr className="bg-green-50">
                        <td className="px-4 py-3 font-semibold text-green-800 border-r flex items-center space-x-2">
                          <button
                            onClick={() => setExpandedEncaissements(!expandedEncaissements)}
                            className="w-6 h-6 rounded bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors"
                          >
                            {expandedEncaissements ? '−' : '+'}
                          </button>
                          <span>Encaissements TTC</span>
                          <span className="text-xs px-2 py-1 rounded-full bg-white/80 text-green-700 font-medium ml-2">
                            {getSelectedScenarioData().name.replace(/📈|📊|📉/, '').trim()}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-semibold ${getSelectedScenarioData().color}`}>
                          {new Intl.NumberFormat('fr-FR').format(getForecastValue(57450000))}
                        </td>
                      </tr>
                      {/* Détails des encaissements */}
                      {expandedEncaissements && (
                        <>
                          <tr className="bg-green-25">
                            <td className="px-4 py-2 text-sm text-green-700 border-r pl-8 flex items-center space-x-2">
                              <button
                                onClick={() => setExpandedVentes(!expandedVentes)}
                                className="w-5 h-5 rounded bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors text-xs"
                              >
                                {expandedVentes ? '−' : '+'}
                              </button>
                              <span>• Ventes de marchandises</span>
                            </td>
                            <td className={`px-4 py-2 text-right text-sm ${getSelectedScenarioData().color}`}>
                              {new Intl.NumberFormat('fr-FR').format(getForecastValue(36400000))}
                            </td>
                          </tr>
                          {expandedVentes && (
                            <>
                              <tr
                                role="button"
                                tabIndex={0}
                                className="bg-green-100 hover:bg-green-150 cursor-pointer"
                                onClick={() => openDetailModal('produits_locaux')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openDetailModal('produits_locaux');
                                  }
                                }}
                                aria-label="Voir détails produits locaux"
                              >
                                <td className="px-4 py-1 text-xs text-green-600 border-r pl-16 hover:underline">- Produits locaux</td>
                                <td className={`px-4 py-1 text-right text-xs ${getSelectedScenarioData().color}`}>
                                  {new Intl.NumberFormat('fr-FR').format(getForecastValue(24500000))}
                                </td>
                              </tr>
                              <tr
                                role="button"
                                tabIndex={0}
                                className="bg-green-100 hover:bg-green-150 cursor-pointer"
                                onClick={() => openDetailModal('produits_importes')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openDetailModal('produits_importes');
                                  }
                                }}
                                aria-label="Voir détails produits importés"
                              >
                                <td className="px-4 py-1 text-xs text-green-600 border-r pl-16 hover:underline">- Produits importés</td>
                                <td className={`px-4 py-1 text-right text-xs ${getSelectedScenarioData().color}`}>
                                  {new Intl.NumberFormat('fr-FR').format(getForecastValue(11900000))}
                                </td>
                              </tr>
                            </>
                          )}
                          <tr className="bg-green-25">
                            <td className="px-4 py-2 text-sm text-green-700 border-r pl-8 flex items-center space-x-2">
                              <button
                                onClick={() => setExpandedServices(!expandedServices)}
                                className="w-5 h-5 rounded bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors text-xs"
                              >
                                {expandedServices ? '−' : '+'}
                              </button>
                              <span>• Prestations de services</span>
                            </td>
                            <td className="px-4 py-2 text-right text-sm">18,250,000</td>
                          </tr>
                          {expandedServices && (
                            <>
                              <tr className="bg-green-100">
                                <td className="px-4 py-1 text-xs text-green-600 border-r pl-16">- Conseil et formation</td>
                                <td className="px-4 py-1 text-right text-xs">12,000,000</td>
                              </tr>
                              <tr className="bg-green-100">
                                <td className="px-4 py-1 text-xs text-green-600 border-r pl-16">- Maintenance</td>
                                <td className="px-4 py-1 text-right text-xs">6,250,000</td>
                              </tr>
                            </>
                          )}
                          <tr className="bg-green-25">
                            <td className="px-4 py-2 text-sm text-green-700 border-r pl-8 flex items-center space-x-2">
                              <button
                                onClick={() => setExpandedAutresProduits(!expandedAutresProduits)}
                                className="w-5 h-5 rounded bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors text-xs"
                              >
                                {expandedAutresProduits ? '−' : '+'}
                              </button>
                              <span>• Autres produits</span>
                            </td>
                            <td className="px-4 py-2 text-right text-sm">2,800,000</td>
                          </tr>
                          {expandedAutresProduits && (
                            <>
                              <tr className="bg-green-100">
                                <td className="px-4 py-1 text-xs text-green-600 border-r pl-16">- Produits financiers</td>
                                <td className="px-4 py-1 text-right text-xs">1,500,000</td>
                              </tr>
                              <tr className="bg-green-100">
                                <td className="px-4 py-1 text-xs text-green-600 border-r pl-16">- Produits exceptionnels</td>
                                <td className="px-4 py-1 text-right text-xs">1,300,000</td>
                              </tr>
                            </>
                          )}
                        </>
                      )}
                      <tr>
                        <td className="px-4 py-3 font-medium text-green-700 border-r">Total des encaissements</td>
                        <td className={`px-4 py-3 text-right text-sm font-semibold ${getSelectedScenarioData().color}`}>
                          {new Intl.NumberFormat('fr-FR').format(getForecastValue(57450000))}
                        </td>
                      </tr>
                      <tr className="bg-[var(--color-primary)]/5">
                        <td className="px-4 py-3 font-semibold text-[var(--color-primary)] border-r">Total de trésorerie disponible (avant décaissement)</td>
                        <td className={`px-4 py-3 text-right text-sm font-semibold ${getSelectedScenarioData().color}`}>
                          {new Intl.NumberFormat('fr-FR').format(-95194202 + getForecastValue(57450000))}
                        </td>
                      </tr>

                      {/* Section Décaissements */}
                      <tr className="bg-red-50">
                        <td className="px-4 py-3 font-semibold text-red-800 border-r flex items-center space-x-2">
                          <button
                            onClick={() => setExpandedDecaissements(!expandedDecaissements)}
                            className="w-6 h-6 rounded bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
                          >
                            {expandedDecaissements ? '−' : '+'}
                          </button>
                          <span>Décaissements TTC</span>
                          <span className="text-xs px-2 py-1 rounded-full bg-white/80 text-red-700 font-medium ml-2">
                            {getSelectedScenarioData().name.replace(/📈|📊|📉/, '').trim()}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-semibold ${getSelectedScenarioData().color}`}>
                          {new Intl.NumberFormat('fr-FR').format(getForecastValue(45590000))}
                        </td>
                      </tr>
                      {/* Détails des décaissements */}
                      {expandedDecaissements && (
                        <>
                          <tr className="bg-red-25">
                            <td className="px-4 py-2 text-sm text-red-700 border-r pl-8 flex items-center space-x-2">
                              <button
                                onClick={() => setExpandedAchats(!expandedAchats)}
                                className="w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                              >
                                {expandedAchats ? '−' : '+'}
                              </button>
                              <span>• Achats de marchandises</span>
                            </td>
                            <td className="px-4 py-2 text-right text-sm">27,250,000</td>
                          </tr>
                          {expandedAchats && (
                            <>
                              <tr
                                role="button"
                                tabIndex={0}
                                className="bg-red-100 hover:bg-red-150 cursor-pointer"
                                onClick={() => openDetailModal('matieres_premieres')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openDetailModal('matieres_premieres');
                                  }
                                }}
                                aria-label="Voir détails matières premières"
                              >
                                <td className="px-4 py-1 text-xs text-red-600 border-r pl-16 hover:underline">- Matières premières</td>
                                <td className="px-4 py-1 text-right text-xs">18,200,000</td>
                              </tr>
                              <tr className="bg-red-100">
                                <td className="px-4 py-1 text-xs text-red-600 border-r pl-16">- Marchandises</td>
                                <td className="px-4 py-1 text-right text-xs">9,050,000</td>
                              </tr>
                            </>
                          )}
                          <tr className="bg-red-25">
                            <td className="px-4 py-2 text-sm text-red-700 border-r pl-8 flex items-center space-x-2">
                              <button
                                onClick={() => setExpandedPersonnel(!expandedPersonnel)}
                                className="w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                              >
                                {expandedPersonnel ? '−' : '+'}
                              </button>
                              <span>• Charges de personnel</span>
                            </td>
                            <td className="px-4 py-2 text-right text-sm">10,200,000</td>
                          </tr>
                          {expandedPersonnel && (
                            <>
                              <tr
                                role="button"
                                tabIndex={0}
                                className="bg-red-100 hover:bg-red-150 cursor-pointer"
                                onClick={() => openDetailModal('salaires')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openDetailModal('salaires');
                                  }
                                }}
                                aria-label="Voir détails salaires et appointements"
                              >
                                <td className="px-4 py-1 text-xs text-red-600 border-r pl-16 hover:underline">- Salaires et appointements</td>
                                <td className="px-4 py-1 text-right text-xs">7,500,000</td>
                              </tr>
                              <tr className="bg-red-100">
                                <td className="px-4 py-1 text-xs text-red-600 border-r pl-16">- Charges sociales</td>
                                <td className="px-4 py-1 text-right text-xs">2,700,000</td>
                              </tr>
                            </>
                          )}
                          <tr className="bg-red-25">
                            <td className="px-4 py-2 text-sm text-red-700 border-r pl-8 flex items-center space-x-2">
                              <button
                                onClick={() => setExpandedExploitation(!expandedExploitation)}
                                className="w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                              >
                                {expandedExploitation ? '−' : '+'}
                              </button>
                              <span>• Charges d'exploitation</span>
                            </td>
                            <td className="px-4 py-2 text-right text-sm">5,860,000</td>
                          </tr>
                          {expandedExploitation && (
                            <>
                              <tr className="bg-red-100">
                                <td className="px-4 py-1 text-xs text-red-600 border-r pl-16">- Loyers et charges</td>
                                <td className="px-4 py-1 text-right text-xs">2,400,000</td>
                              </tr>
                              <tr className="bg-red-100">
                                <td className="px-4 py-1 text-xs text-red-600 border-r pl-16">- Entretien et réparations</td>
                                <td className="px-4 py-1 text-right text-xs">1,800,000</td>
                              </tr>
                              <tr className="bg-red-100">
                                <td className="px-4 py-1 text-xs text-red-600 border-r pl-16">- Autres charges externes</td>
                                <td className="px-4 py-1 text-right text-xs">1,660,000</td>
                              </tr>
                            </>
                          )}
                          <tr className="bg-red-25">
                            <td className="px-4 py-2 text-sm text-red-700 border-r pl-8 flex items-center space-x-2">
                              <button
                                onClick={() => setExpandedImpots(!expandedImpots)}
                                className="w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                              >
                                {expandedImpots ? '−' : '+'}
                              </button>
                              <span>• Impôts et taxes</span>
                            </td>
                            <td className="px-4 py-2 text-right text-sm">2,280,000</td>
                          </tr>
                          {expandedImpots && (
                            <>
                              <tr className="bg-red-100">
                                <td className="px-4 py-1 text-xs text-red-600 border-r pl-16">- TVA</td>
                                <td className="px-4 py-1 text-right text-xs">1,200,000</td>
                              </tr>
                              <tr className="bg-red-100">
                                <td className="px-4 py-1 text-xs text-red-600 border-r pl-16">- Autres impôts</td>
                                <td className="px-4 py-1 text-right text-xs">1,080,000</td>
                              </tr>
                            </>
                          )}
                        </>
                      )}
                      <tr className="bg-red-100">
                        <td className="px-4 py-3 font-semibold text-red-800 border-r">Total des décaissements</td>
                        <td className={`px-4 py-3 text-right text-sm font-bold ${getSelectedScenarioData().color}`}>
                          {new Intl.NumberFormat('fr-FR').format(getForecastValue(45590000))}
                        </td>
                      </tr>

                      {/* Position finale */}
                      <tr className="bg-[var(--color-primary)]/10 border-t-2 border-[var(--color-primary)]">
                        <td className="px-4 py-3 font-bold text-[var(--color-text-primary)] border-r">
                          Position de trésorerie (fin de période)
                          <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-text-secondary)]/20 text-[var(--color-text-secondary)] font-medium ml-2">
                            {getSelectedScenarioData().name.replace(/📈|📊|📉/, '').trim()}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-bold ${getSelectedScenarioData().color}`}>
                          {new Intl.NumberFormat('fr-FR').format(-95194202 + getForecastValue(57450000) - getForecastValue(45590000))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Recap */}
      {activeTab === 'recap' && (
        <div className="space-y-6">
          {/* Header avec filtres */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[var(--color-text-secondary)]/10 to-[var(--color-text-tertiary)]/10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">📊 Rapport Prévisions de Trésorerie - Tous Scénarios</h3>
                <div className="flex items-center space-x-4 flex-wrap">
                  {/* Filtre par type */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Type :</label>
                    <select
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm bg-white"
                    >
                      <option value="all">Tous</option>
                      <option value="encaissements">Encaissements</option>
                      <option value="decaissements">Décaissements</option>
                    </select>
                  </div>

                  {/* Période */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Du :</label>
                    <input
                      type="date"
                      value={dateDebut}
                      onChange={(e) => setDateDebut(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Au :</label>
                    <input
                      type="date"
                      value={dateFin}
                      onChange={(e) => setDateFin(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm bg-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <button className="px-4 py-1 bg-[var(--color-primary)] text-white rounded text-sm hover:bg-[var(--color-primary)]/80 transition-colors">
                      🔍 Filtrer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparaison des scénarios */}
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">📈 Comparaison des Scénarios</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Métrique</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-green-700 uppercase">📈 Optimiste</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-primary)] uppercase">📊 Réaliste</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-red-700 uppercase">📉 Pessimiste</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Écart Max</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Encaissements TTC</td>
                        <td className="px-4 py-3 text-center text-sm text-green-600 font-medium">
                          {new Intl.NumberFormat('fr-FR').format(Math.round(57450000 * 1.3))}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-[var(--color-primary)] font-medium">
                          {new Intl.NumberFormat('fr-FR').format(57450000)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-red-600 font-medium">
                          {new Intl.NumberFormat('fr-FR').format(Math.round(57450000 * 0.7))}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                          {new Intl.NumberFormat('fr-FR').format(Math.round(57450000 * 1.3) - Math.round(57450000 * 0.7))}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Décaissements TTC</td>
                        <td className="px-4 py-3 text-center text-sm text-green-600 font-medium">
                          {new Intl.NumberFormat('fr-FR').format(Math.round(45590000 * 1.3))}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-[var(--color-primary)] font-medium">
                          {new Intl.NumberFormat('fr-FR').format(45590000)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-red-600 font-medium">
                          {new Intl.NumberFormat('fr-FR').format(Math.round(45590000 * 0.7))}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                          {new Intl.NumberFormat('fr-FR').format(Math.round(45590000 * 1.3) - Math.round(45590000 * 0.7))}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 bg-[var(--color-primary)]/5">
                        <td className="px-4 py-3 text-sm font-bold text-[var(--color-text-primary)]">Position de Trésorerie</td>
                        <td className="px-4 py-3 text-center text-sm text-green-600 font-bold">
                          {new Intl.NumberFormat('fr-FR').format(-95194202 + Math.round(57450000 * 1.3) - Math.round(45590000 * 1.3))}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-[var(--color-primary)] font-bold">
                          {new Intl.NumberFormat('fr-FR').format(-95194202 + 57450000 - 45590000)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-red-600 font-bold">
                          {new Intl.NumberFormat('fr-FR').format(-95194202 + Math.round(57450000 * 0.7) - Math.round(45590000 * 0.7))}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-[var(--color-text-primary)]">
                          {new Intl.NumberFormat('fr-FR').format(
                            (-95194202 + Math.round(57450000 * 1.3) - Math.round(45590000 * 1.3)) -
                            (-95194202 + Math.round(57450000 * 0.7) - Math.round(45590000 * 0.7))
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tableaux détaillés par scénario */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">💼 Rapport Détaillé par Scénario</h4>

                {/* Scénario Optimiste - Tableau détaillé */}
                <div className="mb-8">
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                    <h5 className="text-lg font-semibold text-green-800 mb-2">📈 Scénario Optimiste (+30%)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div><strong>Taux de réalisation:</strong> 130%</div>
                      <div><strong>Niveau de risque:</strong> Faible</div>
                      <div><strong>Probabilité:</strong> 25%</div>
                      <div><strong>Confiance:</strong> Élevée</div>
                    </div>
                  </div>

                  <div className="border border-green-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-green-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-green-700 uppercase">N° Facture</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-green-700 uppercase">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-green-700 uppercase">Client/Fournisseur</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-green-700 uppercase">Échéance</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-green-700 uppercase">Montant Base</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-green-700 uppercase">Montant Optimiste</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-green-700 uppercase">Gain Potentiel</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-green-700 uppercase">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-200">
                        {/* Encaissements optimistes */}
                        <tr className="hover:bg-green-25">
                          <td className="px-3 py-2 text-sm font-mono">FAC-2025-001</td>
                          <td className="px-3 py-2 text-sm">📈 Encaissement</td>
                          <td className="px-3 py-2 text-sm">SUPERMARCHE CHAMPION</td>
                          <td className="px-3 py-2 text-sm">15/02/2025</td>
                          <td className="px-3 py-2 text-right text-sm">8,500,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-green-600">11,050,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-green-700">+2,550,000</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Favorable</span></td>
                        </tr>
                        <tr className="hover:bg-green-25">
                          <td className="px-3 py-2 text-sm font-mono">FAC-2025-003</td>
                          <td className="px-3 py-2 text-sm">📈 Encaissement</td>
                          <td className="px-3 py-2 text-sm">DISTRIBUTEUR COSMOS</td>
                          <td className="px-3 py-2 text-sm">20/03/2025</td>
                          <td className="px-3 py-2 text-right text-sm">6,200,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-green-600">8,060,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-green-700">+1,860,000</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Favorable</span></td>
                        </tr>
                        <tr className="hover:bg-green-25">
                          <td className="px-3 py-2 text-sm font-mono">FAC-2025-002</td>
                          <td className="px-3 py-2 text-sm">📈 Encaissement</td>
                          <td className="px-3 py-2 text-sm">IMPORT AFRICA</td>
                          <td className="px-3 py-2 text-sm">18/04/2025</td>
                          <td className="px-3 py-2 text-right text-sm">4,200,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-green-600">5,460,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-green-700">+1,260,000</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Favorable</span></td>
                        </tr>
                        <tr className="hover:bg-red-25">
                          <td className="px-3 py-2 text-sm font-mono">FOUR-2025-001</td>
                          <td className="px-3 py-2 text-sm">📉 Décaissement</td>
                          <td className="px-3 py-2 text-sm">PLANTATION AFRICA</td>
                          <td className="px-3 py-2 text-sm">10/02/2025</td>
                          <td className="px-3 py-2 text-right text-sm">12,000,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-600">15,600,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-700">+3,600,000</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Défavorable</span></td>
                        </tr>
                        <tr className="hover:bg-red-25">
                          <td className="px-3 py-2 text-sm font-mono">SAL-2025-01</td>
                          <td className="px-3 py-2 text-sm">📉 Décaissement</td>
                          <td className="px-3 py-2 text-sm">PERSONNEL CADRES</td>
                          <td className="px-3 py-2 text-sm">05/02/2025</td>
                          <td className="px-3 py-2 text-right text-sm">4,500,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-600">5,850,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-700">+1,350,000</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Défavorable</span></td>
                        </tr>
                        <tr className="bg-green-100 font-bold">
                          <td colSpan="4" className="px-3 py-2 text-sm font-bold text-green-800">TOTAL SCÉNARIO OPTIMISTE</td>
                          <td className="px-3 py-2 text-right text-sm font-bold">35,400,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-green-600">46,020,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-green-700">+10,620,000</td>
                          <td className="px-3 py-2 text-center font-bold text-green-800">NET FAVORABLE</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Scénario Réaliste - Tableau détaillé */}
                <div className="mb-8">
                  <div className="bg-[var(--color-primary)]/5 border-l-4 border-[var(--color-primary)] p-4 mb-4">
                    <h5 className="text-lg font-semibold text-[var(--color-primary)] mb-2">📊 Scénario Réaliste (Base)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div><strong>Taux de réalisation:</strong> 100%</div>
                      <div><strong>Niveau de risque:</strong> Modéré</div>
                      <div><strong>Probabilité:</strong> 50%</div>
                      <div><strong>Confiance:</strong> Modérée</div>
                    </div>
                  </div>

                  <div className="border border-[var(--color-primary)]/20 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-[var(--color-primary)]/5">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--color-primary)] uppercase">N° Facture</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--color-primary)] uppercase">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--color-primary)] uppercase">Client/Fournisseur</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--color-primary)] uppercase">Échéance</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--color-primary)] uppercase">Montant Base</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--color-primary)] uppercase">Montant Réaliste</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--color-primary)] uppercase">Écart</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--color-primary)] uppercase">Probabilité</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-200">
                        <tr className="hover:bg-[var(--color-primary)]/5">
                          <td className="px-3 py-2 text-sm font-mono">FAC-2025-001</td>
                          <td className="px-3 py-2 text-sm">📈 Encaissement</td>
                          <td className="px-3 py-2 text-sm">SUPERMARCHE CHAMPION</td>
                          <td className="px-3 py-2 text-sm">15/02/2025</td>
                          <td className="px-3 py-2 text-right text-sm">8,500,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-[var(--color-primary)]">8,500,000</td>
                          <td className="px-3 py-2 text-right text-sm">±0</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs rounded-full">85%</span></td>
                        </tr>
                        <tr className="hover:bg-[var(--color-primary)]/5">
                          <td className="px-3 py-2 text-sm font-mono">FAC-2025-003</td>
                          <td className="px-3 py-2 text-sm">📈 Encaissement</td>
                          <td className="px-3 py-2 text-sm">DISTRIBUTEUR COSMOS</td>
                          <td className="px-3 py-2 text-sm">20/03/2025</td>
                          <td className="px-3 py-2 text-right text-sm">6,200,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-[var(--color-primary)]">6,200,000</td>
                          <td className="px-3 py-2 text-right text-sm">±0</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs rounded-full">80%</span></td>
                        </tr>
                        <tr className="hover:bg-[var(--color-primary)]/5">
                          <td className="px-3 py-2 text-sm font-mono">FAC-2025-002</td>
                          <td className="px-3 py-2 text-sm">📈 Encaissement</td>
                          <td className="px-3 py-2 text-sm">IMPORT AFRICA</td>
                          <td className="px-3 py-2 text-sm">18/04/2025</td>
                          <td className="px-3 py-2 text-right text-sm">4,200,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-[var(--color-primary)]">4,200,000</td>
                          <td className="px-3 py-2 text-right text-sm">±0</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs rounded-full">75%</span></td>
                        </tr>
                        <tr className="hover:bg-[var(--color-primary)]/5">
                          <td className="px-3 py-2 text-sm font-mono">FOUR-2025-001</td>
                          <td className="px-3 py-2 text-sm">📉 Décaissement</td>
                          <td className="px-3 py-2 text-sm">PLANTATION AFRICA</td>
                          <td className="px-3 py-2 text-sm">10/02/2025</td>
                          <td className="px-3 py-2 text-right text-sm">12,000,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-600">12,000,000</td>
                          <td className="px-3 py-2 text-right text-sm">±0</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs rounded-full">90%</span></td>
                        </tr>
                        <tr className="hover:bg-[var(--color-primary)]/5">
                          <td className="px-3 py-2 text-sm font-mono">SAL-2025-01</td>
                          <td className="px-3 py-2 text-sm">📉 Décaissement</td>
                          <td className="px-3 py-2 text-sm">PERSONNEL CADRES</td>
                          <td className="px-3 py-2 text-sm">05/02/2025</td>
                          <td className="px-3 py-2 text-right text-sm">4,500,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-600">4,500,000</td>
                          <td className="px-3 py-2 text-right text-sm">±0</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs rounded-full">95%</span></td>
                        </tr>
                        <tr className="bg-[var(--color-primary)]/10 font-bold">
                          <td colSpan="4" className="px-3 py-2 text-sm font-bold text-[var(--color-primary)]">TOTAL SCÉNARIO RÉALISTE</td>
                          <td className="px-3 py-2 text-right text-sm font-bold">35,400,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-[var(--color-primary)]">35,400,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold">±0</td>
                          <td className="px-3 py-2 text-center font-bold text-[var(--color-primary)]">ÉQUILIBRÉ</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Scénario Pessimiste - Tableau détaillé */}
                <div className="mb-8">
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <h5 className="text-lg font-semibold text-red-800 mb-2">📉 Scénario Pessimiste (-30%)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div><strong>Taux de réalisation:</strong> 70%</div>
                      <div><strong>Niveau de risque:</strong> Élevé</div>
                      <div><strong>Probabilité:</strong> 25%</div>
                      <div><strong>Confiance:</strong> Faible</div>
                    </div>
                  </div>

                  <div className="border border-red-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-700 uppercase">N° Facture</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-700 uppercase">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-700 uppercase">Client/Fournisseur</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-700 uppercase">Échéance</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-red-700 uppercase">Montant Base</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-red-700 uppercase">Montant Pessimiste</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-red-700 uppercase">Perte Potentielle</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-red-700 uppercase">Risque</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-200">
                        <tr className="hover:bg-red-25">
                          <td className="px-3 py-2 text-sm font-mono">FAC-2025-001</td>
                          <td className="px-3 py-2 text-sm">📈 Encaissement</td>
                          <td className="px-3 py-2 text-sm">SUPERMARCHE CHAMPION</td>
                          <td className="px-3 py-2 text-sm">15/02/2025</td>
                          <td className="px-3 py-2 text-right text-sm">8,500,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-600">5,950,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-700">-2,550,000</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Élevé</span></td>
                        </tr>
                        <tr className="hover:bg-red-25">
                          <td className="px-3 py-2 text-sm font-mono">FAC-2025-003</td>
                          <td className="px-3 py-2 text-sm">📈 Encaissement</td>
                          <td className="px-3 py-2 text-sm">DISTRIBUTEUR COSMOS</td>
                          <td className="px-3 py-2 text-sm">20/03/2025</td>
                          <td className="px-3 py-2 text-right text-sm">6,200,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-600">4,340,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-700">-1,860,000</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Élevé</span></td>
                        </tr>
                        <tr className="hover:bg-red-25">
                          <td className="px-3 py-2 text-sm font-mono">FAC-2025-002</td>
                          <td className="px-3 py-2 text-sm">📈 Encaissement</td>
                          <td className="px-3 py-2 text-sm">IMPORT AFRICA</td>
                          <td className="px-3 py-2 text-sm">18/04/2025</td>
                          <td className="px-3 py-2 text-right text-sm">4,200,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-600">2,940,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-700">-1,260,000</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Modéré</span></td>
                        </tr>
                        <tr className="hover:bg-green-25">
                          <td className="px-3 py-2 text-sm font-mono">FOUR-2025-001</td>
                          <td className="px-3 py-2 text-sm">📉 Décaissement</td>
                          <td className="px-3 py-2 text-sm">PLANTATION AFRICA</td>
                          <td className="px-3 py-2 text-sm">10/02/2025</td>
                          <td className="px-3 py-2 text-right text-sm">12,000,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-green-600">8,400,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-green-700">-3,600,000</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Favorable</span></td>
                        </tr>
                        <tr className="hover:bg-green-25">
                          <td className="px-3 py-2 text-sm font-mono">SAL-2025-01</td>
                          <td className="px-3 py-2 text-sm">📉 Décaissement</td>
                          <td className="px-3 py-2 text-sm">PERSONNEL CADRES</td>
                          <td className="px-3 py-2 text-sm">05/02/2025</td>
                          <td className="px-3 py-2 text-right text-sm">4,500,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-green-600">3,150,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-green-700">-1,350,000</td>
                          <td className="px-3 py-2 text-center"><span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Favorable</span></td>
                        </tr>
                        <tr className="bg-red-100 font-bold">
                          <td colSpan="4" className="px-3 py-2 text-sm font-bold text-red-800">TOTAL SCÉNARIO PESSIMISTE</td>
                          <td className="px-3 py-2 text-right text-sm font-bold">35,400,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-600">24,780,000</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-700">-10,620,000</td>
                          <td className="px-3 py-2 text-center font-bold text-red-800">NET RISQUÉ</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Analyse de sensibilité */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-semibold text-green-800 mb-3">📈 Scénario Optimiste</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Taux de réalisation :</span>
                      <span className="font-medium text-green-600">130%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Risque :</span>
                      <span className="font-medium text-green-600">Faible</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold text-green-800">Position finale :</span>
                      <span className="font-bold text-green-600">
                        {new Intl.NumberFormat('fr-FR').format(-95194202 + Math.round(57450000 * 1.3) - Math.round(45590000 * 1.3))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-lg p-4">
                  <h5 className="font-semibold text-[var(--color-primary)] mb-3">📊 Scénario Réaliste</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Taux de réalisation :</span>
                      <span className="font-medium text-[var(--color-primary)]">100%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Risque :</span>
                      <span className="font-medium text-[var(--color-primary)]">Modéré</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold text-[var(--color-primary)]">Position finale :</span>
                      <span className="font-bold text-[var(--color-primary)]">
                        {new Intl.NumberFormat('fr-FR').format(-95194202 + 57450000 - 45590000)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h5 className="font-semibold text-red-800 mb-3">📉 Scénario Pessimiste</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Taux de réalisation :</span>
                      <span className="font-medium text-red-600">70%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Risque :</span>
                      <span className="font-medium text-red-600">Élevé</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold text-red-800">Position finale :</span>
                      <span className="font-bold text-red-600">
                        {new Intl.NumberFormat('fr-FR').format(-95194202 + Math.round(57450000 * 0.7) - Math.round(45590000 * 0.7))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions du rapport */}
              <div className="mt-6 flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  Rapport généré le {new Date().toLocaleDateString('fr-FR')} •
                  Période : {new Date(dateDebut).toLocaleDateString('fr-FR')} - {new Date(dateFin).toLocaleDateString('fr-FR')}
                </div>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/80 transition-colors">
                    📊 Export Excel
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    📄 Export PDF
                  </button>
                  <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/80 transition-colors">
                    📧 Envoyer par email
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Analyse */}
      {activeTab === 'analyse' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[var(--color-text-secondary)]/10 to-[var(--color-text-tertiary)]/10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">📊 Analyse des Écarts</h3>
                <div className="flex items-center space-x-4 flex-wrap">
                  {/* Filtre par type */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Type :</label>
                    <select
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm bg-white"
                    >
                      <option value="all">Tous</option>
                      <option value="encaissements">Encaissements</option>
                      <option value="decaissements">Décaissements</option>
                    </select>
                  </div>

                  {/* Période */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Du :</label>
                    <input
                      type="date"
                      value={dateDebut}
                      onChange={(e) => setDateDebut(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Au :</label>
                    <input
                      type="date"
                      value={dateFin}
                      onChange={(e) => setDateFin(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm bg-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <button className="px-4 py-1 bg-[var(--color-primary)] text-white rounded text-sm hover:bg-[var(--color-primary)]/80 transition-colors">
                      🔍 Filtrer
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">

              {/* Indicateur des filtres actifs */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <strong>Filtres actifs :</strong>
                    <span className="ml-2 px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs rounded-full">
                      Type: {selectedFilter === 'all' ? 'Tous' : selectedFilter === 'encaissements' ? 'Encaissements' : 'Décaissements'}
                    </span>
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Période: {new Date(dateDebut).toLocaleDateString('fr-FR')} - {new Date(dateFin).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-700">
                    Analyse mise à jour automatiquement
                  </div>
                </div>
              </div>

              {/* Analyse des Encaissements */}
              <div>
                <h4 className="text-lg font-semibold text-green-800 mb-4">📈 Encaissements</h4>

                {/* Tableau résumé encaissements */}
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                  <table className="w-full">
                    <thead className="bg-green-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Prévisionnel</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Réelle</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Écart</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Encaissements</td>
                        <td className="px-4 py-3 text-right text-sm text-green-600">
                          {new Intl.NumberFormat('fr-FR').format(getForecastValue(57450000))}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-[var(--color-primary)]">45,230,000</td>
                        <td className="px-4 py-3 text-right text-sm text-red-600 font-medium">
                          {new Intl.NumberFormat('fr-FR', {
                            signDisplay: 'always'
                          }).format(45230000 - getForecastValue(57450000))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Détail des transactions encaissements */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-green-100 px-4 py-2">
                    <h5 className="font-medium text-green-800">Transactions</h5>
                  </div>
                  <table className="w-full">
                    <thead className="bg-green-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">N° Pièce</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Tiers</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Ref Facture</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">{t('accounting.label')}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase">Montant Prévisionnel</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase">Montant Réel</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase">Écart</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[
                        { piece: 'ENC001', tiers: 'CLIENT ABC', ref: 'F2025-001', libelle: 'Vente marchandises Q1', previsionnel: 12500000, reel: 11800000 },
                        { piece: 'ENC002', tiers: 'CLIENT XYZ', ref: 'F2025-002', libelle: 'Prestation conseil', previsionnel: 8750000, reel: 9200000 },
                        { piece: 'ENC003', tiers: 'CLIENT DEF', ref: 'F2025-003', libelle: 'Formation personnel', previsionnel: 6980000, reel: 6500000 },
                        { piece: 'ENC004', tiers: 'CLIENT GHI', ref: 'F2025-004', libelle: 'Maintenance équipements', previsionnel: 4200000, reel: 4800000 },
                        { piece: 'ENC005', tiers: 'CLIENT JKL', ref: 'F2025-005', libelle: 'Vente produits locaux', previsionnel: 12800000, reel: 12950000 }
                      ].map((transaction, index) => {
                        const ecart = transaction.reel - transaction.previsionnel;
                        const ecartPositif = ecart > 0;
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm font-mono">{transaction.piece}</td>
                            <td className="px-3 py-2 text-sm text-gray-700">{transaction.tiers}</td>
                            <td className="px-3 py-2 text-sm font-mono">{transaction.ref}</td>
                            <td className="px-3 py-2 text-sm">{transaction.libelle}</td>
                            <td className="px-3 py-2 text-right text-sm text-[var(--color-primary)] font-medium">
                              {new Intl.NumberFormat('fr-FR').format(transaction.previsionnel)}
                            </td>
                            <td className="px-3 py-2 text-right text-sm text-green-600 font-medium">
                              {new Intl.NumberFormat('fr-FR').format(transaction.reel)}
                            </td>
                            <td className={`px-3 py-2 text-right text-sm font-bold ${ecartPositif ? 'text-green-600' : 'text-red-600'}`}>
                              {new Intl.NumberFormat('fr-FR', { signDisplay: 'always' }).format(ecart)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                Math.abs(ecart) < 500000 ? 'bg-green-100 text-green-800' :
                                ecartPositif ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-red-100 text-red-800'
                              }`}>
                                {Math.abs(ecart) < 500000 ? 'Conforme' : ecartPositif ? 'Surplus' : 'Déficit'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Analyse des Décaissements */}
              <div>
                <h4 className="text-lg font-semibold text-red-800 mb-4">📉 Décaissements</h4>

                {/* Tableau résumé décaissements */}
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                  <table className="w-full">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Prévisionnel</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Réelle</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Écart</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Décaissements</td>
                        <td className="px-4 py-3 text-right text-sm text-red-600">
                          {new Intl.NumberFormat('fr-FR').format(getForecastValue(45590000))}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-[var(--color-primary)]">52,180,000</td>
                        <td className="px-4 py-3 text-right text-sm text-red-600 font-medium">
                          {new Intl.NumberFormat('fr-FR', {
                            signDisplay: 'always'
                          }).format(52180000 - getForecastValue(45590000))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Détail des transactions décaissements */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-red-100 px-4 py-2">
                    <h5 className="font-medium text-red-800">Transactions</h5>
                  </div>
                  <table className="w-full">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">N° Pièce</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Tiers</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Ref Facture</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">{t('accounting.label')}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase">Montant Prévisionnel</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase">Montant Réel</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase">Écart</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[
                        { piece: 'DEC001', tiers: 'FOURNISSEUR A', ref: 'FA-2025-001', libelle: 'Achat matières premières', previsionnel: 18200000, reel: 19500000 },
                        { piece: 'DEC002', tiers: 'PERSONNEL', ref: 'SAL-01-2025', libelle: 'Salaires janvier 2025', previsionnel: 7500000, reel: 7500000 },
                        { piece: 'DEC003', tiers: 'FOURNISSEUR B', ref: 'FB-2025-002', libelle: 'Fournitures bureau', previsionnel: 2400000, reel: 2180000 },
                        { piece: 'DEC004', tiers: 'TRESOR PUBLIC', ref: 'TVA-Q4-2024', libelle: 'Déclaration TVA Q4', previsionnel: 1200000, reel: 1350000 },
                        { piece: 'DEC005', tiers: 'FOURNISSEUR C', ref: 'FC-2025-001', libelle: 'Charges sociales', previsionnel: 2700000, reel: 2650000 },
                        { piece: 'DEC006', tiers: 'PROPRIETAIRE', ref: 'LOYER-01-25', libelle: 'Loyer janvier 2025', previsionnel: 2400000, reel: 2400000 },
                        { piece: 'DEC007', tiers: 'FOURNISSEUR D', ref: 'FD-2025-003', libelle: 'Maintenance équipements', previsionnel: 1800000, reel: 1600000 }
                      ].map((transaction, index) => {
                        const ecart = transaction.reel - transaction.previsionnel;
                        const ecartPositif = ecart > 0;
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm font-mono">{transaction.piece}</td>
                            <td className="px-3 py-2 text-sm text-gray-700">{transaction.tiers}</td>
                            <td className="px-3 py-2 text-sm font-mono">{transaction.ref}</td>
                            <td className="px-3 py-2 text-sm">{transaction.libelle}</td>
                            <td className="px-3 py-2 text-right text-sm text-[var(--color-primary)] font-medium">
                              {new Intl.NumberFormat('fr-FR').format(transaction.previsionnel)}
                            </td>
                            <td className="px-3 py-2 text-right text-sm text-red-600 font-medium">
                              {new Intl.NumberFormat('fr-FR').format(transaction.reel)}
                            </td>
                            <td className={`px-3 py-2 text-right text-sm font-bold ${
                              // Pour les décaissements, un écart positif (dépense plus élevée) est défavorable
                              ecartPositif ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {new Intl.NumberFormat('fr-FR', { signDisplay: 'always' }).format(ecart)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                Math.abs(ecart) < 100000 ? 'bg-green-100 text-green-800' :
                                ecartPositif ? 'bg-red-100 text-red-800' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                              }`}>
                                {Math.abs(ecart) < 100000 ? 'Conforme' : ecartPositif ? 'Dépassement' : 'Économie'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Synthèse des écarts */}
              <div className="mt-6 p-4 bg-[var(--color-primary)]/10 rounded-lg">
                <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">💰 Synthèse des Écarts</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded border">
                    <div className="text-lg font-bold text-green-600">
                      {new Intl.NumberFormat('fr-FR', {
                        signDisplay: 'always'
                      }).format(45230000 - getForecastValue(57450000))}
                    </div>
                    <div className="text-xs text-gray-600">Écart Encaissements</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded border">
                    <div className="text-lg font-bold text-red-600">
                      {new Intl.NumberFormat('fr-FR', {
                        signDisplay: 'always'
                      }).format(52180000 - getForecastValue(45590000))}
                    </div>
                    <div className="text-xs text-gray-600">Écart Décaissements</div>
                  </div>
                  <div className="text-center p-3 bg-[var(--color-primary)]/5 rounded border">
                    <div className="text-lg font-bold text-[var(--color-primary)]">
                      {new Intl.NumberFormat('fr-FR', {
                        signDisplay: 'always'
                      }).format((45230000 - getForecastValue(57450000)) - (52180000 - getForecastValue(45590000)))}
                    </div>
                    <div className="text-xs text-gray-600">Impact Net sur Trésorerie</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal Ajout Transaction */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                📋 Transaction - {transactionType === 'encaissement' ? 'Encaissement' : 'Décaissement'}
              </h3>
              <button
                onClick={() => setShowTransactionModal(false)}
                className="text-gray-700 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              toast.success(`Transaction ${transactionType} ajoutée avec succès !`);
              setShowTransactionModal(false);
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('accounting.journal')}</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                      placeholder="Ex: VTE, ACH, BQ"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">N° Piece</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                      placeholder="Ex: P001, FAC001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tiers</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                      placeholder="Nom du client/fournisseur"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ref Facture</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                      placeholder="Référence de la facture"
                    />
                  </div>
                </div>

                {/* Catégories */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSelectedSubCategory('');
                      }}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {Object.entries(transactionType === 'encaissement' ? encaissementCategories : decaissementCategories).map(([key, category]) => (
                        <option key={key} value={key}>{category.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sous-catégorie</label>
                    <select
                      value={selectedSubCategory}
                      onChange={(e) => setSelectedSubCategory(e.target.value)}
                      required
                      disabled={!selectedCategory}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] disabled:bg-gray-100"
                    >
                      <option value="">Sélectionner une sous-catégorie</option>
                      {selectedCategory && Object.entries(
                        (transactionType === 'encaissement' ? encaissementCategories : decaissementCategories)[selectedCategory]?.subCategories || {}
                      ).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('accounting.label')}</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                    placeholder="Description de la transaction"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                    placeholder="Montant en CFA"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    transactionType === 'encaissement'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Ajouter {transactionType === 'encaissement' ? 'Encaissement' : 'Décaissement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détail des Factures */}
      {showDetailModal && detailModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                📋 {detailModalData.title}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-700 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Résumé */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">{detailModalData.invoices.length}</div>
                  <div className="text-sm text-gray-600">
                    {detailModalData.type === 'client' ? 'Factures clients' : 'Factures fournisseurs'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {new Intl.NumberFormat('fr-FR').format(
                      detailModalData.invoices.reduce((sum, inv) => sum + inv.montant, 0)
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Total CFA</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-[var(--color-primary)]">
                    {detailModalData.invoices.filter(inv => inv.statut === 'Validée' || inv.statut === 'En cours').length}
                  </div>
                  <div className="text-sm text-gray-600">En cours/Validées</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">
                    {detailModalData.invoices.filter(inv => inv.statut === 'En attente' || inv.statut === 'À payer').length}
                  </div>
                  <div className="text-sm text-gray-600">En attente/À payer</div>
                </div>
              </div>
            </div>

            {/* Tableau des factures */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className={`${detailModalData.type === 'client' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">N° Facture</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      {detailModalData.type === 'client' ? 'Client' : 'Fournisseur'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date émission</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Échéance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Montant</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Statut</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {detailModalData.invoices.map((invoice, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono font-medium">
                        {invoice.numero}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {invoice.client || invoice.fournisseur}
                      </td>
                      <td className="px-4 py-3 text-sm">{invoice.date}</td>
                      <td className="px-4 py-3 text-sm">{invoice.echeance}</td>
                      <td className={`px-4 py-3 text-right text-sm font-medium ${
                        detailModalData.type === 'client' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {new Intl.NumberFormat('fr-FR').format(invoice.montant)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          invoice.statut === 'Validée' ? 'bg-green-100 text-green-800' :
                          invoice.statut === 'En cours' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' :
                          invoice.statut === 'À payer' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            // Redirection vers le grand livre avec filtre par numéro de facture
                            navigate(`/accounting/general-ledger?search=${invoice.numero}`);
                          }}
                          className="text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)]/70 text-sm transition-colors hover:underline"
                        >
                          📄 Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions du modal */}
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-600">
                Total affiché : {detailModalData.invoices.length} facture(s)
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
                <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/80 transition-colors">
                  📊 Exporter Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreasuryPlanDetails;