import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '@/utils/formatters';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Filter, Calendar, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';

const BudgetRecapPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const department = searchParams.get('department') || '';
  const type = searchParams.get('type') || 'revenue'; // 'revenue' ou 'expense'
  const [selectedYear, setSelectedYear] = useState('2024');

  // Fonction pour calculer les totaux à partir des détails
  const calculateTotalsFromDetails = (details: Array<Record<string, number>>) => {
    const totals = {
      jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
      jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0, total: 0
    };

    details.forEach(item => {
      totals.jan += item.jan || 0;
      totals.feb += item.feb || 0;
      totals.mar += item.mar || 0;
      totals.apr += item.apr || 0;
      totals.may += item.may || 0;
      totals.jun += item.jun || 0;
      totals.jul += item.jul || 0;
      totals.aug += item.aug || 0;
      totals.sep += item.sep || 0;
      totals.oct += item.oct || 0;
      totals.nov += item.nov || 0;
      totals.dec += item.dec || 0;
      totals.total += item.total || 0;
    });

    return totals;
  };

  // Les détails du compte 706100 (depuis BudgetDetailPage)
  const details706100 = [
    { compte: '706111', description: 'Loyer', jan: 144464561, feb: 143643029, mar: 147949038, apr: 146212173, may: 146241064, jun: 146483417, jul: 151567823, aug: 155872823, sep: 155874677, oct: 156359954, nov: 157039028, dec: 163140163, total: 1814847750 },
    { compte: '706112', description: 'Charges locatives', jan: 36907710, feb: 37088465, mar: 38073011, apr: 38328675, may: 38329590, jun: 38359054, jul: 38379574, aug: 42198949, sep: 42198949, oct: 41608738, nov: 41655761, dec: 41655762, total: 474784235 },
    { compte: '706113', description: "Droit d'entrée", jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 104427924, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0, total: 104427924 },
    { compte: '706171', description: 'Location éphémère', jan: 17256504, feb: 15565414, mar: 16315414, apr: 31058202, may: 21256504, jun: 25276504, jul: 27836504, aug: 31676504, sep: 31986504, oct: 23316504, nov: 23276504, dec: 39126504, total: 303947566 },
    { compte: '706172', description: 'Location market', jan: 1855000, feb: 3527000, mar: 4255000, apr: 4355000, may: 4966000, jun: 6904000, jul: 6904000, aug: 6904000, sep: 6904000, oct: 6904000, nov: 6904000, dec: 6904000, total: 67286000 },
    { compte: '706160', description: 'Produits issus de partages de revenues', jan: 4344048, feb: 550986, mar: 4220698, apr: 9960515, may: 4716318, jun: 3548466, jul: 8183048, aug: 7904913, sep: 6664203, oct: 6916134, nov: 7232941, dec: 13995062, total: 78237332 },
    { compte: '706170', description: 'Autres locations', jan: 1296333, feb: 3019333, mar: 1008333, apr: 858333, may: 858333, jun: 1693333, jul: 858333, aug: 1693333, sep: 858333, oct: 1693333, nov: 858333, dec: 1693333, total: 16389000 },
    { compte: '706173', description: 'Frais accessoires', jan: 511900, feb: 620650, mar: 669400, apr: 665650, may: 676900, jun: 836900, jul: 811900, aug: 949400, sep: 968150, oct: 811900, nov: 811900, dec: 1068150, total: 9402800 }
  ];

  // Calculer le total du compte 706100 à partir des détails
  const totals706100 = calculateTotalsFromDetails(details706100);

  // Données de revenus par mois (avec totaux calculés)
  const revenueData = [
    {
      compte: '706100',
      description: "Chiffre d'affaires",
      jan: totals706100.jan,
      feb: totals706100.feb,
      mar: totals706100.mar,
      apr: totals706100.apr,
      may: totals706100.may,
      jun: totals706100.jun,
      jul: totals706100.jul,
      aug: totals706100.aug,
      sep: totals706100.sep,
      oct: totals706100.oct,
      nov: totals706100.nov,
      dec: totals706100.dec,
      total: totals706100.total,
      hasDetails: true
    },
    {
      compte: '707100',
      description: "Ventes de marchandises",
      jan: 45000000,
      feb: 48000000,
      mar: 52000000,
      apr: 51000000,
      may: 49000000,
      jun: 53000000,
      jul: 55000000,
      aug: 54000000,
      sep: 52000000,
      oct: 51000000,
      nov: 50000000,
      dec: 56000000,
      total: 616000000,
      hasDetails: false
    },
    {
      compte: '708100',
      description: "Produits des activités annexes",
      jan: 12000000,
      feb: 11500000,
      mar: 13000000,
      apr: 12500000,
      may: 13500000,
      jun: 14000000,
      jul: 14500000,
      aug: 13000000,
      sep: 12000000,
      oct: 13500000,
      nov: 14000000,
      dec: 15000000,
      total: 158500000,
      hasDetails: false
    }
  ];

  // Données de dépenses par mois
  const expenseData = [
    {
      compte: '601100',
      description: "Achats de marchandises",
      jan: 85000000,
      feb: 82000000,
      mar: 88000000,
      apr: 90000000,
      may: 87000000,
      jun: 89000000,
      jul: 92000000,
      aug: 91000000,
      sep: 88000000,
      oct: 86000000,
      nov: 85000000,
      dec: 93000000,
      total: 1056000000
    },
    {
      compte: '602100',
      description: "Achats de matières premières",
      jan: 45000000,
      feb: 43000000,
      mar: 47000000,
      apr: 48000000,
      may: 46000000,
      jun: 47000000,
      jul: 49000000,
      aug: 48000000,
      sep: 46000000,
      oct: 45000000,
      nov: 44000000,
      dec: 50000000,
      total: 558000000
    },
    {
      compte: '661100',
      description: "Charges de personnel",
      jan: 25000000,
      feb: 25000000,
      mar: 25000000,
      apr: 25000000,
      may: 25000000,
      jun: 25000000,
      jul: 25000000,
      aug: 25000000,
      sep: 25000000,
      oct: 25000000,
      nov: 25000000,
      dec: 30000000,
      total: 305000000
    }
  ];

  const data = type === 'revenue' ? revenueData : expenseData;

  const formatAmount = (amount: number) => {
    return formatCurrency(amount);
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
              <h1 className="text-lg font-bold text-[#171717]">Budget Récap</h1>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-sm text-[#737373]">
                  {department || 'Tous les départements'}
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

            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#e5e5e5] rounded-lg hover:bg-gray-50" aria-label="Filtrer">
              <Filter className="w-4 h-4" />
              <span className="text-sm">{t('common.filter')}</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-[#525252] text-white rounded-lg hover:bg-[#404040]" aria-label="Télécharger">
              <Download className="w-4 h-4" />
              <span className="text-sm">{t('common.export')}</span>
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

      {/* Titre de la section */}
      <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] mb-4">
        <h2 className="text-lg font-bold text-[#171717]">
          {type === 'revenue' ? 'Revenus' : 'Dépenses'}
        </h2>
      </div>

      {/* Tableau des données */}
      <div className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-[#e5e5e5]">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-[#404040] sticky left-0 bg-gray-100 min-w-[100px]">
                  Compte
                </th>
                <th className="text-left p-3 text-sm font-medium text-[#404040] min-w-[200px]">
                  Account Description
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
              {data.map((row, index) => (
                <tr key={row.compte} className="hover:bg-gray-50">
                  <td className="p-3 text-sm font-medium text-[#171717] sticky left-0 bg-white">
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
                    <button
                      onClick={() => navigate(`/budgeting/detail?compte=${row.compte}&description=${encodeURIComponent(row.description)}&department=${encodeURIComponent(department)}&type=${type}`)}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="Voir les détails"
                    >
                      <Eye className="w-4 h-4 text-[#525252]" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Ligne de total */}
              <tr className="bg-gray-100 font-bold">
                <td className="p-3 text-sm text-[#171717] sticky left-0 bg-gray-100" colSpan={2}>
                  TOTAL
                </td>
                {months.map((month, idx) => (
                  <td key={month} className="p-3 text-sm text-right text-[#171717]">
                    {formatAmount(
                      data.reduce((sum, row) => {
                        const monthKey = month.toLowerCase() as keyof typeof row;
                        const value = row[monthKey];
                        return sum + (typeof value === 'number' ? value : 0);
                      }, 0)
                    )}
                  </td>
                ))}
                <td className="p-3 text-sm text-right text-[#171717] bg-gray-200">
                  {formatAmount(data.reduce((sum, row) => sum + row.total, 0))}
                </td>
                <td className="p-3 text-center bg-gray-200">
                  <button
                    onClick={() => navigate(`/budgeting/detail?department=${encodeURIComponent(department)}&type=${type}&all=true`)}
                    className="p-1 hover:bg-gray-300 rounded"
                    title="Voir tous les détails"
                  >
                    <Eye className="w-4 h-4 text-[#171717]" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistiques en bas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
          <p className="text-xs text-[#737373] mb-2">Moyenne mensuelle</p>
          <p className="text-lg font-bold text-[#525252]">
            {formatAmount(Math.round(data.reduce((sum, row) => sum + row.total, 0) / 12))}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
          <p className="text-xs text-[#737373] mb-2">Mois le plus élevé</p>
          <p className="text-lg font-bold text-green-600">
            {(() => {
              let maxMonth = 'jan';
              let maxValue = 0;
              months.forEach(month => {
                const monthKey = month.toLowerCase() as keyof typeof data[0];
                const monthSum = data.reduce((sum, row) => {
                  const value = row[monthKey];
                  return sum + (typeof value === 'number' ? value : 0);
                }, 0);
                if (monthSum > maxValue) {
                  maxValue = monthSum;
                  maxMonth = month;
                }
              });
              return `${maxMonth} (${formatAmount(maxValue)})`;
            })()}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
          <p className="text-xs text-[#737373] mb-2">Mois le plus bas</p>
          <p className="text-lg font-bold text-red-600">
            {(() => {
              let minMonth = 'jan';
              let minValue = Infinity;
              months.forEach(month => {
                const monthKey = month.toLowerCase() as keyof typeof data[0];
                const monthSum = data.reduce((sum, row) => {
                  const value = row[monthKey];
                  return sum + (typeof value === 'number' ? value : 0);
                }, 0);
                if (monthSum < minValue) {
                  minValue = monthSum;
                  minMonth = month;
                }
              });
              return `${minMonth} (${formatAmount(minValue)})`;
            })()}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
          <p className="text-xs text-[#737373] mb-2">Nombre de comptes</p>
          <p className="text-lg font-bold text-[#171717]">
            {data.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BudgetRecapPage;