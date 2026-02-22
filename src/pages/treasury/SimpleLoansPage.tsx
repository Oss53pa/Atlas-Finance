import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CalculatorIcon,
  DocumentTextIcon,
  CalendarIcon,
  CreditCardIcon,
  ChartBarIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

interface Loan {
  id: string;
  reference: string;
  bank: string;
  amount: number;
  rate: number;
  duration: number;
  startDate: string;
  endDate: string;
  monthlyPayment: number;
  remainingBalance: number;
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
  type: 'INVESTMENT' | 'WORKING_CAPITAL' | 'REAL_ESTATE' | 'EQUIPMENT';
}

const SimpleLoansPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'schedule' | 'analytics'>('list');
  const [selectedLoan, setSelectedLoan] = useState<string>('');

  // Mock data
  const loans: Loan[] = [
    {
      id: '1',
      reference: 'EMP-2024-001',
      bank: 'SGBC',
      amount: 50000000,
      rate: 8.5,
      duration: 60,
      startDate: '2024-01-15',
      endDate: '2029-01-15',
      monthlyPayment: 1025000,
      remainingBalance: 42500000,
      status: 'ACTIVE',
      type: 'INVESTMENT'
    },
    {
      id: '2',
      reference: 'EMP-2024-002',
      bank: 'UBA',
      amount: 25000000,
      rate: 9.2,
      duration: 36,
      startDate: '2024-03-01',
      endDate: '2027-03-01',
      monthlyPayment: 790000,
      remainingBalance: 18750000,
      status: 'ACTIVE',
      type: 'WORKING_CAPITAL'
    }
  ];


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-[#171717]/10 text-[#171717]';
      case 'SUSPENDED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INVESTMENT': return <ChartBarIcon className="h-5 w-5 text-[#171717]" />;
      case 'WORKING_CAPITAL': return <CreditCardIcon className="h-5 w-5 text-green-600" />;
      case 'REAL_ESTATE': return <DocumentTextIcon className="h-5 w-5 text-[#525252]" />;
      case 'EQUIPMENT': return <CalculatorIcon className="h-5 w-5 text-orange-600" />;
      default: return <DocumentTextIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Gestion des Emprunts</h1>
          <p className="text-gray-600">Suivi complet des financements bancaires</p>
        </div>
        <div className="flex space-x-4">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as typeof viewMode)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="list">Vue Liste</option>
            <option value="schedule">Échéancier</option>
            <option value="analytics">Analytics</option>
          </select>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <PlusIcon className="h-5 w-5" />
            <span>Nouvel Emprunt</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Emprunts</p>
              <p className="text-lg font-bold text-gray-900">{loans.length}</p>
              <p className="text-sm text-[#171717]">{loans.filter(l => l.status === 'ACTIVE').length} actifs</p>
            </div>
            <div className="h-12 w-12 bg-[#171717]/10 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="h-6 w-6 text-[#171717]" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Capital Emprunté</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(loans.reduce((sum, loan) => sum + loan.amount, 0))}
              </p>
              <p className="text-sm text-green-600">Total initial</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Solde Restant</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(loans.reduce((sum, loan) => sum + loan.remainingBalance, 0))}
              </p>
              <p className="text-sm text-[#525252]">À rembourser</p>
            </div>
            <div className="h-12 w-12 bg-[#525252]/10 rounded-lg flex items-center justify-center">
              <CreditCardIcon className="h-6 w-6 text-[#525252]" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mensualités</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0))}
              </p>
              <p className="text-sm text-orange-600">Par mois</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Vue Liste */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Liste des Emprunts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Emprunt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Banque
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Capital Initial
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Taux
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Mensualité
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Solde Restant
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getTypeIcon(loan.type)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{loan.reference}</div>
                          <div className="text-sm text-gray-700">{loan.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {loan.bank}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(loan.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {loan.rate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(loan.monthlyPayment)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(loan.remainingBalance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                        {loan.status === 'ACTIVE' ? 'Actif' : 
                         loan.status === 'COMPLETED' ? 'Terminé' : 'Suspendu'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex space-x-2 justify-center">
                        <button
                          onClick={() => setSelectedLoan(loan.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button className="text-[#171717] hover:text-[#171717]/80" aria-label="Modifier">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900" aria-label="Supprimer">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vue Échéancier */}
      {viewMode === 'schedule' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Échéancier des Emprunts</h2>
          <div className="text-center text-gray-700 py-12">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-700" />
            <p>Sélectionnez un emprunt pour voir son échéancier détaillé</p>
          </div>
        </div>
      )}

      {/* Vue Analytics */}
      {viewMode === 'analytics' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics des Emprunts</h2>
          <div className="text-center text-gray-700 py-12">
            <CalculatorIcon className="h-12 w-12 mx-auto mb-4 text-gray-700" />
            <p>Analyses et projections financières des emprunts</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleLoansPage;