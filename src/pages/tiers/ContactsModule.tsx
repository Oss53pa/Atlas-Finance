import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck, Plus, Search, Filter, Download, Eye, Edit, Trash2,
  ArrowLeft, Phone, Mail, MapPin, Calendar, User, Building,
  MessageSquare, Activity, Clock, Star, Heart, Award,
  BarChart3, PieChart, TrendingUp, Users, Globe, Linkedin
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Cell, LineChart, Line, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { Contact, Interaction, ThirdParty } from '../../types/tiers';

const ContactsModule: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('liste');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTiers, setFilterTiers] = useState('tous');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);

  // Mock Contacts Data
  const mockContacts: (Contact & { tiers: string })[] = [
    {
      id: '1',
      tiersId: '1',
      tiers: 'SARL CONGO BUSINESS',
      civilite: 'M',
      prenom: 'Jean',
      nom: 'MAMBOU',
      fonction: 'Directeur Commercial',
      departement: 'Commercial',
      telephone: '+242 06 123 45 67',
      mobile: '+242 06 987 65 43',
      email: 'j.mambou@congobusiness.cg',
      linkedin: 'jean-mambou-123456',
      isPrincipal: true,
      isActif: true,
      languePrefere: 'Français',
      dateNaissance: '1975-05-15',
      notes: 'Contact clé pour les négociations commerciales',
      interactions: [
        {
          id: 'int1',
          type: 'APPEL',
          date: '2024-09-18',
          sujet: 'Suivi commande Q3',
          description: 'Discussion sur le planning de livraison Q3',
          statut: 'TERMINE',
          responsable: 'Marie Kouam',
          resultats: 'Accord sur les délais',
          fichesJoints: [],
          createdAt: '2024-09-18T10:30:00Z'
        },
        {
          id: 'int2',
          type: 'EMAIL',
          date: '2024-09-15',
          sujet: 'Proposition commerciale',
          description: 'Envoi de la nouvelle proposition tarifaire',
          statut: 'TERMINE',
          responsable: 'Marie Kouam',
          prochaineSuivi: '2024-09-25',
          fichesJoints: [],
          createdAt: '2024-09-15T14:20:00Z'
        }
      ],
      createdAt: '2024-01-15',
      updatedAt: '2024-09-19'
    },
    {
      id: '2',
      tiersId: '2',
      tiers: 'STE AFRICAINE TECH',
      civilite: 'MME',
      prenom: 'Sophie',
      nom: 'NDONG',
      fonction: 'CEO',
      departement: 'Direction',
      telephone: '+237 6 98 76 54 32',
      mobile: '+237 6 11 22 33 44',
      email: 's.ndong@africantech.cm',
      linkedin: 'sophie-ndong-ceo',
      isPrincipal: true,
      isActif: true,
      languePrefere: 'Français',
      dateNaissance: '1982-11-08',
      notes: 'Décisionnaire principal, très réactive',
      interactions: [
        {
          id: 'int3',
          type: 'RENCONTRE',
          date: '2024-09-17',
          sujet: 'Présentation nouveaux services',
          description: 'Rendez-vous au siège pour présenter nos nouveaux services',
          statut: 'TERMINE',
          responsable: 'Paul Mbeki',
          resultats: 'Intérêt confirmé pour les services cloud',
          prochaineSuivi: '2024-09-30',
          fichesJoints: [],
          createdAt: '2024-09-17T09:00:00Z'
        }
      ],
      createdAt: '2024-02-01',
      updatedAt: '2024-09-19'
    },
    {
      id: '3',
      tiersId: '1',
      tiers: 'SARL CONGO BUSINESS',
      civilite: 'M',
      prenom: 'Paul',
      nom: 'OKEMBA',
      fonction: 'Responsable Achats',
      departement: 'Achats',
      telephone: '+242 06 555 44 33',
      email: 'p.okemba@congobusiness.cg',
      isPrincipal: false,
      isActif: true,
      languePrefere: 'Français',
      notes: 'Contact pour les aspects techniques',
      interactions: [],
      createdAt: '2024-03-10',
      updatedAt: '2024-09-19'
    },
    {
      id: '4',
      tiersId: '3',
      tiers: 'CEMAC SUPPLIES',
      civilite: 'MME',
      prenom: 'Marie',
      nom: 'ESSONO',
      fonction: 'Responsable Qualité',
      departement: 'Qualité',
      telephone: '+237 6 44 33 22 11',
      email: 'm.essono@cemacsupplies.cm',
      isPrincipal: false,
      isActif: true,
      languePrefere: 'Français',
      notes: 'Contact pour les audits qualité',
      interactions: [
        {
          id: 'int4',
          type: 'EMAIL',
          date: '2024-09-16',
          sujet: 'Certification ISO',
          description: 'Échange sur le processus de certification ISO',
          statut: 'TERMINE',
          responsable: 'Jean Akono',
          fichesJoints: [],
          createdAt: '2024-09-16T11:15:00Z'
        }
      ],
      createdAt: '2024-04-05',
      updatedAt: '2024-09-19'
    }
  ];

  const tabs = [
    { id: 'liste', label: 'Liste Contacts', icon: UserCheck },
    { id: 'interactions', label: 'Interactions', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'organigramme', label: 'Organigramme', icon: Users }
  ];

  const tiersOptions = [
    { value: 'tous', label: 'Tous les tiers' },
    { value: 'clients', label: 'Clients' },
    { value: 'fournisseurs', label: 'Fournisseurs' },
    { value: 'prospects', label: 'Prospects' }
  ];

  const statutOptions = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'actif', label: 'Actif' },
    { value: 'inactif', label: 'Inactif' }
  ];

  const getCiviliteColor = (civilite: string) => {
    const colors = {
      'M': 'bg-[#6A8A82]/10 text-[#6A8A82]',
      'MME': 'bg-pink-100 text-pink-800',
      'MLLE': 'bg-[#B87333]/10 text-[#B87333]',
      'DR': 'bg-green-100 text-green-800',
      'PR': 'bg-gray-100 text-gray-800'
    };
    return colors[civilite as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getInteractionTypeColor = (type: string) => {
    const colors = {
      'APPEL': 'bg-[#6A8A82]/10 text-[#6A8A82]',
      'EMAIL': 'bg-green-100 text-green-800',
      'RENCONTRE': 'bg-[#B87333]/10 text-[#B87333]',
      'VISITE': 'bg-orange-100 text-orange-800',
      'DEMONSTRATION': 'bg-indigo-100 text-indigo-800',
      'NEGOTIATION': 'bg-red-100 text-red-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getInteractionIcon = (type: string) => {
    const icons = {
      'APPEL': Phone,
      'EMAIL': Mail,
      'RENCONTRE': Users,
      'VISITE': MapPin,
      'DEMONSTRATION': Activity,
      'NEGOTIATION': TrendingUp
    };
    return icons[type as keyof typeof icons] || MessageSquare;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const filteredContacts = mockContacts.filter(contact => {
    const matchSearch = contact.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       contact.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       contact.tiers.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatut = filterStatut === 'tous' ||
                       (filterStatut === 'actif' && contact.isActif) ||
                       (filterStatut === 'inactif' && !contact.isActif);

    return matchSearch && matchStatut;
  });

  // Mock Analytics Data
  const analyticsData = {
    repartitionTiers: [
      { type: 'Clients', count: 145, pourcentage: 62 },
      { type: 'Fournisseurs', count: 67, pourcentage: 29 },
      { type: 'Prospects', count: 22, pourcentage: 9 }
    ],
    interactionsParMois: [
      { mois: 'Jan', appels: 45, emails: 78, rencontres: 12 },
      { mois: 'Fév', appels: 52, emails: 85, rencontres: 15 },
      { mois: 'Mar', appels: 48, emails: 92, rencontres: 18 },
      { mois: 'Avr', appels: 55, emails: 88, rencontres: 14 },
      { mois: 'Mai', appels: 60, emails: 95, rencontres: 20 },
      { mois: 'Juin', appels: 58, emails: 102, rencontres: 22 }
    ],
    topInteracteurs: [
      { nom: 'Jean MAMBOU', entreprise: 'CONGO BUSINESS', interactions: 25, derniere: '2024-09-18' },
      { nom: 'Sophie NDONG', entreprise: 'AFRICAINE TECH', interactions: 18, derniere: '2024-09-17' },
      { nom: 'Martin NKOMO', entreprise: 'CEMAC SUPPLIES', interactions: 15, derniere: '2024-09-16' },
      { nom: 'Christine OBIANG', entreprise: 'AFRICA MATERIALS', interactions: 12, derniere: '2024-09-15' }
    ],
    repartitionFonctions: [
      { fonction: 'Direction', count: 45 },
      { fonction: 'Commercial', count: 67 },
      { fonction: 'Achats', count: 34 },
      { fonction: 'Technique', count: 28 },
      { fonction: 'Qualité', count: 15 },
      { fonction: 'Finance', count: 25 }
    ]
  };

  // Récupérer toutes les interactions de tous les contacts
  const allInteractions = mockContacts.flatMap(contact =>
    contact.interactions.map(interaction => ({
      ...interaction,
      contactNom: `${contact.prenom} ${contact.nom}`,
      contactEntreprise: contact.tiers,
      contactId: contact.id
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Gestion des Contacts</h1>
                <p className="text-sm text-[#666666]">Centralisation et gestion des contacts tiers</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowContactModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">Nouveau Contact</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm font-semibold">Exporter</span>
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

      {/* Liste Contacts Tab */}
      {activeTab === 'liste' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom, email ou entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A99AC] focus:border-transparent"
                />
              </div>

              <select
                value={filterTiers}
                onChange={(e) => setFilterTiers(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A99AC]"
              >
                {tiersOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A99AC]"
              >
                {statutOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Contacts Table */}
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entreprise</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fonction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Communications</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interactions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <User className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCiviliteColor(contact.civilite)}`}>
                                {contact.civilite}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {contact.prenom} {contact.nom}
                              </span>
                              {contact.isPrincipal && (
                                <Star className="w-4 h-4 text-yellow-500" />
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{contact.departement}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{contact.tiers}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contact.fonction}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {contact.telephone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-3 h-3 mr-1" />
                              {contact.telephone}
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-3 h-3 mr-1" />
                              {contact.email}
                            </div>
                          )}
                          {contact.linkedin && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Linkedin className="w-3 h-3 mr-1" />
                              LinkedIn
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MessageSquare className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {contact.interactions.length}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          contact.isActif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {contact.isActif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2 justify-end">
                          <button
                            onClick={() => setSelectedContact(contact)}
                            className="p-1 text-[#6A8A82] hover:text-[#6A8A82]/80"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowInteractionModal(true)}
                            className="p-1 text-[#B87333] hover:text-[#B87333]/80"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-green-600 hover:text-green-900">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-red-600 hover:text-red-900">
                            <Trash2 className="w-4 h-4" />
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

      {/* Interactions Tab */}
      {activeTab === 'interactions' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Total Interactions</p>
                  <p className="text-2xl font-bold text-[#191919]">{allInteractions.length}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-[#6A8A82]" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Cette Semaine</p>
                  <p className="text-2xl font-bold text-[#191919]">15</p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">En Attente</p>
                  <p className="text-2xl font-bold text-[#191919]">3</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Taux Réponse</p>
                  <p className="text-2xl font-bold text-[#191919]">94%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#B87333]" />
              </div>
            </div>
          </div>

          {/* Recent Interactions */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Interactions Récentes</h3>
            <div className="space-y-4">
              {allInteractions.slice(0, 10).map((interaction) => {
                const IconComponent = getInteractionIcon(interaction.type);
                return (
                  <div key={interaction.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getInteractionTypeColor(interaction.type)}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-[#191919]">{interaction.sujet}</h4>
                        <span className="text-sm text-[#666666]">{formatDate(interaction.date)}</span>
                      </div>
                      <p className="text-sm text-[#666666] mt-1">{interaction.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-[#191919]">{interaction.contactNom}</span>
                          <span className="text-sm text-[#666666]">•</span>
                          <span className="text-sm text-[#666666]">{interaction.contactEntreprise}</span>
                        </div>
                        <span className="text-sm text-[#666666]">par {interaction.responsable}</span>
                      </div>
                      {interaction.prochaineSuivi && (
                        <div className="flex items-center mt-2">
                          <Clock className="w-4 h-4 text-orange-500 mr-1" />
                          <span className="text-sm text-orange-600">
                            Suivi prévu le {formatDate(interaction.prochaineSuivi)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Répartition par type de tiers */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Répartition par Type de Tiers</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    dataKey="count"
                    data={analyticsData.repartitionTiers}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    label={({ type, pourcentage }) => `${type} (${pourcentage}%)`}
                  >
                    {analyticsData.repartitionTiers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Évolution des interactions */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Évolution des Interactions</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.interactionsParMois}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="emails" stackId="1" stroke="#7A99AC" fill="#7A99AC" />
                  <Area type="monotone" dataKey="appels" stackId="1" stroke="#6A89AC" fill="#6A89AC" />
                  <Area type="monotone" dataKey="rencontres" stackId="1" stroke="#5A79AC" fill="#5A79AC" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top interacteurs */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Top Interacteurs</h3>
              <div className="space-y-3">
                {analyticsData.topInteracteurs.map((contact, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-green-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-[#191919]">{contact.nom}</p>
                        <p className="text-sm text-[#666666]">{contact.entreprise}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[#191919]">{contact.interactions} interactions</p>
                      <p className="text-sm text-[#666666]">Dernière: {formatDate(contact.derniere)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Répartition par fonction */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Répartition par Fonction</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.repartitionFonctions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fonction" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7A99AC" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Contact Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#191919]">Détails Contact</h2>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informations personnelles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#191919]">Informations Personnelles</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCiviliteColor(selectedContact.civilite)}`}>
                        {selectedContact.civilite}
                      </span>
                      <span className="font-medium text-[#191919]">
                        {selectedContact.prenom} {selectedContact.nom}
                      </span>
                      {selectedContact.isPrincipal && (
                        <Star className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Fonction</label>
                      <p className="text-[#191919]">{selectedContact.fonction}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Département</label>
                      <p className="text-[#191919]">{selectedContact.departement}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Entreprise</label>
                      <p className="text-[#191919]">{selectedContact.tiers}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Langue préférée</label>
                      <p className="text-[#191919]">{selectedContact.languePrefere}</p>
                    </div>
                  </div>
                </div>

                {/* Informations de contact */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#191919]">Informations de Contact</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {selectedContact.telephone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-[#191919]">{selectedContact.telephone}</span>
                      </div>
                    )}
                    {selectedContact.mobile && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-[#191919]">{selectedContact.mobile} (Mobile)</span>
                      </div>
                    )}
                    {selectedContact.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-[#191919]">{selectedContact.email}</span>
                      </div>
                    )}
                    {selectedContact.linkedin && (
                      <div className="flex items-center space-x-2">
                        <Linkedin className="w-4 h-4 text-gray-400" />
                        <span className="text-[#191919]">{selectedContact.linkedin}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#191919]">Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-[#191919]">{selectedContact.notes || 'Aucune note'}</p>
                  </div>
                </div>

                {/* Interactions récentes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#191919]">Interactions Récentes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedContact.interactions.length > 0 ? (
                      <div className="space-y-3">
                        {selectedContact.interactions.slice(0, 3).map((interaction) => {
                          const IconComponent = getInteractionIcon(interaction.type);
                          return (
                            <div key={interaction.id} className="flex items-start space-x-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getInteractionTypeColor(interaction.type)}`}>
                                <IconComponent className="w-3 h-3" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-[#191919]">{interaction.sujet}</p>
                                <p className="text-xs text-[#666666]">{formatDate(interaction.date)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[#666666] text-center">Aucune interaction</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Fermer
                </button>
                <button className="px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC]">
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organigramme Tab */}
      {activeTab === 'organigramme' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Organigramme des Contacts</h3>
            <p className="text-[#666666]">Visualisation hiérarchique des contacts par entreprise</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsModule;