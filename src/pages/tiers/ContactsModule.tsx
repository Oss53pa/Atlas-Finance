import React, { useState, useEffect } from 'react';
import { formatDate } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import {
  UserCheck, Plus, Search, Filter, Download, Eye, Edit, Trash2,
  ArrowLeft, Phone, Mail, MapPin, Calendar, User, Building,
  MessageSquare, Activity, Clock, Star, Heart, Award,
  BarChart3, PieChart, TrendingUp, Users, Globe, Linkedin
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { Contact, Interaction, ThirdParty } from '../../types/tiers';

const ContactsModule: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('liste');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTiers, setFilterTiers] = useState('tous');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<(Contact & { tiers: string }) | null>(null);
  const [contactToDelete, setContactToDelete] = useState<(Contact & { tiers: string }) | null>(null);
  const [contactForInteraction, setContactForInteraction] = useState<(Contact & { tiers: string }) | null>(null);
  const [showInteractionDetailModal, setShowInteractionDetailModal] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<any>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set(['SARL CONGO BUSINESS', 'STE AFRICAINE TECH']));

  // Data from DataContext
  const { adapter } = useData();
  const [thirdParties, setThirdParties] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const tps = await adapter.getAll('thirdParties');
      setThirdParties(tps as any[]);
    };
    load();
  }, [adapter]);

  // Map third parties to contact format
  const mockContacts: (Contact & { tiers: string })[] = thirdParties.map((tp) => ({
    id: tp.id,
    tiersId: tp.id,
    tiers: tp.name,
    civilite: 'M',
    prenom: tp.name.split(' ')[0] || '',
    nom: tp.name.split(' ').slice(1).join(' ') || tp.name,
    fonction: tp.type === 'customer' ? 'Client' : tp.type === 'supplier' ? 'Fournisseur' : 'Client/Fournisseur',
    departement: tp.type === 'customer' ? 'Commercial' : tp.type === 'supplier' ? 'Achats' : 'Direction',
    telephone: tp.phone || '',
    email: tp.email || '',
    isPrincipal: true,
    isActif: tp.isActive,
    languePrefere: 'Français',
    notes: tp.address || '',
    interactions: [],
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  }));

  const tabs = [
    { id: 'liste', label: 'Liste Contacts', icon: UserCheck },
    { id: 'interactions', label: 'Interactions', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'organigramme', label: 'Organigramme', icon: Users }
  ];

  const tiersOptions = [
    { value: 'tous', label: 'Tous les tiers' },
    { value: 'clients', label: t('navigation.clients') },
    { value: 'fournisseurs', label: t('navigation.suppliers') },
    { value: 'prospects', label: 'Prospects' }
  ];

  const statutOptions = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'actif', label: 'Actif' },
    { value: 'inactif', label: 'Inactif' }
  ];

  const getCiviliteColor = (civilite: string) => {
    const colors = {
      'M': 'bg-[#171717]/10 text-[#171717]',
      'MME': 'bg-pink-100 text-pink-800',
      'MLLE': 'bg-[#525252]/10 text-[#525252]',
      'DR': 'bg-green-100 text-green-800',
      'PR': 'bg-gray-100 text-gray-800'
    };
    return colors[civilite as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getInteractionTypeColor = (type: string) => {
    const colors = {
      'APPEL': 'bg-[#171717]/10 text-[#171717]',
      'EMAIL': 'bg-green-100 text-green-800',
      'RENCONTRE': 'bg-[#525252]/10 text-[#525252]',
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

  const COLORS = ['#171717', '#525252', '#a3a3a3', '#3b82f6', '#22c55e', '#f59e0b'];

  return (
    <div className="p-6 bg-[#e5e5e5] min-h-screen ">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/tiers')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#404040]" />
              <span className="text-sm font-semibold text-[#404040]">Tiers</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#171717]">Gestion des Communications</h1>
                <p className="text-sm text-[#525252]">Centralisation et suivi des communications avec les tiers</p>
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

            <button className="flex items-center space-x-2 px-4 py-2 bg-[#737373] text-white rounded-lg hover:bg-[#525252] transition-colors" aria-label="Télécharger">
              <Download className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('common.export')}</span>
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
                  ? 'bg-white text-[#737373] shadow-sm'
                  : 'text-[#525252] hover:text-[#404040]'
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
          <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom, email ou entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#737373] focus:border-transparent"
                />
              </div>

              <select
                value={filterTiers}
                onChange={(e) => setFilterTiers(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#737373]"
              >
                {tiersOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#737373]"
              >
                {statutOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50" aria-label="Filtrer">
                <Filter className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Contacts Table */}
          <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Entreprise</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Fonction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Communications</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Interactions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
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
                            <div className="text-sm text-gray-700">{contact.departement}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 text-gray-700 mr-2" />
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
                          <MessageSquare className="w-4 h-4 text-gray-700 mr-2" />
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
                            className="p-1 text-[#171717] hover:text-[#171717]/80"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setContactForInteraction(contact);
                              setShowInteractionModal(true);
                            }}
                            className="p-1 text-[#525252] hover:text-[#525252]/80"
                            title="Nouvelle interaction"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setContactToEdit(contact);
                              setShowEditModal(true);
                            }}
                            className="p-1 text-green-600 hover:text-green-900"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setContactToDelete(contact);
                              setShowDeleteModal(true);
                            }}
                            className="p-1 text-red-600 hover:text-red-900"
                            aria-label="Supprimer"
                            title="Supprimer"
                          >
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
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Total Interactions</p>
                  <p className="text-lg font-bold text-[#171717]">{allInteractions.length}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-[#171717]" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Cette Semaine</p>
                  <p className="text-lg font-bold text-[#171717]">15</p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">En Attente</p>
                  <p className="text-lg font-bold text-[#171717]">3</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Taux Réponse</p>
                  <p className="text-lg font-bold text-[#171717]">94%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#525252]" />
              </div>
            </div>
          </div>

          {/* Recent Interactions */}
          <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
            <h3 className="text-lg font-semibold text-[#171717] mb-4">Interactions Récentes</h3>
            <div className="space-y-4">
              {allInteractions.slice(0, 10).map((interaction) => {
                const IconComponent = getInteractionIcon(interaction.type);
                return (
                  <div key={interaction.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getInteractionTypeColor(interaction.type)}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-[#171717]">{interaction.sujet}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-[#525252]">{formatDate(interaction.date)}</span>
                          <button
                            onClick={() => {
                              setSelectedInteraction(interaction);
                              setShowInteractionDetailModal(true);
                            }}
                            className="p-1.5 bg-[#171717]/10 text-[#171717] rounded-lg hover:bg-[#171717]/20 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-[#525252] mt-1">{interaction.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-[#171717]">{interaction.contactNom}</span>
                          <span className="text-sm text-[#525252]">•</span>
                          <span className="text-sm text-[#525252]">{interaction.contactEntreprise}</span>
                        </div>
                        <span className="text-sm text-[#525252]">par {interaction.responsable}</span>
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
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Répartition par Type de Tiers</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    dataKey="count"
                    data={analyticsData.repartitionTiers}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#737373"
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
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Évolution des Interactions</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.interactionsParMois}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="emails" stackId="1" stroke="#737373" fill="#737373" />
                  <Area type="monotone" dataKey="appels" stackId="1" stroke="#525252" fill="#525252" />
                  <Area type="monotone" dataKey="rencontres" stackId="1" stroke="#525252" fill="#525252" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top interacteurs */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Top Interacteurs</h3>
              <div className="space-y-3">
                {analyticsData.topInteracteurs.map((contact, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-green-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-[#171717]">{contact.nom}</p>
                        <p className="text-sm text-[#525252]">{contact.entreprise}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[#171717]">{contact.interactions} interactions</p>
                      <p className="text-sm text-[#525252]">Dernière: {formatDate(contact.derniere)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Répartition par fonction */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Répartition par Fonction</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.repartitionFonctions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fonction" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#737373" />
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
                <h2 className="text-lg font-bold text-[#171717]">Détails Contact</h2>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informations personnelles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#171717]">Informations Personnelles</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCiviliteColor(selectedContact.civilite)}`}>
                        {selectedContact.civilite}
                      </span>
                      <span className="font-medium text-[#171717]">
                        {selectedContact.prenom} {selectedContact.nom}
                      </span>
                      {selectedContact.isPrincipal && (
                        <Star className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Fonction</label>
                      <p className="text-[#171717]">{selectedContact.fonction}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Département</label>
                      <p className="text-[#171717]">{selectedContact.departement}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Entreprise</label>
                      <p className="text-[#171717]">{selectedContact.tiers}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Langue préférée</label>
                      <p className="text-[#171717]">{selectedContact.languePrefere}</p>
                    </div>
                  </div>
                </div>

                {/* Informations de contact */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#171717]">Informations de Contact</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {selectedContact.telephone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-700" />
                        <span className="text-[#171717]">{selectedContact.telephone}</span>
                      </div>
                    )}
                    {selectedContact.mobile && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-700" />
                        <span className="text-[#171717]">{selectedContact.mobile} (Mobile)</span>
                      </div>
                    )}
                    {selectedContact.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-700" />
                        <span className="text-[#171717]">{selectedContact.email}</span>
                      </div>
                    )}
                    {selectedContact.linkedin && (
                      <div className="flex items-center space-x-2">
                        <Linkedin className="w-4 h-4 text-gray-700" />
                        <span className="text-[#171717]">{selectedContact.linkedin}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#171717]">Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-[#171717]">{selectedContact.notes || 'Aucune note'}</p>
                  </div>
                </div>

                {/* Interactions récentes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#171717]">Interactions Récentes</h3>
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
                                <p className="text-sm font-medium text-[#171717]">{interaction.sujet}</p>
                                <p className="text-xs text-[#525252]">{formatDate(interaction.date)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[#525252] text-center">Aucune interaction</p>
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
                <button className="px-4 py-2 bg-[#737373] text-white rounded-lg hover:bg-[#525252]">
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organigramme Tab */}
      {activeTab === 'organigramme' && (
        <div className="space-y-6">
          {/* Header avec statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Entreprises</p>
                  <p className="text-lg font-bold text-[#171717]">
                    {[...new Set(mockContacts.map(c => c.tiers))].length}
                  </p>
                </div>
                <Building className="w-8 h-8 text-[#171717]" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Total Contacts</p>
                  <p className="text-lg font-bold text-[#171717]">{mockContacts.length}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Contacts Principaux</p>
                  <p className="text-lg font-bold text-[#171717]">
                    {mockContacts.filter(c => c.isPrincipal).length}
                  </p>
                </div>
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Départements</p>
                  <p className="text-lg font-bold text-[#171717]">
                    {[...new Set(mockContacts.map(c => c.departement).filter(Boolean))].length}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-[#525252]" />
              </div>
            </div>
          </div>

          {/* Organigramme hiérarchique */}
          <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#171717] to-[#262626] flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#171717]">Organigramme par Entreprise</h3>
                  <p className="text-sm text-[#525252]">Visualisation hiérarchique des contacts</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const allCompanies = [...new Set(mockContacts.map(c => c.tiers))];
                    setExpandedCompanies(new Set(allCompanies));
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Tout déplier
                </button>
                <button
                  onClick={() => setExpandedCompanies(new Set())}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Tout replier
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Grouper les contacts par entreprise */}
              {[...new Set(mockContacts.map(c => c.tiers))].map((entreprise) => {
                const contactsEntreprise = mockContacts.filter(c => c.tiers === entreprise);
                const isExpanded = expandedCompanies.has(entreprise);
                const contactPrincipal = contactsEntreprise.find(c => c.isPrincipal);
                const departements = [...new Set(contactsEntreprise.map(c => c.departement).filter(Boolean))];

                return (
                  <div key={entreprise} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* En-tête entreprise */}
                    <div
                      className="bg-gradient-to-r from-[#171717]/10 to-[#171717]/5 p-4 cursor-pointer hover:from-[#171717]/15 hover:to-[#171717]/10 transition-colors"
                      onClick={() => {
                        const newExpanded = new Set(expandedCompanies);
                        if (isExpanded) {
                          newExpanded.delete(entreprise);
                        } else {
                          newExpanded.add(entreprise);
                        }
                        setExpandedCompanies(newExpanded);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-[#171717] rounded-xl flex items-center justify-center shadow-md">
                            <Building className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-[#171717]">{entreprise}</h4>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className="text-sm text-[#525252] flex items-center">
                                <Users className="w-3 h-3 mr-1" />
                                {contactsEntreprise.length} contact{contactsEntreprise.length > 1 ? 's' : ''}
                              </span>
                              <span className="text-sm text-[#525252] flex items-center">
                                <Activity className="w-3 h-3 mr-1" />
                                {departements.length} département{departements.length > 1 ? 's' : ''}
                              </span>
                              {contactPrincipal && (
                                <span className="text-sm text-yellow-600 flex items-center">
                                  <Star className="w-3 h-3 mr-1" />
                                  {contactPrincipal.prenom} {contactPrincipal.nom}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex -space-x-2">
                            {contactsEntreprise.slice(0, 3).map((contact, idx) => (
                              <div
                                key={contact.id}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white ${
                                  contact.isPrincipal ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                }`}
                                title={`${contact.prenom} ${contact.nom}`}
                              >
                                {contact.prenom[0]}{contact.nom[0]}
                              </div>
                            ))}
                            {contactsEntreprise.length > 3 && (
                              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold border-2 border-white">
                                +{contactsEntreprise.length - 3}
                              </div>
                            )}
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Contenu déplié - Organigramme */}
                    {isExpanded && (
                      <div className="p-4 bg-white">
                        {/* Contact principal en haut */}
                        {contactPrincipal && (
                          <div className="flex flex-col items-center mb-6">
                            <div className="relative">
                              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-lg font-bold text-white">
                                  {contactPrincipal.prenom[0]}{contactPrincipal.nom[0]}
                                </span>
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white">
                                <Star className="w-3 h-3 text-white" />
                              </div>
                            </div>
                            <div className="mt-3 text-center">
                              <p className="font-bold text-[#171717]">{contactPrincipal.prenom} {contactPrincipal.nom}</p>
                              <p className="text-sm text-[#171717] font-medium">{contactPrincipal.fonction}</p>
                              <p className="text-xs text-[#525252]">{contactPrincipal.departement}</p>
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              {contactPrincipal.telephone && (
                                <a href={`tel:${contactPrincipal.telephone}`} className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200">
                                  <Phone className="w-3 h-3" />
                                </a>
                              )}
                              {contactPrincipal.email && (
                                <a href={`mailto:${contactPrincipal.email}`} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200">
                                  <Mail className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                onClick={() => setSelectedContact(contactPrincipal)}
                                className="p-1.5 bg-[#171717]/10 text-[#171717] rounded-lg hover:bg-[#171717]/20"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                            </div>
                            {/* Ligne de connexion */}
                            {contactsEntreprise.filter(c => !c.isPrincipal).length > 0 && (
                              <div className="w-0.5 h-8 bg-gray-300 mt-4"></div>
                            )}
                          </div>
                        )}

                        {/* Contacts secondaires par département */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {contactsEntreprise.filter(c => !c.isPrincipal).map((contact) => (
                            <div
                              key={contact.id}
                              className="relative bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-[#171717] hover:shadow-md transition-all"
                            >
                              {/* Ligne de connexion vers le haut */}
                              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-0.5 h-4 bg-gray-300"></div>

                              <div className="flex items-start space-x-3">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-sm font-bold text-green-700">
                                    {contact.prenom[0]}{contact.nom[0]}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-[#171717] truncate">
                                    {contact.prenom} {contact.nom}
                                  </p>
                                  <p className="text-sm text-[#171717] truncate">{contact.fonction}</p>
                                  {contact.departement && (
                                    <span className="inline-flex items-center px-2 py-0.5 mt-1 text-xs bg-gray-200 text-gray-700 rounded-full">
                                      {contact.departement}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center space-x-1">
                                  {contact.telephone && (
                                    <a
                                      href={`tel:${contact.telephone}`}
                                      className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                      title={contact.telephone}
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {contact.email && (
                                    <a
                                      href={`mailto:${contact.email}`}
                                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title={contact.email}
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {contact.linkedin && (
                                    <a
                                      href={`https://linkedin.com/in/${contact.linkedin}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 text-gray-600 hover:text-[#0077b5] hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                      <Linkedin className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                                <button
                                  onClick={() => setSelectedContact(contact)}
                                  className="p-1.5 bg-[#171717]/10 text-[#171717] rounded-lg hover:bg-[#171717]/20 transition-colors"
                                  title="Voir les détails"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Badge nombre d'interactions */}
                              {contact.interactions.length > 0 && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#525252] rounded-full flex items-center justify-center text-xs font-bold text-white">
                                  {contact.interactions.length}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Message si aucun autre contact */}
                        {contactsEntreprise.filter(c => !c.isPrincipal).length === 0 && contactPrincipal && (
                          <div className="text-center py-4 text-gray-500">
                            <p className="text-sm">Seul le contact principal est enregistré pour cette entreprise</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Légende */}
          <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
            <h4 className="text-sm font-semibold text-[#171717] mb-3">Légende</h4>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-[#525252]">Contact principal</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-green-700" />
                </div>
                <span className="text-sm text-[#525252]">Contact secondaire</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-[#525252] rounded-full flex items-center justify-center text-[10px] font-bold text-white">3</div>
                <span className="text-sm text-[#525252]">Nombre d'interactions</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Nouveau contact</h3>
                    <p className="text-sm text-gray-700">Ajouter un contact à un tiers</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-gray-700 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiers associé <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Sélectionner un tiers</option>
                    <option value="1">SARL CONGO BUSINESS</option>
                    <option value="2">SA CENTRAL AFRICA</option>
                    <option value="3">ETS DIGITAL SOLUTIONS</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Civilité <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="M">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Mlle">Mlle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Jean"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="MAMBOU"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fonction <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Directeur Commercial"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Département
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Commercial"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone fixe <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+242 06 123 45 67"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile
                    </label>
                    <input
                      type="tel"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+242 06 987 65 43"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="contact@email.cg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LinkedIn
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="profil-linkedin"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de naissance
                    </label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Langue préférée
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="Français">Français</option>
                      <option value="Anglais">Anglais</option>
                      <option value="Lingala">Lingala</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Contact principal</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" defaultChecked />
                    <span className="text-sm text-gray-700">Actif</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Informations complémentaires sur le contact..."
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Créer le contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interaction Modal */}
      {showInteractionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Nouvelle interaction</h3>
                    <p className="text-sm text-gray-700">
                      {contactForInteraction
                        ? `Communication avec ${contactForInteraction.prenom} ${contactForInteraction.nom}`
                        : 'Enregistrer une interaction avec un contact'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowInteractionModal(false);
                    setContactForInteraction(null);
                  }}
                  className="text-gray-700 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Affichage du contact sélectionné */}
                {contactForInteraction && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {contactForInteraction.prenom} {contactForInteraction.nom}
                        </p>
                        <p className="text-sm text-gray-600">
                          {contactForInteraction.fonction} - {contactForInteraction.tiers}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!contactForInteraction && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="">Sélectionner un contact</option>
                      {mockContacts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.prenom} {c.nom} - {c.tiers}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type d'interaction <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="APPEL">Appel téléphonique</option>
                      <option value="EMAIL">Email</option>
                      <option value="REUNION">Réunion</option>
                      <option value="VISITE">Visite</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objet de l'interaction <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Ex: Suivi commande, Négociation contrat..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Compte-rendu <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Détails de l'interaction, points discutés, décisions prises..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prochaine action
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Action de suivi à planifier"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de suivi
                    </label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Responsable
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="Marie Kouam">Marie Kouam</option>
                      <option value="Jean Dupont">Jean Dupont</option>
                      <option value="Sophie Martin">Sophie Martin</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Historique des interactions</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Toutes les interactions sont tracées et disponibles dans l'historique du contact
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowInteractionModal(false);
                  setContactForInteraction(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Enregistrer l'interaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditModal && contactToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Edit className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Modifier le contact</h3>
                    <p className="text-sm text-gray-700">
                      {contactToEdit.prenom} {contactToEdit.nom} - {contactToEdit.tiers}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setContactToEdit(null);
                  }}
                  className="text-gray-700 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiers associé <span className="text-red-500">*</span>
                  </label>
                  <select
                    defaultValue={contactToEdit.tiersId}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un tiers</option>
                    <option value="1">SARL CONGO BUSINESS</option>
                    <option value="2">STE AFRICAINE TECH</option>
                    <option value="3">CEMAC SUPPLIES</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Civilité <span className="text-red-500">*</span>
                    </label>
                    <select
                      defaultValue={contactToEdit.civilite}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="M">M.</option>
                      <option value="MME">Mme</option>
                      <option value="MLLE">Mlle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      defaultValue={contactToEdit.prenom}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      defaultValue={contactToEdit.nom}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fonction <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      defaultValue={contactToEdit.fonction}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Département
                    </label>
                    <input
                      type="text"
                      defaultValue={contactToEdit.departement || ''}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone fixe
                    </label>
                    <input
                      type="tel"
                      defaultValue={contactToEdit.telephone || ''}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile
                    </label>
                    <input
                      type="tel"
                      defaultValue={contactToEdit.mobile || ''}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      defaultValue={contactToEdit.email || ''}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LinkedIn
                    </label>
                    <input
                      type="text"
                      defaultValue={contactToEdit.linkedin || ''}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de naissance
                    </label>
                    <input
                      type="date"
                      defaultValue={contactToEdit.dateNaissance || ''}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Langue préférée
                    </label>
                    <select
                      defaultValue={contactToEdit.languePrefere || 'Français'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="Français">Français</option>
                      <option value="Anglais">Anglais</option>
                      <option value="Lingala">Lingala</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked={contactToEdit.isPrincipal}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">Contact principal</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked={contactToEdit.isActif}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">Actif</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    defaultValue={contactToEdit.notes || ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Informations complémentaires sur le contact..."
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setContactToEdit(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && contactToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Supprimer le contact</h3>
                  <p className="text-sm text-gray-600">Cette action est irréversible</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  Vous êtes sur le point de supprimer le contact :
                </p>
                <p className="font-medium text-gray-900 mt-2">
                  {contactToDelete.civilite} {contactToDelete.prenom} {contactToDelete.nom}
                </p>
                <p className="text-sm text-gray-600">
                  {contactToDelete.fonction} - {contactToDelete.tiers}
                </p>
                {contactToDelete.interactions.length > 0 && (
                  <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-sm text-orange-800">
                      ⚠️ Ce contact a {contactToDelete.interactions.length} interaction(s) enregistrée(s).
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setContactToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    // Simuler la suppression
                    setShowDeleteModal(false);
                    setContactToDelete(null);
                    // Afficher un toast ou notification ici
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Confirmer la suppression
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interaction Detail Modal */}
      {showInteractionDetailModal && selectedInteraction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getInteractionTypeColor(selectedInteraction.type)}`}>
                    {(() => {
                      const IconComponent = getInteractionIcon(selectedInteraction.type);
                      return <IconComponent className="w-5 h-5" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Détails de l'interaction</h3>
                    <p className="text-sm text-gray-700">{selectedInteraction.sujet}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowInteractionDetailModal(false);
                    setSelectedInteraction(null);
                  }}
                  className="text-gray-700 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Informations principales */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase">Type</label>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`px-2 py-1 text-sm font-medium rounded-full ${getInteractionTypeColor(selectedInteraction.type)}`}>
                        {selectedInteraction.type === 'APPEL' ? 'Appel téléphonique' :
                         selectedInteraction.type === 'EMAIL' ? 'Email' :
                         selectedInteraction.type === 'RENCONTRE' ? 'Réunion/Rencontre' :
                         selectedInteraction.type === 'VISITE' ? 'Visite' :
                         selectedInteraction.type}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase">Date</label>
                    <p className="mt-1 text-gray-900 font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      {formatDate(selectedInteraction.date)}
                    </p>
                  </div>
                </div>

                {/* Contact concerné */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <label className="text-xs font-medium text-green-600 uppercase">Contact concerné</label>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedInteraction.contactNom}</p>
                      <p className="text-sm text-gray-600">{selectedInteraction.contactEntreprise}</p>
                    </div>
                  </div>
                </div>

                {/* Objet */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Objet de l'interaction</label>
                  <p className="mt-1 text-gray-900 font-medium text-lg">{selectedInteraction.sujet}</p>
                </div>

                {/* Description / Compte-rendu */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Compte-rendu</label>
                  <div className="mt-2 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedInteraction.description}</p>
                  </div>
                </div>

                {/* Résultats si disponible */}
                {selectedInteraction.resultats && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Résultats / Décisions</label>
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800">{selectedInteraction.resultats}</p>
                    </div>
                  </div>
                )}

                {/* Informations complémentaires */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase">Responsable</label>
                    <p className="mt-1 text-gray-900 font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600" />
                      {selectedInteraction.responsable}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase">Statut</label>
                    <p className="mt-1">
                      <span className={`px-2 py-1 text-sm font-medium rounded-full ${
                        selectedInteraction.statut === 'TERMINE' ? 'bg-green-100 text-green-800' :
                        selectedInteraction.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedInteraction.statut === 'TERMINE' ? 'Terminé' :
                         selectedInteraction.statut === 'EN_COURS' ? 'En cours' :
                         selectedInteraction.statut}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Prochaine action */}
                {selectedInteraction.prochaineSuivi && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <label className="text-xs font-medium text-orange-600 uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Prochaine action / Suivi
                    </label>
                    <p className="mt-1 text-orange-800 font-medium">
                      {formatDate(selectedInteraction.prochaineSuivi)}
                    </p>
                  </div>
                )}

                {/* Metadata */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Créé le {selectedInteraction.createdAt ? new Date(selectedInteraction.createdAt).toLocaleString('fr-FR') : 'N/A'}</span>
                    <span>ID: {selectedInteraction.id}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200 flex justify-between">
              <button
                onClick={() => {
                  // Trouver le contact et ouvrir le modal d'édition d'interaction
                  setShowInteractionDetailModal(false);
                  setSelectedInteraction(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Fermer
              </button>
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm font-medium text-[#171717] bg-[#171717]/10 hover:bg-[#171717]/20 rounded-lg transition-colors flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => {
                    // Créer une nouvelle interaction de suivi
                    setShowInteractionDetailModal(false);
                    setSelectedInteraction(null);
                    setShowInteractionModal(true);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Nouvelle interaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsModule;