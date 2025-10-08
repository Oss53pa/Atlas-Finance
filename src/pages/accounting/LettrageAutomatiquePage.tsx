import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import {
  Link,
  CheckCircle,
  AlertTriangle,
  Zap,
  BarChart3,
  Calendar,
  DollarSign,
  FileText,
  Target,
  TrendingUp,
  Clock,
  Users
} from 'lucide-react';

interface LettrageMatch {
  id: string;
  type: 'exact' | 'partial' | 'ml_suggestion' | 'ai_pattern' | 'fuzzy_logic';
  confidence: number;
  amount: number;
  reference: string;
  date: Date;
  description: string;
  client_supplier?: string;
  invoice_id?: string;
  payment_id?: string;
  ml_factors: MLFactor[];
  validation_status: 'pending' | 'approved' | 'rejected';
  auto_validated: boolean;
  similarity_score?: number;
  pattern_type?: string;
  learning_feedback?: 'positive' | 'negative';
}

interface MLFactor {
  factor: string;
  weight: number;
  contribution: number;
  description: string;
}

interface MLAlgorithm {
  name: string;
  type: 'supervised' | 'unsupervised' | 'reinforcement';
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  training_samples: number;
  last_training: string;
  is_active: boolean;
  description: string;
}

interface LettrageStats {
  totalUnmatched: number;
  autoMatched: number;
  pendingReview: number;
  matchRate: number;
  mlMatches: number;
  accuracyRate: number;
  processingTime: number;
  learningIterations: number;
  false_positives: number;
  false_negatives: number;
}

const LettrageAutomatiquePage: React.FC = () => {
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
  const [stats, setStats] = useState<LettrageStats>({
    totalUnmatched: 0,
    autoMatched: 0,
    pendingReview: 0,
    matchRate: 0
  });
  const [matches, setMatches] = useState<LettrageMatch[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    loadStats();
    loadMatches();
  }, []);

  const loadStats = async () => {
    // Simulation de données
    setStats({
      totalUnmatched: 156,
      autoMatched: 89,
      pendingReview: 23,
      matchRate: 85.2
    });
  };

  const loadMatches = async () => {
    // Simulation de données
    const mockMatches: LettrageMatch[] = [
      {
        id: '1',
        type: 'exact',
        confidence: 100,
        amount: 250000,
        reference: 'FAC-2024-001',
        date: new Date('2024-01-15'),
        description: 'Facture client ABC Corp'
      },
      {
        id: '2',
        type: 'ml_suggestion',
        confidence: 87,
        amount: 150000,
        reference: 'REG-2024-045',
        date: new Date('2024-01-18'),
        description: 'Règlement XYZ Ltd'
      }
    ];
    setMatches(mockMatches);
  };

  const runAutoLettrage = async () => {
    setIsRunning(true);
    // Simulation du processus
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsRunning(false);
    loadStats();
    loadMatches();
  };

  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case 'exact': return 'Montant exact';
      case 'partial': return 'Partiel';
      case 'ml_suggestion': return 'IA Suggestion';
      default: return type;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-500';
    if (confidence >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <Link className="h-8 w-8 text-blue-600 mr-3" />
                Lettrage Automatique
              </h1>
              <p className="text-gray-600">
                Rapprochement intelligent des factures et règlements
              </p>
            </div>
            
            <button
              onClick={runAutoLettrage}
              disabled={isRunning}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Zap className="h-5 w-5 mr-2" />
              {isRunning ? 'Lettrage en cours...' : 'Lancer le lettrage'}
            </button>
          </div>
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
              <p className="text-2xl font-bold text-gray-900">{stats.totalUnmatched}</p>
              <p className="text-gray-600 text-sm">Non lettrés</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.autoMatched}</p>
              <p className="text-gray-600 text-sm">Auto-lettrés</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingReview}</p>
              <p className="text-gray-600 text-sm">À valider</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.matchRate}%</p>
              <p className="text-gray-600 text-sm">Taux lettrage</p>
            </div>
          </motion.div>
        </div>

        {/* Algorithmes de lettrage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Algorithmes de Lettrage</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center mb-3">
                <Target className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-blue-900">Montant Exact</h3>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                Rapprochement par montant identique et date compatible
              </p>
              <div className="text-xs text-blue-600">
                ✓ Fiabilité: 100%<br />
                ✓ Vitesse: Instantanée
              </div>
            </div>

            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <div className="flex items-center mb-3">
                <FileText className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="font-semibold text-green-900">Référence Facture</h3>
              </div>
              <p className="text-sm text-green-700 mb-3">
                Matching par numéro de facture dans libellé
              </p>
              <div className="text-xs text-green-600">
                ✓ Fiabilité: 95%<br />
                ✓ OCR intégré
              </div>
            </div>

            <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
              <div className="flex items-center mb-3">
                <Zap className="h-5 w-5 text-purple-600 mr-2" />
                <h3 className="font-semibold text-purple-900">Machine Learning</h3>
              </div>
              <p className="text-sm text-purple-700 mb-3">
                Suggestions basées sur l'historique et patterns
              </p>
              <div className="text-xs text-purple-600">
                ✓ Apprentissage continu<br />
                ✓ Confiance variable
              </div>
            </div>
          </div>
        </div>

        {/* Suggestions de lettrage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Suggestions de Lettrage</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Dernière analyse: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="space-y-4">
            {matches.map((match) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`p-2 rounded-lg ${
                        match.type === 'exact' ? 'bg-green-100' :
                        match.type === 'partial' ? 'bg-yellow-100' : 'bg-purple-100'
                      }`}>
                        {match.type === 'exact' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : match.type === 'partial' ? (
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <Zap className="h-5 w-5 text-purple-600" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-medium text-gray-900">
                          {match.reference}
                        </span>
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          match.type === 'exact' ? 'bg-green-100 text-green-800' :
                          match.type === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {getMatchTypeLabel(match.type)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {match.amount.toLocaleString()} XOF
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {match.date.toLocaleDateString()}
                        </span>
                        <span className={`font-medium ${getConfidenceColor(match.confidence)}`}>
                          Confiance: {match.confidence}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{match.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                      Valider
                    </button>
                    <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                      Rejeter
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {matches.length === 0 && (
            <div className="text-center py-12">
              <Link className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune suggestion disponible
              </h3>
              <p className="text-gray-600">
                Lancez le processus de lettrage automatique pour voir les suggestions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(range) => setDateRange(range)}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default LettrageAutomatiquePage;
