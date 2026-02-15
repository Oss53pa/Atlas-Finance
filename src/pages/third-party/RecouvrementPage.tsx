import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  Phone,
  Mail,
  FileText,
  Target,
  BarChart3
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  totalDue: number;
  overdueAmount: number;
  daysPastDue: number;
  lastContact: Date | null;
  riskLevel: 'low' | 'medium' | 'high';
  relanceLevel: number;
}

interface RecoveryStats {
  totalOverdue: number;
  customersOverdue: number;
  averageDSO: number;
  recoveryRate: number;
}

const RecouvrementPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<RecoveryStats>({
    totalOverdue: 0,
    customersOverdue: 0,
    averageDSO: 0,
    recoveryRate: 0
  });
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecoveryData();
  }, []);

  const loadRecoveryData = async () => {
    // Simulation de données
    const mockCustomers: Customer[] = [
      {
        id: '1',
        name: 'ABC Corporation',
        totalDue: 2500000,
        overdueAmount: 850000,
        daysPastDue: 45,
        lastContact: new Date('2024-01-20'),
        riskLevel: 'medium',
        relanceLevel: 2
      },
      {
        id: '2',
        name: 'XYZ Industries',
        totalDue: 1200000,
        overdueAmount: 1200000,
        daysPastDue: 75,
        lastContact: null,
        riskLevel: 'high',
        relanceLevel: 4
      },
      {
        id: '3',
        name: 'DEF Services',
        totalDue: 450000,
        overdueAmount: 150000,
        daysPastDue: 15,
        lastContact: new Date('2024-01-25'),
        riskLevel: 'low',
        relanceLevel: 1
      }
    ];

    const mockStats: RecoveryStats = {
      totalOverdue: 3500000,
      customersOverdue: 28,
      averageDSO: 52,
      recoveryRate: 78.5
    };

    setCustomers(mockCustomers);
    setStats(mockStats);
    setLoading(false);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'high': return 'Risque Élevé';
      case 'medium': return 'Risque Moyen';
      case 'low': return 'Risque Faible';
      default: return level;
    }
  };

  const getRelanceColor = (level: number) => {
    if (level >= 4) return 'text-red-600';
    if (level >= 2) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
            <DollarSign className="h-8 w-8 text-green-600 mr-3" />
            Recouvrement Intelligent
          </h1>
          <p className="text-gray-600">
            Relances automatisées et gestion des créances clients
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {stats.totalOverdue.toLocaleString()} XOF
              </p>
              <p className="text-gray-600 text-sm">Créances échues</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.customersOverdue}</p>
              <p className="text-gray-600 text-sm">Clients en retard</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.averageDSO}</p>
              <p className="text-gray-600 text-sm">DSO moyen (jours)</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.recoveryRate}%</p>
              <p className="text-gray-600 text-sm">Taux recouvrement</p>
            </div>
          </motion.div>
        </div>

        {/* Balance âgée */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Balance Âgée</h2>
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <BarChart3 className="h-4 w-4 mr-2" />
                Exporter
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {customers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedCustomer(customer.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          customer.riskLevel === 'high' ? 'bg-red-100' :
                          customer.riskLevel === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                        }`}>
                          <Users className={`h-6 w-6 ${
                            customer.riskLevel === 'high' ? 'text-red-600' :
                            customer.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                          }`} />
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {customer.name}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(customer.riskLevel)}`}>
                            {getRiskLabel(customer.riskLevel)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {customer.overdueAmount.toLocaleString()} XOF en retard
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {customer.daysPastDue} jours
                          </span>
                          <span className={`font-medium ${getRelanceColor(customer.relanceLevel)}`}>
                            Relance niveau {customer.relanceLevel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-700 hover:text-blue-600 transition-colors">
                        <Phone className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-700 hover:text-blue-600 transition-colors">
                        <Mail className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-700 hover:text-blue-600 transition-colors">
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Niveaux de relance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Niveaux de Relance Automatisés</h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { level: 1, days: 5, type: 'Email courtois', color: 'blue' },
                { level: 2, days: 15, type: 'Relance ferme', color: 'yellow' },
                { level: 3, days: 30, type: 'Mise en demeure', color: 'orange' },
                { level: 4, days: 45, type: 'Procédure', color: 'red' },
                { level: 5, days: 60, type: 'Contentieux', color: 'red' }
              ].map((relance) => (
                <div
                  key={relance.level}
                  className={`p-4 rounded-lg border ${
                    relance.color === 'blue' ? 'border-blue-200 bg-blue-50' :
                    relance.color === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
                    relance.color === 'orange' ? 'border-orange-200 bg-orange-50' :
                    'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="text-center">
                    <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                      relance.color === 'blue' ? 'bg-blue-500' :
                      relance.color === 'yellow' ? 'bg-yellow-500' :
                      relance.color === 'orange' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}>
                      <span className="text-white font-bold text-sm">{relance.level}</span>
                    </div>
                    <h4 className={`font-semibold text-sm mb-1 ${
                      relance.color === 'blue' ? 'text-blue-800' :
                      relance.color === 'yellow' ? 'text-yellow-800' :
                      relance.color === 'orange' ? 'text-orange-800' :
                      'text-red-800'
                    }`}>
                      J+{relance.days}
                    </h4>
                    <p className={`text-xs ${
                      relance.color === 'blue' ? 'text-blue-700' :
                      relance.color === 'yellow' ? 'text-yellow-700' :
                      relance.color === 'orange' ? 'text-orange-700' :
                      'text-red-700'
                    }`}>
                      {relance.type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecouvrementPage;