import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Users,
  Calendar,
  MapPin,
  Plus,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileText,
  QrCode,
  Camera,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  Settings,
  Clock,
  Package,
  BarChart3,
  UserCheck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { PhysicalCount, InventoryItem, Location } from './types';
import { mockPhysicalCounts, mockInventoryItems, mockLocations } from './utils/mockData';
import { InventoryCalculations } from './utils/calculations';
import CurrencyDisplay from './components/CurrencyDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import Pagination from './components/Pagination';
import ExportButton from './components/ExportButton';

interface CreateCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (countData: any) => void;
}

const CreateCountModal: React.FC<CreateCountModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    type: 'cycle' as 'full' | 'cycle' | 'spot',
    locationId: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    includeCategories: [] as string[],
    excludeCategories: [] as string[],
    counters: [{ userId: '', name: '' }],
    notes: ''
  });

  const categories = [
    { id: 'CAT001', name: 'Electronics' },
    { id: 'CAT002', name: 'Food & Beverage' },
    { id: 'CAT003', name: 'Construction Materials' },
    { id: 'CAT004', name: 'Office Supplies' },
    { id: 'CAT005', name: 'Automotive' }
  ];

  const users = [
    { id: 'USER001', name: 'John Counter' },
    { id: 'USER002', name: 'Jane Counter' },
    { id: 'USER003', name: 'Mike Auditor' },
    { id: 'USER004', name: 'Sarah Inspector' }
  ];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const addCounter = () => {
    setFormData({
      ...formData,
      counters: [...formData.counters, { userId: '', name: '' }]
    });
  };

  const removeCounter = (index: number) => {
    setFormData({
      ...formData,
      counters: formData.counters.filter((_, i) => i !== index)
    });
  };

  const updateCounter = (index: number, field: 'userId' | 'name', value: string) => {
    const updatedCounters = [...formData.counters];
    updatedCounters[index][field] = value;
    if (field === 'userId') {
      const user = users.find(u => u.id === value);
      if (user) {
        updatedCounters[index].name = user.name;
      }
    }
    setFormData({ ...formData, counters: updatedCounters });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Create Physical Count</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Count Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                  required
                >
                  <option value="cycle">Cycle Count</option>
                  <option value="full">Full Physical Count</option>
                  <option value="spot">Spot Check</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                  required
                >
                  <option value="">Select location...</option>
                  {mockLocations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                required
              />
            </div>

            {/* Category Filters */}
            {formData.type !== 'full' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Include Categories (optional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map(category => (
                      <label key={category.id} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={formData.includeCategories.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                includeCategories: [...formData.includeCategories, category.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                includeCategories: formData.includeCategories.filter(id => id !== category.id)
                              });
                            }
                          }}
                          className="mr-2 text-[#6A8A82] focus:ring-[#6A8A82]"
                        />
                        {category.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exclude Categories (optional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map(category => (
                      <label key={category.id} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={formData.excludeCategories.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                excludeCategories: [...formData.excludeCategories, category.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                excludeCategories: formData.excludeCategories.filter(id => id !== category.id)
                              });
                            }
                          }}
                          className="mr-2 text-[#6A8A82] focus:ring-[#6A8A82]"
                        />
                        {category.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Counters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Assigned Counters
                </label>
                <button
                  type="button"
                  onClick={addCounter}
                  className="text-[#6A8A82] hover:text-blue-700 text-sm"
                >
                  + Add Counter
                </button>
              </div>
              <div className="space-y-2">
                {formData.counters.map((counter, index) => (
                  <div key={index} className="flex gap-2">
                    <select
                      value={counter.userId}
                      onChange={(e) => updateCounter(index, 'userId', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                      required
                    >
                      <option value="">Select user...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                    {formData.counters.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCounter(index)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                rows={3}
                placeholder="Additional instructions or notes..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-[#6A8A82] text-white py-2 px-4 rounded-md hover:bg-[#5A7A72] transition-colors"
              >
                Create Count
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface CountDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: PhysicalCount | null;
}

const CountDetailsModal: React.FC<CountDetailsModalProps> = ({
  isOpen,
  onClose,
  count
}) => {
  if (!isOpen || !count) return null;

  const location = mockLocations.find(loc => loc.id === count.locationId);
  const completionRate = (count.items.filter(item => item.countedQuantity !== undefined).length / count.items.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{count.countNumber}</h3>
              <p className="text-gray-600">{location?.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Status and Progress */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#6A8A82]/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#6A8A82]">{count.items.length}</div>
              <div className="text-sm text-[#6A8A82]">Total Items</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {count.items.filter(item => item.countedQuantity !== undefined).length}
              </div>
              <div className="text-sm text-green-800">Counted</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {count.items.filter(item => item.variance && Math.abs(item.variance) > 0).length}
              </div>
              <div className="text-sm text-yellow-800">Variances</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{completionRate.toFixed(0)}%</div>
              <div className="text-sm text-purple-800">Progress</div>
            </div>
          </div>

          {/* Variance Summary */}
          {count.status === 'completed' && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Variance Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Book Value:</span>
                  <div className="font-semibold">
                    <CurrencyDisplay amount={count.totalBookValue} currency="USD" size="sm" />
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Total Count Value:</span>
                  <div className="font-semibold">
                    <CurrencyDisplay amount={count.totalCountValue} currency="USD" size="sm" />
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Total Variance:</span>
                  <div className={`font-semibold ${count.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <CurrencyDisplay amount={count.totalVariance} currency="USD" size="sm" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PhysicalInventory: React.FC = () => {
  const [counts, setCounts] = useState<PhysicalCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCount, setSelectedCount] = useState<PhysicalCount | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate additional mock data
      const additionalCounts: PhysicalCount[] = [
        {
          id: 'PC002',
          countNumber: 'PC-2024-002',
          type: 'full',
          status: 'in_progress',
          locationId: 'LOC002',
          scheduledDate: '2024-02-01T08:00:00Z',
          startDate: '2024-02-01T08:30:00Z',
          items: [
            {
              itemId: 'ITEM001',
              sku: 'LAP-DEL-5520',
              name: 'Dell Latitude 5520 Laptop',
              bookQuantity: 30,
              countedQuantity: 28,
              variance: -2,
              varianceValue: -2440.00,
              countedBy: 'counter3',
              countDate: '2024-02-01T10:00:00Z'
            }
          ],
          totalBookValue: 85000.00,
          totalCountValue: 82560.00,
          totalVariance: -2440.00,
          counters: [{ userId: 'counter3', name: 'Mike Auditor', assignedItems: ['ITEM001'] }],
          createdBy: 'inventory.manager',
          createdAt: '2024-01-30T16:00:00Z'
        },
        {
          id: 'PC003',
          countNumber: 'PC-2024-003',
          type: 'spot',
          status: 'planned',
          locationId: 'LOC003',
          scheduledDate: '2024-02-05T08:00:00Z',
          items: [],
          totalBookValue: 0,
          totalCountValue: 0,
          totalVariance: 0,
          counters: [{ userId: 'counter4', name: 'Sarah Inspector', assignedItems: [] }],
          createdBy: 'inventory.manager',
          createdAt: '2024-02-01T09:00:00Z'
        }
      ];

      setCounts([...mockPhysicalCounts, ...additionalCounts]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  // Filter and paginate data
  const filteredCounts = counts.filter(count => {
    if (filterStatus !== 'all' && count.status !== filterStatus) return false;
    if (filterType !== 'all' && count.type !== filterType) return false;
    return true;
  });

  const totalItems = filteredCounts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredCounts.slice(startIndex, startIndex + itemsPerPage);

  const handleCreateCount = (countData: any) => {
    const newCount: PhysicalCount = {
      id: `PC${(counts.length + 1).toString().padStart(3, '0')}`,
      countNumber: `PC-2024-${(counts.length + 1).toString().padStart(3, '0')}`,
      type: countData.type,
      status: 'planned',
      locationId: countData.locationId,
      scheduledDate: countData.scheduledDate + 'T08:00:00Z',
      items: [],
      totalBookValue: 0,
      totalCountValue: 0,
      totalVariance: 0,
      counters: countData.counters.map((counter: any) => ({
        userId: counter.userId,
        name: counter.name,
        assignedItems: []
      })),
      createdBy: 'current.user',
      createdAt: new Date().toISOString()
    };

    setCounts(prev => [newCount, ...prev]);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading physical counts..." />
      </div>
    );
  }

  return (
    <div className="p-3 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Inventaire Physique</h1>
          <div className="text-sm text-gray-600 flex items-center gap-4">
            <span>Inventaire Annuel 2024</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              Progression: 75%
            </span>
          </div>
        </div>

        <div className="flex gap-2 mt-2 lg:mt-0">
          <button className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <QrCode className="w-3 h-3" />
            Scanner
          </button>
          <button className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <Plus className="w-3 h-3" />
            Nouvelle Session
          </button>
          <button className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <Download className="w-3 h-3" />
            Exporter
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#6A8A82]" />
            <div>
              <p className="text-lg font-bold text-gray-900">{counts.length}</p>
              <p className="text-xs text-gray-600">Articles</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-lg font-bold text-gray-900">
                {counts.filter(c => c.status === 'in_progress').length}
              </p>
              <p className="text-xs text-gray-600">En cours</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-lg font-bold text-gray-900">
                {counts.filter(c => c.status === 'completed').length}
              </p>
              <p className="text-xs text-gray-600">Comptés</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-lg font-bold text-gray-900">
                {counts.filter(c => c.totalVariance < 0).length}
              </p>
              <p className="text-xs text-gray-600">Écarts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-2">
        <div className="grid w-full grid-cols-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`text-xs py-2 px-3 rounded-md transition-all ${
              activeTab === 'inventory'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Articles à Compter
          </button>
          <button
            onClick={() => setActiveTab('variances')}
            className={`text-xs py-2 px-3 rounded-md transition-all ${
              activeTab === 'variances'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Écarts Détectés
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`text-xs py-2 px-3 rounded-md transition-all ${
              activeTab === 'teams'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Équipes
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`text-xs py-2 px-3 rounded-md transition-all ${
              activeTab === 'reports'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Rapports
          </button>
        </div>

        {/* Articles à Compter */}
        {activeTab === 'inventory' && (
          <div className="space-y-2">
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="py-2 px-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Articles à Compter</h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-7 w-48 text-xs px-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                    />
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {filteredCounts.length} articles
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-900">Code Article</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-900">Description</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-900">Emplacement</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-900">Qté Système</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-900">Qté Comptée</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-gray-900">Statut</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedData.slice(0, 5).map((count, index) => (
                        <tr key={count.id} className="hover:bg-gray-50">
                          <td className="py-2 px-3 text-xs font-mono">{count.countNumber}</td>
                          <td className="py-2 px-3 text-xs">Article de test {index + 1}</td>
                          <td className="py-2 px-3 text-xs">Entrepôt A</td>
                          <td className="py-2 px-3 text-xs text-right font-mono">150</td>
                          <td className="py-2 px-3 text-xs text-right font-mono">148</td>
                          <td className="py-2 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              Compté
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button className="p-1 text-gray-400 hover:text-[#6A8A82] rounded">
                              <QrCode className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Écarts Détectés */}
        {activeTab === 'variances' && (
          <div className="space-y-2">
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="py-2 px-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Écarts Détectés</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                    {counts.filter(c => c.totalVariance !== 0).length} écarts
                  </span>
                </div>
              </div>
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-900">Code Article</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-900">Description</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-900">Qté Système</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-900">Qté Comptée</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-900">Écart</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-900">Valeur Écart</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-gray-900">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {counts.filter(c => c.totalVariance !== 0).slice(0, 5).map((count, index) => (
                        <tr key={count.id} className="hover:bg-gray-50">
                          <td className="py-2 px-3 text-xs font-mono">{count.countNumber}</td>
                          <td className="py-2 px-3 text-xs">Article écart {index + 1}</td>
                          <td className="py-2 px-3 text-xs text-right font-mono">100</td>
                          <td className="py-2 px-3 text-xs text-right font-mono">98</td>
                          <td className="py-2 px-3 text-xs text-right font-mono text-red-600">-2</td>
                          <td className="py-2 px-3 text-xs text-right text-red-600">
                            <CurrencyDisplay amount={count.totalVariance} currency="USD" size="sm" />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                              Manquant
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Équipes */}
        {activeTab === 'teams' && (
          <div className="space-y-2">
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="py-2 px-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Équipes de Comptage</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    4 équipes actives
                  </span>
                </div>
              </div>
              <div className="p-3 space-y-2">
                {[
                  { id: 1, name: 'Équipe A', leader: 'John Counter', members: 3, zone: 'Entrepôt Principal', progress: 85 },
                  { id: 2, name: 'Équipe B', leader: 'Jane Counter', members: 2, zone: 'Entrepôt Secondaire', progress: 72 },
                  { id: 3, name: 'Équipe C', leader: 'Mike Auditor', members: 4, zone: 'Zone Réception', progress: 95 },
                  { id: 4, name: 'Équipe D', leader: 'Sarah Inspector', members: 2, zone: 'Zone Expédition', progress: 60 }
                ].map((team) => (
                  <div key={team.id} className="border rounded p-2 bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-[#6A8A82]" />
                        <span className="text-sm font-medium">{team.name}</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">{team.members} membres</span>
                      </div>
                      <div className="text-xs text-gray-600">{team.progress}%</div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Chef: {team.leader}</span>
                      <span>Zone: {team.zone}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-[#6A8A82] h-1.5 rounded-full"
                        style={{ width: `${team.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Rapports */}
        {activeTab === 'reports' && (
          <div className="space-y-2">
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="py-2 px-3 border-b border-gray-200">
                <h3 className="text-sm font-medium">Rapports d'Inventaire</h3>
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Summary Stats */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-700">Résumé de l'inventaire</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-blue-50 p-2 rounded border">
                        <div className="text-lg font-bold text-blue-700">1,247</div>
                        <div className="text-xs text-blue-600">Articles comptés</div>
                      </div>
                      <div className="bg-green-50 p-2 rounded border">
                        <div className="text-lg font-bold text-green-700">89%</div>
                        <div className="text-xs text-green-600">Précision</div>
                      </div>
                      <div className="bg-red-50 p-2 rounded border">
                        <div className="text-lg font-bold text-red-700">23</div>
                        <div className="text-xs text-red-600">Écarts majeurs</div>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded border">
                        <div className="text-lg font-bold text-yellow-700">5.2%</div>
                        <div className="text-xs text-yellow-600">Taux d'écart</div>
                      </div>
                    </div>
                  </div>

                  {/* Charts Preview */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-700">Analyse des écarts</h4>
                    <div className="bg-gray-50 rounded p-3 h-24 flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-gray-400" />
                      <span className="text-xs text-gray-500 ml-2">Graphique des écarts par catégorie</span>
                    </div>
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="border-t pt-2 mt-3">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Exporter les rapports</h4>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                      <FileText className="w-3 h-3" />
                      Rapport complet PDF
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                      <Download className="w-3 h-3" />
                      Écarts CSV
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                      <BarChart3 className="w-3 h-3" />
                      Analyse Excel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateCountModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCount}
      />

      <CountDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        count={selectedCount}
      />
    </div>
  );
};

export default PhysicalInventory;