import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Filter, ChevronLeft, ChevronRight, ChevronDown, Printer, FileText, Eye, Plus, X, Trash2 } from 'lucide-react';

const BudgetDetailPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const compte = searchParams.get('compte') || '706100';
  const description = searchParams.get('description') || "Chiffre d'affaires";
  const type = searchParams.get('type') || 'revenue';
  const [selectedYear, setSelectedYear] = useState('2024');
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [activeTab, setActiveTab] = useState('informations');

  // Données détaillées pour le compte 706100
  const detailData = [
    {
      compte: '706112',
      description: 'Charges locatives',
      jan: 36907710,
      feb: 37088465,
      mar: 38073011,
      apr: 38328675,
      may: 38329590,
      jun: 38359054,
      jul: 38379574,
      aug: 42198949,
      sep: 42198949,
      oct: 41608738,
      nov: 41655761,
      dec: 41655762,
      total: 474784235,
      subItems: []
    },
    {
      compte: '706113',
      description: "Droit d'entrée",
      jan: 0,
      feb: 0,
      mar: 0,
      apr: 0,
      may: 0,
      jun: 0,
      jul: 104427924,
      aug: 0,
      sep: 0,
      oct: 0,
      nov: 0,
      dec: 0,
      total: 104427924,
      subItems: [
        {
          compte: '',
          description: 'U12',
          jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
          jul: 30000000, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
          total: 30000000
        },
        {
          compte: '',
          description: 'My place Annexe',
          jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
          jul: 14400000, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
          total: 14400000
        },
        {
          compte: '',
          description: 'Bacio Nero',
          jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
          jul: 10227924, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
          total: 10227924
        },
        {
          compte: '',
          description: 'Emy Annexe',
          jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
          jul: 25800000, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
          total: 25800000
        },
        {
          compte: '',
          description: 'Paradise Game Annexe',
          jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
          jul: 24000000, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
          total: 24000000
        }
      ]
    },
    {
      compte: '706171',
      description: 'Location éphémère',
      jan: 17256504,
      feb: 15565414,
      mar: 16315414,
      apr: 31058202,
      may: 21256504,
      jun: 25276504,
      jul: 27836504,
      aug: 31676504,
      sep: 31986504,
      oct: 23316504,
      nov: 23276504,
      dec: 39126504,
      total: 303947566,
      subItems: []
    },
    {
      compte: '706172',
      description: 'Location market',
      jan: 1855000,
      feb: 3527000,
      mar: 4255000,
      apr: 4355000,
      may: 4966000,
      jun: 6904000,
      jul: 6904000,
      aug: 6904000,
      sep: 6904000,
      oct: 6904000,
      nov: 6904000,
      dec: 6904000,
      total: 67286000,
      subItems: []
    },
    {
      compte: '706160',
      description: 'Produits issus de partages de revenues',
      jan: 4344048,
      feb: 550986,
      mar: 4220698,
      apr: 9960515,
      may: 4716318,
      jun: 3548466,
      jul: 8183048,
      aug: 7904913,
      sep: 6664203,
      oct: 6916134,
      nov: 7232941,
      dec: 13995062,
      total: 78237332,
      subItems: []
    },
    {
      compte: '706170',
      description: 'Autres locations',
      jan: 1296333,
      feb: 3019333,
      mar: 1008333,
      apr: 858333,
      may: 858333,
      jun: 1693333,
      jul: 858333,
      aug: 1693333,
      sep: 858333,
      oct: 1693333,
      nov: 858333,
      dec: 1693333,
      total: 16389000,
      subItems: []
    },
    {
      compte: '706173',
      description: 'Frais accessoires',
      jan: 511900,
      feb: 620650,
      mar: 669400,
      apr: 665650,
      may: 676900,
      jun: 836900,
      jul: 811900,
      aug: 949400,
      sep: 968150,
      oct: 811900,
      nov: 811900,
      dec: 1068150,
      total: 9402800,
      subItems: []
    },
    {
      compte: '706111',
      description: 'Loyer',
      jan: 144464561,
      feb: 143643029,
      mar: 147949038,
      apr: 146212173,
      may: 146241064,
      jun: 146483417,
      jul: 151567823,
      aug: 155872823,
      sep: 155874677,
      oct: 156359954,
      nov: 157039028,
      dec: 163140163,
      total: 1814847750,
      subItems: []
    }
  ];

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR');
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
    <div className="p-6 bg-[#ECECEC] min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm text-[#444444]">Retour</span>
            </button>

            <div>
              <h1 className="text-lg font-bold text-[#191919]">Budget Détail</h1>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-sm text-[#767676]">
                  Compte : {compte} {description}
                </span>
                <span className="text-sm text-[#767676]">•</span>
                <span className="text-sm font-medium text-[#B87333]">
                  {type === 'revenue' ? 'Revenus' : 'Dépenses'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Sélecteur d'année */}
            <div className="flex items-center bg-white border border-[#E8E8E8] rounded-lg">
              <button
                onClick={() => setSelectedYear((prev) => (parseInt(prev) - 1).toString())}
                className="p-2 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 font-medium text-[#191919]">{selectedYear}</span>
              <button
                onClick={() => setSelectedYear((prev) => (parseInt(prev) + 1).toString())}
                className="p-2 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#E8E8E8] rounded-lg hover:bg-gray-50" aria-label="Imprimer">
              <Printer className="w-4 h-4" />
              <span className="text-sm">{t('common.print')}</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#E8E8E8] rounded-lg hover:bg-gray-50">
              <FileText className="w-4 h-4" />
              <span className="text-sm">PDF</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323]">
              <Download className="w-4 h-4" />
              <span className="text-sm">Exporter Excel</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#191919]">
              Compte : {compte} - {description}
            </h2>
            <p className="text-sm text-[#767676] mt-1">
              {type === 'revenue' ? 'Revenus' : 'Dépenses'} détaillés par sous-compte
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#767676]">Total annuel</p>
            <p className="text-lg font-bold text-[#B87333]">
              {formatAmount(grandTotal)} FCFA
            </p>
          </div>
        </div>
      </div>

      {/* Tableau des détails */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-[#E8E8E8]">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-[#444444] sticky left-0 bg-gray-100 min-w-[50px]">
                </th>
                <th className="text-left p-3 text-sm font-medium text-[#444444] min-w-[100px]">
                  Compte
                </th>
                <th className="text-left p-3 text-sm font-medium text-[#444444] min-w-[250px]">
                  Description
                </th>
                {months.map((month) => (
                  <th key={month} className="text-right p-3 text-sm font-medium text-[#444444] min-w-[100px]">
                    {month}
                  </th>
                ))}
                <th className="text-right p-3 text-sm font-medium text-[#444444] bg-gray-200 min-w-[120px]">
                  Total
                </th>
                <th className="p-3 text-sm font-medium text-[#444444] bg-gray-200 min-w-[50px]">
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
                    <td className="p-3 text-sm text-[#191919]">
                      {row.compte}
                    </td>
                    <td className="p-3 text-sm text-[#444444]">
                      {row.description}
                    </td>
                    <td className="p-3 text-sm text-right text-[#767676]">
                      {formatAmount(row.jan)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#767676]">
                      {formatAmount(row.feb)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#767676]">
                      {formatAmount(row.mar)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#767676]">
                      {formatAmount(row.apr)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#767676]">
                      {formatAmount(row.may)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#767676]">
                      {formatAmount(row.jun)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#767676]">
                      {formatAmount(row.jul)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#767676]">
                      {formatAmount(row.aug)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#767676]">
                      {formatAmount(row.sep)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#767676]">
                      {formatAmount(row.oct)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#767676]">
                      {formatAmount(row.nov)}
                    </td>
                    <td className="p-3 text-sm text-right text-[#767676]">
                      {formatAmount(row.dec)}
                    </td>
                    <td className="p-3 text-sm text-right font-bold text-[#191919] bg-gray-50">
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
                          <Eye className="w-4 h-4 text-[#B87333]" />
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
                            <td className="p-3 text-sm text-[#767676]">
                            </td>
                            <td className="p-3 pl-8 text-sm text-[#767676] italic">
                              {subItem.description}
                            </td>
                            <td className="p-3 text-sm text-right text-[#767676]">
                              {formatAmount(subItem.jan)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#767676]">
                              {formatAmount(subItem.feb)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#767676]">
                              {formatAmount(subItem.mar)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#767676]">
                              {formatAmount(subItem.apr)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#767676]">
                              {formatAmount(subItem.may)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#767676]">
                              {formatAmount(subItem.jun)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#767676]">
                              {formatAmount(subItem.jul)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#767676]">
                              {formatAmount(subItem.aug)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#767676]">
                              {formatAmount(subItem.sep)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#767676]">
                              {formatAmount(subItem.oct)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#767676]">
                              {formatAmount(subItem.nov)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#767676]">
                              {formatAmount(subItem.dec)}
                            </td>
                            <td className="p-3 text-sm text-right text-[#767676] bg-gray-100">
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
                                  <Eye className="w-3 h-3 text-[#767676]" />
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
                          <td colSpan={18} className="p-3 text-center text-sm text-[#767676] italic">
                            Aucun détail disponible pour ce compte
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </React.Fragment>
              ))}

              {/* Ligne de total */}
              <tr className="bg-[#B87333] text-white font-bold">
                <td className="p-3 sticky left-0 bg-[#B87333]">
                </td>
                <td className="p-3 text-sm bg-[#B87333]" colSpan={2}>
                  TOTAL
                </td>
                {monthlyTotals.map((total, idx) => (
                  <td key={idx} className="p-3 text-sm text-right">
                    {formatAmount(total)}
                  </td>
                ))}
                <td className="p-3 text-sm text-right bg-[#A86323]">
                  {formatAmount(grandTotal)}
                </td>
                <td className="p-3 bg-[#A86323]">
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Graphique ou statistiques supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
          <p className="text-xs text-[#767676] mb-2">Trimestre le plus fort</p>
          <p className="text-lg font-bold text-green-600">
            Q3 - {formatAmount(monthlyTotals[6] + monthlyTotals[7] + monthlyTotals[8])}
          </p>
          <p className="text-xs text-[#767676] mt-1">Juillet - Septembre</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
          <p className="text-xs text-[#767676] mb-2">Variation max</p>
          <p className="text-lg font-bold text-[#B87333]">
            +{Math.round(((Math.max(...monthlyTotals) - Math.min(...monthlyTotals)) / Math.min(...monthlyTotals)) * 100)}%
          </p>
          <p className="text-xs text-[#767676] mt-1">Entre min et max mensuel</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
          <p className="text-xs text-[#767676] mb-2">Nombre de sous-comptes</p>
          <p className="text-lg font-bold text-[#191919]">
            {detailData.length}
          </p>
          <p className="text-xs text-[#767676] mt-1">Comptes actifs</p>
        </div>
      </div>

      {/* Modal d'ajout de ligne budgétaire */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#191919]">Ajouter une ligne budgétaire</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-700 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#444444] mb-2">
                  Sélectionner un compte
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]"
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
                <label className="block text-sm font-medium text-[#444444] mb-2">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Description de la ligne budgétaire"
                  className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#444444] mb-2">
                  Montant mensuel
                </label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-[#E8E8E8] rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedAccount('');
                }}
                className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323]"
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
            <div className="flex justify-between items-center p-6 border-b border-[#E8E8E8]">
              <h3 className="text-lg font-bold text-[#191919]">Add Budget</h3>
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
            <div className="flex border-b border-[#E8E8E8]">
              <button
                onClick={() => setActiveTab('informations')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'informations'
                    ? 'text-[#B87333] border-b-2 border-[#B87333]'
                    : 'text-[#767676] hover:text-[#444444]'
                }`}
              >
                Informations
              </button>
              <button
                onClick={() => setActiveTab('justification')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'justification'
                    ? 'text-[#B87333] border-b-2 border-[#B87333]'
                    : 'text-[#767676] hover:text-[#444444]'
                }`}
              >
                Note justificative
              </button>
              <button
                onClick={() => setActiveTab('attachement')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'attachement'
                    ? 'text-[#B87333] border-b-2 border-[#B87333]'
                    : 'text-[#767676] hover:text-[#444444]'
                }`}
              >
                Attachement
              </button>
              <button
                onClick={() => setActiveTab('valeurs')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'valeurs'
                    ? 'text-[#B87333] border-b-2 border-[#B87333]'
                    : 'text-[#767676] hover:text-[#444444]'
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
                      <label className="block text-sm font-medium text-[#444444] mb-2">{t('accounting.account')}</label>
                      <input
                        type="text"
                        value={editValues.compte || ''}
                        readOnly
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Année</label>
                      <input
                        type="text"
                        value={selectedYear}
                        readOnly
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Description</label>
                    <input
                      type="text"
                      value={editValues.description || ''}
                      onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Département</label>
                    <select className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]">
                      <option>General Admin</option>
                      <option>Marketing</option>
                      <option>Commercial</option>
                      <option>Production</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Responsable</label>
                    <input
                      type="text"
                      placeholder="Nom du responsable"
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                    />
                  </div>
                </div>
              )}

              {/* Onglet Note justificative */}
              {activeTab === 'justification' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Note justificative</label>
                    <textarea
                      rows={8}
                      placeholder="Ajouter une note justificative..."
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Objectifs</label>
                    <textarea
                      rows={4}
                      placeholder="Décrire les objectifs..."
                      className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                    />
                  </div>
                </div>
              )}

              {/* Onglet Attachement */}
              {activeTab === 'attachement' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Documents joints</label>
                    <div className="border-2 border-dashed border-[#E8E8E8] rounded-lg p-8 text-center">
                      <div className="mb-4">
                        <svg className="mx-auto h-12 w-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <button className="text-[#B87333] hover:text-[#A86323] font-medium">
                        Cliquer pour ajouter un fichier
                      </button>
                      <p className="text-xs text-gray-700 mt-2">
                        PDF, Excel, Word, Images (max. 10MB)
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-[#444444]">Fichiers attachés</h4>
                    <div className="text-sm text-gray-700 italic">Aucun fichier attaché</div>
                  </div>
                </div>
              )}

              {/* Onglet Valeurs mensuelles */}
              {activeTab === 'valeurs' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-[#767676] mb-1">Janvier</label>
                      <input
                      type="number"
                      value={editValues.jan || 0}
                      onChange={(e) => setEditValues({...editValues, jan: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#E8E8E8] rounded focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#767676] mb-1">Février</label>
                    <input
                      type="number"
                      value={editValues.feb || 0}
                      onChange={(e) => setEditValues({...editValues, feb: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#E8E8E8] rounded focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#767676] mb-1">Mars</label>
                    <input
                      type="number"
                      value={editValues.mar || 0}
                      onChange={(e) => setEditValues({...editValues, mar: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#E8E8E8] rounded focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#767676] mb-1">Avril</label>
                    <input
                      type="number"
                      value={editValues.apr || 0}
                      onChange={(e) => setEditValues({...editValues, apr: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#E8E8E8] rounded focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#767676] mb-1">Mai</label>
                    <input
                      type="number"
                      value={editValues.may || 0}
                      onChange={(e) => setEditValues({...editValues, may: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#E8E8E8] rounded focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#767676] mb-1">Juin</label>
                    <input
                      type="number"
                      value={editValues.jun || 0}
                      onChange={(e) => setEditValues({...editValues, jun: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#E8E8E8] rounded focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#767676] mb-1">Juillet</label>
                    <input
                      type="number"
                      value={editValues.jul || 0}
                      onChange={(e) => setEditValues({...editValues, jul: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#E8E8E8] rounded focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#767676] mb-1">Août</label>
                    <input
                      type="number"
                      value={editValues.aug || 0}
                      onChange={(e) => setEditValues({...editValues, aug: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#E8E8E8] rounded focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#767676] mb-1">Septembre</label>
                    <input
                      type="number"
                      value={editValues.sep || 0}
                      onChange={(e) => setEditValues({...editValues, sep: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#E8E8E8] rounded focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#767676] mb-1">Octobre</label>
                    <input
                      type="number"
                      value={editValues.oct || 0}
                      onChange={(e) => setEditValues({...editValues, oct: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#E8E8E8] rounded focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#767676] mb-1">Novembre</label>
                    <input
                      type="number"
                      value={editValues.nov || 0}
                      onChange={(e) => setEditValues({...editValues, nov: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#E8E8E8] rounded focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#767676] mb-1">Décembre</label>
                    <input
                      type="number"
                      value={editValues.dec || 0}
                      onChange={(e) => setEditValues({...editValues, dec: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1 border border-[#E8E8E8] rounded focus:outline-none focus:ring-1 focus:ring-[#B87333]"
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-[#444444]">Total annuel</span>
                    <span className="text-lg font-bold text-[#B87333]">
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
            <div className="flex justify-end space-x-3 p-6 border-t border-[#E8E8E8]">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                  setEditValues({});
                  setActiveTab('informations');
                }}
                className="px-4 py-2 border border-[#E8E8E8] rounded-lg hover:bg-gray-50"
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
                className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323]"
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