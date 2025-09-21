import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Plus, Search, Filter, Download, Eye, Edit, Trash2,
  ArrowLeft, Phone, Mail, Calendar, Clock, AlertTriangle,
  CheckCircle, XCircle, TrendingUp, Users, FileText, Building,
  BarChart3, PieChart, Activity, CreditCard, MessageSquare,
  Target, Award, RefreshCw, Send, Bell
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Cell, LineChart, Line, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { DebtCollection, CollectionAction, InvoiceDebt } from '../../types/tiers';

const RecouvrementModule: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('creances');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterNiveau, setFilterNiveau] = useState('tous');
  const [selectedCreance, setSelectedCreance] = useState<any>(null);
  const [showActionModal, setShowActionModal] = useState(false);

  // Mock Debt Collection Data
  const mockCreances = [
    {
      id: '1',
      clientId: 'CLI001',
      clientNom: 'SARL CONGO BUSINESS',
      clientCode: 'CLI001',
      factures: [
        {
          factureId: 'FAC-2024-001',
          numero: 'FAC-2024-001',
          date: '2024-08-15',
          dateEcheance: '2024-09-15',
          montantOriginal: 75000,
          montantRestant: 15000,
          joursRetard: 4
        },
        {
          factureId: 'FAC-2024-002',
          numero: 'FAC-2024-002',
          date: '2024-09-01',
          dateEcheance: '2024-10-01',
          montantOriginal: 45000,
          montantRestant: 45000,
          joursRetard: -12 // pas encore échu
        }
      ],
      montantTotal: 60000,
      joursRetard: 4,
      niveauRelance: 'RELANCE_1',
      derniereRelance: '2024-09-16',
      prochaineRelance: '2024-09-23',
      relances: [
        {
          id: 'r1',
          type: 'EMAIL',
          date: '2024-09-16',
          description: 'Premier rappel par email',
          moyenCommunication: 'EMAIL',
          responsable: 'Marie Kouam',
          resultat: 'Accusé de réception reçu'
        }
      ],
      statut: 'EN_COURS',
      assigneA: 'Marie Kouam',
      commentaires: 'Client généralement ponctuel, situation temporaire'
    },
    {
      id: '2',
      clientId: 'CLI003',
      clientNom: 'CAMEROUN INDUSTRIES',
      clientCode: 'CLI003',
      factures: [
        {
          factureId: 'FAC-2024-015',
          numero: 'FAC-2024-015',
          date: '2024-07-10',
          dateEcheance: '2024-08-10',
          montantOriginal: 125000,
          montantRestant: 125000,
          joursRetard: 40
        }
      ],
      montantTotal: 125000,
      joursRetard: 40,
      niveauRelance: 'RELANCE_3',
      derniereRelance: '2024-09-10',
      prochaineRelance: '2024-09-24',
      relances: [
        {
          id: 'r2',
          type: 'APPEL',
          date: '2024-08-15',
          description: 'Premier contact téléphonique',
          moyenCommunication: 'TELEPHONE',
          responsable: 'Paul Mbeki',
          resultat: 'Promesse de paiement sous 15 jours'
        },
        {
          id: 'r3',
          type: 'EMAIL',
          date: '2024-09-01',
          description: 'Relance formelle par email',
          moyenCommunication: 'EMAIL',
          responsable: 'Paul Mbeki',
          resultat: 'Pas de réponse'
        },
        {
          id: 'r4',
          type: 'COURRIER',
          date: '2024-09-10',
          description: 'Mise en demeure par courrier recommandé',
          moyenCommunication: 'COURRIER',
          responsable: 'Sophie Ndong',
          resultat: 'AR reçu, pas de réaction'
        }
      ],
      statut: 'EN_COURS',
      assigneA: 'Sophie Ndong',
      commentaires: 'Situation délicate, client en difficulté financière'
    },
    {
      id: '3',
      clientId: 'CLI004',
      clientNom: 'GABON LOGISTICS',
      clientCode: 'CLI004',
      factures: [
        {
          factureId: 'FAC-2024-008',
          numero: 'FAC-2024-008',
          date: '2024-06-20',
          dateEcheance: '2024-07-20',
          montantOriginal: 85000,
          montantRestant: 0,
          joursRetard: 0
        }
      ],
      montantTotal: 0,
      joursRetard: 0,
      niveauRelance: 'AUCUNE',
      derniereRelance: null,
      prochaineRelance: null,
      relances: [
        {
          id: 'r5',
          type: 'APPEL',
          date: '2024-07-25',
          description: 'Appel de rappel courtois',
          moyenCommunication: 'TELEPHONE',
          responsable: 'Marie Kouam',
          resultat: 'Paiement reçu le jour même'
        }
      ],
      statut: 'RESOLU',
      assigneA: 'Marie Kouam',
      commentaires: 'Recouvrement réussi, excellent client'
    }
  ];

  const tabs = [
    { id: 'creances', label: 'Créances', icon: DollarSign },
    { id: 'relances', label: 'Relances', icon: Bell },
    { id: 'contentieux', label: 'Contentieux', icon: AlertTriangle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const statutOptions = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'EN_COURS', label: 'En cours' },
    { value: 'RESOLU', label: 'Résolu' },
    { value: 'CONTENTIEUX', label: 'Contentieux' },
    { value: 'IRRECUPERABLE', label: 'Irrécupérable' }
  ];

  const niveauOptions = [
    { value: 'tous', label: 'Tous les niveaux' },
    { value: 'AUCUNE', label: 'Aucune relance' },
    { value: 'RELANCE_1', label: 'Relance 1' },
    { value: 'RELANCE_2', label: 'Relance 2' },
    { value: 'RELANCE_3', label: 'Relance 3' },
    { value: 'MISE_EN_DEMEURE', label: 'Mise en demeure' },
    { value: 'CONTENTIEUX', label: 'Contentieux' }
  ];

  const getStatutColor = (statut: string) => {
    const colors = {
      'EN_COURS': 'bg-[#6A8A82]/10 text-[#6A8A82]',
      'RESOLU': 'bg-green-100 text-green-800',
      'CONTENTIEUX': 'bg-red-100 text-red-800',
      'IRRECUPERABLE': 'bg-gray-100 text-gray-800'
    };
    return colors[statut as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getNiveauColor = (niveau: string) => {
    const colors = {
      'AUCUNE': 'bg-gray-100 text-gray-800',
      'RELANCE_1': 'bg-yellow-100 text-yellow-800',
      'RELANCE_2': 'bg-orange-100 text-orange-800',
      'RELANCE_3': 'bg-red-100 text-red-800',
      'MISE_EN_DEMEURE': 'bg-[#B87333]/10 text-[#B87333]',
      'CONTENTIEUX': 'bg-red-200 text-red-900'
    };
    return colors[niveau as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getUrgenceColor = (joursRetard: number) => {
    if (joursRetard <= 0) return 'text-green-600';
    if (joursRetard <= 15) return 'text-yellow-600';
    if (joursRetard <= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const getActionIcon = (type: string) => {
    const icons = {
      'APPEL': Phone,
      'EMAIL': Mail,
      'COURRIER': FileText,
      'SMS': MessageSquare,
      'VISITE': Users,
      'MISE_EN_DEMEURE': AlertTriangle,
      'PROCEDURE_JUDICIAIRE': Award
    };
    return icons[type as keyof typeof icons] || MessageSquare;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const filteredCreances = mockCreances.filter(creance => {
    const matchSearch = creance.clientNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       creance.clientCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = filterStatut === 'tous' || creance.statut === filterStatut;
    const matchNiveau = filterNiveau === 'tous' || creance.niveauRelance === filterNiveau;
    return matchSearch && matchStatut && matchNiveau;
  });

  // Mock Analytics Data
  const analyticsData = {
    statistiques: {
      montantTotalCreances: 1250000,
      montantRecouvre: 980000,
      tauxRecouvrement: 78.4,
      nombreCreances: 45,
      delaiMoyenRecouvrement: 18,
      creancesEnRetard: 12
    },
    evolutionRecouvrement: [
      { mois: 'Jan', recouvre: 150000, creances: 200000 },
      { mois: 'Fév', recouvre: 180000, creances: 220000 },
      { mois: 'Mar', recouvre: 165000, creances: 210000 },
      { mois: 'Avr', recouvre: 190000, creances: 240000 },
      { mois: 'Mai', recouvre: 175000, creances: 225000 },
      { mois: 'Juin', recouvre: 195000, creances: 250000 }
    ],
    repartitionNiveaux: [
      { niveau: 'Aucune relance', count: 8, montant: 125000 },
      { niveau: 'Relance 1', count: 15, montant: 380000 },
      { niveau: 'Relance 2', count: 12, montant: 295000 },
      { niveau: 'Relance 3', count: 7, montant: 285000 },
      { niveau: 'Contentieux', count: 3, montant: 165000 }
    ],
    anciennete: [
      { periode: '0-30 jours', nombre: 18, montant: 450000 },
      { periode: '31-60 jours', nombre: 12, montant: 320000 },
      { periode: '61-90 jours', nombre: 8, montant: 280000 },
      { periode: '+90 jours', nombre: 7, montant: 200000 }
    ]
  };

  const COLORS = ['#7A99AC', '#6A89AC', '#5A79AC', '#4A69AC', '#3A59AC'];

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/tiers')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Tiers</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Recouvrement</h1>
                <p className="text-sm text-[#666666]">Gestion des créances et processus de recouvrement</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm font-semibold">Exporter</span>
            </button>

            <button
              onClick={() => setShowActionModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="text-sm font-semibold">Nouvelle Relance</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-6 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-[#7A99AC] shadow-sm'
                  : 'text-[#666666] hover:text-[#444444]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Créances Tab */}
      {activeTab === 'creances' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Créances Totales</p>
                  <p className="text-2xl font-bold text-[#191919]">
                    {formatCurrency(analyticsData.statistiques.montantTotalCreances)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Montant Recouvré</p>
                  <p className="text-2xl font-bold text-[#191919]">
                    {formatCurrency(analyticsData.statistiques.montantRecouvre)}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Taux Recouvrement</p>
                  <p className="text-2xl font-bold text-[#191919]">
                    {analyticsData.statistiques.tauxRecouvrement}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#6A8A82]" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Délai Moyen</p>
                  <p className="text-2xl font-bold text-[#191919]">
                    {analyticsData.statistiques.delaiMoyenRecouvrement}j
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou code client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A99AC] focus:border-transparent"
                />
              </div>

              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A99AC]"
              >
                {statutOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={filterNiveau}
                onChange={(e) => setFilterNiveau(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A99AC]"
              >
                {niveauOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Créances Table */}
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retard</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Niveau</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dernière Relance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigné à</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCreances.map((creance) => (
                    <tr key={creance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                            <Building className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{creance.clientNom}</div>
                            <div className="text-sm text-gray-500">{creance.clientCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(creance.montantTotal)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {creance.factures.length} facture{creance.factures.length > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getUrgenceColor(creance.joursRetard)}`}>
                          {creance.joursRetard > 0 ? `${creance.joursRetard} jours` : 'À jour'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getNiveauColor(creance.niveauRelance)}`}>
                          {creance.niveauRelance.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {creance.derniereRelance ? formatDate(creance.derniereRelance) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {creance.assigneA}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(creance.statut)}`}>
                          {creance.statut.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2 justify-end">
                          <button
                            onClick={() => setSelectedCreance(creance)}
                            className="p-1 text-[#6A8A82] hover:text-[#6A8A82]/80"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowActionModal(true)}
                            className="p-1 text-orange-600 hover:text-orange-900"
                            title="Nouvelle action"
                          >
                            <Bell className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-green-600 hover:text-green-900" title="Appeler">
                            <Phone className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-[#B87333] hover:text-[#B87333]/80" title="Email">
                            <Mail className="w-4 h-4" />
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

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Évolution du recouvrement */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Évolution du Recouvrement</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.evolutionRecouvrement}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Area type="monotone" dataKey="creances" stackId="1" stroke="#E74C3C" fill="#E74C3C" fillOpacity={0.3} name="Créances" />
                  <Area type="monotone" dataKey="recouvre" stackId="2" stroke="#27AE60" fill="#27AE60" fillOpacity={0.6} name="Recouvré" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Répartition par niveau */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Répartition par Niveau de Relance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    dataKey="montant"
                    data={analyticsData.repartitionNiveaux}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    label={({ niveau, count }) => `${niveau} (${count})`}
                  >
                    {analyticsData.repartitionNiveaux.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ancienneté des créances */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Ancienneté des Créances</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.anciennete}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periode" />
                <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="montant" fill="#7A99AC" name="Montant" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Créance Detail Modal */}
      {selectedCreance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#191919]">
                  Détail Créance - {selectedCreance.clientNom}
                </h2>
                <button
                  onClick={() => setSelectedCreance(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Informations client */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#191919]">Informations Client</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Nom</label>
                      <p className="text-[#191919]">{selectedCreance.clientNom}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Code</label>
                      <p className="text-[#191919]">{selectedCreance.clientCode}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Assigné à</label>
                      <p className="text-[#191919]">{selectedCreance.assigneA}</p>
                    </div>
                  </div>
                </div>

                {/* Informations créance */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#191919]">Informations Créance</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Montant total</label>
                      <p className="text-[#191919] font-semibold">{formatCurrency(selectedCreance.montantTotal)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Jours de retard</label>
                      <p className={`font-semibold ${getUrgenceColor(selectedCreance.joursRetard)}`}>
                        {selectedCreance.joursRetard > 0 ? `${selectedCreance.joursRetard} jours` : 'À jour'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Niveau de relance</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getNiveauColor(selectedCreance.niveauRelance)}`}>
                        {selectedCreance.niveauRelance.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Factures */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#191919] mb-4">Factures</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Échéance</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant Original</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Restant</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Retard</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedCreance.factures.map((facture: any) => (
                        <tr key={facture.factureId}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{facture.numero}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(facture.date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(facture.dateEcheance)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(facture.montantOriginal)}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-red-600">{formatCurrency(facture.montantRestant)}</td>
                          <td className={`px-4 py-3 text-sm text-center font-medium ${getUrgenceColor(facture.joursRetard)}`}>
                            {facture.joursRetard > 0 ? `${facture.joursRetard}j` : 'OK'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historique des relances */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#191919] mb-4">Historique des Relances</h3>
                <div className="space-y-3">
                  {selectedCreance.relances.map((relance: any) => {
                    const IconComponent = getActionIcon(relance.type);
                    return (
                      <div key={relance.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-[#6A8A82]/10 rounded-full flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-[#6A8A82]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-[#191919]">{relance.description}</h4>
                            <span className="text-sm text-[#666666]">{formatDate(relance.date)}</span>
                          </div>
                          <p className="text-sm text-[#666666] mt-1">
                            <strong>Moyen:</strong> {relance.moyenCommunication} •
                            <strong> Responsable:</strong> {relance.responsable}
                          </p>
                          {relance.resultat && (
                            <p className="text-sm text-green-600 mt-1">
                              <strong>Résultat:</strong> {relance.resultat}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Commentaires */}
              {selectedCreance.commentaires && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#191919] mb-4">Commentaires</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-[#191919]">{selectedCreance.commentaires}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedCreance(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Fermer
                </button>
                <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  Nouvelle Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Autres onglets affichent des composants placeholder */}
      {activeTab === 'relances' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Gestion des Relances</h3>
            <p className="text-[#666666]">Planification et suivi des actions de relance</p>
          </div>
        </div>
      )}

      {activeTab === 'contentieux' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Gestion Contentieux</h3>
            <p className="text-[#666666]">Procédures judiciaires et dossiers contentieux</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecouvrementModule;