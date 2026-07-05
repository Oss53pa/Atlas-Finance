import { formatCurrency } from '@/utils/formatters';
import { buildPieceNumbers, pieceNumberOf } from '../../utils/pieceNumber';
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { autoLettrage, applyLettrage, applyManualLettrage } from '../../services/lettrageService';
import { useToast } from '../../hooks/useToast';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import {
  Link,
  CheckCircle,
  AlertTriangle,
  Zap,
  Calendar,
  DollarSign,
  Target,
  Clock
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
  ml_factors?: MLFactor[];
  validation_status?: 'pending' | 'approved' | 'rejected';
  auto_validated?: boolean;
  similarity_score?: number;
  pattern_type?: string;
  learning_feedback?: 'positive' | 'negative';
  // Références des deux lignes à lettrer (pour appliquer LA paire, pas un lettrage global).
  debitRef?: { entryId: string; lineId: string };
  creditRef?: { entryId: string; lineId: string };
}

interface MLFactor {
  factor: string;
  weight: number;
  contribution: number;
  description: string;
}

interface LettrageStats {
  totalUnmatched: number;
  autoMatched: number;
  pendingReview: number;
  matchRate: number;
  mlMatches?: number;
  accuracyRate?: number;
  processingTime?: number;
  learningIterations?: number;
  false_positives?: number;
  false_negatives?: number;
}

const LettrageAutomatiquePage: React.FC = () => {
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: `${new Date().getFullYear()}-01-01`, end: `${new Date().getFullYear()}-12-31` });
  const [isRunning, setIsRunning] = useState(false);
  const { adapter } = useData();
  const [allEntries, setAllEntries] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const e = await adapter.getAll('journalEntries');
      setAllEntries(e as Record<string, unknown>[]);
    };
    load();
  }, [adapter]);

  // Derive lettrage lines from journal entries within the date range
  const reconcilableLines = useMemo(() => {
    const lines: Array<{
      id: string;
      entryId: string;
      lineId: string;
      accountCode: string;
      label: string;
      date: string;
      reference: string;
      debit: number;
      credit: number;
      lettrageCode?: string;
      thirdPartyName?: string;
    }> = [];

    const pieceNumbers = buildPieceNumbers(allEntries as any);
    for (const entry of allEntries) {
      if (entry.date < dateRange.start || entry.date > dateRange.end) continue;
      for (const line of entry.lines) {
        if (!line.accountCode.startsWith('41') && !line.accountCode.startsWith('40')) continue;
        lines.push({
          id: `${entry.id}-${line.id}`,
          entryId: entry.id,
          lineId: line.id,
          accountCode: line.accountCode,
          label: line.label || entry.label,
          date: entry.date,
          reference: pieceNumberOf(entry as any, pieceNumbers),
          debit: line.debit,
          credit: line.credit,
          lettrageCode: line.lettrageCode,
          thirdPartyName: line.thirdPartyName,
        });
      }
    }
    return lines;
  }, [allEntries, dateRange]);

  // Compute stats from real data
  const stats = useMemo<LettrageStats>(() => {
    const total = reconcilableLines.length;
    const matched = reconcilableLines.filter(l => l.lettrageCode).length;
    const unmatched = total - matched;
    const matchRate = total > 0 ? Math.round((matched / total) * 1000) / 10 : 0;
    return {
      totalUnmatched: unmatched,
      autoMatched: matched,
      pendingReview: 0,
      matchRate,
    };
  }, [reconcilableLines]);

  // Build match suggestions: find unmatched debit/credit pairs on the same account with same amount
  const matches = useMemo<LettrageMatch[]>(() => {
    const unmatched = reconcilableLines.filter(l => !l.lettrageCode);
    const debits = unmatched.filter(l => l.debit > 0);
    const credits = unmatched.filter(l => l.credit > 0);
    const suggestions: LettrageMatch[] = [];
    const usedCredits = new Set<string>();

    for (const d of debits) {
      for (const c of credits) {
        if (usedCredits.has(c.id)) continue;
        if (d.accountCode !== c.accountCode) continue;
        const diff = Math.abs(d.debit - c.credit);
        if (diff < 0.01) {
          // Exact match
          suggestions.push({
            id: `match-${d.id}-${c.id}`,
            type: 'exact',
            confidence: 100,
            amount: d.debit,
            reference: d.reference,
            date: new Date(d.date),
            description: `${d.label} / ${c.label}`,
            debitRef: { entryId: d.entryId, lineId: d.lineId },
            creditRef: { entryId: c.entryId, lineId: c.lineId },
          });
          usedCredits.add(c.id);
          break;
        } else if (diff / Math.max(d.debit, c.credit) < 0.05) {
          // Partial match within 5%
          suggestions.push({
            id: `match-${d.id}-${c.id}`,
            type: 'partial',
            confidence: Math.round((1 - diff / Math.max(d.debit, c.credit)) * 100),
            amount: d.debit,
            reference: d.reference,
            date: new Date(d.date),
            description: `${d.label} / ${c.label}`,
            debitRef: { entryId: d.entryId, lineId: d.lineId },
            creditRef: { entryId: c.entryId, lineId: c.lineId },
          });
          usedCredits.add(c.id);
          break;
        }
      }
    }
    return suggestions;
  }, [reconcilableLines]);

  const { toast } = useToast();
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const reload = async () => {
    const e = await adapter.getAll('journalEntries');
    setAllEntries(e as Record<string, unknown>[]);
  };

  // Applique LA paire affichée (pas un lettrage global) : écrit un code partagé dans
  // journal_lines via applyManualLettrage (qui vérifie l'équilibre débit=crédit).
  const validateMatch = async (m: LettrageMatch) => {
    if (!m.debitRef || !m.creditRef) return;
    setValidatingId(m.id);
    try {
      const code = await applyManualLettrage(adapter, [m.debitRef, m.creditRef]);
      await reload();
      toast.success(`Lettrage ${code} appliqué`);
    } catch (err: any) {
      toast.error(err?.message || 'Lettrage impossible');
    } finally {
      setValidatingId(null);
    }
  };

  // Rejeter = écarter la suggestion de la liste (décision de session, pas une donnée métier).
  const rejectMatch = (id: string) => setRejectedIds(prev => new Set(prev).add(id));

  const runAutoLettrage = async () => {
    setIsRunning(true);
    try {
      const result = await autoLettrage(adapter, { tolerance: 1 });
      if (result.matches.length > 0) {
        const applied = await applyLettrage(adapter, result.matches);
        await reload();
        toast.success(`${applied} écriture(s) lettrée(s) automatiquement`);
      } else {
        toast.warning('Aucune correspondance trouvée');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du lettrage automatique');
    }
    setIsRunning(false);
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
    <div className="min-h-full bg-primary-50">
      <div className="container mx-auto px-4 py-6">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
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
              <p className="text-lg font-bold text-gray-900">{stats.totalUnmatched}</p>
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
              <p className="text-lg font-bold text-gray-900">{stats.autoMatched}</p>
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
              <p className="text-lg font-bold text-gray-900">{stats.pendingReview}</p>
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
              <p className="text-lg font-bold text-gray-900">{stats.matchRate}%</p>
              <p className="text-gray-600 text-sm">Taux lettrage</p>
            </div>
          </motion.div>
        </div>

        {/* Algorithmes de lettrage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Méthodes de rapprochement</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center mb-3">
                <Target className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-blue-900">Montant exact</h3>
              </div>
              <p className="text-sm text-blue-700">
                Rapprochement d'un débit et d'un crédit de montant identique sur
                le même compte tiers (classes 40 et 41).
              </p>
            </div>

            <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
              <div className="flex items-center mb-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <h3 className="font-semibold text-yellow-900">Rapprochement partiel</h3>
              </div>
              <p className="text-sm text-yellow-700">
                Suggestion lorsqu'un débit et un crédit du même compte présentent
                un écart inférieur à 5 % (à valider manuellement).
              </p>
            </div>
          </div>
        </div>

        {/* Suggestions de lettrage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Suggestions de Lettrage</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Dernière analyse: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="space-y-4">
            {matches.filter(m => !rejectedIds.has(m.id)).map((match) => (
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
                        match.type === 'partial' ? 'bg-yellow-100' : 'bg-primary-100'
                      }`}>
                        {match.type === 'exact' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : match.type === 'partial' ? (
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <Zap className="h-5 w-5 text-primary-600" />
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
                          match.type === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-primary-100 text-primary-800'
                        }`}>
                          {getMatchTypeLabel(match.type)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {formatCurrency(match.amount)}
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
                    <button
                      onClick={() => validateMatch(match)}
                      disabled={validatingId === match.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50">
                      {validatingId === match.id ? 'Lettrage…' : 'Valider'}
                    </button>
                    <button
                      onClick={() => rejectMatch(match.id)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                      Rejeter
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {matches.filter(m => !rejectedIds.has(m.id)).length === 0 && (
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
