
import React, { useState, useEffect } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
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
  const [showFilters, setShowFilters] = useState(false);
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

  const reloadTps = React.useCallback(async () => {
    const tps = await adapter.getAll('thirdParties');
    setThirdParties(tps as Record<string, unknown>[]);
  }, [adapter]);
  useEffect(() => { reloadTps(); }, [reloadTps]);

  // Création RÉELLE (les contacts sont dérivés des tiers → on crée un tiers persistant).
  const handleCreateContact = async () => {
    const nom = window.prompt(t('contacts.promptContactName'))?.trim();
    if (!nom) return;
    try {
      await adapter.create('thirdParties', {
        name: nom, code: nom.slice(0, 6).toUpperCase().replace(/\s/g, ''),
        type: 'customer', accountCode: '411000', balance: 0,
      } as any);
      await reloadTps();
      setShowContactModal(false);
    } catch { /* best-effort */ }
  };

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

  // Libellés d'affichage (la donnée interne reste en français : elle sert de clé de regroupement).
  const roleLabel = (f?: string) =>
    f === 'Client' ? t('contacts.roleCustomer')
      : f === 'Fournisseur' ? t('contacts.roleSupplier')
      : f === 'Client/Fournisseur' ? t('contacts.roleCustomerSupplier')
      : (f || '');
  const deptLabel = (d?: string) =>
    d === 'Commercial' ? t('contacts.deptSales')
      : d === 'Achats' ? t('contacts.deptPurchasing')
      : d === 'Direction' ? t('contacts.deptManagement')
      : (d || '');
  const langLabel = (l?: string) =>
    l === 'Français' ? t('contacts.langFrench')
      : l === 'Anglais' ? t('contacts.langEnglish')
      : l === 'Lingala' ? t('contacts.langLingala')
      : (l || '');

  const tabs = [
    { id: 'liste', label: t('contacts.tabList'), icon: UserCheck },
    { id: 'interactions', label: t('contacts.tabInteractions'), icon: MessageSquare },
    { id: 'analytics', label: t('contacts.tabAnalytics'), icon: BarChart3 },
    { id: 'organigramme', label: t('contacts.tabOrgChart'), icon: Users }
  ];

  const tiersOptions = [
    { value: 'tous', label: t('contacts.allTiers') },
    { value: 'clients', label: t('navigation.clients') },
    { value: 'fournisseurs', label: t('navigation.suppliers') },
    { value: 'prospects', label: t('contacts.prospects') }
  ];

  const statutOptions = [
    { value: 'tous', label: t('contacts.allStatuses') },
    { value: 'actif', label: t('contacts.statusActive') },
    { value: 'inactif', label: t('contacts.statusInactive') }
  ];

  const getCiviliteColor = (civilite: string) => {
    const colors = {
      'M': 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
      'MME': 'bg-primary-100 text-primary-800',
      'MLLE': 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]',
      'DR': 'bg-green-100 text-green-800',
      'PR': 'bg-gray-100 text-gray-800'
    };
    return colors[civilite as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getInteractionTypeColor = (type: string) => {
    const colors = {
      'APPEL': 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
      'EMAIL': 'bg-green-100 text-green-800',
      'RENCONTRE': 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]',
      'VISITE': 'bg-orange-100 text-orange-800',
      'DEMONSTRATION': 'bg-primary-100 text-primary-800',
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

  // Analytics calculées sur les tiers RÉELS (répartition par type / département).
  const analyticsData = (() => {
    const list = mockContacts;
    const total = list.length;
    const types: Record<string, number> = { Clients: 0, Fournisseurs: 0, 'Client/Fournisseur': 0 };
    for (const c of list) {
      const key = c.fonction === 'Client' ? 'Clients' : c.fonction === 'Fournisseur' ? 'Fournisseurs' : 'Client/Fournisseur';
      types[key] = (types[key] || 0) + 1;
    }
    const repartitionTiers = Object.entries(types)
      .filter(([, n]) => n > 0)
      .map(([type, count]) => ({
        type: type === 'Clients' ? t('contacts.typeCustomers')
          : type === 'Fournisseurs' ? t('contacts.typeSuppliers')
          : t('contacts.roleCustomerSupplier'),
        count,
        pourcentage: total ? Math.round((count / total) * 100) : 0,
      }));
    const byDept = new Map<string, number>();
    for (const c of list) {
      const dept = c.departement || '—';
      byDept.set(dept, (byDept.get(dept) || 0) + 1);
    }
    const repartitionFonctions = Array.from(byDept.entries()).map(([fonction, count]) => ({ fonction: deptLabel(fonction), count }));
    return {
      repartitionTiers,
      interactionsParMois: [] as { mois: string; appels: number; emails: number; rencontres: number }[],
      topInteracteurs: [] as { nom: string; entreprise: string; interactions: number; derniere: string }[],
      repartitionFonctions,
    };
  })();

  // Récupérer toutes les interactions de tous les contacts
  const allInteractions = mockContacts.flatMap(contact =>
    contact.interactions.map(interaction => ({
      ...interaction,
      contactNom: `${contact.prenom} ${contact.nom}`,
      contactEntreprise: contact.tiers,
      contactId: contact.id
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const COLORS = ['#235A6E', '#E89A2E', '#15803D', '#4E7E8D', '#C77E2C', '#7FA3AF'];

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-screen ">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/tiers')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#404040]" />
              <span className="text-sm font-semibold text-[#404040]">{t('contacts.backToTiers')}</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--color-primary)]">{t('contacts.title')}</h1>
                <p className="text-sm text-[var(--color-text-secondary)]">{t('contacts.subtitle')}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <PageHeaderActions
              onToggleFilters={() => setShowFilters((v) => !v)}
              filtersOpen={showFilters}
              activeFilters={[searchTerm !== '', filterTiers !== 'tous', filterStatut !== 'tous'].filter(Boolean).length}
            />
            <button
              onClick={() => setShowContactModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('contacts.newContactBtn')}</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-text-tertiary)] text-white rounded-lg hover:bg-[var(--color-text-secondary)] transition-colors" aria-label={t('contacts.downloadAria')}>
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
                  ? 'bg-white text-[var(--color-text-tertiary)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[#404040]'
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
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700" />
                <input
                  type="text"
                  placeholder={t('contacts.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-tertiary)] focus:border-transparent"
                />
              </div>

              {showFilters && (
              <>
              <select
                value={filterTiers}
                onChange={(e) => setFilterTiers(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-tertiary)]"
              >
                {tiersOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-tertiary)]"
              >
                {statutOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              </>
              )}

              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50" aria-label={t('contacts.filterAria')}>
                <Filter className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Contacts Table */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('contacts.colContact')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('contacts.colCompany')}</th>
                    <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('contacts.colRole')}</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('contacts.colCommunications')}</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('contacts.colInteractions')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('contacts.colStatus')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('contacts.colActions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="sticky left-0 z-10 bg-white px-4 py-4 whitespace-nowrap">
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
                            <div className="text-sm text-gray-700">{deptLabel(contact.departement)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 text-gray-700 mr-2" />
                          <span className="text-sm text-gray-900">{contact.tiers}</span>
                        </div>
                      </td>
                      <td className="hidden xl:table-cell px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {roleLabel(contact.fonction)}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-4 whitespace-nowrap">
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
                      <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MessageSquare className="w-4 h-4 text-gray-700 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {contact.interactions.length}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          contact.isActif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {contact.isActif ? t('contacts.statusActive') : t('contacts.statusInactive')}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2 justify-end">
                          <button
                            onClick={() => setSelectedContact(contact)}
                            className="p-1 text-[var(--color-primary)] hover:text-[var(--color-primary)]/80"
                            title={t('contacts.viewDetails')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setContactForInteraction(contact);
                              setShowInteractionModal(true);
                            }}
                            className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-secondary)]/80"
                            title={t('contacts.newInteraction')}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setContactToEdit(contact);
                              setShowEditModal(true);
                            }}
                            className="p-1 text-green-600 hover:text-green-900"
                            title={t('contacts.edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setContactToDelete(contact);
                              setShowDeleteModal(true);
                            }}
                            className="p-1 text-red-600 hover:text-red-900"
                            aria-label={t('contacts.delete')}
                            title={t('contacts.delete')}
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
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('contacts.totalInteractions')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">{allInteractions.length}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-[var(--color-primary)]" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('contacts.thisWeek')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">15</p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('contacts.pending')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">3</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('contacts.responseRate')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">94%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-[var(--color-text-secondary)]" />
              </div>
            </div>
          </div>

          {/* Recent Interactions */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('contacts.recentInteractions')}</h3>
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
                        <h4 className="font-medium text-[var(--color-primary)]">{interaction.sujet}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-[var(--color-text-secondary)]">{formatDate(interaction.date)}</span>
                          <button
                            onClick={() => {
                              setSelectedInteraction(interaction);
                              setShowInteractionDetailModal(true);
                            }}
                            className="p-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors"
                            title={t('contacts.viewDetails')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1">{interaction.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-[var(--color-primary)]">{interaction.contactNom}</span>
                          <span className="text-sm text-[var(--color-text-secondary)]">•</span>
                          <span className="text-sm text-[var(--color-text-secondary)]">{interaction.contactEntreprise}</span>
                        </div>
                        <span className="text-sm text-[var(--color-text-secondary)]">{t('contacts.byResponsible', { name: String(interaction.responsable ?? '') })}</span>
                      </div>
                      {interaction.prochaineSuivi && (
                        <div className="flex items-center mt-2">
                          <Clock className="w-4 h-4 text-orange-500 mr-1" />
                          <span className="text-sm text-orange-600">
                            {t('contacts.followUpScheduled', { date: formatDate(interaction.prochaineSuivi) })}
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
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('contacts.distributionByTierType')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    dataKey="count"
                    data={analyticsData.repartitionTiers}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#235A6E"
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
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('contacts.interactionsTrend')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.interactionsParMois}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="emails" stackId="1" stroke="#235A6E" fill="#235A6E" />
                  <Area type="monotone" dataKey="appels" stackId="1" stroke="#4E7E8D" fill="#4E7E8D" />
                  <Area type="monotone" dataKey="rencontres" stackId="1" stroke="#4E7E8D" fill="#4E7E8D" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top interacteurs */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('contacts.topInteractors')}</h3>
              <div className="space-y-3">
                {analyticsData.topInteracteurs.map((contact, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-green-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-primary)]">{contact.nom}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">{contact.entreprise}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[var(--color-primary)]">{t('contacts.interactionsCount', { count: String(contact.interactions) })}</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">{t('contacts.lastLabel', { date: formatDate(contact.derniere) })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Répartition par fonction */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('contacts.distributionByDepartment')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.repartitionFonctions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fonction" />
                  <YAxis />
                  <Tooltip />
                  <Bar radius={[6,6,0,0]} dataKey="count" fill="url(#gradPetrol)" />
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
                <h2 className="text-lg font-bold text-[var(--color-primary)]">{t('contacts.contactDetails')}</h2>
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
                  <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('contacts.personalInfo')}</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCiviliteColor(selectedContact.civilite)}`}>
                        {selectedContact.civilite}
                      </span>
                      <span className="font-medium text-[var(--color-primary)]">
                        {selectedContact.prenom} {selectedContact.nom}
                      </span>
                      {selectedContact.isPrincipal && (
                        <Star className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('contacts.fieldRole')}</label>
                      <p className="text-[var(--color-primary)]">{roleLabel(selectedContact.fonction)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('contacts.fieldDepartment')}</label>
                      <p className="text-[var(--color-primary)]">{deptLabel(selectedContact.departement)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('contacts.fieldCompany')}</label>
                      <p className="text-[var(--color-primary)]">{selectedContact.tiersId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('contacts.fieldPreferredLanguage')}</label>
                      <p className="text-[var(--color-primary)]">{langLabel(selectedContact.languePrefere)}</p>
                    </div>
                  </div>
                </div>

                {/* Informations de contact */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('contacts.contactInfo')}</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {selectedContact.telephone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-700" />
                        <span className="text-[var(--color-primary)]">{selectedContact.telephone}</span>
                      </div>
                    )}
                    {selectedContact.mobile && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-700" />
                        <span className="text-[var(--color-primary)]">{selectedContact.mobile} {t('contacts.mobileSuffix')}</span>
                      </div>
                    )}
                    {selectedContact.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-700" />
                        <span className="text-[var(--color-primary)]">{selectedContact.email}</span>
                      </div>
                    )}
                    {selectedContact.linkedin && (
                      <div className="flex items-center space-x-2">
                        <Linkedin className="w-4 h-4 text-gray-700" />
                        <span className="text-[var(--color-primary)]">{selectedContact.linkedin}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('contacts.notes')}</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-[var(--color-primary)]">{selectedContact.notes || t('contacts.noNote')}</p>
                  </div>
                </div>

                {/* Interactions récentes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('contacts.recentInteractions')}</h3>
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
                                <p className="text-sm font-medium text-[var(--color-primary)]">{interaction.sujet}</p>
                                <p className="text-xs text-[var(--color-text-secondary)]">{formatDate(interaction.date)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[var(--color-text-secondary)] text-center">{t('contacts.noInteraction')}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {t('contacts.close')}
                </button>
                <button className="px-4 py-2 bg-[var(--color-text-tertiary)] text-white rounded-lg hover:bg-[var(--color-text-secondary)]">
                  {t('contacts.edit')}
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
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('contacts.companies')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">
                    {[...new Set(mockContacts.map(c => c.tiers))].length}
                  </p>
                </div>
                <Building className="w-8 h-8 text-[var(--color-primary)]" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('contacts.totalContacts')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">{mockContacts.length}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('contacts.mainContacts')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">
                    {mockContacts.filter(c => c.isPrincipal).length}
                  </p>
                </div>
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('contacts.departments')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">
                    {[...new Set(mockContacts.map(c => c.departement).filter(Boolean))].length}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-[var(--color-text-secondary)]" />
              </div>
            </div>
          </div>

          {/* Organigramme hiérarchique */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('contacts.orgChartByCompany')}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('contacts.orgChartSubtitle')}</p>
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
                  {t('contacts.expandAll')}
                </button>
                <button
                  onClick={() => setExpandedCompanies(new Set())}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('contacts.collapseAll')}
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
                      className="bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 p-4 cursor-pointer hover:from-[var(--color-primary)]/15 hover:to-[var(--color-primary)]/10 transition-colors"
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
                          <div className="w-12 h-12 bg-[var(--color-primary)] rounded-xl flex items-center justify-center shadow-md">
                            <Building className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-[var(--color-primary)]">{entreprise}</h4>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className="text-sm text-[var(--color-text-secondary)] flex items-center">
                                <Users className="w-3 h-3 mr-1" />
                                {contactsEntreprise.length > 1
                                  ? t('contacts.contactCountMany', { count: String(contactsEntreprise.length) })
                                  : t('contacts.contactCountOne', { count: String(contactsEntreprise.length) })}
                              </span>
                              <span className="text-sm text-[var(--color-text-secondary)] flex items-center">
                                <Activity className="w-3 h-3 mr-1" />
                                {departements.length > 1
                                  ? t('contacts.departmentCountMany', { count: String(departements.length) })
                                  : t('contacts.departmentCountOne', { count: String(departements.length) })}
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
                              <p className="font-bold text-[var(--color-primary)]">{contactPrincipal.prenom} {contactPrincipal.nom}</p>
                              <p className="text-sm text-[var(--color-primary)] font-medium">{roleLabel(contactPrincipal.fonction)}</p>
                              <p className="text-xs text-[var(--color-text-secondary)]">{deptLabel(contactPrincipal.departement)}</p>
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
                                className="p-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/20"
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
                              className="relative bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-[var(--color-primary)] hover:shadow-md transition-all"
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
                                  <p className="font-semibold text-[var(--color-primary)] truncate">
                                    {contact.prenom} {contact.nom}
                                  </p>
                                  <p className="text-sm text-[var(--color-primary)] truncate">{roleLabel(contact.fonction)}</p>
                                  {contact.departement && (
                                    <span className="inline-flex items-center px-2 py-0.5 mt-1 text-xs bg-gray-200 text-gray-700 rounded-full">
                                      {deptLabel(contact.departement)}
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
                                  className="p-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors"
                                  title={t('contacts.viewDetails')}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Badge nombre d'interactions */}
                              {contact.interactions.length > 0 && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--color-text-secondary)] rounded-full flex items-center justify-center text-xs font-bold text-white">
                                  {contact.interactions.length}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Message si aucun autre contact */}
                        {contactsEntreprise.filter(c => !c.isPrincipal).length === 0 && contactPrincipal && (
                          <div className="text-center py-4 text-gray-500">
                            <p className="text-sm">{t('contacts.onlyMainContact')}</p>
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
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-3">{t('contacts.legend')}</h4>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-[var(--color-text-secondary)]">{t('contacts.legendMain')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-green-700" />
                </div>
                <span className="text-sm text-[var(--color-text-secondary)]">{t('contacts.legendSecondary')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-[var(--color-text-secondary)] rounded-full flex items-center justify-center text-[10px] font-bold text-white">3</div>
                <span className="text-sm text-[var(--color-text-secondary)]">{t('contacts.legendInteractionsCount')}</span>
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
                    <h3 className="text-lg font-semibold text-gray-900">{t('contacts.newContactTitle')}</h3>
                    <p className="text-sm text-gray-700">{t('contacts.newContactSubtitle')}</p>
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
                    {t('contacts.linkedTier')} <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">{t('contacts.selectTier')}</option>
                    <option value="1">SARL CONGO BUSINESS</option>
                    <option value="2">SA CENTRAL AFRICA</option>
                    <option value="3">ETS DIGITAL SOLUTIONS</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.civility')} <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="M">{t('contacts.civilityMr')}</option>
                      <option value="Mme">{t('contacts.civilityMrs')}</option>
                      <option value="Mlle">{t('contacts.civilityMiss')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.firstName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('contacts.phFirstName')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.lastName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('contacts.phLastName')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.fieldRole')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('contacts.phRole')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.fieldDepartment')}
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('contacts.phDepartment')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.landline')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+242 06 123 45 67"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.mobile')}
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
                      {t('contacts.email')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="contact@email.cg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.linkedin')}
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('contacts.phLinkedin')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.birthDate')}
                    </label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.fieldPreferredLanguage')}
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="Français">{t('contacts.langFrench')}</option>
                      <option value="Anglais">{t('contacts.langEnglish')}</option>
                      <option value="Lingala">{t('contacts.langLingala')}</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">{t('contacts.mainContact')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" defaultChecked />
                    <span className="text-sm text-gray-700">{t('contacts.statusActive')}</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contacts.notes')}
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('contacts.phNotes')}
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('contacts.cancel')}
              </button>
              <button onClick={handleCreateContact} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                {t('contacts.createContact')}
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
                    <h3 className="text-lg font-semibold text-gray-900">{t('contacts.newInteraction')}</h3>
                    <p className="text-sm text-gray-700">
                      {contactForInteraction
                        ? t('contacts.interactionWith', { name: `${contactForInteraction.prenom} ${contactForInteraction.nom}` })
                        : t('contacts.recordInteraction')}
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
                          {roleLabel(contactForInteraction.fonction)} - {contactForInteraction.tiers}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!contactForInteraction && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.colContact')} <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="">{t('contacts.selectContact')}</option>
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
                      {t('contacts.interactionType')} <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="">{t('contacts.select')}</option>
                      <option value="APPEL">{t('contacts.typePhoneCall')}</option>
                      <option value="EMAIL">{t('contacts.typeEmail')}</option>
                      <option value="REUNION">{t('contacts.typeMeeting')}</option>
                      <option value="VISITE">{t('contacts.typeVisit')}</option>
                      <option value="AUTRE">{t('contacts.typeOther')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.date')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contacts.interactionSubject')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={t('contacts.phSubject')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contacts.report')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={t('contacts.phReport')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contacts.nextAction')}
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={t('contacts.phNextAction')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.followUpDate')}
                    </label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.responsible')}
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="">{t('contacts.select')}</option>
                      <option value="">—</option>
                      <option value="">—</option>
                      <option value="">—</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">{t('contacts.interactionHistory')}</p>
                      <p className="text-sm text-blue-700 mt-1">
                        {t('contacts.interactionHistoryHint')}
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
                {t('contacts.cancel')}
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {t('contacts.saveInteraction')}
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
                    <h3 className="text-lg font-semibold text-gray-900">{t('contacts.editContactTitle')}</h3>
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
                    {t('contacts.linkedTier')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    defaultValue={contactToEdit.tiersId}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">{t('contacts.selectTier')}</option>
                    <option value="1">SARL CONGO BUSINESS</option>
                    <option value="2">STE AFRICAINE TECH</option>
                    <option value="3">CEMAC SUPPLIES</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.civility')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      defaultValue={contactToEdit.civilite}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="M">{t('contacts.civilityMr')}</option>
                      <option value="MME">{t('contacts.civilityMrs')}</option>
                      <option value="MLLE">{t('contacts.civilityMiss')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.firstName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      defaultValue={contactToEdit.prenom}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.lastName')} <span className="text-red-500">*</span>
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
                      {t('contacts.fieldRole')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      defaultValue={contactToEdit.fonction}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.fieldDepartment')}
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
                      {t('contacts.landline')}
                    </label>
                    <input
                      type="tel"
                      defaultValue={contactToEdit.telephone || ''}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.mobile')}
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
                      {t('contacts.email')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      defaultValue={contactToEdit.email || ''}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.linkedin')}
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
                      {t('contacts.birthDate')}
                    </label>
                    <input
                      type="date"
                      defaultValue={contactToEdit.dateNaissance || ''}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('contacts.fieldPreferredLanguage')}
                    </label>
                    <select
                      defaultValue={contactToEdit.languePrefere || 'Français'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="Français">{t('contacts.langFrench')}</option>
                      <option value="Anglais">{t('contacts.langEnglish')}</option>
                      <option value="Lingala">{t('contacts.langLingala')}</option>
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
                    <span className="text-sm text-gray-700">{t('contacts.mainContact')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked={contactToEdit.isActif}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{t('contacts.statusActive')}</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contacts.notes')}
                  </label>
                  <textarea
                    rows={3}
                    defaultValue={contactToEdit.notes || ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={t('contacts.phNotes')}
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
                {t('contacts.cancel')}
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2">
                <Edit className="w-4 h-4" />
                {t('contacts.saveChanges')}
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
                  <h3 className="text-lg font-semibold text-gray-900">{t('contacts.deleteContactTitle')}</h3>
                  <p className="text-sm text-gray-600">{t('contacts.irreversible')}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  {t('contacts.aboutToDelete')}
                </p>
                <p className="font-medium text-gray-900 mt-2">
                  {contactToDelete.civilite} {contactToDelete.prenom} {contactToDelete.nom}
                </p>
                <p className="text-sm text-gray-600">
                  {roleLabel(contactToDelete.fonction)} - {contactToDelete.tiers}
                </p>
                {contactToDelete.interactions.length > 0 && (
                  <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-sm text-orange-800">
                      {t('contacts.hasInteractionsWarning', { count: String(contactToDelete.interactions.length) })}
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
                  {t('contacts.cancel')}
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
                  {t('contacts.confirmDelete')}
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
                    <h3 className="text-lg font-semibold text-gray-900">{t('contacts.interactionDetails')}</h3>
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
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('contacts.type')}</label>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`px-2 py-1 text-sm font-medium rounded-full ${getInteractionTypeColor(selectedInteraction.type)}`}>
                        {selectedInteraction.type === 'APPEL' ? t('contacts.typePhoneCall') :
                         selectedInteraction.type === 'EMAIL' ? t('contacts.typeEmail') :
                         selectedInteraction.type === 'RENCONTRE' ? t('contacts.typeMeetingEncounter') :
                         selectedInteraction.type === 'VISITE' ? t('contacts.typeVisit') :
                         selectedInteraction.type}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('contacts.date')}</label>
                    <p className="mt-1 text-gray-900 font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      {formatDate(selectedInteraction.date)}
                    </p>
                  </div>
                </div>

                {/* Contact concerné */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <label className="text-xs font-medium text-green-600 uppercase">{t('contacts.contactConcerned')}</label>
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
                  <label className="text-xs font-medium text-gray-500 uppercase">{t('contacts.interactionSubject')}</label>
                  <p className="mt-1 text-gray-900 font-medium text-lg">{selectedInteraction.sujet}</p>
                </div>

                {/* Description / Compte-rendu */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">{t('contacts.report')}</label>
                  <div className="mt-2 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedInteraction.description}</p>
                  </div>
                </div>

                {/* Résultats si disponible */}
                {selectedInteraction.resultats && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('contacts.resultsDecisions')}</label>
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800">{selectedInteraction.resultats}</p>
                    </div>
                  </div>
                )}

                {/* Informations complémentaires */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('contacts.responsible')}</label>
                    <p className="mt-1 text-gray-900 font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600" />
                      {selectedInteraction.responsable}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('contacts.colStatus')}</label>
                    <p className="mt-1">
                      <span className={`px-2 py-1 text-sm font-medium rounded-full ${
                        selectedInteraction.statut === 'TERMINE' ? 'bg-green-100 text-green-800' :
                        selectedInteraction.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedInteraction.statut === 'TERMINE' ? t('contacts.statusDone') :
                         selectedInteraction.statut === 'EN_COURS' ? t('contacts.statusInProgress') :
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
                      {t('contacts.nextActionFollowUp')}
                    </label>
                    <p className="mt-1 text-orange-800 font-medium">
                      {formatDate(selectedInteraction.prochaineSuivi)}
                    </p>
                  </div>
                )}

                {/* Metadata */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{t('contacts.createdOn', { date: selectedInteraction.createdAt ? new Date(selectedInteraction.createdAt).toLocaleString('fr-FR') : 'N/A' })}</span>
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
                {t('contacts.close')}
              </button>
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 rounded-lg transition-colors flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  {t('contacts.edit')}
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
                  {t('contacts.newInteraction')}
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