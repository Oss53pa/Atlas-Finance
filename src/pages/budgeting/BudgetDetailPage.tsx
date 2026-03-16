// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '@/utils/formatters';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Filter, ChevronLeft, ChevronRight, ChevronDown, Printer, FileText, Eye, Plus, X, Trash2 } from 'lucide-react';

const BudgetDetailPage: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const compte = searchParams.get('compte') || '706100';
  const description = searchParams.get('description') || "Chiffre d'affaires";
  const type = searchParams.get('type') || 'revenue';
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [activeTab, setActiveTab] = useState('informations');

  // Load budget detail from adapter
  const [detailData, setDetailData] = useState<any[]>([]);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const [budgetLines, accounts] = await Promise.all([
          adapter.getAll<any>('budgetLines'),
          adapter.getAll<any>('accounts'),
        ]);

        // Filter by selected year / parent account
        const filtered = budgetLines.filter((bl: any) =>
          bl.fiscalYear === selectedYear || !selectedYear
        );

        // Group by accountCode and pivot periods into months
        const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const grouped: Record<string, any> = {};

        for (const bl of filtered) {
          const code = bl.accountCode || 'UNKNOWN';
          if (!grouped[code]) {
            const acc = accounts.find((a: any) => a.code === code);
            grouped[code] = {
              compte: code,
              description: acc?.name || code,
              jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
              jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
              total: 0,
              subItems: [],
            };
          }

          // Map period to month column
          const period = String(bl.period || '').toLowerCase();
          const monthIdx = monthKeys.indexOf(period);
          if (monthIdx >= 0) {
            grouped[code][monthKeys[monthIdx]] += bl.budgeted || 0;
          } else if (period === 'annual' || period === '') {
            // Distribute evenly or put in total
            grouped[code].total += bl.budgeted || 0;
          }
        }

        // Compute totals
        const result = Object.values(grouped).map((row: any) => {
          const monthTotal = monthKeys.reduce((s, m) => s + (row[m] || 0), 0);
          return { ...row, total: monthTotal > 0 ? monthTotal : row.total };
        });

        setDetailData(result);
      } catch (err) {
        console.error('Erreur chargement détail budget:', err);
      }
    };
    loadDetail();
  }, [adapter, selectedYear]);

  const formatAmount = (amount: number) => {
    return formatCurrency(amount);
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Calculer les totaux par mois
  const monthlyTotals = months.map(month => {
    const monthKey = month.toLowerCase() as keyof typeof detailData[0];
    return detailData.reduce((sum, row) => {
      const value = row[monthKey];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  });

  const grandTotal = detailData.reduce((sum, row) => sum + row.total, 0);

  const toggleAccount = (accountCode: string) => {
    if (expandedAccounts.includes(accountCode)) {
      setExpandedAccounts(expandedAccounts.filter(c => c !== accountCode));
    } else {
      setExpandedAccounts([...expandedAccounts, accountCode]);
    }
  };

  // Liste des comptes pour la sélection
  const availableAccounts = [
    { code: '706100', name: "Chiffre d'affaires" },
    { code: '707100', name: "Ventes de marchandises" },
    { code: '708100', name: "Produits des activités annexes" },
    { code: '601100', name: "Achats de marchandises" },
    { code: '602100', name: "Achats de matières premières" },
    { code: '661100', name: "Charges de personnel" },
    { code: '612100', name: "Transport" },
    { code: '613100', name: "Location" },
    { code: '614100', name: "Maintenance" },
    { code: '615100', name: "Assurance" },
  ];

  return (
    <div className="p-6 bg-[#e5e5e5] min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#404040]" />
              <span className="text-sm text-[#404040]">Retour</span>
            </button>

            <div>
              <h1 className="text-lg font-bold text-[#171717]">Budget Détail</h1>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-sm text-[#737373]">
                  Compte : {compte} {description}
                </span>
                <span className="text-sm text-[#737373]">•</span>
                <span className="text-sm font-medium text-[#525252]">
                  {type === 'revenue' ? 'Revenus' : 'Dépenses'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Sélecteur d'année */}
            <div className="flex items-center bg-white border border-[#e5e5e5] rounded-lg">
              <button
                onClick={() => setSelectedYear((prev) => (parseInt(prev) - 1).toString())}
                className="p-2 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 font-medium text-[#171717]">{selectedYear}</span>
              <button
                onClick={() => setSelectedYear((prev) => (parseInt(prev) + 1).toString())}
                className="p-2 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#e5e5e5] rounded-lg hover:bg-gray-50" aria-label="Imprimer">
              <Printer className="w-4 h-4" />
              <span className="text-sm">{t('common.print')}</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#e5e5e5] rounded-lg hover:bg-gray-50">
              <FileText className="w-4 h-4" />
              <span className="text-sm">PDF</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-[#525252] text-white rounded-lg hover:bg-[#404040]">
              <Download className="w-4 h-4" />
              <span className="text-sm">Exporter Excel</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Ajouter ligne</span>
            </button>

            <button
              onClick={() => navigate('/budgeting')}
              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              title={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Informations du compte */}
      <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#171717]">
              Compte : {compte} - {description}
            </h2>
            <p className="text-sm text-[#737373] mt-1">
              {type === 'revenue' ? 'Revenus' : 'Dépenses'} détaillés par sous-compte
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#737373]">Total annuel</p>
            <p className="text-lg font-bold text-[#525252]">
              {formatAmount(grandTotal)} FCFA
            </p>
          </div>
        </div>
      </div>

      {/* Tableau des détails */}
      <div className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-[#e5e5e5]">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-[#404040] sticky left-0 bg-gray-100 min-w-[50px]">
                </th>
                <th className="text-left p-3 text-sm font-medium text-[#404040] min-w-[100px]">
                  Compte
                </th>
                <th className="text-left p-3 text-sm font-medium text-[#404040] min-w-[250px]">
                  Description
                </th>
                {months.map((month) => (
                  <th key={month} className="text-right p-3 text-sm font-medium text-[#404040] min-w-[100px]">
                    {month}
                  </th>
                ))}
                <th className="text-right p-3 text-sm font-medium text-[#404040] bg-gray-200 min-w-[120px]">
                  Total
                </th>
                <th className="p-3 text-sm font-medium text-[#404040] bg-gray-200 min-w-[50px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {detailData.map((row, index) => (
                <React.Fragment key={index}>
                  <tr className={`hover:bg-gray-50 ${row.subItems.length > 0 ? 'font-medium' : ''}`}>
                    <td className="p-3 sticky left-0 bg-white">
                      <button
                        onClick={() => toggleAccount(row.compte)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            expandedAccounts.includes(row.compte) ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </td>
                    <td className="p-3 text-sm text-[#171717]">
                      {row.compte}
                    </td>
                    <td className="p-3 text-sm text-[#404040]">
                      {row.description}
                    </td>
                    <td className="p-3 text-sm text-right text-[#737373]">
                      {formatAmount(row.jan)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#737373]">
                      {formatAmount(row.feb)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#737373]">
                      {formatAmount(row.mar)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#737373]">
                      {formatAmount(row.apr)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#737373]">
                      {formatAmount(row.may)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#737373]">
                      {formatAmount(row.jun)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#737373]">
                      {formatAmount(row.jul)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#737373]">
                      {formatAmount(row.aug)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#737373]">
                      {formatAmount(row.sep)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#737373]">
                      {formatAmount(row.oct)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#737373]">
                      {formatAmount(row.nov)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#737373]">
                      {formatAmount(row.dec)}
                    </td>
                    <td className="p-3 text-sm text-right font-bold text-[#171717] bg-gray-50">
                      {formatAmount(row.total)}
                    </td>
                    <td className="p-3 text-center bg-gray-50">
                      <div className="flex justify-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingItem(row);
                            setEditValues({
                              description: row.description,
                              compte: row.compte,
                              jan: row.jan,
                              feb: row.feb,
                              mar: row.mar,
                              apr: row.apr,
                              may: row.may,
                              jun: row.jun,
                              jul: row.jul,
                              aug: row.aug,
                              sep: row.sep,
                              oct: row.oct,
                              nov: row.nov,
                              dec: row.dec,
                            });
                            setShowEditModal(true);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4 text-[#525252]" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer cette ligne ?')) {
                            }
                          }}
                          className="p-1 hover:bg-red-100 rounded"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Sous-éléments */}
                  {expandedAccounts.includes(row.compte) && (
                    <>
                      {row.subItems.length > 0 ? (
                        row.subItems.map((subItem, subIndex) => (
                          <tr key={`${index}-${subIndex}`} className="bg-gray-50 hover:bg-gray-100">
                            <td className="p-3 sticky left-0 bg-gray-50">
                            </td>
                            <td className="p-3 text-sm text-[#737373]">
                            </td>
                            <td className="p-3 pl-8 text-sm text-[#737373] italic">
                              {subItem.description}
                            </td>
                            <td className="p-3 text-sm text-right text-[#737373]">
                              {formatAmount(subItem.jan)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#737373]">
                              {formatAmount(subItem.feb)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#737373]">
                              {formatAmount(subItem.mar)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#737373]">
                              {formatAmount(subItem.apr)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#737373]">
                              {formatAmount(subItem.may)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#737373]">
                              {formatAmount(subItem.jun)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#737373]">
                              {formatAmount(subItem.jul)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#737373]">
                              {formatAmount(subItem.aug)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#737373]">
                              {formatAmount(subItem.sep)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#737373]">
                              {formatAmount(subItem.oct)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#737373]">
                              {formatAmount(subItem.nov)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#737373]">
                              {formatAmount(subItem.dec)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#737373] bg-gray-100">
                              {formatAmount(subItem.total)}
                            </td>
                            <td className="p-3 text-center bg-gray-100">
                              <div className="flex justify-center space-x-1">
                                <button
                                  onClick={() => {
                                    setEditingItem(subItem);
                                    setEditValues({
                                      description: subItem.description,
                                      jan: subItem.jan,
                                      feb: subItem.feb,
                                      mar: subItem.mar,
                                      apr: subItem.apr,
                                      may: subItem.may,
                                      jun: subItem.jun,
                                      jul: subItem.jul,
                                      aug: subItem.aug,
                                      sep: subItem.sep,
                                      oct: subItem.oct,
                                      nov: subItem.nov,
                                      dec: subItem.dec,
                                    });
                                    setShowEditModal(true);
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title="Voir les détails"
                                >
                                  <Eye className="w-3 h-3 text-[#737373]" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Êtes-vous sûr de vouloir supprimer cette sous-ligne ?')) {
                                    }
                                  }}
                                  className="p-1 hover:bg-red-100 rounded"
                                  title={t('common.delete')}
                                >
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="bg-gray-50">
                          <td colSpan={18} className="p-3 text-center text-sm text-[#737373] italic">
                            Aucun détail disponible pour ce compte
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </React.Fragment>
              ))}

              {/* Ligne de total */}
              <tr className="bg-[#525252] text-white font-bold">
                <td className="p-3 sticky left-0 bg-[#525252]">
                </td>
                <td className="p-3 text-sm bg-[#525252]" colSpan={2}>
                  TOTAL
                </td>
                {monthlyTotals.map((total, idx) => (
                  <td key={idx} className="p-3 text-sm text-right">
                    {formatAmount(total)}
                  </td>
                ))}
                <td className="p-3 text-sm text-right bg-[#404040]">
                  {formatAmount(grandTotal)}
                </td>
                <td className="p-3 bg-[#404040]">
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Graphique ou statistiques supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
          <p className="text-xs text-[#737373] mb-2">Trimestre le plus fort</p>
          <p className="text-lg font-bold text-green-600">
            Q3 - {formatAmount(monthlyTotals[6] + monthlyTotals[7] + monthlyTotals[8])}
          </p>
          <p className="text-xs text-[#737373] mt-1">Juillet - Septembre</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
          <p className="text-xs text-[#737373] mb-2">Variation max</p>
          <p className="text-lg font-bold text-[#525252]">
            +{Math.round(((Math.max(...monthlyTotals) - Math.min(...monthlyTotals)) / Math.min(...monthlyTotals)) * 100)}%
          </p>
          <p className="text-xs text-[#737373] mt-1">Entre min et max mensuel</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
          <p className="text-xs text-[#737373] mb-2">Nombre de sous-comptes</p>
          <p className="text-lg font-bold text-[#171717]">
            {detailData.length}
          </p>
          <p className="text-xs text-[#737373] mt-1">Comptes actifs</p>
        </div>
      </div>

      {/* Modal d'ajout de ligne budgétaire */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#171717]">Ajouter une ligne budgétaire</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-700 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#404040] mb-2">
                  Sélectionner un compte
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#525252]"
                >
                  <option value="">Sélectionner un compte</option>
                  {availableAccounts.map(account => (
                    <option key={account.code} value={account.code}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#404040] mb-2">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Description de la ligne budgétaire"
                  className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#525252]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#404040] mb-2">
                  Montant mensuel
                </label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#525252]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-[#e5e5e5] rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedAccount('');
                }}
                className="px-4 py-2 bg-[#525252] text-white rounded-lg hover:bg-[#404040]"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition de budget */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[900px] max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-[#e5e5e5]">
              <h3 className="text-lg font-bold text-[#171717]">Add Budget</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                  setEditValues({});
                  setActiveTab('informations');
                }}
                className="text-gray-700 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Onglets */}
            <div className="flex border-b border-[#e5e5e5]">
              <button
                onClick={() => setActiveTab('informations')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'informations'
                    ? 'text-[#525252] border-b-2 border-[#525252]'
                    : 'text-[#737373] hover:text-[#404040]'
                }`}
              >
                Informations
              </button>
              <button
                onClick={() => setActiveTab('justification')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'justification'
                    ? 'text-[#525252] border-b-2 border-[#525252]'
                    : 'text-[#737373] hover:text-[#404040]'
                }`}
              >
                Note justificative
              </button>
              <button
                onClick={() => setActiveTab('attachement')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'attachement'
                    ? 'text-[#525252] border-b-2 border-[#525252]'
                    : 'text-[#737373] hover:text-[#404040]'
                }`}
              >
                Attachement
              </button>
              <button
                onClick={() => setActiveTab('valeurs')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'valeurs'
                    ? 'text-[#525252] border-b-2 border-[#525252]'
                    : 'text-[#737373] hover:text-[#404040]'
                }`}
              >
                Valeurs mensuelles
              </button>
            </div>

            {/* Contenu des onglets */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {/* Onglet Informations */}
              {activeTab === 'informations' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#404040] mb-2">{t('accounting.account')}</label>
                      <input
                        type="text"
                        value={editValues.compte || ''}
                        readOnly
                        className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#404040] mb-2">Année</label>
                      <input
                        type="text"
                        value={selectedYear}
                        readOnly
                        className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Description</label>
                    <input
                      type="text"
                      value={editValues.description || ''}
                      onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                      className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#525252]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Département</label>
                    <select className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#525252]">
                      <option>General Admin</option>
                      <option>Marketing</option>
                      <option>Commercial</option>
                      <option>Production</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Responsable</label>
                    <input
                      type="text"
                      placeholder="Nom du responsable"
                      className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#525252]"
                    />
                  </div>
                </div>
              )}

              {/* Onglet Note justificative */}
              {activeTab === 'justification' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Note justificative</label>
                    <textarea
                      rows={8}
                      placeholder="Ajouter une note justificative..."
                      className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#525252]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Objectifs</label>
                    <textarea
                      rows={4}
                      placeholder="Décrire les objectifs..."
                      className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#525252]"
                    />
                  </div>
                </div>
              )}

              {/* Onglet Attachement */}
              {activeTab === 'attachement' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Documents joints</label>
                    <div className="border-2 border-dashed border-[#e5e5e5] rounded-lg p-8 text-center">
                      <div className="mb-4">
                        <svg className="mx-auto h-12 w-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <button className="text-[#525252] hover:text-[#404040] font-medium">
                        Cliquer pour ajouter un fichier
                      </button>
                      <p className="text-xs text-gray-700 mt-2">
                        PDF, Excel, Word, Images (max. 10MB)
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-[#404040]">Fichiers attachés</h4>
                    <div className="text-sm text-gray-700 italic">Aucun fichier attaché</div>
                  </div>
                </div>
              )}

              {/* Onglet Valeurs mensuelles */}
              {activeTab === 'valeurs' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-[#737373] mb-1">Janvier</label>
                      <input
                      type="number"
                      value={editValues.jan || 0}
                      onChange={(e) => setEditValues({...editValues, jan: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#e5e5e5] rounded focus:outline-none focus:ring-1 focus:ring-[#525252]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Février</label>
                    <input
                      type="number"
                      value={editValues.feb || 0}
                      onChange={(e) => setEditValues({...editValues, feb: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#e5e5e5] rounded focus:outline-none focus:ring-1 focus:ring-[#525252]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Mars</label>
                    <input
                      type="number"
                      value={editValues.mar || 0}
                      onChange={(e) => setEditValues({...editValues, mar: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#e5e5e5] rounded focus:outline-none focus:ring-1 focus:ring-[#525252]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Avril</label>
                    <input
                      type="number"
                      value={editValues.apr || 0}
                      onChange={(e) => setEditValues({...editValues, apr: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#e5e5e5] rounded focus:outline-none focus:ring-1 focus:ring-[#525252]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Mai</label>
                    <input
                      type="number"
                      value={editValues.may || 0}
                      onChange={(e) => setEditValues({...editValues, may: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#e5e5e5] rounded focus:outline-none focus:ring-1 focus:ring-[#525252]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Juin</label>
                    <input
                      type="number"
                      value={editValues.jun || 0}
                      onChange={(e) => setEditValues({...editValues, jun: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#e5e5e5] rounded focus:outline-none focus:ring-1 focus:ring-[#525252]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Juillet</label>
                    <input
                      type="number"
                      value={editValues.jul || 0}
                      onChange={(e) => setEditValues({...editValues, jul: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#e5e5e5] rounded focus:outline-none focus:ring-1 focus:ring-[#525252]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Août</label>
                    <input
                      type="number"
                      value={editValues.aug || 0}
                      onChange={(e) => setEditValues({...editValues, aug: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#e5e5e5] rounded focus:outline-none focus:ring-1 focus:ring-[#525252]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Septembre</label>
                    <input
                      type="number"
                      value={editValues.sep || 0}
                      onChange={(e) => setEditValues({...editValues, sep: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#e5e5e5] rounded focus:outline-none focus:ring-1 focus:ring-[#525252]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Octobre</label>
                    <input
                      type="number"
                      value={editValues.oct || 0}
                      onChange={(e) => setEditValues({...editValues, oct: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#e5e5e5] rounded focus:outline-none focus:ring-1 focus:ring-[#525252]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Novembre</label>
                    <input
                      type="number"
                      value={editValues.nov || 0}
                      onChange={(e) => setEditValues({...editValues, nov: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#e5e5e5] rounded focus:outline-none focus:ring-1 focus:ring-[#525252]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Décembre</label>
                    <input
                      type="number"
                      value={editValues.dec || 0}
                      onChange={(e) => setEditValues({...editValues, dec: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#e5e5e5] rounded focus:outline-none focus:ring-1 focus:ring-[#525252]"
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-[#404040]">Total annuel</span>
                    <span className="text-lg font-bold text-[#525252]">
                      {formatAmount(
                        (editValues.jan || 0) + (editValues.feb || 0) + (editValues.mar || 0) +
                        (editValues.apr || 0) + (editValues.may || 0) + (editValues.jun || 0) +
                        (editValues.jul || 0) + (editValues.aug || 0) + (editValues.sep || 0) +
                        (editValues.oct || 0) + (editValues.nov || 0) + (editValues.dec || 0)
                      )} FCFA
                    </span>
                  </div>
                </div>
                </div>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end space-x-3 p-6 border-t border-[#e5e5e5]">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                  setEditValues({});
                  setActiveTab('informations');
                }}
                className="px-4 py-2 border border-[#e5e5e5] rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                  setEditValues({});
                  setActiveTab('informations');
                }}
                className="px-4 py-2 bg-[#525252] text-white rounded-lg hover:bg-[#404040]"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetDetailPage;