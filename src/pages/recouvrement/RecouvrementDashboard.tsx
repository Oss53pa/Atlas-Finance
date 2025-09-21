import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Users,
  Calendar,
  Phone,
  Mail,
  FileText,
  Download,
  Filter,
  Search,
  ChevronRight
} from 'lucide-react';

interface CreanceClient {
  id: string;
  clientName: string;
  clientCode: string;
  montantTotal: number;
  montantPaye: number;
  montantRestant: number;
  dateEcheance: string;
  jourRetard: number;
  statut: 'en_cours' | 'en_retard' | 'critique' | 'recouvre';
  dernierContact: string;
  prochainContact: string;
}

const RecouvrementDashboard: React.FC = () => {
  const [creances, setCreances] = useState<CreanceClient[]>([
    {
      id: '1',
      clientName: 'Entreprise ABC',
      clientCode: 'CLI001',
      montantTotal: 25000,
      montantPaye: 10000,
      montantRestant: 15000,
      dateEcheance: '2024-01-15',
      jourRetard: 5,
      statut: 'en_retard',
      dernierContact: '2024-01-10',
      prochainContact: '2024-01-20'
    },
    {
      id: '2',
      clientName: 'Société XYZ',
      clientCode: 'CLI002',
      montantTotal: 50000,
      montantPaye: 0,
      montantRestant: 50000,
      dateEcheance: '2024-01-05',
      jourRetard: 15,
      statut: 'critique',
      dernierContact: '2024-01-02',
      prochainContact: '2024-01-21'
    },
    {
      id: '3',
      clientName: 'Tech Solutions',
      clientCode: 'CLI003',
      montantTotal: 35000,
      montantPaye: 35000,
      montantRestant: 0,
      dateEcheance: '2024-01-10',
      jourRetard: 0,
      statut: 'recouvre',
      dernierContact: '2024-01-08',
      prochainContact: '-'
    }
  ]);

  const [selectedStatut, setSelectedStatut] = useState<string>('tous');
  const [searchTerm, setSearchTerm] = useState('');

  const stats = {
    totalCreances: creances.reduce((sum, c) => sum + c.montantTotal, 0),
    totalRecouvre: creances.reduce((sum, c) => sum + c.montantPaye, 0),
    totalRestant: creances.reduce((sum, c) => sum + c.montantRestant, 0),
    creancesEnRetard: creances.filter(c => c.statut === 'en_retard').length,
    creancesCritiques: creances.filter(c => c.statut === 'critique').length,
    tauxRecouvrement: creances.length > 0
      ? ((creances.reduce((sum, c) => sum + c.montantPaye, 0) / creances.reduce((sum, c) => sum + c.montantTotal, 0)) * 100).toFixed(1)
      : '0'
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'en_cours': return 'bg-blue-100 text-blue-800';
      case 'en_retard': return 'bg-yellow-100 text-yellow-800';
      case 'critique': return 'bg-red-100 text-red-800';
      case 'recouvre': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'en_cours': return 'En cours';
      case 'en_retard': return 'En retard';
      case 'critique': return 'Critique';
      case 'recouvre': return 'Recouvré';
      default: return statut;
    }
  };

  const filteredCreances = creances.filter(creance => {
    const matchStatut = selectedStatut === 'tous' || creance.statut === selectedStatut;
    const matchSearch = creance.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        creance.clientCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatut && matchSearch;
  });

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Recouvrement</h1>
        <p className="text-gray-600 mt-2">Gestion et suivi du recouvrement des créances clients</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-10 h-10 text-blue-500" />
            <span className="text-sm font-medium text-blue-600">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totalCreances.toLocaleString()} DH
          </p>
          <p className="text-sm text-gray-600 mt-1">Créances totales</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <span className="text-sm font-medium text-green-600">
              {stats.tauxRecouvrement}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totalRecouvre.toLocaleString()} DH
          </p>
          <p className="text-sm text-gray-600 mt-1">Montant recouvré</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-10 h-10 text-orange-500" />
            <span className="text-sm font-medium text-orange-600">
              {stats.creancesEnRetard}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totalRestant.toLocaleString()} DH
          </p>
          <p className="text-sm text-gray-600 mt-1">Montant restant</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <span className="text-sm font-medium text-red-600">
              {stats.creancesCritiques}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.creancesCritiques}
          </p>
          <p className="text-sm text-gray-600 mt-1">Créances critiques</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Créances clients</h2>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={selectedStatut}
                onChange={(e) => setSelectedStatut(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="tous">Tous les statuts</option>
                <option value="en_cours">En cours</option>
                <option value="en_retard">En retard</option>
                <option value="critique">Critique</option>
                <option value="recouvre">Recouvré</option>
              </select>

              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Download className="w-4 h-4" />
                Exporter
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montants
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Échéance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCreances.map((creance) => (
                <tr key={creance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {creance.clientName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {creance.clientCode}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {creance.montantRestant.toLocaleString()} DH
                      </div>
                      <div className="text-sm text-gray-500">
                        sur {creance.montantTotal.toLocaleString()} DH
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${(creance.montantPaye / creance.montantTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">
                        {new Date(creance.dateEcheance).toLocaleDateString()}
                      </div>
                      {creance.jourRetard > 0 && (
                        <div className="text-sm text-red-600 font-medium">
                          {creance.jourRetard} jours de retard
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(creance.statut)}`}>
                      {getStatutLabel(creance.statut)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>Dernier: {new Date(creance.dernierContact).toLocaleDateString()}</div>
                      <div>Prochain: {creance.prochainContact === '-' ? '-' : new Date(creance.prochainContact).toLocaleDateString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Phone className="w-4 h-4" />
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">
                        <Mail className="w-4 h-4" />
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Prochaines relances</h3>
          <div className="space-y-3">
            {creances.filter(c => c.prochainContact !== '-').slice(0, 5).map((creance) => (
              <div key={creance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{creance.clientName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(creance.prochainContact).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
              <Phone className="w-5 h-5" />
              <span className="text-sm font-medium">Appeler client</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
              <Mail className="w-5 h-5" />
              <span className="text-sm font-medium">Envoyer relance</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100">
              <FileText className="w-5 h-5" />
              <span className="text-sm font-medium">Générer rapport</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">Plan d'action</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecouvrementDashboard;