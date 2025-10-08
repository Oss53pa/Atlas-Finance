import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Users, Building2, UserPlus, Phone, Mail, MapPin, 
  CreditCard, FileText, BarChart3, TrendingUp, DollarSign,
  Calendar, Clock, AlertTriangle, CheckCircle, Search,
  Filter, Plus, Edit, Trash2, Eye, Download, Upload,
  Star, Tag, Globe, Briefcase, Settings, RefreshCw,
  ChevronRight, Activity, Package, Receipt, Target
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody, StatCard } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Types
interface Customer {
  id: string;
  code: string;
  raisonSociale: string;
  type: 'particulier' | 'entreprise' | 'administration';
  segment: 'premium' | 'standard' | 'basic';
  secteurActivite: string;
  adresse: {
    rue: string;
    ville: string;
    codePostal: string;
    pays: string;
  };
  contact: {
    telephone: string;
    email: string;
    siteWeb?: string;
    personneContact?: string;
  };
  commercial: string;
  ca12Mois: number;
  encours: number;
  creditAutorise: number;
  delaiPaiement: number;
  retardMoyen: number;
  nombreFactures: number;
  dateCreation: string;
  derniereCommande: string;
  statut: 'actif' | 'inactif' | 'prospect' | 'suspendu';
  notes?: string;
}

interface Supplier {
  id: string;
  code: string;
  raisonSociale: string;
  type: 'fournisseur' | 'prestataire' | 'sous-traitant';
  categorie: string;
  numeroTva?: string;
  adresse: {
    rue: string;
    ville: string;
    codePostal: string;
    pays: string;
  };
  contact: {
    telephone: string;
    email: string;
    siteWeb?: string;
    personneContact?: string;
  };
  achats12Mois: number;
  encours: number;
  delaiPaiementMoyen: number;
  nombreCommandes: number;
  evaluation: number; // 1-5 étoiles
  dateCreation: string;
  derniereCommande: string;
  statut: 'actif' | 'inactif' | 'suspendu';
  conditions: {
    delaiPaiement: number;
    remise?: number;
    conditions?: string;
  };
}

interface Transaction {
  id: string;
  tierId: string;
  type: 'facture' | 'avoir' | 'paiement' | 'commande';
  numero: string;
  date: string;
  montant: number;
  solde: number;
  statut: 'en-attente' | 'paye' | 'retard' | 'annule';
  echeance?: string;
}

interface Interaction {
  id: string;
  tierId: string;
  date: string;
  type: 'appel' | 'email' | 'meeting' | 'visite' | 'autre';
  sujet: string;
  description: string;
  utilisateur: string;
  prochaine?: string;
  statut: 'planifie' | 'realise' | 'annule';
}

const CompleteThirdPartyModule: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Données de démonstration
  const stats = {
    totalCustomers: 245,
    totalSuppliers: 85,
    caTotal: 1542000,
    achatsTotal: 890000,
    nouveauxClients: 12,
    churnRate: 2.5,
    dso: 42,
    dpo: 35
  };

  const customers: Customer[] = [
    {
      id: '1',
      code: 'CLI-001',
      raisonSociale: 'SARL TechnoWorld',
      type: 'entreprise',
      segment: 'premium',
      secteurActivite: 'Informatique',
      adresse: {
        rue: '123 Avenue de la Tech',
        ville: 'Casablanca',
        codePostal: '20000',
        pays: 'Maroc'
      },
      contact: {
        telephone: '+212 522 123456',
        email: 'contact@technoworld.ma',
        siteWeb: 'www.technoworld.ma',
        personneContact: 'Ahmed Benali'
      },
      commercial: 'Jean Dupont',
      ca12Mois: 145000,
      encours: 25000,
      creditAutorise: 50000,
      delaiPaiement: 30,
      retardMoyen: 5,
      nombreFactures: 24,
      dateCreation: '2022-03-15',
      derniereCommande: '2024-01-10',
      statut: 'actif'
    },
    {
      id: '2',
      code: 'CLI-002',
      raisonSociale: 'Ministère de l\'Éducation',
      type: 'administration',
      segment: 'premium',
      secteurActivite: 'Administration',
      adresse: {
        rue: 'Avenue Mohammed V',
        ville: 'Rabat',
        codePostal: '10000',
        pays: 'Maroc'
      },
      contact: {
        telephone: '+212 537 654321',
        email: 'marches@men.gov.ma',
        personneContact: 'Fatima Zahra'
      },
      commercial: 'Marie Martin',
      ca12Mois: 285000,
      encours: 85000,
      creditAutorise: 200000,
      delaiPaiement: 60,
      retardMoyen: 15,
      nombreFactures: 8,
      dateCreation: '2021-09-20',
      derniereCommande: '2024-01-05',
      statut: 'actif'
    },
    {
      id: '3',
      code: 'CLI-003',
      raisonSociale: 'Boutique Mode & Style',
      type: 'entreprise',
      segment: 'standard',
      secteurActivite: 'Commerce',
      adresse: {
        rue: 'Rue de la Mode, 45',
        ville: 'Casablanca',
        codePostal: '20100',
        pays: 'Maroc'
      },
      contact: {
        telephone: '+212 522 789012',
        email: 'info@modestyle.ma',
        personneContact: 'Khadija Alami'
      },
      commercial: 'Pierre Bernard',
      ca12Mois: 65000,
      encours: 12000,
      creditAutorise: 25000,
      delaiPaiement: 45,
      retardMoyen: 8,
      nombreFactures: 18,
      dateCreation: '2023-01-10',
      derniereCommande: '2023-12-20',
      statut: 'actif'
    },
    {
      id: '4',
      code: 'PRO-001',
      raisonSociale: 'StartUp Innovante',
      type: 'entreprise',
      segment: 'standard',
      secteurActivite: 'Innovation',
      adresse: {
        rue: 'Technopark, Villa 12',
        ville: 'Casablanca',
        codePostal: '20150',
        pays: 'Maroc'
      },
      contact: {
        telephone: '+212 522 345678',
        email: 'hello@startup.ma',
        personneContact: 'Youssef Benomar'
      },
      commercial: 'Sophie Legrand',
      ca12Mois: 0,
      encours: 0,
      creditAutorise: 15000,
      delaiPaiement: 30,
      retardMoyen: 0,
      nombreFactures: 0,
      dateCreation: '2024-01-15',
      derniereCommande: '',
      statut: 'prospect'
    }
  ];

  const suppliers: Supplier[] = [
    {
      id: '1',
      code: 'FOU-001',
      raisonSociale: 'Global Supply Co',
      type: 'fournisseur',
      categorie: 'Matières premières',
      numeroTva: 'MA123456789',
      adresse: {
        rue: 'Zone Industrielle Sidi Bernoussi',
        ville: 'Casablanca',
        codePostal: '20300',
        pays: 'Maroc'
      },
      contact: {
        telephone: '+212 522 567890',
        email: 'commercial@globalsupply.ma',
        siteWeb: 'www.globalsupply.ma',
        personneContact: 'Mohamed Alaoui'
      },
      achats12Mois: 285000,
      encours: 45000,
      delaiPaiementMoyen: 42,
      nombreCommandes: 28,
      evaluation: 4,
      dateCreation: '2020-05-12',
      derniereCommande: '2024-01-08',
      statut: 'actif',
      conditions: {
        delaiPaiement: 45,
        remise: 5,
        conditions: 'Remise 5% si paiement sous 10 jours'
      }
    },
    {
      id: '2',
      code: 'PRE-001',
      raisonSociale: 'Services IT Solutions',
      type: 'prestataire',
      categorie: 'Informatique',
      adresse: {
        rue: 'Twin Center, Tour A',
        ville: 'Casablanca',
        codePostal: '20000',
        pays: 'Maroc'
      },
      contact: {
        telephone: '+212 522 678901',
        email: 'contact@itsolutions.ma',
        personneContact: 'Rachid Bennani'
      },
      achats12Mois: 125000,
      encours: 18000,
      delaiPaiementMoyen: 35,
      nombreCommandes: 15,
      evaluation: 5,
      dateCreation: '2021-08-20',
      derniereCommande: '2023-12-15',
      statut: 'actif',
      conditions: {
        delaiPaiement: 30,
        conditions: 'Support inclus pendant 6 mois'
      }
    },
    {
      id: '3',
      code: 'SOU-001',
      raisonSociale: 'Logistique Express',
      type: 'sous-traitant',
      categorie: 'Transport',
      adresse: {
        rue: 'Route de l\'aéroport, Km 12',
        ville: 'Casablanca',
        codePostal: '20250',
        pays: 'Maroc'
      },
      contact: {
        telephone: '+212 522 789123',
        email: 'ops@logexpress.ma',
        personneContact: 'Nadia Hajji'
      },
      achats12Mois: 65000,
      encours: 8500,
      delaiPaiementMoyen: 30,
      nombreCommandes: 45,
      evaluation: 3,
      dateCreation: '2022-11-05',
      derniereCommande: '2024-01-12',
      statut: 'actif',
      conditions: {
        delaiPaiement: 30,
        conditions: 'Assurance incluse'
      }
    }
  ];

  // Graphiques
  const caEvolutionData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
    datasets: [
      {
        label: 'CA Clients',
        data: [120000, 135000, 142000, 138000, 155000, 162000, 158000, 165000, 172000, 168000, 175000, 180000],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true
      },
      {
        label: 'Achats Fournisseurs',
        data: [68000, 72000, 75000, 71000, 78000, 82000, 79000, 81000, 85000, 83000, 87000, 90000],
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true
      }
    ]
  };

  const segmentationData = {
    labels: ['Premium', 'Standard', 'Basic', 'Prospects'],
    datasets: [
      {
        data: [25, 45, 20, 10],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(107, 114, 128, 0.8)'
        ]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          font: { size: 11 }
        }
      }
    }
  };

  const getStatutBadge = (statut: string) => {
    const badges = {
      'actif': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      'inactif': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
      'prospect': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Target },
      'suspendu': { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle }
    };
    const badge = badges[statut as keyof typeof badges];
    const Icon = badge?.icon || CheckCircle;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${badge?.bg} ${badge?.text}`}>
        <Icon className="w-3 h-3" />
        {statut}
      </span>
    );
  };

  const getSegmentBadge = (segment: string) => {
    const badges = {
      'premium': { bg: 'bg-green-100', text: 'text-green-700', icon: Star },
      'standard': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Users },
      'basic': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Tag }
    };
    const badge = badges[segment as keyof typeof badges];
    const Icon = badge?.icon || Tag;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${badge?.bg} ${badge?.text}`}>
        <Icon className="w-3 h-3" />
        {segment}
      </span>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Clients actifs"
          value={stats.totalCustomers.toString()}
          icon={Users}
          trend={{ value: 8.2, type: 'increase' }}
          color="primary"
          subtitle={`+${stats.nouveauxClients} ce mois`}
        />
        <StatCard
          title={t('navigation.suppliers')}
          value={stats.totalSuppliers.toString()}
          icon={Building2}
          trend={{ value: 2.5, type: 'increase' }}
          color="secondary"
        />
        <StatCard
          title="CA Total"
          value={`€${stats.caTotal.toLocaleString('fr-FR')}`}
          icon={DollarSign}
          trend={{ value: 12.5, type: 'increase' }}
          color="success"
        />
        <StatCard
          title="DSO"
          value={`${stats.dso} jours`}
          icon={Clock}
          trend={{ value: -3.2, type: 'decrease' }}
          color="info"
          subtitle="Délai paiement client"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard>
          <CardHeader
            title="Évolution CA & Achats"
            subtitle="12 derniers mois"
            icon={BarChart3}
          />
          <CardBody>
            <div className="h-64">
              <Line data={caEvolutionData} options={chartOptions} />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardHeader
            title="Segmentation clients"
            subtitle="Répartition par segment"
            icon={Target}
          />
          <CardBody>
            <div className="h-64">
              <Doughnut data={segmentationData} options={chartOptions} />
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* Top clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard>
          <CardHeader
            title="Top 10 Clients"
            subtitle="Par chiffre d'affaires"
            icon={TrendingUp}
          />
          <CardBody>
            <div className="space-y-3">
              {customers
                .sort((a, b) => b.ca12Mois - a.ca12Mois)
                .slice(0, 5)
                .map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{customer.raisonSociale}</p>
                        <p className="text-xs text-gray-700">{customer.secteurActivite}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">€{customer.ca12Mois.toLocaleString('fr-FR')}</p>
                      {getSegmentBadge(customer.segment)}
                    </div>
                  </div>
                ))}
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardHeader
            title="Top Fournisseurs"
            subtitle="Par volume d'achats"
            icon={Package}
          />
          <CardBody>
            <div className="space-y-3">
              {suppliers
                .sort((a, b) => b.achats12Mois - a.achats12Mois)
                .slice(0, 5)
                .map((supplier, index) => (
                  <div key={supplier.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-medium text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{supplier.raisonSociale}</p>
                        <p className="text-xs text-gray-700">{supplier.categorie}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">€{supplier.achats12Mois.toLocaleString('fr-FR')}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3 h-3 ${
                              i < supplier.evaluation ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardBody>
        </ModernCard>
      </div>
    </div>
  );

  const renderCustomers = () => (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] w-64"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">Tous les types</option>
            <option value="entreprise">Entreprise</option>
            <option value="particulier">Particulier</option>
            <option value="administration">Administration</option>
          </select>
          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">Tous les segments</option>
            <option value="premium">Premium</option>
            <option value="standard">Standard</option>
            <option value="basic">Basic</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-1" />
            Importer
          </ModernButton>
          <ModernButton variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Exporter
          </ModernButton>
          <ModernButton variant="primary" size="sm" onClick={() => setShowCustomerModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Nouveau client
          </ModernButton>
        </div>
      </div>

      {/* Table des clients */}
      <ModernCard>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Code</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Raison sociale</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Segment</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Contact</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">CA 12M</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Encours</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Retard</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Statut</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers
                  .filter(customer => selectedType === 'all' || customer.type === selectedType)
                  .filter(customer => selectedSegment === 'all' || customer.segment === selectedSegment)
                  .filter(customer => 
                    searchQuery === '' || 
                    customer.raisonSociale.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    customer.code.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-mono font-medium">{customer.code}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium">{customer.raisonSociale}</p>
                          <p className="text-xs text-gray-700">{customer.secteurActivite}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          customer.type === 'entreprise' ? 'bg-blue-100 text-blue-700' :
                          customer.type === 'particulier' ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {customer.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getSegmentBadge(customer.segment)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Phone className="w-3 h-3" />
                            {customer.contact.telephone}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Mail className="w-3 h-3" />
                            {customer.contact.email}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        €{customer.ca12Mois.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        €{customer.encours.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-sm font-medium ${
                          customer.retardMoyen > 15 ? 'text-red-600' :
                          customer.retardMoyen > 5 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {customer.retardMoyen}j
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatutBadge(customer.statut)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Voir" aria-label="Voir les détails">
                            <Eye className="w-4 h-4 text-gray-700" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded transition-colors" title={t('common.edit')}>
                            <Edit className="w-4 h-4 text-gray-700" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Factures">
                            <Receipt className="w-4 h-4 text-gray-700" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );

  const renderSuppliers = () => (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un fournisseur..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] w-64"
            />
          </div>
          <select className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm">
            <option value="all">Tous les types</option>
            <option value="fournisseur">Fournisseur</option>
            <option value="prestataire">Prestataire</option>
            <option value="sous-traitant">Sous-traitant</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-1" />
            Importer
          </ModernButton>
          <ModernButton variant="primary" size="sm" onClick={() => setShowSupplierModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Nouveau fournisseur
          </ModernButton>
        </div>
      </div>

      {/* Table des fournisseurs */}
      <ModernCard>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Code</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Raison sociale</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Catégorie</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Contact</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Achats 12M</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Évaluation</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Statut</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-mono font-medium">{supplier.code}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium">{supplier.raisonSociale}</p>
                        {supplier.numeroTva && (
                          <p className="text-xs text-gray-700">TVA: {supplier.numeroTva}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        supplier.type === 'fournisseur' ? 'bg-green-100 text-green-700' :
                        supplier.type === 'prestataire' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {supplier.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{supplier.categorie}</td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Phone className="w-3 h-3" />
                          {supplier.contact.telephone}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Mail className="w-3 h-3" />
                          {supplier.contact.email}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      €{supplier.achats12Mois.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${
                              i < supplier.evaluation ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`} 
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatutBadge(supplier.statut)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Voir" aria-label="Voir les détails">
                          <Eye className="w-4 h-4 text-gray-700" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors" title={t('common.edit')}>
                          <Edit className="w-4 h-4 text-gray-700" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Commandes">
                          <Package className="w-4 h-4 text-gray-700" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Gestion des Tiers
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Clients, fournisseurs et relations commerciales
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-1" />
            Analyses
          </ModernButton>
          <ModernButton variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Actualiser
          </ModernButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'dashboard', label: t('dashboard.title'), icon: BarChart3 },
            { id: 'customers', label: t('navigation.clients'), icon: Users },
            { id: 'suppliers', label: t('navigation.suppliers'), icon: Building2 },
            { id: 'contacts', label: 'Contacts', icon: UserPlus },
            { id: 'transactions', label: 'Transactions', icon: Receipt },
            { id: 'analytics', label: 'Analyses', icon: Activity }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-gray-700 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'customers' && renderCustomers()}
        {activeTab === 'suppliers' && renderSuppliers()}
        {activeTab === 'contacts' && <div>Module contacts en cours de développement...</div>}
        {activeTab === 'transactions' && <div>Module transactions en cours de développement...</div>}
        {activeTab === 'analytics' && <div>Module analyses tiers en cours de développement...</div>}
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Nouveau client</h3>
                    <p className="text-sm text-gray-700">Ajouter un nouveau client au système</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomerModal(false)}
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Informations client</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Remplissez tous les champs obligatoires pour créer le client
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code client <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      placeholder="CLI-001"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Raison sociale <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nom de l'entreprise ou du client"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="entreprise">Entreprise</option>
                      <option value="particulier">Particulier</option>
                      <option value="administration">Administration</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Segment <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="premium">Premium</option>
                      <option value="standard">Standard</option>
                      <option value="basic">Basic</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Secteur d'activité <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Informatique"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Adresse
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rue <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Numéro et nom de rue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ville <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Casablanca"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code postal
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="20000"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pays <span className="text-red-500">*</span>
                      </label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="Maroc">Maroc</option>
                        <option value="France">France</option>
                        <option value="Belgique">Belgique</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contact
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+212 522 123456"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="contact@entreprise.ma"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Site web
                      </label>
                      <input
                        type="url"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="www.entreprise.ma"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Personne de contact
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nom du contact principal"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Conditions commerciales
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Commercial responsable
                      </label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Sélectionner</option>
                        <option value="Jean Dupont">Jean Dupont</option>
                        <option value="Marie Martin">Marie Martin</option>
                        <option value="Pierre Bernard">Pierre Bernard</option>
                        <option value="Sophie Legrand">Sophie Legrand</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Crédit autorisé (€)
                      </label>
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="50000"
                        step="1000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Délai de paiement (jours)
                      </label>
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="30"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Informations complémentaires..."
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Créer le client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Nouveau fournisseur</h3>
                    <p className="text-sm text-gray-700">Ajouter un nouveau fournisseur au système</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSupplierModal(false)}
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
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Informations fournisseur</p>
                      <p className="text-sm text-green-700 mt-1">
                        Enregistrez les informations complètes du fournisseur
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code fournisseur <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                      placeholder="FOU-001"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Raison sociale <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Nom du fournisseur"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="fournisseur">Fournisseur</option>
                      <option value="prestataire">Prestataire</option>
                      <option value="sous-traitant">Sous-traitant</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catégorie <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Ex: Matières premières"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro TVA
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="MA123456789"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Adresse
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rue <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Adresse complète"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ville <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Casablanca"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code postal
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="20000"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pays <span className="text-red-500">*</span>
                      </label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        <option value="Maroc">Maroc</option>
                        <option value="France">France</option>
                        <option value="Chine">Chine</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contact
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="+212 522 123456"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="contact@fournisseur.ma"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Site web
                      </label>
                      <input
                        type="url"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="www.fournisseur.ma"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Personne de contact
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Nom du contact"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Conditions de paiement
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Délai de paiement (jours)
                      </label>
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Remise (%)
                      </label>
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="5"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Évaluation
                      </label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                        <option value="4">⭐⭐⭐⭐ Très bon</option>
                        <option value="3">⭐⭐⭐ Bon</option>
                        <option value="2">⭐⭐ Moyen</option>
                        <option value="1">⭐ Faible</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conditions particulières
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Ex: Remise 5% si paiement sous 10 jours"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Informations complémentaires..."
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSupplierModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Créer le fournisseur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteThirdPartyModule;