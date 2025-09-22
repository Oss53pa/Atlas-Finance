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
  ChevronRight,
  FolderOpen,
  XCircle,
  Archive,
  Briefcase,
  Gavel,
  AlertTriangle,
  Shield,
  Scale,
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  CheckSquare,
  FileSignature,
  UserCheck,
  Building
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

interface DossierRecouvrement {
  id: string;
  numeroRef: string;
  client: string;
  montantPrincipal: number;
  interets: number;
  frais: number;
  montantTotal: number;
  dateOuverture: string;
  statut: 'actif' | 'suspendu' | 'cloture' | 'juridique';
  typeRecouvrement: 'amiable' | 'judiciaire' | 'huissier';
  responsable: string;
  derniereAction: string;
  prochainEtape: string;
}

interface RadiationCreance {
  id: string;
  numeroCreance: string;
  client: string;
  montantOriginal: number;
  montantRadie: number;
  dateCreance: string;
  dateRadiation: string;
  motifRadiation: 'irrecuperable' | 'faillite' | 'prescription' | 'accord' | 'autre';
  justificatifs: string[];
  approbateur: string;
  statut: 'en_attente' | 'approuvee' | 'rejetee';
  commentaires: string;
}

const RecouvrementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('creances');
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

  const [dossiersRecouvrement, setDossiersRecouvrement] = useState<DossierRecouvrement[]>([
    {
      id: '1',
      numeroRef: 'REC-2024-001',
      client: 'Entreprise ABC',
      montantPrincipal: 15000,
      interets: 750,
      frais: 250,
      montantTotal: 16000,
      dateOuverture: '2024-01-15',
      statut: 'actif',
      typeRecouvrement: 'amiable',
      responsable: 'Marie Dupont',
      derniereAction: 'Appel téléphonique - 15/01/2024',
      prochainEtape: 'Mise en demeure - 20/01/2024'
    },
    {
      id: '2',
      numeroRef: 'REC-2024-002',
      client: 'Société XYZ',
      montantPrincipal: 50000,
      interets: 3500,
      frais: 1500,
      montantTotal: 55000,
      dateOuverture: '2024-01-05',
      statut: 'juridique',
      typeRecouvrement: 'judiciaire',
      responsable: 'Jean Martin',
      derniereAction: 'Saisie avocat - 10/01/2024',
      prochainEtape: 'Audience tribunal - 25/01/2024'
    },
    {
      id: '3',
      numeroRef: 'REC-2023-156',
      client: 'Commerce Local',
      montantPrincipal: 8000,
      interets: 400,
      frais: 100,
      montantTotal: 8500,
      dateOuverture: '2023-11-10',
      statut: 'suspendu',
      typeRecouvrement: 'amiable',
      responsable: 'Sophie Bernard',
      derniereAction: 'Plan de paiement proposé - 05/01/2024',
      prochainEtape: 'En attente réponse client'
    }
  ]);

  const [radiations, setRadiations] = useState<RadiationCreance[]>([
    {
      id: '1',
      numeroCreance: 'CRE-2023-045',
      client: 'Ancienne Société SARL',
      montantOriginal: 125000,
      montantRadie: 125000,
      dateCreance: '2023-03-15',
      dateRadiation: '2024-01-10',
      motifRadiation: 'faillite',
      justificatifs: ['Jugement tribunal de commerce', 'PV liquidation'],
      approbateur: 'Direction Générale',
      statut: 'approuvee',
      commentaires: 'Société en liquidation judiciaire, créance irrécupérable'
    },
    {
      id: '2',
      numeroCreance: 'CRE-2021-789',
      client: 'Entreprise Défaillante',
      montantOriginal: 45000,
      montantRadie: 45000,
      dateCreance: '2021-09-20',
      dateRadiation: '2024-01-15',
      motifRadiation: 'prescription',
      justificatifs: ['Constat huissier', 'Rapport juridique'],
      approbateur: 'Directeur Financier',
      statut: 'en_attente',
      commentaires: 'Délai de prescription atteint, aucune action possible'
    },
    {
      id: '3',
      numeroCreance: 'CRE-2023-234',
      client: 'PME Services',
      montantOriginal: 30000,
      montantRadie: 18000,
      dateCreance: '2023-06-10',
      dateRadiation: '2024-01-12',
      motifRadiation: 'accord',
      justificatifs: ['Protocole accord', 'Quittance partielle'],
      approbateur: 'Direction Commerciale',
      statut: 'approuvee',
      commentaires: 'Accord transactionnel à 40% du montant dû'
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
      case 'actif': return 'bg-blue-100 text-blue-800';
      case 'suspendu': return 'bg-orange-100 text-orange-800';
      case 'cloture': return 'bg-gray-100 text-gray-800';
      case 'juridique': return 'bg-purple-100 text-purple-800';
      case 'approuvee': return 'bg-green-100 text-green-800';
      case 'en_attente': return 'bg-yellow-100 text-yellow-800';
      case 'rejetee': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'en_cours': return 'En cours';
      case 'en_retard': return 'En retard';
      case 'critique': return 'Critique';
      case 'recouvre': return 'Recouvré';
      case 'actif': return 'Actif';
      case 'suspendu': return 'Suspendu';
      case 'cloture': return 'Clôturé';
      case 'juridique': return 'Juridique';
      case 'approuvee': return 'Approuvée';
      case 'en_attente': return 'En attente';
      case 'rejetee': return 'Rejetée';
      default: return statut;
    }
  };

  const getMotifLabel = (motif: string) => {
    switch (motif) {
      case 'irrecuperable': return 'Irrécupérable';
      case 'faillite': return 'Faillite';
      case 'prescription': return 'Prescription';
      case 'accord': return 'Accord amiable';
      case 'autre': return 'Autre';
      default: return motif;
    }
  };

  const filteredCreances = creances.filter(creance => {
    const matchStatut = selectedStatut === 'tous' || creance.statut === selectedStatut;
    const matchSearch = creance.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        creance.clientCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatut && matchSearch;
  });

  const tabs = [
    { id: 'creances', label: 'Créances', icon: DollarSign },
    { id: 'dossiers', label: 'Dossiers en Recouvrement', icon: FolderOpen },
    { id: 'radiation', label: 'Radiation de Créances', icon: XCircle },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Recouvrement</h1>
        <p className="text-gray-600 mt-2">Gestion et suivi du recouvrement des créances clients</p>
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'creances' && (
        <>
          {/* Stats */}
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

          {/* Table des créances */}
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
        </>
      )}

      {/* Onglet Dossiers en Recouvrement */}
      {activeTab === 'dossiers' && (
        <div className="space-y-6">
          {/* KPIs des dossiers */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <Briefcase className="w-8 h-8 text-blue-500" />
                <span className="text-sm font-medium text-blue-600">Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {dossiersRecouvrement.length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Dossiers actifs</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <Scale className="w-8 h-8 text-purple-500" />
                <span className="text-sm font-medium text-purple-600">Judiciaire</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {dossiersRecouvrement.filter(d => d.typeRecouvrement === 'judiciaire').length}
              </p>
              <p className="text-sm text-gray-600 mt-1">En procédure judiciaire</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-8 h-8 text-green-500" />
                <span className="text-sm font-medium text-green-600">Montant</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {dossiersRecouvrement.reduce((sum, d) => sum + d.montantTotal, 0).toLocaleString()} DH
              </p>
              <p className="text-sm text-gray-600 mt-1">Total en recouvrement</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <AlertTriangle className="w-8 h-8 text-orange-500" />
                <span className="text-sm font-medium text-orange-600">Suspendus</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {dossiersRecouvrement.filter(d => d.statut === 'suspendu').length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Dossiers suspendus</p>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Gestion des dossiers</h3>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <PlusCircle className="w-4 h-4" />
                  Nouveau dossier
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <FileSignature className="w-4 h-4" />
                  Assigner dossiers
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Download className="w-4 h-4" />
                  Exporter
                </button>
              </div>
            </div>
          </div>

          {/* Table des dossiers */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Dossiers en cours</h2>
                <div className="flex items-center gap-3">
                  <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Tous les types</option>
                    <option>Amiable</option>
                    <option>Judiciaire</option>
                    <option>Huissier</option>
                  </select>
                  <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Tous les statuts</option>
                    <option>Actif</option>
                    <option>Suspendu</option>
                    <option>Clôturé</option>
                    <option>Juridique</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responsable
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prochaine étape
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dossiersRecouvrement.map((dossier) => (
                    <tr key={dossier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {dossier.numeroRef}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(dossier.dateOuverture).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{dossier.client}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {dossier.montantTotal.toLocaleString()} DH
                          </div>
                          <div className="text-xs text-gray-500">
                            Principal: {dossier.montantPrincipal.toLocaleString()} DH
                          </div>
                          <div className="text-xs text-gray-500">
                            Intérêts + Frais: {(dossier.interets + dossier.frais).toLocaleString()} DH
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {dossier.typeRecouvrement === 'judiciaire' ? (
                            <Gavel className="w-4 h-4 text-purple-500 mr-1" />
                          ) : dossier.typeRecouvrement === 'huissier' ? (
                            <Shield className="w-4 h-4 text-orange-500 mr-1" />
                          ) : (
                            <Users className="w-4 h-4 text-blue-500 mr-1" />
                          )}
                          <span className="text-sm capitalize">{dossier.typeRecouvrement}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(dossier.statut)}`}>
                          {getStatutLabel(dossier.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserCheck className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{dossier.responsable}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{dossier.prochainEtape}</div>
                          <div className="text-xs text-gray-500 mt-1">{dossier.derniereAction}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:text-blue-900" title="Voir détails">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-900" title="Modifier">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-orange-600 hover:text-orange-900" title="Historique">
                            <Clock className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statistiques par type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Par type de recouvrement</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Amiable</span>
                  <span className="text-sm font-medium">
                    {dossiersRecouvrement.filter(d => d.typeRecouvrement === 'amiable').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Judiciaire</span>
                  <span className="text-sm font-medium">
                    {dossiersRecouvrement.filter(d => d.typeRecouvrement === 'judiciaire').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Huissier</span>
                  <span className="text-sm font-medium">
                    {dossiersRecouvrement.filter(d => d.typeRecouvrement === 'huissier').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Par statut</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Actifs</span>
                  <span className="text-sm font-medium text-blue-600">
                    {dossiersRecouvrement.filter(d => d.statut === 'actif').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Juridiques</span>
                  <span className="text-sm font-medium text-purple-600">
                    {dossiersRecouvrement.filter(d => d.statut === 'juridique').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Suspendus</span>
                  <span className="text-sm font-medium text-orange-600">
                    {dossiersRecouvrement.filter(d => d.statut === 'suspendu').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions du jour</h3>
              <div className="space-y-2">
                <button className="w-full text-left p-3 bg-blue-50 rounded-lg hover:bg-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700">3 Appels à passer</span>
                    <Phone className="w-4 h-4 text-blue-500" />
                  </div>
                </button>
                <button className="w-full text-left p-3 bg-green-50 rounded-lg hover:bg-green-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-700">2 Relances à envoyer</span>
                    <Mail className="w-4 h-4 text-green-500" />
                  </div>
                </button>
                <button className="w-full text-left p-3 bg-purple-50 rounded-lg hover:bg-purple-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-700">1 Audience prévue</span>
                    <Gavel className="w-4 h-4 text-purple-500" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Radiation de Créances */}
      {activeTab === 'radiation' && (
        <div className="space-y-6">
          {/* KPIs des radiations */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <Archive className="w-8 h-8 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {radiations.length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Demandes de radiation</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
                <span className="text-sm font-medium text-red-600">Radié</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {radiations.reduce((sum, r) => sum + r.montantRadie, 0).toLocaleString()} DH
              </p>
              <p className="text-sm text-gray-600 mt-1">Montant total radié</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <CheckSquare className="w-8 h-8 text-green-500" />
                <span className="text-sm font-medium text-green-600">Approuvées</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {radiations.filter(r => r.statut === 'approuvee').length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Radiations approuvées</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-8 h-8 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-600">En attente</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {radiations.filter(r => r.statut === 'en_attente').length}
              </p>
              <p className="text-sm text-gray-600 mt-1">En attente d'approbation</p>
            </div>
          </div>

          {/* Actions et filtres */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Gestion des radiations</h3>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  <PlusCircle className="w-4 h-4" />
                  Nouvelle demande de radiation
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <FileText className="w-4 h-4" />
                  Rapport des radiations
                </button>
              </div>
            </div>
          </div>

          {/* Table des radiations */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Demandes de radiation</h2>
                <div className="flex items-center gap-3">
                  <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Tous les motifs</option>
                    <option>Irrécupérable</option>
                    <option>Faillite</option>
                    <option>Prescription</option>
                    <option>Accord amiable</option>
                  </select>
                  <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Tous les statuts</option>
                    <option>En attente</option>
                    <option>Approuvée</option>
                    <option>Rejetée</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      N° Créance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motif
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approbateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {radiations.map((radiation) => (
                    <tr key={radiation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {radiation.numeroCreance}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{radiation.client}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-red-600">
                            -{radiation.montantRadie.toLocaleString()} DH
                          </div>
                          <div className="text-xs text-gray-500">
                            Original: {radiation.montantOriginal.toLocaleString()} DH
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">
                            Radié: {new Date(radiation.dateRadiation).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Créé: {new Date(radiation.dateCreance).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {radiation.motifRadiation === 'faillite' && <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />}
                          {radiation.motifRadiation === 'prescription' && <Clock className="w-4 h-4 text-orange-500 mr-2" />}
                          {radiation.motifRadiation === 'accord' && <Users className="w-4 h-4 text-green-500 mr-2" />}
                          <span className="text-sm">{getMotifLabel(radiation.motifRadiation)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(radiation.statut)}`}>
                          {getStatutLabel(radiation.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{radiation.approbateur}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:text-blue-900" title="Voir détails">
                            <Eye className="w-4 h-4" />
                          </button>
                          {radiation.statut === 'en_attente' && (
                            <>
                              <button className="text-green-600 hover:text-green-900" title="Approuver">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button className="text-red-600 hover:text-red-900" title="Rejeter">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button className="text-gray-600 hover:text-gray-900" title="Documents">
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

          {/* Statistiques et informations complémentaires */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par motif</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Faillite</span>
                  </div>
                  <span className="text-sm font-medium">
                    {radiations.filter(r => r.motifRadiation === 'faillite').length} ({((radiations.filter(r => r.motifRadiation === 'faillite').length / radiations.length) * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Prescription</span>
                  </div>
                  <span className="text-sm font-medium">
                    {radiations.filter(r => r.motifRadiation === 'prescription').length} ({((radiations.filter(r => r.motifRadiation === 'prescription').length / radiations.length) * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Accord amiable</span>
                  </div>
                  <span className="text-sm font-medium">
                    {radiations.filter(r => r.motifRadiation === 'accord').length} ({((radiations.filter(r => r.motifRadiation === 'accord').length / radiations.length) * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Irrécupérable</span>
                  </div>
                  <span className="text-sm font-medium">
                    {radiations.filter(r => r.motifRadiation === 'irrecuperable').length} ({((radiations.filter(r => r.motifRadiation === 'irrecuperable').length / radiations.length) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Processus de radiation</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-blue-600">1</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Demande initiale</p>
                    <p className="text-xs text-gray-500">Soumission du dossier avec justificatifs</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-yellow-600">2</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Vérification</p>
                    <p className="text-xs text-gray-500">Contrôle des documents et validation juridique</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-purple-600">3</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Approbation</p>
                    <p className="text-xs text-gray-500">Validation par la direction selon les seuils</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-green-600">4</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Comptabilisation</p>
                    <p className="text-xs text-gray-500">Passage en perte et archivage</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecouvrementDashboard;