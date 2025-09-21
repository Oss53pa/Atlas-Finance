import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface TaxDeclaration {
  id: string;
  type: 'tva' | 'impot_societes' | 'bic' | 'patente' | 'taux_apprentissage' | 'cfu' | 'tpp';
  reference: string;
  period: string;
  status: 'draft' | 'submitted' | 'validated' | 'paid' | 'overdue' | 'rejected';
  dueDate: string;
  amount: number;
  paidAmount: number;
  penalty: number;
  submittedDate?: string;
  validatedDate?: string;
  paidDate?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  createdBy: string;
  createdAt: string;
  lastModified: string;
  attachments: string[];
}

const TaxDeclarationsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2024');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<TaxDeclaration | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const queryClient = useQueryClient();

  const { data: declarations = [], isLoading } = useQuery({
    queryKey: ['tax-declarations', searchTerm, selectedType, selectedStatus, selectedPeriod],
    queryFn: async () => {
      const mockDeclarations: TaxDeclaration[] = [
        {
          id: '1',
          type: 'tva',
          reference: 'TVA-2024-08',
          period: 'Août 2024',
          status: 'overdue',
          dueDate: '2024-09-15',
          amount: 920000,
          paidAmount: 0,
          penalty: 46000,
          submittedDate: '2024-09-10',
          createdBy: 'Marie Dubois',
          createdAt: '2024-09-01T00:00:00Z',
          lastModified: '2024-09-10T14:30:00Z',
          attachments: ['tva_aout_2024.pdf', 'annexe_tva.xlsx']
        },
        {
          id: '2',
          type: 'tva',
          reference: 'TVA-2024-07',
          period: 'Juillet 2024',
          status: 'paid',
          dueDate: '2024-08-15',
          amount: 850000,
          paidAmount: 850000,
          penalty: 0,
          submittedDate: '2024-08-10',
          validatedDate: '2024-08-12',
          paidDate: '2024-08-14',
          createdBy: 'Marie Dubois',
          createdAt: '2024-08-01T00:00:00Z',
          lastModified: '2024-08-14T16:45:00Z',
          attachments: ['tva_juillet_2024.pdf']
        },
        {
          id: '3',
          type: 'impot_societes',
          reference: 'IS-2023',
          period: '2023',
          status: 'validated',
          dueDate: '2024-04-30',
          amount: 2500000,
          paidAmount: 1250000,
          penalty: 0,
          submittedDate: '2024-04-15',
          validatedDate: '2024-04-25',
          createdBy: 'Paul Martin',
          createdAt: '2024-03-15T00:00:00Z',
          lastModified: '2024-04-25T11:20:00Z',
          attachments: ['is_2023.pdf', 'bilan_2023.pdf', 'compte_resultat_2023.pdf']
        },
        {
          id: '4',
          type: 'bic',
          reference: 'BIC-2023',
          period: '2023',
          status: 'draft',
          dueDate: '2024-12-31',
          amount: 450000,
          paidAmount: 0,
          penalty: 0,
          createdBy: 'Sophie Koné',
          createdAt: '2024-09-01T00:00:00Z',
          lastModified: '2024-09-15T09:15:00Z',
          attachments: []
        },
        {
          id: '5',
          type: 'patente',
          reference: 'PAT-2024',
          period: '2024',
          status: 'submitted',
          dueDate: '2024-03-31',
          amount: 150000,
          paidAmount: 0,
          penalty: 0,
          submittedDate: '2024-03-25',
          createdBy: 'Jean Kouassi',
          createdAt: '2024-02-15T00:00:00Z',
          lastModified: '2024-03-25T13:10:00Z',
          attachments: ['patente_2024.pdf']
        },
        {
          id: '6',
          type: 'taux_apprentissage',
          reference: 'TA-2024',
          period: '2024',
          status: 'rejected',
          dueDate: '2024-06-30',
          amount: 85000,
          paidAmount: 0,
          penalty: 0,
          submittedDate: '2024-06-20',
          rejectedDate: '2024-07-05',
          rejectionReason: 'Documents manquants - Masse salariale non justifiée',
          createdBy: 'Marie Dubois',
          createdAt: '2024-05-15T00:00:00Z',
          lastModified: '2024-07-05T10:00:00Z',
          attachments: ['ta_2024_v1.pdf']
        }
      ];
      
      return mockDeclarations.filter(decl =>
        (searchTerm === '' || 
         decl.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
         decl.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
         decl.createdBy.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedType === 'all' || decl.type === selectedType) &&
        (selectedStatus === 'all' || decl.status === selectedStatus) &&
        decl.period.includes(selectedPeriod)
      );
    }
  });

  const deleteDeclarationMutation = useMutation({
    mutationFn: async (declarationId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return declarationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-declarations'] });
    }
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'tva': return 'bg-blue-100 text-blue-800';
      case 'impot_societes': return 'bg-purple-100 text-purple-800';
      case 'bic': return 'bg-green-100 text-green-800';
      case 'patente': return 'bg-orange-100 text-orange-800';
      case 'taux_apprentissage': return 'bg-pink-100 text-pink-800';
      case 'cfu': return 'bg-indigo-100 text-indigo-800';
      case 'tpp': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'validated': return 'bg-blue-100 text-blue-800';
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'validated': return <CheckCircleIcon className="h-5 w-5 text-blue-600" />;
      case 'submitted': return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'draft': return <DocumentTextIcon className="h-5 w-5 text-gray-600" />;
      case 'overdue': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      case 'rejected': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      default: return <DocumentTextIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTaxTypeName = (type: string) => {
    switch (type) {
      case 'tva': return 'TVA';
      case 'impot_societes': return 'Impôt sur les Sociétés';
      case 'bic': return 'BIC';
      case 'patente': return 'Patente';
      case 'taux_apprentissage': return 'Taxe d\'Apprentissage';
      case 'cfu': return 'CFU';
      case 'tpp': return 'TPP';
      default: return type;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleDelete = (declaration: TaxDeclaration) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la déclaration "${declaration.reference}" ?`)) {
      deleteDeclarationMutation.mutate(declaration.id);
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== 'paid' && status !== 'validated';
  };

  const filteredDeclarations = declarations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(declarations.length / itemsPerPage);

  const totalAmount = declarations.reduce((sum, decl) => sum + decl.amount, 0);
  const totalPaid = declarations.reduce((sum, decl) => sum + decl.paidAmount, 0);
  const totalPending = totalAmount - totalPaid;
  const overdueCount = declarations.filter(decl => decl.status === 'overdue' || isOverdue(decl.dueDate, decl.status)).length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Déclarations Fiscales</h1>
          <p className="text-gray-600">Gestion des déclarations et obligations fiscales</p>
        </div>
        <div className="flex space-x-3">
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <DocumentArrowDownIcon className="h-5 w-5" />
            <span>Exporter</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Nouvelle Déclaration</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Déclarations</p>
              <p className="text-2xl font-bold text-gray-900">{declarations.length}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Montant Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Attente</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalPending)}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Retard</p>
              <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une déclaration..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Filtres</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tous les types</option>
                <option value="tva">TVA</option>
                <option value="impot_societes">Impôt sur les Sociétés</option>
                <option value="bic">BIC</option>
                <option value="patente">Patente</option>
                <option value="taux_apprentissage">Taxe d'Apprentissage</option>
                <option value="cfu">CFU</option>
                <option value="tpp">TPP</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="submitted">Soumise</option>
                <option value="validated">Validée</option>
                <option value="paid">Payée</option>
                <option value="overdue">En retard</option>
                <option value="rejected">Rejetée</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actions</label>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('all');
                  setSelectedStatus('all');
                  setSelectedPeriod('2024');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tableau des déclarations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Période
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Échéance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Créé par
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-28"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredDeclarations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Aucune déclaration trouvée
                  </td>
                </tr>
              ) : (
                filteredDeclarations.map((declaration) => (
                  <tr key={declaration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{declaration.reference}</div>
                      <div className="text-sm text-gray-500">
                        {declaration.attachments.length} pièce(s) jointe(s)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(declaration.type)}`}>
                        {getTaxTypeName(declaration.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {declaration.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(declaration.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(declaration.status)}`}>
                          {declaration.status === 'paid' ? 'Payée' :
                           declaration.status === 'validated' ? 'Validée' :
                           declaration.status === 'submitted' ? 'Soumise' :
                           declaration.status === 'draft' ? 'Brouillon' :
                           declaration.status === 'rejected' ? 'Rejetée' : 'En retard'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(declaration.dueDate).toLocaleDateString('fr-FR')}
                      </div>
                      {isOverdue(declaration.dueDate, declaration.status) && (
                        <div className="text-xs text-red-600">En retard</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(declaration.amount)}</div>
                      {declaration.penalty > 0 && (
                        <div className="text-sm text-red-600">
                          Pénalité: {formatCurrency(declaration.penalty)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{declaration.createdBy}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(declaration.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedDeclaration(declaration);
                            setShowViewModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Voir les détails"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDeclaration(declaration);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Modifier"
                          disabled={declaration.status === 'paid' || declaration.status === 'validated'}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(declaration)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Supprimer"
                          disabled={declaration.status === 'submitted' || declaration.status === 'validated' || declaration.status === 'paid'}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  Affichage de{' '}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                  {' '}à{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, declarations.length)}
                  </span>
                  {' '}sur{' '}
                  <span className="font-medium">{declarations.length}</span>
                  {' '}résultats
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxDeclarationsPage;