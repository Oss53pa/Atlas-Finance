import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
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
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';

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
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<TaxDeclaration | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const queryClient = useQueryClient();

  const { data: declarations = [], isLoading } = useQuery({
    queryKey: ['tax-declarations', searchTerm, selectedType, selectedStatus, dateRange],
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
        decl.period.includes(dateRange.startDate || '2024')
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


  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; declaration: TaxDeclaration | null }>({
    isOpen: false,
    declaration: null
  });

  const handleDeleteClick = (declaration: TaxDeclaration) => {
    setDeleteConfirm({ isOpen: true, declaration });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.declaration) {
      deleteDeclarationMutation.mutate(deleteConfirm.declaration.id);
      setDeleteConfirm({ isOpen: false, declaration: null });
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
          <h1 className="text-lg font-bold text-gray-900">Déclarations Fiscales</h1>
          <p className="text-gray-600">Gestion des déclarations et obligations fiscales</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              toast.success('Export des déclarations fiscales en cours...');
              setTimeout(() => toast.success('Export terminé - fichier téléchargé'), 1500);
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            aria-label="Télécharger"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            <span>{t('common.export')}</span>
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
              <p className="text-lg font-bold text-gray-900">{declarations.length}</p>
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
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
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
              <p className="text-lg font-bold text-orange-600">{formatCurrency(totalPending)}</p>
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
              <p className="text-lg font-bold text-red-600">{overdueCount}</p>
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
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700" />
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
                <option value="draft">{t('accounting.draft')}</option>
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
                value={dateRange.startDate || '2024'}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Période
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Échéance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Créé par
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
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
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-700">
                    Aucune déclaration trouvée
                  </td>
                </tr>
              ) : (
                filteredDeclarations.map((declaration) => (
                  <tr key={declaration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{declaration.reference}</div>
                      <div className="text-sm text-gray-700">
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
                      <div className="text-sm text-gray-700">
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
                          className="p-2 text-gray-700 hover:text-indigo-600 transition-colors"
                          title="Voir les détails"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDeclaration(declaration);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-gray-700 hover:text-indigo-600 transition-colors"
                          title={t('common.edit')}
                          disabled={declaration.status === 'paid' || declaration.status === 'validated'}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(declaration)}
                          className="p-2 text-gray-700 hover:text-red-600 transition-colors"
                          title={t('common.delete')}
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

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Nouvelle Déclaration Fiscale</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de taxe <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="">Sélectionner...</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référence <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="TVA-2024-09"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Période <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Septembre 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Période de déclaration <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={() => setShowPeriodModal(true)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:bg-gray-50 flex items-center gap-2"
                  >
                    <CalendarDaysIcon className="w-5 h-5" />
                    {dateRange.startDate && dateRange.endDate
                      ? `${dateRange.startDate} - ${dateRange.endDate}`
                      : 'Sélectionner une période'
                    }
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="920000"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="draft">{t('accounting.draft')}</option>
                    <option value="submitted">Soumise</option>
                    <option value="validated">Validée</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Commentaires</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Notes complémentaires..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pièces jointes
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                  <DocumentArrowDownIcon className="h-12 w-12 text-gray-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Cliquez pour ajouter des fichiers ou glissez-déposez
                  </p>
                  <p className="text-xs text-gray-700 mt-1">PDF, Excel, Word (max 10MB)</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Assurez-vous que toutes les informations sont correctes avant de soumettre la déclaration.
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Créer la déclaration
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedDeclaration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Détails de la Déclaration</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedDeclaration(null);
                }}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedDeclaration.reference}</h3>
                  <p className="text-gray-700 mt-1">{selectedDeclaration.period}</p>
                </div>
                <div className="flex space-x-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getTypeColor(selectedDeclaration.type)}`}>
                    {getTaxTypeName(selectedDeclaration.type)}
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedDeclaration.status)}`}>
                    {selectedDeclaration.status === 'paid' ? 'Payée' :
                     selectedDeclaration.status === 'validated' ? 'Validée' :
                     selectedDeclaration.status === 'submitted' ? 'Soumise' :
                     selectedDeclaration.status === 'draft' ? 'Brouillon' :
                     selectedDeclaration.status === 'rejected' ? 'Rejetée' : 'En retard'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Informations Principales</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="text-gray-900 font-medium">{getTaxTypeName(selectedDeclaration.type)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Période:</span>
                      <span className="text-gray-900 font-medium">{selectedDeclaration.period}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date d'échéance:</span>
                      <span className="text-gray-900 font-medium">
                        {new Date(selectedDeclaration.dueDate).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Créé par:</span>
                      <span className="text-gray-900 font-medium">{selectedDeclaration.createdBy}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Montants</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant déclaré:</span>
                      <span className="text-gray-900 font-medium">{formatCurrency(selectedDeclaration.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant payé:</span>
                      <span className="text-green-600 font-medium">{formatCurrency(selectedDeclaration.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reste à payer:</span>
                      <span className="text-orange-600 font-medium">
                        {formatCurrency(selectedDeclaration.amount - selectedDeclaration.paidAmount)}
                      </span>
                    </div>
                    {selectedDeclaration.penalty > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pénalités:</span>
                        <span className="text-red-600 font-medium">{formatCurrency(selectedDeclaration.penalty)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Historique</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Création</div>
                      <div className="text-xs text-gray-700">
                        {new Date(selectedDeclaration.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>

                  {selectedDeclaration.submittedDate && (
                    <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                      <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <DocumentTextIcon className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Soumission</div>
                        <div className="text-xs text-gray-700">
                          {new Date(selectedDeclaration.submittedDate).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDeclaration.validatedDate && (
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Validation</div>
                        <div className="text-xs text-gray-700">
                          {new Date(selectedDeclaration.validatedDate).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDeclaration.paidDate && (
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Paiement</div>
                        <div className="text-xs text-gray-700">
                          {new Date(selectedDeclaration.paidDate).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDeclaration.rejectedDate && (
                    <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                      <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Rejet</div>
                        <div className="text-xs text-gray-700">
                          {new Date(selectedDeclaration.rejectedDate).toLocaleDateString('fr-FR')}
                        </div>
                        {selectedDeclaration.rejectionReason && (
                          <div className="text-xs text-red-600 mt-1">{selectedDeclaration.rejectionReason}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedDeclaration.attachments.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Pièces jointes</h4>
                  <div className="space-y-2">
                    {selectedDeclaration.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <DocumentTextIcon className="h-5 w-5 text-gray-700" />
                          <span className="text-sm text-gray-900">{file}</span>
                        </div>
                        <button className="text-indigo-600 hover:text-indigo-700 text-sm">
                          Télécharger
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDeclaration.status === 'overdue' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-medium">
                    Cette déclaration est en retard. Des pénalités de {formatCurrency(selectedDeclaration.penalty)} s'appliquent.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between sticky bottom-0">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2">
                <DocumentArrowDownIcon className="h-4 w-4" />
                <span>Télécharger PDF</span>
              </button>
              <div className="flex space-x-3">
                {selectedDeclaration.status !== 'paid' && selectedDeclaration.status !== 'validated' && (
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setShowEditModal(true);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>{t('common.edit')}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedDeclaration(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedDeclaration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Modifier la Déclaration</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedDeclaration(null);
                }}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de taxe <span className="text-red-500">*</span>
                  </label>
                  <select
                    defaultValue={selectedDeclaration.type}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={selectedDeclaration.status === 'submitted' || selectedDeclaration.status === 'validated'}
                  >
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référence <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedDeclaration.reference}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Période <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedDeclaration.period}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Période de déclaration <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={() => setShowPeriodModal(true)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:bg-gray-50 flex items-center gap-2"
                  >
                    <CalendarDaysIcon className="w-5 h-5" />
                    {dateRange.startDate && dateRange.endDate
                      ? `${dateRange.startDate} - ${dateRange.endDate}`
                      : selectedDeclaration?.period || 'Sélectionner une période'
                    }
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    defaultValue={selectedDeclaration.amount}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    defaultValue={selectedDeclaration.status}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="draft">{t('accounting.draft')}</option>
                    <option value="submitted">Soumise</option>
                    <option value="validated">Validée</option>
                    <option value="paid">Payée</option>
                  </select>
                </div>
              </div>

              {selectedDeclaration.status === 'rejected' && selectedDeclaration.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Motif de rejet:</h4>
                  <p className="text-sm text-red-700">{selectedDeclaration.rejectionReason}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Commentaires</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Notes complémentaires..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pièces jointes actuelles
                </label>
                {selectedDeclaration.attachments.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {selectedDeclaration.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <DocumentTextIcon className="h-5 w-5 text-gray-700" />
                          <span className="text-sm text-gray-900">{file}</span>
                        </div>
                        <button className="text-red-600 hover:text-red-700 text-sm">
                          Supprimer
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 mb-4">Aucune pièce jointe</p>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                  <DocumentArrowDownIcon className="h-12 w-12 text-gray-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Cliquez pour ajouter des fichiers ou glissez-déposez
                  </p>
                  <p className="text-xs text-gray-700 mt-1">PDF, Excel, Word (max 10MB)</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedDeclaration(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onPeriodSelect={(period) => {
          setDateRange(period);
          setShowPeriodModal(false);
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, declaration: null })}
        onConfirm={handleConfirmDelete}
        title="Supprimer la déclaration"
        message={`Êtes-vous sûr de vouloir supprimer la déclaration "${deleteConfirm.declaration?.reference}" ? Cette action est irréversible.`}
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmLoading={deleteDeclarationMutation.isPending}
      />
    </div>
  );
};

export default TaxDeclarationsPage;