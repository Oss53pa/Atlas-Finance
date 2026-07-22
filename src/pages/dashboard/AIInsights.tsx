import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Brain, TrendingUp, TrendingDown, Target, Zap, LineChart,
  AlertTriangle, CheckCircle, Info, DollarSign, Users, Package,
  Calendar, Clock, BarChart3, PieChart, Activity, Shield,
  Cpu, Eye, RefreshCw, Download, Settings, ChevronRight,
  ArrowUpRight, ArrowDownRight, Sparkles, Bot, Lightbulb
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { askProph3t, isProph3tCoreConfigured } from '../../lib/proph3t';
import { LineChart as RechartsLineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface Prediction {
  id: string;
  type: 'revenue' | 'expense' | 'cashflow' | 'demand' | 'risk';
  title: string;
  description: string;
  value: number;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  factors: string[];
  recommendation: string;
  probability: number;
}

interface Anomaly {
  id: string;
  category: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  detectedAt: Date;
  pattern: string;
  affectedMetric: string;
  deviation: number;
  suggestion: string;
}

interface Insight {
  id: string;
  category: 'opportunity' | 'risk' | 'optimization' | 'trend';
  title: string;
  description: string;
  actionableSteps: string[];
  potentialGain: number;
  confidence: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
}

const DEFAULT_SCORING_BENCHMARKS = {
  equilibreDebitCredit: 100,
  couverture: 80,
  validation: 90,
  exhaustivite: 85,
};

const AIInsights: React.FC = () => {
  const { adapter } = useData();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('predictions');
  const [selectedModel, setSelectedModel] = useState('revenue_forecast');
  const [timeHorizon, setTimeHorizon] = useState('3months');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  // Analyse narrative par le CORE IA Atlas Studio (Proph3t, mode B hébergé).
  const [proph3tAnswer, setProph3tAnswer] = useState<string | null>(null);
  const [proph3tLoading, setProph3tLoading] = useState(false);
  const [proph3tError, setProph3tError] = useState<string | null>(null);
  const [metricsSummary, setMetricsSummary] = useState<string>('');
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [scoringData, setScoringData] = useState<any[]>([]);
  const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [aiServiceAvailable] = useState(Boolean(import.meta.env.VITE_AI_SERVICE_URL));
  const [totalEntries, setTotalEntries] = useState(0);

  // Moteur d'analyse RÉEL — toutes les métriques dérivent du Grand Livre.
  useEffect(() => {
    const analyzeData = async () => {
      try {
        const entries = await adapter.getAll<any>('journalEntries');
        setTotalEntries(entries.length);
        // ⚠️ les écritures importées sont 'validated' (pas seulement 'posted')
        const posted = entries.filter((e: any) => e.status === 'posted' || e.status === 'validated');
        const isAN = (e: any) => e.journal === 'AN' || e.journal === 'RAN';

        // ── Séries mensuelles (flux de période : hors À Nouveau) ────────────
        const monthlyRevenue: Record<string, number> = {};
        const monthlyCharges: Record<string, number> = {};
        let totalCA = 0;
        let totalCharges = 0;
        let totalTresorerie = 0;
        let encoursClients = 0;
        const chargesByPrefix: Record<string, number> = {};

        for (const entry of posted) {
          if (!entry.lines) continue;
          const month = entry.date ? entry.date.substring(0, 7) : 'inconnu';
          const an = isAN(entry);
          for (const line of entry.lines) {
            const code = line.accountCode || '';
            if (code.startsWith('5')) totalTresorerie += (line.debit || 0) - (line.credit || 0);
            if (code.startsWith('41')) encoursClients += (line.debit || 0) - (line.credit || 0);
            if (an) continue; // l'ouverture n'est pas un flux d'activité
            if (code.startsWith('7')) {
              const val = (line.credit || 0) - (line.debit || 0);
              totalCA += val;
              monthlyRevenue[month] = (monthlyRevenue[month] || 0) + val;
            }
            if (code.startsWith('6')) {
              const val = (line.debit || 0) - (line.credit || 0);
              totalCharges += val;
              monthlyCharges[month] = (monthlyCharges[month] || 0) + val;
              const p2 = code.substring(0, 2);
              chargesByPrefix[p2] = (chargesByPrefix[p2] || 0) + val;
            }
          }
        }

        // ── PRÉVISION CA : régression linéaire sur la série mensuelle réelle ─
        const months = Object.keys(monthlyRevenue).sort();
        const series = months.map(m => monthlyRevenue[m] || 0);
        const horizonMonths = timeHorizon === '1month' ? 1 : timeHorizon === '6months' ? 6 : timeHorizon === '1year' ? 12 : 3;
        let slope = 0, intercept = series[0] || 0, r2 = 0, sigma = 0;
        if (series.length >= 3) {
          const n = series.length;
          const xs = series.map((_, i) => i);
          const sumX = xs.reduce((a, b) => a + b, 0);
          const sumY = series.reduce((a, b) => a + b, 0);
          const sumXY = xs.reduce((a, x, i) => a + x * series[i], 0);
          const sumX2 = xs.reduce((a, x) => a + x * x, 0);
          const denom = n * sumX2 - sumX * sumX;
          slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
          intercept = (sumY - slope * sumX) / n;
          const meanY = sumY / n;
          let ssRes = 0, ssTot = 0;
          for (let i = 0; i < n; i++) {
            const fit = intercept + slope * i;
            ssRes += (series[i] - fit) ** 2;
            ssTot += (series[i] - meanY) ** 2;
          }
          r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
          sigma = Math.sqrt(ssRes / Math.max(1, n - 2));
        }
        const forecastConfidence = series.length >= 3 ? Math.round(40 + r2 * 55) : 0;
        const nextMonthForecast = series.length >= 3 ? Math.max(0, intercept + slope * series.length) : 0;
        const horizonForecast = series.length >= 3
          ? Array.from({ length: horizonMonths }, (_, k) => Math.max(0, intercept + slope * (series.length + k))).reduce((a, b) => a + b, 0)
          : 0;

        // Graphe : réel + projection avec bande de confiance (±1,96σ des résidus)
        const lastMonth = months[months.length - 1];
        const futureMonths: string[] = [];
        if (lastMonth && series.length >= 3) {
          const [y0, m0] = lastMonth.split('-').map(Number);
          for (let k = 1; k <= horizonMonths; k++) {
            const total = (m0 - 1) + k;
            futureMonths.push(`${y0 + Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`);
          }
        }
        setForecastData([
          ...months.map((m, i) => ({
            date: m,
            actual: Math.round(series[i]),
            predicted: series.length >= 3 ? Math.round(intercept + slope * i) : null,
            upper: null,
            lower: null,
          })),
          ...futureMonths.map((m, k) => {
            const fit = Math.max(0, intercept + slope * (series.length + k));
            return {
              date: m,
              actual: null,
              predicted: Math.round(fit),
              upper: Math.round(fit + 1.96 * sigma),
              lower: Math.round(Math.max(0, fit - 1.96 * sigma)),
            };
          }),
        ]);

        // ── Cartes Prédictions ───────────────────────────────────────────────
        const builtPredictions: Prediction[] = [];
        if (series.length >= 3) {
          builtPredictions.push({
            id: 'forecast',
            type: 'revenue',
            title: t('aiInsights.forecastTitle', { count: String(horizonMonths) }),
            description: t('aiInsights.forecastDesc', { months: String(series.length), amount: formatCurrency(Math.round(nextMonthForecast)) }),
            value: Math.round(horizonForecast),
            confidence: forecastConfidence,
            impact: 'high',
            timeframe: t('aiInsights.timeframeMonths', { count: String(horizonMonths) }),
            factors: [
              t(slope >= 0 ? 'aiInsights.factorTrendUp' : 'aiInsights.factorTrendDown', { amount: formatCurrency(Math.round(slope)) }),
              `R² = ${(r2 * 100).toFixed(0)}%`,
              t('aiInsights.factorHistory', { count: String(series.length) }),
            ],
            recommendation: slope < 0
              ? t('aiInsights.recoTrendDown')
              : t('aiInsights.recoTrendHealthy'),
            probability: Math.min(1, Math.max(0, r2)),
          });
        }
        if (totalCA > 0) {
          builtPredictions.push({
            id: 'ca',
            type: 'revenue',
            title: t('aiInsights.titleRevenueActual'),
            description: t('aiInsights.descRevenueActual', { amount: formatCurrency(Math.round(totalCA)) }),
            value: Math.round(totalCA),
            confidence: 100,
            impact: 'high',
            timeframe: t('aiInsights.timeframePeriod'),
            factors: [t('aiInsights.factorClass7'), t('aiInsights.factorActiveMonths', { count: String(months.length) })],
            recommendation: t('aiInsights.recoNetMargin', { value: String(totalCA > 0 ? (((totalCA - totalCharges) / totalCA) * 100).toFixed(1) : 0) }),
            probability: 1
          });
        }
        if (totalTresorerie !== 0) {
          const monthlyBurn = months.length > 0 ? (totalCharges - totalCA) / months.length : 0;
          const runway = monthlyBurn > 0 ? totalTresorerie / monthlyBurn : Infinity;
          builtPredictions.push({
            id: 'treso',
            type: 'cashflow',
            title: t('aiInsights.titleTreasury'),
            description: t(totalTresorerie < 0 ? 'aiInsights.descTreasuryNegative' : 'aiInsights.descTreasuryPositive', { amount: formatCurrency(Math.round(totalTresorerie)) }),
            value: Math.round(totalTresorerie),
            confidence: 100,
            impact: totalTresorerie < 0 ? 'high' : 'medium',
            timeframe: t('aiInsights.timeframeCurrent'),
            factors: [
              t('aiInsights.factorClass5'),
              monthlyBurn > 0 ? t('aiInsights.factorRunway', { count: runway.toFixed(0) }) : t('aiInsights.factorCashGenerating'),
            ],
            recommendation: totalTresorerie < 0
              ? t('aiInsights.recoTreasuryNegative')
              : t('aiInsights.recoTreasuryPositive'),
            probability: 1
          });
        }
        if (builtPredictions.length === 0) {
          builtPredictions.push({
            id: '0', type: 'revenue', title: t('aiInsights.titleInsufficientData'),
            description: t('aiInsights.descInsufficientData'),
            value: 0, confidence: 0, impact: 'low', timeframe: '-',
            factors: [t('aiInsights.titleInsufficientData')],
            recommendation: t('aiInsights.recoInsufficientData'),
            probability: 0
          });
        }
        setPredictions(builtPredictions);

        // ── DÉTECTION D'ANOMALIES réelle (5 détecteurs) ──────────────────────
        const builtAnomalies: Anomaly[] = [];
        let anomalyId = 0;
        const push = (a: Omit<Anomaly, 'id'>) => { anomalyId++; builtAnomalies.push({ id: String(anomalyId), ...a } as Anomaly); };
        // moyenne UNE fois (pas dans la boucle)
        const opEntries = posted.filter((e: any) => !isAN(e));
        const totals = opEntries.map((e: any) => e.totalDebit || (e.lines || []).reduce((s: number, l: any) => s + (l.debit || 0), 0));
        const avgAmount = totals.length ? totals.reduce((a: number, b: number) => a + b, 0) / totals.length : 0;
        const seenSignatures = new Map<string, any>();
        for (let i = 0; i < opEntries.length; i++) {
          const entry = opEntries[i];
          const lines = entry.lines || [];
          const d = lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
          const c = lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
          // 1. Déséquilibre D/C
          if (Math.abs(d - c) > 0.01) {
            push({
              category: t('aiInsights.catAccounting'), severity: 'critical',
              description: t('aiInsights.anomUnbalancedDesc', { entry: String(entry.entryNumber || entry.id) }),
              detectedAt: new Date(entry.date || Date.now()),
              pattern: t('aiInsights.anomUnbalancedPattern', { amount: formatCurrency(Math.abs(d - c)) }),
              affectedMetric: t('aiInsights.metricAccountingBalance'), deviation: Math.round(Math.abs(d - c)),
              suggestion: t('aiInsights.anomUnbalancedSuggestion')
            } as any);
          }
          // 2. Montant inhabituel (> 10× moyenne)
          if (avgAmount > 0 && totals[i] > avgAmount * 10) {
            push({
              category: t('aiInsights.catAmount'), severity: 'warning',
              description: t('aiInsights.anomUnusualAmountDesc', { entry: String(entry.entryNumber || entry.id), label: (entry.label || '').slice(0, 60) }),
              detectedAt: new Date(entry.date || Date.now()),
              pattern: t('aiInsights.anomUnusualAmountPattern', { amount: formatCurrency(totals[i]), average: formatCurrency(Math.round(avgAmount)), ratio: (totals[i] / avgAmount).toFixed(1) }),
              affectedMetric: t('aiInsights.metricEntryAmount'), deviation: Math.round(((totals[i]) / avgAmount - 1) * 100),
              suggestion: t('aiInsights.anomUnusualAmountSuggestion')
            } as any);
          }
          // 3. Écriture un week-end (samedi/dimanche)
          if (entry.date) {
            const day = new Date(entry.date).getDay();
            if ((day === 0 || day === 6) && totals[i] > avgAmount) {
              push({
                category: t('aiInsights.catCalendar'), severity: 'info',
                description: t('aiInsights.anomWeekendDesc', { day: t(day === 0 ? 'aiInsights.daySunday' : 'aiInsights.daySaturday'), entry: String(entry.entryNumber || entry.id) }),
                detectedAt: new Date(entry.date),
                pattern: `${entry.date} (${formatCurrency(totals[i])})`,
                affectedMetric: t('aiInsights.metricEntryDate'), deviation: 0,
                suggestion: t('aiInsights.anomWeekendSuggestion')
              } as any);
            }
          }
          // 4. Doublons potentiels (même journal + date + montant)
          if (totals[i] > 0) {
            const sig = `${entry.journal}|${entry.date}|${Math.round(totals[i])}`;
            const first = seenSignatures.get(sig);
            if (first && first.id !== entry.id) {
              push({
                category: t('aiInsights.catDuplicate'), severity: 'warning',
                description: t('aiInsights.anomDuplicateDesc', { first: String(first.entryNumber || first.id), second: String(entry.entryNumber || entry.id) }),
                detectedAt: new Date(entry.date || Date.now()),
                pattern: t('aiInsights.anomDuplicatePattern', { journal: String(entry.journal), date: String(entry.date), amount: formatCurrency(totals[i]) }),
                affectedMetric: t('aiInsights.metricDocumentUniqueness'), deviation: 100,
                suggestion: t('aiInsights.anomDuplicateSuggestion')
              } as any);
            } else {
              seenSignatures.set(sig, entry);
            }
          }
        }
        // Trier par sévérité puis montant, plafonner l'affichage
        const sevRank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        builtAnomalies.sort((a, b) => (sevRank[a.severity] ?? 3) - (sevRank[b.severity] ?? 3) || (b.deviation || 0) - (a.deviation || 0));
        setAnomalies(builtAnomalies.slice(0, 50));

        // ── INSIGHTS ACTIONNABLES réels ──────────────────────────────────────
        const builtInsights: Insight[] = [];
        const marge = totalCA > 0 ? ((totalCA - totalCharges) / totalCA) * 100 : 0;
        if (totalCA > 0 && marge < 25) {
          builtInsights.push({
            id: 'marge', category: 'risk', title: t('aiInsights.insightMarginTitle'),
            description: t('aiInsights.insightMarginDesc', { margin: marge.toFixed(1), revenue: formatCurrency(Math.round(totalCA)), expenses: formatCurrency(Math.round(totalCharges)) }),
            actionableSteps: [t('aiInsights.insightMarginStep1'), t('aiInsights.insightMarginStep2'), t('aiInsights.insightMarginStep3')],
            potentialGain: Math.round(totalCA * 0.05), confidence: 90, priority: 'high'
          });
        }
        // Top 3 postes de charges réels
        const CHARGE_LABELS: Record<string, string> = {
          '60': t('aiInsights.chargeLabel60'), '61': t('aiInsights.chargeLabel61'), '62': t('aiInsights.chargeLabel62'),
          '63': t('aiInsights.chargeLabel63'), '64': t('aiInsights.chargeLabel64'), '65': t('aiInsights.chargeLabel65'),
          '66': t('aiInsights.chargeLabel66'), '67': t('aiInsights.chargeLabel67'), '68': t('aiInsights.chargeLabel68'),
          '69': t('aiInsights.chargeLabel69'),
        };
        const topCharges = Object.entries(chargesByPrefix).sort((a, b) => b[1] - a[1]).slice(0, 3);
        if (topCharges.length > 0 && totalCharges > 0) {
          builtInsights.push({
            id: 'charges', category: 'optimization', title: t('aiInsights.insightChargesTitle'),
            description: topCharges.map(([p, v]) => `${CHARGE_LABELS[p] || p} : ${formatCurrency(Math.round(v))} (${((v / totalCharges) * 100).toFixed(0)}%)`).join(' · '),
            actionableSteps: topCharges.map(([p, v]) => t('aiInsights.insightChargesStep', { label: CHARGE_LABELS[p] || p, pct: ((v / totalCharges) * 100).toFixed(0) })),
            potentialGain: Math.round(topCharges[0][1] * 0.1), confidence: 100, priority: 'medium'
          });
        }
        // Encours clients vs CA (tension de recouvrement)
        if (encoursClients > 0 && totalCA > 0) {
          const ratio = (encoursClients / totalCA) * 100;
          const dso = Math.round((encoursClients / totalCA) * 365);
          if (ratio > 25) {
            builtInsights.push({
              id: 'dso', category: 'risk', title: t('aiInsights.insightDsoTitle'),
              description: t('aiInsights.insightDsoDesc', { amount: formatCurrency(Math.round(encoursClients)), ratio: ratio.toFixed(0), dso: String(dso) }),
              actionableSteps: [t('aiInsights.insightDsoStep1'), t('aiInsights.insightDsoStep2'), t('aiInsights.insightDsoStep3')],
              potentialGain: Math.round(encoursClients * 0.3), confidence: 95, priority: 'high'
            });
          }
        }
        const draftCount = entries.filter((e: any) => e.status === 'draft').length;
        if (draftCount > 5) {
          builtInsights.push({
            id: 'drafts', category: 'optimization', title: t('aiInsights.insightDraftsTitle'),
            description: t('aiInsights.insightDraftsDesc', { count: String(draftCount) }),
            actionableSteps: [t('aiInsights.insightDraftsStep1'), t('aiInsights.insightDraftsStep2')],
            potentialGain: 0, confidence: 95, priority: 'medium'
          });
        }
        if (builtInsights.length === 0 && totalCA > 0) {
          builtInsights.push({
            id: 'ok', category: 'optimization', title: t('aiInsights.insightOkTitle'),
            description: t('aiInsights.insightOkDesc', { margin: marge.toFixed(1) }),
            actionableSteps: [t('aiInsights.insightOkStep1'), t('aiInsights.insightOkStep2')],
            potentialGain: 0, confidence: 80, priority: 'low'
          });
        }
        setInsights(builtInsights);

        // Résumé compact des métriques RÉELLES — contexte envoyé à Proph3t (IA Core).
        setMetricsSummary([
          `CA période: ${Math.round(totalCA)} FCFA sur ${months.length} mois (${months[0] || '?'} → ${months[months.length - 1] || '?'})`,
          `Charges: ${Math.round(totalCharges)} FCFA — marge nette ${marge.toFixed(1)}%`,
          `Trésorerie: ${Math.round(totalTresorerie)} FCFA — encours clients: ${Math.round(encoursClients)} FCFA`,
          `Top charges: ${topCharges.map(([p, v]) => `${CHARGE_LABELS[p] || p}=${Math.round(v)}`).join(', ')}`,
          series.length >= 3 ? `Tendance CA: ${Math.round(slope)}/mois (R²=${(r2 * 100).toFixed(0)}%), prévision mois prochain: ${Math.round(nextMonthForecast)}` : 'Historique insuffisant pour la tendance',
          `Anomalies détectées: ${builtAnomalies.length} (déséquilibres, montants atypiques, doublons potentiels, dates week-end)`,
        ].join('\n'));

        // Scoring based on data quality
        const balancedPct = posted.length > 0
          ? Math.round((posted.filter((e: any) => {
              if (!e.lines) return true;
              const dd = e.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
              const cc = e.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
              return Math.abs(dd - cc) < 0.01;
            }).length / posted.length) * 100)
          : 0;
        setScoringData([
          { metric: t('aiInsights.scoreBalance'), score: balancedPct, benchmark: DEFAULT_SCORING_BENCHMARKS.equilibreDebitCredit },
          { metric: t('aiInsights.scoreCoverage'), score: entries.length > 0 ? Math.min(100, entries.length * 2) : 0, benchmark: DEFAULT_SCORING_BENCHMARKS.couverture },
          { metric: t('aiInsights.scoreValidation'), score: posted.length > 0 ? Math.round((posted.length / entries.length) * 100) : 0, benchmark: DEFAULT_SCORING_BENCHMARKS.validation },
          { metric: t('aiInsights.scoreCompleteness'), score: totalCA > 0 && totalCharges > 0 ? 80 : 20, benchmark: DEFAULT_SCORING_BENCHMARKS.exhaustivite },
        ]);

        setCorrelationData([]);
      } catch (err) {
        /* ignored */
      }
    };
    analyzeData();
    // timeHorizon recalcule la projection ; refreshTick relance l'analyse à la demande.
  }, [adapter, timeHorizon, refreshTick, t]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshTick(prev => prev + 1); // relance l'analyse réelle (deps de l'effet)
    await new Promise(resolve => setTimeout(resolve, 600));
    setRefreshing(false);
  };

  // Analyse narrative par le CORE IA Atlas Studio (Proph3t) : on lui envoie les
  // métriques réelles déjà calculées (sensibilité 'confidential' → routage core
  // confiné aux providers sans rétention).
  const handleProph3tAnalysis = async () => {
    if (!metricsSummary || proph3tLoading) return;
    setProph3tLoading(true);
    setProph3tError(null);
    try {
      const res = await askProph3t({
        message:
          `Tu es l'analyste financier d'un ERP SYSCOHADA (zone OHADA, FCFA). Voici les métriques réelles ` +
          `calculées sur le Grand Livre de l'entreprise :\n\n${metricsSummary}\n\n` +
          `Donne une analyse stratégique CONCISE en français : 1) lecture de la santé financière, ` +
          `2) les 2 risques prioritaires, 3) les 3 actions concrètes recommandées. Pas de généralités.`,
        sensitivity: 'confidential',
      });
      setProph3tAnswer(res.answer);
    } catch (err) {
      setProph3tError(err instanceof Error ? err.message : t('aiInsights.proph3tUnavailable'));
    } finally {
      setProph3tLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-700';
    if (confidence >= 60) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'info': return 'bg-[var(--color-surface-hover)] border-[var(--color-border)]';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const tabs = [
    { id: 'predictions', label: t('aiInsights.tabPredictions'), icon: Brain },
    { id: 'anomalies', label: t('aiInsights.tabAnomalies'), icon: AlertTriangle },
    { id: 'insights', label: t('aiInsights.actionableInsights'), icon: Lightbulb },
    { id: 'performance', label: t('aiInsights.tabPerformance'), icon: BarChart3 }
  ];

  const renderPredictionsTab = () => (
    <div className="space-y-6">
      {/* AI Performance Overview */}
      <div className="bg-gradient-to-r from-[#235A6E] to-[#4E7E8D] rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-8 h-8 text-white" />
          <div>
            <h2 className="text-lg font-semibold text-white">{t('aiInsights.aiModelPerformance')}</h2>
            <p className="text-white/80">{t('aiInsights.realtimeAccuracy')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-white" />
              <span className="text-sm text-white/90">{t('aiInsights.entriesAnalyzed')}</span>
            </div>
            <p className="text-lg font-bold text-white">{totalEntries}</p>
            <p className="text-sm text-white/75 mt-1">{t('aiInsights.total')}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-sm text-white/90">{t('aiInsights.anomaliesDetected')}</span>
            </div>
            <p className="text-lg font-bold text-white">{anomalies.length}</p>
            <p className="text-sm text-white/75 mt-1">{t('aiInsights.toProcess')}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-white" />
              <span className="text-sm text-white/90">{t('aiInsights.insights')}</span>
            </div>
            <p className="text-lg font-bold text-white">{insights.length}</p>
            <p className="text-sm text-white/75 mt-1">{t('aiInsights.recommendations')}</p>
          </div>
        </div>
      </div>

      {/* Predictions Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {predictions.map((prediction) => (
          <div key={prediction.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{prediction.title}</h3>
                <p className="text-sm text-gray-900 mt-1">{prediction.description}</p>
              </div>
              <Bot className="w-5 h-5 text-[var(--color-text-primary)]" />
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-gray-900">
                  {prediction.type === 'revenue' || prediction.type === 'cashflow'
                    ? `${formatCurrency(prediction.value)}`
                    : t('aiInsights.units', { value: String(prediction.value) })}
                </span>
                <span className="text-sm text-gray-600">{prediction.timeframe}</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-900">{t('aiInsights.confidence')}</span>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getConfidenceColor(prediction.confidence))}>
                  {prediction.confidence}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full",
                    prediction.confidence >= 80 ? "bg-[#15803D]" :
                    prediction.confidence >= 60 ? "bg-[#E89A2E]" : "bg-[#C0322B]"
                  )}
                  style={{ width: `${prediction.confidence}%` }}
                />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-900 mb-2">{t('aiInsights.keyFactors')}</p>
              <div className="flex flex-wrap gap-1">
                {prediction.factors.map((factor, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 text-xs rounded">
                    {factor}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[var(--color-primary)]/10 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-[var(--color-text-primary)] mt-0.5" />
                <p className="text-sm text-[var(--color-text-primary)]">{prediction.recommendation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Forecast Chart — affiché seulement si l'historique mensuel est suffisant
          (≥ 2 mois réels). Sinon courbe vide → on montre un état honnête. */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('aiInsights.forecastWithCI')}</h2>
        {forecastData.filter((d) => d && d.actual != null).length < 2 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            {t('aiInsights.insufficientHistory')}
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={forecastData}>
            <defs>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#171717" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#171717" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="date" stroke="#235A6E" />
            <YAxis stroke="#235A6E" />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="upper" stroke="transparent" fill="#E0E7FF" name={t('aiInsights.upperBound')} />
            <Area type="monotone" dataKey="lower" stroke="transparent" fill="#FFFFFF" name={t('aiInsights.lowerBound')} />
            <Line type="monotone" dataKey="actual" stroke="#15803D" strokeWidth={2} dot={false} name={t('aiInsights.actual')} />
            <Line type="monotone" dataKey="predicted" stroke="#235A6E" strokeWidth={2} strokeDasharray="5 5" dot={false} name={t('aiInsights.predicted')} />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  const renderAnomaliesTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('aiInsights.realtimeAnomalyDetection')}</h2>
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {anomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={cn(
                "p-4 rounded-lg border",
                getSeverityColor(anomaly.severity)
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{anomaly.description}</h4>
                    <span className="text-xs px-2 py-0.5 bg-white bg-opacity-50 rounded">
                      {anomaly.category}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{anomaly.pattern}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      {anomaly.deviation > 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {Math.abs(anomaly.deviation)}%
                    </span>
                    <span>{new Date(anomaly.detectedAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="mt-2 p-2 bg-white bg-opacity-50 rounded">
                    <p className="text-sm">{anomaly.suggestion}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderInsightsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analyse stratégique par le CORE IA Atlas Studio (Proph3t, mode B) */}
        {isProph3tCoreConfigured() && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-[var(--color-primary)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('aiInsights.strategicAnalysis')} <span className="atlas-brand">Proph3t</span> {t('aiInsights.atlasCoreSuffix')}
                </h2>
              </div>
              <button
                onClick={handleProph3tAnalysis}
                disabled={proph3tLoading || !metricsSummary}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {proph3tLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                {proph3tLoading ? t('aiInsights.analysisRunning') : proph3tAnswer ? t('aiInsights.rerunAnalysis') : t('aiInsights.runAnalysis')}
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {t('aiInsights.proph3tPrivacyNote')}
            </p>
            {proph3tError && (
              /provider|configur|GROQ|BYOK|non op/i.test(proph3tError) ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 space-y-2">
                  <p className="font-medium flex items-center gap-2">
                    <Info className="w-4 h-4 flex-shrink-0" /> {t('aiInsights.coreLabel')} <span className="atlas-brand">Proph3t</span> {t('aiInsights.coreNotOperational')}
                  </p>
                  <p>{t('aiInsights.noLlmEngine')}</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li><b>BYOK</b> {t('aiInsights.byokHint')}</li>
                    <li><b>{t('aiInsights.groqCentral')}</b> {t('aiInsights.groqPart1')} <code className="px-1 bg-amber-100 rounded">GROQ_API_KEY</code> {t('aiInsights.groqPart2')} <b>{t('aiInsights.edgeSecrets')}</b> {t('aiInsights.groqPart3')} <code className="px-1 bg-amber-100 rounded">proph3t-ask</code>.</li>
                  </ul>
                  <button
                    onClick={() => navigate('/settings/ia')}
                    className="mt-1 px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-xs font-medium hover:opacity-90"
                  >
                    {t('aiInsights.configureProph3t')}
                  </button>
                  <p className="text-xs text-amber-700 pt-1">
                    {t('aiInsights.localEngineNote')}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{proph3tError}</div>
              )
            )}
            {proph3tAnswer && (
              <div className="p-4 bg-[var(--color-primary)]/5 rounded-lg text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {proph3tAnswer}
              </div>
            )}
            {!proph3tAnswer && !proph3tError && !proph3tLoading && (
              <div className="text-sm text-gray-400 italic">
                {t('aiInsights.clickRunAnalysisHint')}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('aiInsights.actionableInsights')}</h2>
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="p-4 border rounded-lg hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedInsight(insight)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {insight.category === 'opportunity' && <TrendingUp className="w-5 h-5 text-[#15803D]" />}
                    {insight.category === 'risk' && <AlertTriangle className="w-5 h-5 text-[#C0322B]" />}
                    {insight.category === 'optimization' && <Zap className="w-5 h-5 text-[var(--color-text-primary)]" />}
                    {insight.category === 'trend' && <Activity className="w-5 h-5 text-[var(--color-text-secondary)]" />}
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 text-xs rounded-full font-medium",
                    insight.priority === 'urgent' && "bg-red-100 text-red-700",
                    insight.priority === 'high' && "bg-amber-100 text-amber-700",
                    insight.priority === 'medium' && "bg-amber-100 text-amber-700",
                    insight.priority === 'low' && "bg-green-100 text-green-700"
                  )}>
                    {insight.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-900 mb-2">{insight.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {insight.potentialGain > 0 ? '+' : ''}{formatCurrency(insight.potentialGain)}
                  </span>
                  <span className="text-xs text-gray-600">
                    {t('aiInsights.confidence')}: {insight.confidence}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('aiInsights.priorityRecommendations')}</h2>
          <div className="space-y-4">
            {insights.filter(i => i.priority === 'urgent' || i.priority === 'high').map((insight) => (
              <div key={`priority-${insight.id}`} className="p-4 bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-text-secondary)]/10 rounded-lg border border-[var(--color-primary)]/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[var(--color-primary)]/20 rounded-lg">
                    <Lightbulb className="w-5 h-5 text-[var(--color-text-primary)]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{insight.title}</h4>
                    <p className="text-sm text-gray-900 mb-2">{insight.description}</p>
                    <div className="space-y-2">
                      {insight.actionableSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-[var(--color-text-primary)] mt-0.5" />
                          <span className="text-sm text-gray-900">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('aiInsights.aiPerformanceScore')}</h2>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={scoringData}>
              <PolarGrid stroke="#e5e5e5" />
              <PolarAngleAxis dataKey="metric" stroke="#235A6E" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#235A6E" />
              <Radar name={t('aiInsights.yourScore')} dataKey="score" stroke="#235A6E" fill="#235A6E" fillOpacity={0.6} />
              <Radar name={t('aiInsights.benchmark')} dataKey="benchmark" stroke="#15803D" fill="#15803D" fillOpacity={0.3} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('aiInsights.correlationAnalysis')}</h2>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="x" name={t('aiInsights.sales')} unit="kâ‚¬" stroke="#235A6E" />
              <YAxis dataKey="y" name={t('aiInsights.margin')} unit="%" stroke="#235A6E" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name={t('aiInsights.productsA')} data={correlationData.filter(d => d.category === 'A')} fill="#235A6E" />
              <Scatter name={t('aiInsights.productsB')} data={correlationData.filter(d => d.category === 'B')} fill="#15803D" />
              <Scatter name={t('aiInsights.productsC')} data={correlationData.filter(d => d.category === 'C')} fill="#4E7E8D" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('aiInsights.detailedPerformanceMetrics')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 rounded-lg">
            <div className="w-12 h-12 mx-auto bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center mb-2">
              <Target className="w-6 h-6 text-[var(--color-text-primary)]" />
            </div>
            <div className="text-lg font-bold text-gray-900">{totalEntries}</div>
            <div className="text-sm text-gray-900">{t('aiInsights.entriesAnalyzed')}</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 rounded-lg">
            <div className="w-12 h-12 mx-auto bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center mb-2">
              <CheckCircle className="w-6 h-6 text-[var(--color-text-primary)]" />
            </div>
            <div className="text-lg font-bold text-gray-900">{predictions.length}</div>
            <div className="text-sm text-gray-900">{t('aiInsights.trackedIndicators')}</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-[var(--color-text-secondary)]/10 to-[var(--color-text-secondary)]/5 rounded-lg">
            <div className="w-12 h-12 mx-auto bg-[var(--color-text-secondary)]/20 rounded-lg flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-[var(--color-text-secondary)]" />
            </div>
            <div className="text-lg font-bold text-gray-900">{anomalies.length}</div>
            <div className="text-sm text-gray-900">{t('aiInsights.anomaliesDetected')}</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 rounded-lg">
            <div className="w-12 h-12 mx-auto bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center mb-2">
              <Lightbulb className="w-6 h-6 text-[var(--color-text-primary)]" />
            </div>
            <div className="text-lg font-bold text-gray-900">{insights.length}</div>
            <div className="text-sm text-gray-900">{t('aiInsights.recommendations')}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Statut des analyses : réelles dès qu'il y a des écritures, sinon état vide honnête */}
      {totalEntries === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--color-text-secondary)]" />
            <p className="text-sm text-[var(--color-text-primary)] font-medium">
              {t('aiInsights.noEntriesNotice')}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl flex items-center space-x-3">
          <Info className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiInsights.realDataNotice')}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t('aiInsights.realDataNoticeDetail', { count: String(totalEntries) })}
            </p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{t('aiInsights.pageTitle')}</h1>
          <p className="text-gray-500 mt-2">{t('aiInsights.pageSubtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="revenue_forecast">{t('aiInsights.modelRevenueForecast')}</option>
            <option value="demand_forecast">{t('aiInsights.modelDemandForecast')}</option>
            <option value="risk_analysis">{t('aiInsights.modelRiskAnalysis')}</option>
            <option value="optimization">{t('aiInsights.modelOptimization')}</option>
          </select>

          <select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="1month">{t('aiInsights.horizon1Month')}</option>
            <option value="3months">{t('aiInsights.horizon3Months')}</option>
            <option value="6months">{t('aiInsights.horizon6Months')}</option>
            <option value="1year">{t('aiInsights.horizon1Year')}</option>
          </select>

          <button
            onClick={handleRefresh}
            className={cn(
              "p-2 rounded-lg border hover:bg-gray-50 transition-all",
              refreshing && "animate-spin"
            )}
            disabled={refreshing} aria-label={t('aiInsights.refresh')}>
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              const report = {
                generatedAt: new Date().toISOString(),
                totalEntries,
                predictions,
                anomalies: anomalies.map(a => ({ ...a, detectedAt: new Date(a.detectedAt).toISOString() })),
                insights,
                scoringData,
              };
              const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `rapport-ia-${new Date().toISOString().slice(0, 10)}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90"
          >
            <Download className="w-4 h-4" />
            {t('aiInsights.aiReport')}
          </button>
        </div>
      </div>

      {/* Horizontal Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === tab.id
                      ? "border-[var(--color-primary)] text-[var(--color-text-primary)]"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-400"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'predictions' && renderPredictionsTab()}
        {activeTab === 'anomalies' && renderAnomaliesTab()}
        {activeTab === 'insights' && renderInsightsTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
      </div>
    </div>
  );
};

export default AIInsights;