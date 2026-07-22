import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Brain,
  BarChart3,
  Eye,
  X,
  Download,
  CheckCircle,
  Activity,
  TrendingUp,
  AlertTriangle,
  Zap,
  List,
  LayoutGrid,
  Grid3x3,
  Network,
  Calendar,
  GitBranch,
  RefreshCw,
  Database,
  Target,
  Clock,
  Shield,
  Sparkles,
  Settings,
  Code,
  Layers,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Gauge,
  LucideIcon
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import { cn } from '../../lib/utils';

type ViewMode = 'list' | 'kanban' | 'cards';

interface AlgoParam {
  name: string;
  value: string;
}

interface AlgoFeature {
  name: string;
  importance: string;
}

interface AlgoDetectionCriteria {
  name: string;
  threshold: string;
}

interface AlgoRule {
  id: string;
  name: string;
  description: string;
}

interface AlgoRuleCategory {
  category: string;
  rules: AlgoRule[];
}

interface AlgoMlDetection {
  name: string;
  description: string;
}

interface AlgoClassification {
  name: string;
  count: string;
}

interface AlgoUseCase {
  name: string;
  accuracy: string;
}

interface AlgorithmDetail {
  name: string;
  title: string;
  type: string;
  accuracy: string;
  description: string;
  trainingData?: string;
  detected?: string;
  adoption?: string;
  atRisk?: string;
  segments?: string;
  forecasts?: string;
  rulesCount?: string;
  classes?: string;
  predictions?: string;
  parameters?: AlgoParam[];
  inputVariables?: AlgoFeature[];
  features?: AlgoFeature[];
  detectionCriteria?: AlgoDetectionCriteria[];
  riskIndicators?: AlgoFeature[];
  ruleCategories?: AlgoRuleCategory[];
  mlDetections?: AlgoMlDetection[];
  classifications?: AlgoClassification[];
  useCases?: AlgoUseCase[];
}

interface AlgorithmCardInfo {
  name: string;
  title: string;
  desc: string;
  accuracy: string;
  icon: LucideIcon;
}

const IAConfigPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'algorithms' | 'learning' | 'hybrid'>('algorithms');
  const [showAlgoModal, setShowAlgoModal] = useState(false);
  const [selectedAlgo, setSelectedAlgo] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [algorithmStatus, setAlgorithmStatus] = useState<Record<string, boolean>>({
    'LSTM': true,
    'IsolationForest': true,
    'RandomForest': true,
    'GradientBoosting': true,
    'DBSCAN': true,
    'Prophet': true,
    'NetworkAnalysis': true,
    'SYSCOHADACompliance': true,
    'SVM': true,
    'XGBoost': true
  });

  const toggleAlgorithm = (algoName: string) => {
    setAlgorithmStatus(prev => ({
      ...prev,
      [algoName]: !prev[algoName]
    }));
  };

  const handleViewAlgorithm = (algoName: string) => {
    setSelectedAlgo(algoName);
    setShowAlgoModal(true);
  };

  const algorithmDetails: Record<string, AlgorithmDetail> = {
    'LSTM': {
      name: 'LSTM Neural Network',
      title: t('aiConfig.lstmTitle'),
      type: 'LSTM Neural Network',
      accuracy: '94.2%',
      trainingData: t('aiConfig.lstmTrainingData'),
      description: t('aiConfig.lstmDesc'),
      parameters: [
        { name: t('aiConfig.paramHiddenLayers'), value: t('aiConfig.paramHiddenLayersValue') },
        { name: t('aiConfig.paramLearningRate'), value: '0.001' },
        { name: t('aiConfig.paramTimeWindow'), value: t('aiConfig.value90Days') },
        { name: 'Dropout', value: '0.2' }
      ],
      inputVariables: [
        { name: t('aiConfig.varHistoricalBankBalances'), importance: '32%' },
        { name: t('aiConfig.varPendingCustomerInvoices'), importance: '28%' },
        { name: t('aiConfig.varSupplierDueDates'), importance: '24%' },
        { name: t('aiConfig.varSeasonalTrends'), importance: '16%' }
      ]
    },
    'IsolationForest': {
      name: 'Isolation Forest',
      title: t('aiConfig.isolationForestTitle'),
      type: 'Isolation Forest',
      accuracy: '89.7%',
      detected: t('aiConfig.isolationForestDetected'),
      description: t('aiConfig.isolationForestDesc'),
      detectionCriteria: [
        { name: t('aiConfig.critUnusualAmount'), threshold: '±3σ' },
        { name: t('aiConfig.critAbnormalFrequency'), threshold: '±2.5σ' },
        { name: t('aiConfig.critUnusualBeneficiary'), threshold: 'Score < 0.3' },
        { name: t('aiConfig.critSuspiciousTiming'), threshold: t('aiConfig.thresholdOffHours') }
      ]
    },
    'RandomForest': {
      name: 'Random Forest',
      title: t('aiConfig.randomForestTitle'),
      type: 'Random Forest',
      accuracy: '96.1%',
      adoption: '87%',
      description: t('aiConfig.randomForestDesc'),
      parameters: [
        { name: t('aiConfig.paramTreeCount'), value: t('aiConfig.value500Trees') },
        { name: t('aiConfig.paramMaxDepth'), value: t('aiConfig.value15Levels') },
        { name: t('aiConfig.paramVarsPerSplit'), value: '√n features' },
        { name: 'Min samples leaf', value: t('aiConfig.value10Samples') }
      ],
      features: [
        { name: t('aiConfig.featTransactionLabel'), importance: '38%' },
        { name: t('aiConfig.featAmountCurrency'), importance: '22%' },
        { name: t('aiConfig.featThirdParty'), importance: '25%' },
        { name: t('aiConfig.featAccountHistory'), importance: '15%' }
      ]
    },
    'GradientBoosting': {
      name: 'Gradient Boosting',
      title: t('aiConfig.gradientBoostingTitle'),
      type: 'Gradient Boosting',
      accuracy: '91.3%',
      atRisk: t('aiConfig.gradientBoostingAtRisk'),
      description: t('aiConfig.gradientBoostingDesc'),
      riskIndicators: [
        { name: t('aiConfig.riskLateHistory'), importance: '35%' },
        { name: t('aiConfig.riskReceivablesAmount'), importance: '28%' },
        { name: t('aiConfig.riskIndustry'), importance: '18%' },
        { name: t('aiConfig.riskCustomerSeniority'), importance: '19%' }
      ]
    },
    'DBSCAN': {
      name: 'DBSCAN Clustering',
      title: t('aiConfig.dbscanTitle'),
      type: 'DBSCAN Clustering',
      accuracy: '88.5%',
      segments: t('aiConfig.dbscanSegments'),
      description: t('aiConfig.dbscanDesc'),
      parameters: [
        { name: 'Epsilon (eps)', value: '0.3' },
        { name: 'Min samples', value: t('aiConfig.value5Samples') },
        { name: t('aiConfig.paramMetric'), value: 'Euclidean' },
        { name: t('aiConfig.paramDimensions'), value: '12 features' }
      ],
      features: [
        { name: t('aiConfig.featPaymentVariance'), importance: '32%' },
        { name: t('aiConfig.featOrderFrequency'), importance: '28%' },
        { name: t('aiConfig.featAddressChanges'), importance: '18%' },
        { name: t('aiConfig.featAverageAmount'), importance: '22%' }
      ]
    },
    'Prophet': {
      name: 'Prophet Time Series',
      title: t('aiConfig.prophetTitle'),
      type: 'Prophet (Facebook)',
      accuracy: '93.8%',
      forecasts: t('aiConfig.value90Days'),
      description: t('aiConfig.prophetDesc'),
      parameters: [
        { name: 'Changepoint prior', value: '0.05' },
        { name: 'Seasonality mode', value: 'Multiplicative' },
        { name: 'Interval width', value: '95%' },
        { name: 'Horizon', value: t('aiConfig.value90Days') }
      ],
      inputVariables: [
        { name: t('aiConfig.varHistoricalCashFlows'), importance: '40%' },
        { name: t('aiConfig.varMonthlySeasonality'), importance: '25%' },
        { name: t('aiConfig.varAnnualTrends'), importance: '20%' },
        { name: t('aiConfig.varHolidaysEvents'), importance: '15%' }
      ]
    },
    'NetworkAnalysis': {
      name: 'Network Analysis',
      title: t('aiConfig.networkAnalysisTitle'),
      type: 'Graph Analytics (NetworkX)',
      accuracy: '90.2%',
      detected: t('aiConfig.networkAnalysisDetected'),
      description: t('aiConfig.networkAnalysisDesc'),
      detectionCriteria: [
        { name: t('aiConfig.critCircularFlows'), threshold: '> 10,000€' },
        { name: t('aiConfig.critAbnormalCentrality'), threshold: '> 3σ' },
        { name: t('aiConfig.critIsolatedClusters'), threshold: 'Score < 0.4' },
        { name: t('aiConfig.critSuspiciousVelocity'), threshold: '> 5 trans/30min' }
      ]
    },
    'SYSCOHADACompliance': {
      name: 'SYSCOHADA Compliance',
      title: t('aiConfig.syscohadaTitle'),
      type: 'Rule-Based System + ML',
      accuracy: '98.5%',
      rulesCount: t('aiConfig.syscohadaRulesCount'),
      description: t('aiConfig.syscohadaDesc'),
      ruleCategories: [
        {
          category: t('aiConfig.catAccountingCompliance'),
          rules: [
            { id: 'RS001', name: t('aiConfig.ruleRs001'), description: t('aiConfig.ruleRs001Desc') },
            { id: 'RS002', name: t('aiConfig.ruleRs002'), description: t('aiConfig.ruleRs002Desc') },
            { id: 'RS003', name: t('aiConfig.ruleRs003'), description: t('aiConfig.ruleRs003Desc') },
            { id: 'RS011', name: t('aiConfig.ruleRs011'), description: t('aiConfig.ruleRs011Desc') },
            { id: 'RS012', name: t('aiConfig.ruleRs012'), description: t('aiConfig.ruleRs012Desc') },
            { id: 'RS013', name: t('aiConfig.ruleRs013'), description: t('aiConfig.ruleRs013Desc') }
          ]
        },
        {
          category: t('aiConfig.catProvisionsDepreciation'),
          rules: [
            { id: 'RS004', name: t('aiConfig.ruleRs004'), description: t('aiConfig.provisionScaleDesc') },
            { id: 'RS005', name: t('aiConfig.ruleRs005'), description: t('aiConfig.ruleRs005Desc') }
          ]
        },
        {
          category: t('aiConfig.catAccountsJournals'),
          rules: [
            { id: 'RS007', name: t('aiConfig.ruleRs007'), description: t('aiConfig.ruleRs007Desc') },
            { id: 'RS010', name: t('aiConfig.ruleRs010'), description: t('aiConfig.ruleRs010Desc') }
          ]
        },
        {
          category: t('aiConfig.catTaxObligations'),
          rules: [
            { id: 'RS014', name: t('aiConfig.ruleRs014'), description: t('aiConfig.ruleRs014Desc') },
            { id: 'RS015', name: t('aiConfig.ruleRs015'), description: t('aiConfig.ruleRs015Desc') },
            { id: 'RS016', name: t('aiConfig.ruleRs016'), description: t('aiConfig.ruleRs016Desc') }
          ]
        },
        {
          category: t('aiConfig.catLegalFormalities'),
          rules: [
            { id: 'RS017', name: t('aiConfig.ruleRs017'), description: t('aiConfig.ruleRs017Desc') }
          ]
        }
      ],
      mlDetections: [
        { name: t('aiConfig.mlDsfAnomalies'), description: t('aiConfig.mlDsfAnomaliesDesc') },
        { name: t('aiConfig.mlUemoaCemac'), description: t('aiConfig.mlUemoaCemacDesc') },
        { name: t('aiConfig.mlCashThreshold'), description: t('aiConfig.mlCashThresholdDesc') },
        { name: t('aiConfig.mlCfaParity'), description: t('aiConfig.mlCfaParityDesc') },
        { name: t('aiConfig.mlPublicProcurement'), description: t('aiConfig.mlPublicProcurementDesc') }
      ]
    },
    'SVM': {
      name: 'Support Vector Machine',
      title: t('aiConfig.svmTitle'),
      type: 'SVM (Kernel RBF)',
      accuracy: '89.5%',
      classes: t('aiConfig.svmClasses'),
      description: t('aiConfig.svmDesc'),
      parameters: [
        { name: 'Kernel', value: 'RBF (Radial Basis Function)' },
        { name: 'Gamma', value: '0.1' },
        { name: 'C (regularization)', value: '10.0' },
        { name: 'Multi-class strategy', value: 'One-vs-Rest' }
      ],
      features: [
        { name: t('aiConfig.featAmountVariance'), importance: '30%' },
        { name: t('aiConfig.featTransactionFrequency'), importance: '25%' },
        { name: t('aiConfig.featThirdPartyType'), importance: '22%' },
        { name: t('aiConfig.featTemporalPatterns'), importance: '23%' }
      ],
      classifications: [
        { name: t('aiConfig.classBankOperations'), count: '2,453' },
        { name: t('aiConfig.classPurchasesSuppliers'), count: '1,892' },
        { name: t('aiConfig.classSalesCustomers'), count: '3,214' },
        { name: t('aiConfig.classPayrollExpenses'), count: '1,067' },
        { name: t('aiConfig.classTaxExpenses'), count: '845' },
        { name: t('aiConfig.classInvestments'), count: '234' },
        { name: t('journals.miscellaneous'), count: '567' },
        { name: t('aiConfig.classExceptionalOperations'), count: '123' }
      ]
    },
    'XGBoost': {
      name: 'XGBoost',
      title: t('aiConfig.xgboostTitle'),
      type: 'XGBoost (Extreme Gradient Boosting)',
      accuracy: '93.1%',
      predictions: t('aiConfig.xgboostPredictions'),
      description: t('aiConfig.xgboostDesc'),
      parameters: [
        { name: 'Max depth', value: t('aiConfig.value8Levels') },
        { name: 'Learning rate', value: '0.05' },
        { name: 'N estimators', value: t('aiConfig.value300Trees') },
        { name: 'Subsample', value: '0.8' },
        { name: 'Colsample bytree', value: '0.8' }
      ],
      features: [
        { name: t('aiConfig.featPaymentHistory'), importance: '35%' },
        { name: t('aiConfig.featCustomerCreditScore'), importance: '28%' },
        { name: t('aiConfig.featSeasonalityTrends'), importance: '20%' },
        { name: t('aiConfig.featMacroIndicators'), importance: '17%' }
      ],
      useCases: [
        { name: t('aiConfig.ucPaymentDefault'), accuracy: '94.2%' },
        { name: t('aiConfig.ucAutoMatching'), accuracy: '96.5%' },
        { name: t('aiConfig.ucCollections'), accuracy: '91.8%' },
        { name: t('aiConfig.ucSupplierRiskScoring'), accuracy: '89.3%' }
      ]
    }
  };

  const allAlgorithms = [
    { name: 'LSTM', title: 'LSTM Neural Network', desc: t('aiConfig.lstmTitle'), accuracy: '94.2%', icon: TrendingUp },
    { name: 'IsolationForest', title: 'Isolation Forest', desc: t('aiConfig.isolationForestTitle'), accuracy: '91.7%', icon: AlertTriangle },
    { name: 'RandomForest', title: 'Random Forest', desc: t('aiConfig.randomForestTitle'), accuracy: '88.9%', icon: Brain },
    { name: 'GradientBoosting', title: 'Gradient Boosting', desc: t('aiConfig.gradientBoostingTitle'), accuracy: '92.4%', icon: BarChart3 },
    { name: 'DBSCAN', title: 'DBSCAN Clustering', desc: t('aiConfig.dbscanTitle'), accuracy: '88.5%', icon: GitBranch },
    { name: 'Prophet', title: 'Prophet Time Series', desc: t('aiConfig.prophetTitle'), accuracy: '93.8%', icon: Calendar },
    { name: 'NetworkAnalysis', title: 'Network Analysis', desc: t('aiConfig.networkAnalysisTitle'), accuracy: '90.2%', icon: Network },
    { name: 'SYSCOHADACompliance', title: 'SYSCOHADA Compliance', desc: t('aiConfig.syscohadaTitle'), accuracy: '98.5%', icon: Shield },
    { name: 'SVM', title: 'Support Vector Machine', desc: t('aiConfig.svmShortDesc'), accuracy: '89.5%', icon: Brain },
    { name: 'XGBoost', title: 'XGBoost', desc: t('aiConfig.xgboostShortDesc'), accuracy: '93.1%', icon: BarChart3 }
  ];

  const activeAlgorithms = allAlgorithms.filter(algo => algorithmStatus[algo.name]);
  const inactiveAlgorithms = allAlgorithms.filter(algo => !algorithmStatus[algo.name]);

  const renderAlgorithmCard = (algo: AlgorithmCardInfo, isActive: boolean) => {
    const Icon = algo.icon;
    return (
      <div
        key={algo.name}
        className={cn(
          "border border-[var(--color-border)] rounded-lg p-4 transition-colors",
          isActive ? "bg-[var(--color-surface)] hover:border-[var(--color-primary)]" : "bg-[var(--color-surface-hover)] opacity-60"
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              isActive ? "bg-[var(--color-primary-light)]" : "bg-[var(--color-border)]"
            )}>
              <Icon className={cn("w-5 h-5", isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-tertiary)]")} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[var(--color-text-primary)]">{algo.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">{algo.desc}</p>
            </div>
          </div>
          <button
            onClick={() => toggleAlgorithm(algo.name)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              isActive ? "bg-[var(--color-primary)]" : "bg-gray-300"
            )}
            title={isActive ? t('aiConfig.deactivate') : t('aiConfig.activate')}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                isActive ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs font-medium",
              isActive ? "text-[var(--color-success)]" : "text-[var(--color-text-tertiary)]"
            )}>
              {isActive ? t('aiConfig.statusActive') : t('aiConfig.statusInactive')}
            </span>
            {isActive && (
              <>
                <span className="text-xs text-[var(--color-text-tertiary)]">•</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{algo.accuracy} {t('aiConfig.accuracyLabel')}</span>
              </>
            )}
          </div>
          <ModernButton
            onClick={isActive ? () => handleViewAlgorithm(algo.name) : undefined}
            disabled={!isActive}
            variant="ghost"
            size="sm"
            className={cn(
              isActive
                ? "text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
                : "text-[var(--color-text-tertiary)] cursor-not-allowed"
            )}
            leftIcon={<Eye className="w-4 h-4" />}
          >
            {t('aiConfig.viewAlgorithm')}
          </ModernButton>
        </div>
      </div>
    );
  };

  const renderCardsView = () => (
    <>
      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
          <span>{t('aiConfig.activeAlgorithms')} ({activeAlgorithms.length})</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAlgorithms.map(algo => renderAlgorithmCard(algo, true))}
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <Activity className="w-5 h-5 text-[var(--color-text-tertiary)]" />
          <span>{t('aiConfig.inactiveAlgorithms')} ({inactiveAlgorithms.length})</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inactiveAlgorithms.map(algo => renderAlgorithmCard(algo, false))}
          </div>
        </CardBody>
      </ModernCard>
    </>
  );

  const renderListView = () => (
    <ModernCard>
      <CardHeader>
        <span>{t('aiConfig.algorithmList')} ({allAlgorithms.length})</span>
      </CardHeader>
      <CardBody>
        <div className="divide-y divide-[var(--color-border)]">
          {allAlgorithms.map(algo => {
            const Icon = algo.icon;
            const isActive = algorithmStatus[algo.name];
            return (
              <div key={algo.name} className="py-4 flex items-center justify-between hover:bg-[var(--color-surface-hover)] px-4 -mx-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center",
                    isActive ? "bg-[var(--color-primary-light)]" : "bg-[var(--color-border)]"
                  )}>
                    <Icon className={cn("w-6 h-6", isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-tertiary)]")} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-[var(--color-text-primary)]">{algo.title}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      )}>
                        {isActive ? t('aiConfig.statusActive') : t('aiConfig.statusInactive')}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)]">{algo.desc}</p>
                    {isActive && (
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        {t('aiConfig.precisionLabel')}: {algo.accuracy}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleAlgorithm(algo.name)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors mr-3",
                      isActive ? "bg-[var(--color-primary)]" : "bg-gray-300"
                    )}
                    title={isActive ? t('aiConfig.deactivate') : t('aiConfig.activate')}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        isActive ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                  <ModernButton
                    onClick={isActive ? () => handleViewAlgorithm(algo.name) : undefined}
                    disabled={!isActive}
                    variant="outline"
                    size="sm"
                    leftIcon={<Eye className="w-4 h-4" />}
                  >
                    {t('aiConfig.details')}
                  </ModernButton>
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </ModernCard>
  );

  const renderKanbanView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
          <h3 className="font-semibold text-[var(--color-text-primary)]">{t('aiConfig.activeShort')} ({activeAlgorithms.length})</h3>
        </div>
        <div className="space-y-3">
          {activeAlgorithms.map(algo => renderAlgorithmCard(algo, true))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-[var(--color-text-tertiary)]" />
          <h3 className="font-semibold text-[var(--color-text-secondary)]">{t('aiConfig.inactiveShort')} ({inactiveAlgorithms.length})</h3>
        </div>
        <div className="space-y-3">
          {inactiveAlgorithms.map(algo => renderAlgorithmCard(algo, false))}
        </div>
      </div>
    </div>
  );

  const renderHybridView = () => (
    <div className="space-y-6">
      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
          <span>{t('aiConfig.hybridApproachTitle')}</span>
        </CardHeader>
        <CardBody>
          <p className="text-[var(--color-text-secondary)] mb-6">
            {t('aiConfig.hybridApproachDesc')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] rounded-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-6 h-6" />
                <h3 className="font-bold text-lg">40%</h3>
              </div>
              <p className="text-sm opacity-90 font-semibold mb-2">{t('aiConfig.deterministicRules')}</p>
              <p className="text-xs opacity-75">{t('aiConfig.deterministicRulesDesc')}</p>
            </div>

            <div className="bg-gradient-to-br from-[var(--color-text-secondary)] to-[#404040] rounded-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-6 h-6" />
                <h3 className="font-bold text-lg">60%</h3>
              </div>
              <p className="text-sm opacity-90 font-semibold mb-2">{t('aiConfig.probabilisticMl')}</p>
              <p className="text-xs opacity-75">{t('aiConfig.probabilisticMlDesc')}</p>
            </div>

            <div className="bg-gradient-to-br from-[var(--color-text-tertiary)] to-[var(--color-text-secondary)] rounded-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-6 h-6" />
                <h3 className="font-bold text-lg">{t('aiConfig.fusion')}</h3>
              </div>
              <p className="text-sm opacity-90 font-semibold mb-2">{t('aiConfig.compositeScoring')}</p>
              <p className="text-xs opacity-75">{t('aiConfig.compositeScoringDesc')}</p>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[var(--color-primary)]" />
          <span>{t('aiConfig.specializedBusinessRules')}</span>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="bg-[var(--color-primary-light)] px-4 py-2 border-b border-[var(--color-border)]">
                <h4 className="font-semibold text-[var(--color-primary)] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {t('aiConfig.accountingRules15')}
                </h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleDebitCreditBalance')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleDebitCreditBalanceDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleAutoMatching')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleAutoMatchingDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleConsistentVat')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleConsistentVatDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleMandatoryKeyAccounts')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleMandatoryKeyAccountsDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="bg-[var(--color-primary-light)] px-4 py-2 border-b border-[var(--color-border)]">
                <h4 className="font-semibold text-[var(--color-primary)] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t('aiConfig.limitRules8')}
                </h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleCustomerCreditLimit')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleCustomerCreditLimitDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleBankOverdraft')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleBankOverdraftDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleSuspiciousAmounts')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleSuspiciousAmountsDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleOhadaCashThreshold')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleOhadaCashThresholdDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="bg-[var(--color-primary-light)] px-4 py-2 border-b border-[var(--color-border)]">
                <h4 className="font-semibold text-[var(--color-primary)] flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t('aiConfig.deadlineRules6')}
                </h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleOverdueDates')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleOverdueDatesDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleRepeatedDelays')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleRepeatedDelaysDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleSyscohadaProvisions')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.provisionScaleDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleSupplierTerms')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleSupplierTermsDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="bg-[var(--color-primary-light)] px-4 py-2 border-b border-[var(--color-border)]">
                <h4 className="font-semibold text-[var(--color-primary)] flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {t('aiConfig.antiFraudRules12')}
                </h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleRoundTransactions')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleRoundTransactionsDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleCircularFlows')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleCircularFlowsDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleSuspiciousEdits')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleSuspiciousEditsDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('aiConfig.ruleTransactionSplitting')}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{t('aiConfig.ruleTransactionSplittingDesc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-[var(--color-primary)]" />
          <span>{t('aiConfig.diversifiedMlAlgorithms')}</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">Isolation Forest</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">{t('aiConfig.isoForestCardDesc')}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-[var(--color-warning)] bg-opacity-20 text-[var(--color-warning)] rounded">89.7% {t('aiConfig.accuracyLabel')}</span>
                <span className="text-[var(--color-text-tertiary)]">{t('aiConfig.isoForestDetections')}</span>
              </div>
            </div>

            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">DBSCAN Clustering</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">{t('aiConfig.dbscanCardDesc')}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-[var(--color-primary)] bg-opacity-20 text-[var(--color-primary)] rounded">88.5% {t('aiConfig.accuracyLabel')}</span>
                <span className="text-[var(--color-text-tertiary)]">{t('aiConfig.dbscanSegmentsIdentified')}</span>
              </div>
            </div>

            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">LSTM Neural Network</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">{t('aiConfig.lstmCardDesc')}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-success)] rounded">94.2% {t('aiConfig.accuracyLabel')}</span>
                <span className="text-[var(--color-text-tertiary)]">{t('aiConfig.lstmTrainingData')}</span>
              </div>
            </div>

            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-3">
                <Network className="w-5 h-5 text-[var(--color-error)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">Graph Analysis</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">{t('aiConfig.graphCardDesc')}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-error)] rounded">90.2% {t('aiConfig.accuracyLabel')}</span>
                <span className="text-[var(--color-text-tertiary)]">{t('aiConfig.graphPatternsDetected')}</span>
              </div>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[var(--color-primary)]" />
          <span>{t('aiConfig.explainabilityTitle')}</span>
        </CardHeader>
        <CardBody>
          <p className="text-[var(--color-text-secondary)] mb-4">
            {t('aiConfig.explainabilityDesc')}
          </p>

          <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border-l-4 border-[var(--color-warning)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">{t('aiConfig.exampleSuspiciousTx')}</h4>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)] mb-1">{t('aiConfig.riskScore')}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div className="bg-[var(--color-warning)] h-2 rounded-full" style={{width: '87%'}}></div>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-[var(--color-text-primary)] mb-1">{t('aiConfig.rulesViolated')}</p>
                    <ul className="list-disc list-inside text-[var(--color-text-secondary)] space-y-1 ml-2">
                      <li>{t('aiConfig.violationAmountSigma')}</li>
                      <li>{t('aiConfig.violationOffHours')}</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium text-[var(--color-text-primary)] mb-1">{t('aiConfig.mlDetectionPoints')}</p>
                    <ul className="list-disc list-inside text-[var(--color-text-secondary)] space-y-1 ml-2">
                      <li>{t('aiConfig.mlIsoForestScore')}</li>
                      <li>{t('aiConfig.mlGraphCircular')}</li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-[var(--color-border)]">
                    <p className="font-medium text-[var(--color-text-primary)] mb-1">{t('aiConfig.recommendedActions')}</p>
                    <ul className="list-disc list-inside text-[var(--color-text-secondary)] space-y-1 ml-2">
                      <li>{t('aiConfig.actionRequestProof')}</li>
                      <li>{t('aiConfig.actionVerifyBeneficiary')}</li>
                      <li>{t('aiConfig.actionFlagForAudit')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[var(--color-primary)]" />
          <span>{t('aiConfig.businessUseCases')}</span>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="border border-[var(--color-border)] rounded-lg p-4 hover:border-[var(--color-primary)] transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-error)] bg-opacity-20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-[var(--color-error)]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">{t('aiConfig.useCaseFraud')}</h4>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                    {t('aiConfig.useCaseFraudDesc')}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-error)] text-xs rounded">{t('aiConfig.ruleShort')}: 35 pts</span>
                    <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <span className="px-2 py-1 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-error)] text-xs rounded">ML: 45 pts</span>
                    <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <span className="px-2 py-1 bg-[var(--color-error)] text-white text-xs rounded font-bold">Score: 95/100</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[var(--color-border)] rounded-lg p-4 hover:border-[var(--color-primary)] transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-warning)] bg-opacity-20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-[var(--color-warning)]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">{t('aiConfig.useCaseUnpaid')}</h4>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                    {t('aiConfig.useCaseUnpaidDesc')}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-[var(--color-warning)] bg-opacity-20 text-[var(--color-warning)] text-xs rounded">{t('aiConfig.ruleShort')}: 30 pts</span>
                    <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <span className="px-2 py-1 bg-[var(--color-warning)] bg-opacity-20 text-[var(--color-warning)] text-xs rounded">ML: 48 pts</span>
                    <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <span className="px-2 py-1 bg-[var(--color-warning)] text-white text-xs rounded font-bold">Score: 88/100</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[var(--color-border)] rounded-lg p-4 hover:border-[var(--color-primary)] transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-success)] bg-opacity-20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">{t('aiConfig.useCaseSmartMatching')}</h4>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                    {t('aiConfig.useCaseSmartMatchingDesc')}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-success)] text-xs rounded">{t('aiConfig.ruleShort')}: 40 pts</span>
                    <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <span className="px-2 py-1 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-success)] text-xs rounded">ML: 56 pts</span>
                    <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <span className="px-2 py-1 bg-[var(--color-success)] text-white text-xs rounded font-bold">Score: 98/100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <Code className="w-5 h-5 text-[var(--color-primary)]" />
          <span>{t('aiConfig.scalableArchitecture')}</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">{t('aiConfig.asyncPipeline')}</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">{t('aiConfig.asyncPipelineDesc')}</p>
            </div>

            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">{t('aiConfig.hybridCache')}</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">{t('aiConfig.hybridCacheDesc')}</p>
            </div>

            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">REST API</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">{t('aiConfig.restApiDesc')}</p>
            </div>

            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">{t('dashboard.performance')}</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">{t('aiConfig.performanceDesc')}</p>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[var(--color-primary)]" />
          <span>{t('aiConfig.keyInnovations')}</span>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-semibold text-[var(--color-text-primary)] mb-1">Correlation Scoring</h4>
                <p className="text-sm text-[var(--color-text-secondary)]">{t('aiConfig.correlationScoringDesc')}</p>
                <div className="mt-2 p-2 bg-white rounded border border-[var(--color-border)] font-mono text-xs">
                  <span className="text-[var(--color-text-tertiary)]">score_final = </span>
                  <span className="text-[var(--color-primary)]">0.4 * score_règles + 0.6 * score_ml + correlation_boost</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
              <div className="flex-1">
                <h4 className="font-semibold text-[var(--color-text-primary)] mb-1">Adaptive Thresholds</h4>
                <p className="text-sm text-[var(--color-text-secondary)]">{t('aiConfig.adaptiveThresholdsDesc')}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-semibold text-[var(--color-text-primary)] mb-1">Feedback Loop</h4>
                <p className="text-sm text-[var(--color-text-secondary)]">{t('aiConfig.feedbackLoopDesc')}</p>
              </div>
            </div>
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );

  const renderLearningView = () => (
    <div className="space-y-6">
      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-[var(--color-primary)]" />
          <span>{t('aiConfig.continuousLearning')}</span>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <p className="text-[var(--color-text-secondary)]">
              {t('aiConfig.continuousLearningDesc')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-[var(--color-primary)]" />
                  <h3 className="font-semibold text-[var(--color-text-primary)]">{t('aiConfig.dataCollection')}</h3>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t('aiConfig.dataCollectionDesc')}
                </p>
              </div>

              <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-[var(--color-primary)]" />
                  <h3 className="font-semibold text-[var(--color-text-primary)]">{t('aiConfig.userFeedback')}</h3>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t('aiConfig.userFeedbackDesc')}
                </p>
              </div>

              <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-[var(--color-primary)]" />
                  <h3 className="font-semibold text-[var(--color-text-primary)]">{t('aiConfig.autoRetraining')}</h3>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t('aiConfig.autoRetrainingDesc')}
                </p>
              </div>

              <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-[var(--color-primary)]" />
                  <h3 className="font-semibold text-[var(--color-text-primary)]">{t('aiConfig.driftDetection')}</h3>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t('aiConfig.driftDetectionDesc')}
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--color-primary)]" />
          <span>{t('aiConfig.updateProcess')}</span>
        </CardHeader>
        <CardBody>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--color-primary)] font-bold">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">{t('aiConfig.stepDataCollection')}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t('aiConfig.stepDataCollectionDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--color-primary)] font-bold">2</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">{t('aiConfig.stepFeaturePrep')}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t('aiConfig.stepFeaturePrepDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--color-primary)] font-bold">3</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">{t('aiConfig.stepRetraining')}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t('aiConfig.stepRetrainingDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--color-primary)] font-bold">4</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">{t('aiConfig.stepValidation')}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t('aiConfig.stepValidationDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--color-primary)] font-bold">5</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">{t('aiConfig.stepDeployment')}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t('aiConfig.stepDeploymentDesc')}
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
          <span>{t('aiConfig.updateHistory')}</span>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">LSTM Neural Network</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('aiConfig.lastUpdateJan15')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--color-success)]">+3.2%</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('aiConfig.improvement')}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">Random Forest</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('aiConfig.lastUpdateJan12')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--color-success)]">+2.8%</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('aiConfig.improvement')}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-[var(--color-warning)]" />
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">Prophet Time Series</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('aiConfig.retrainingInProgress')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--color-warning)]">{t('status.inProgress')}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('aiConfig.percentCompleted45')}</p>
              </div>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[var(--color-primary)]" />
          <span>{t('aiConfig.performanceMetrics')}</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <p className="text-lg font-bold text-[var(--color-primary)]">92.4%</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t('aiConfig.averageAccuracy')}</p>
              <p className="text-xs text-[var(--color-success)] mt-1">{t('aiConfig.plusThisMonth')}</p>
            </div>
            <div className="text-center p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <p className="text-lg font-bold text-[var(--color-primary)]">15,247</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t('aiConfig.feedbacksCollected')}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{t('aiConfig.thisQuarter')}</p>
            </div>
            <div className="text-center p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <p className="text-lg font-bold text-[var(--color-primary)]">7j</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t('aiConfig.updateFrequency')}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{t('aiConfig.automatic')}</p>
            </div>
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-3">
            <Brain className="w-8 h-8 text-[var(--color-primary)]" />
            {t('aiConfig.pageTitle')}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t('aiConfig.pageSubtitle')}
          </p>
        </div>

        {activeTab === 'algorithms' && (
          <div className="flex items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 rounded flex items-center gap-2 transition-colors",
                viewMode === 'list'
                  ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
              title={t('aiConfig.viewListTooltip')}
            >
              <List className="w-4 h-4" />
              <span className="text-sm hidden md:inline">{t('aiConfig.viewList')}</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                "px-3 py-1.5 rounded flex items-center gap-2 transition-colors",
                viewMode === 'kanban'
                  ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
              title={t('aiConfig.viewKanbanTooltip')}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm hidden md:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                "px-3 py-1.5 rounded flex items-center gap-2 transition-colors",
                viewMode === 'cards'
                  ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
              title={t('aiConfig.viewCardsTooltip')}
            >
              <Grid3x3 className="w-4 h-4" />
              <span className="text-sm hidden md:inline">{t('aiConfig.viewCards')}</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab('algorithms')}
          className={cn(
            "px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
            activeTab === 'algorithms'
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          )}
        >
          <Brain className="w-4 h-4" />
          {t('aiConfig.tabAlgorithms')}
        </button>
        <button
          onClick={() => setActiveTab('learning')}
          className={cn(
            "px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
            activeTab === 'learning'
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          )}
        >
          <RefreshCw className="w-4 h-4" />
          {t('aiConfig.tabLearning')}
        </button>
        <button
          onClick={() => setActiveTab('hybrid')}
          className={cn(
            "px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
            activeTab === 'hybrid'
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          )}
        >
          <Sparkles className="w-4 h-4" />
          {t('aiConfig.tabHybrid')}
        </button>
      </div>

      {activeTab === 'algorithms' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ModernCard className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)]">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-white opacity-80" />
              <span className="text-lg font-bold text-white">{activeAlgorithms.length}/{allAlgorithms.length}</span>
            </div>
            <p className="text-sm text-white opacity-90">{t('aiConfig.activeModels')}</p>
          </CardBody>
        </ModernCard>
        <ModernCard className="bg-gradient-to-br from-[var(--color-text-secondary)] to-[#404040]">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-white opacity-80" />
              <span className="text-lg font-bold text-white">92.4%</span>
            </div>
            <p className="text-sm text-white opacity-90">{t('aiConfig.averageAccuracy')}</p>
          </CardBody>
        </ModernCard>
        <ModernCard className="bg-gradient-to-br from-[var(--color-text-tertiary)] to-[var(--color-text-secondary)]">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-8 h-8 text-white opacity-80" />
              <span className="text-lg font-bold text-white">1,247</span>
            </div>
            <p className="text-sm text-white opacity-90">{t('aiConfig.predictionsPerDay')}</p>
          </CardBody>
        </ModernCard>
      </div>

      {viewMode === 'list' && renderListView()}
      {viewMode === 'kanban' && renderKanbanView()}
      {viewMode === 'cards' && renderCardsView()}

      {showAlgoModal && selectedAlgo && algorithmDetails[selectedAlgo] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAlgoModal(false)}>
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <ModernCard className="w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="sticky top-0 bg-white border-b border-[var(--color-border)] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Brain className="w-7 h-7 text-[var(--color-primary)]" />
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                      {algorithmDetails[selectedAlgo].name}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowAlgoModal(false)}
                    className="p-2 hover:bg-[var(--color-surface-hover)] rounded-full transition-colors"
                    title={t('common.close')}
                  >
                    <X className="w-6 h-6 text-[var(--color-text-primary)]" />
                  </button>
                </div>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ModernCard className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)]">
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Brain className="w-6 h-6 text-white opacity-80" />
                        <span className="text-lg font-bold text-white">{algorithmDetails[selectedAlgo].type}</span>
                      </div>
                      <p className="text-xs text-white opacity-90">{t('aiConfig.algorithmType')}</p>
                    </CardBody>
                  </ModernCard>
                  <ModernCard className="bg-gradient-to-br from-[var(--color-text-secondary)] to-[#404040]">
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <BarChart3 className="w-6 h-6 text-white opacity-80" />
                        <span className="text-lg font-bold text-white">{algorithmDetails[selectedAlgo].accuracy}</span>
                      </div>
                      <p className="text-xs text-white opacity-90">{t('aiConfig.precisionLabel')}</p>
                    </CardBody>
                  </ModernCard>
                  <ModernCard className="bg-gradient-to-br from-[var(--color-text-tertiary)] to-[var(--color-text-secondary)]">
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="w-6 h-6 text-white opacity-80" />
                        <span className="text-lg font-bold text-white">
                          {selectedAlgo === 'LSTM' && algorithmDetails[selectedAlgo].trainingData}
                          {selectedAlgo === 'IsolationForest' && algorithmDetails[selectedAlgo].detected}
                          {selectedAlgo === 'RandomForest' && algorithmDetails[selectedAlgo].adoption}
                          {selectedAlgo === 'GradientBoosting' && algorithmDetails[selectedAlgo].atRisk}
                          {selectedAlgo === 'DBSCAN' && algorithmDetails[selectedAlgo].segments}
                          {selectedAlgo === 'Prophet' && algorithmDetails[selectedAlgo].forecasts}
                          {selectedAlgo === 'NetworkAnalysis' && algorithmDetails[selectedAlgo].detected}
                          {selectedAlgo === 'SYSCOHADACompliance' && algorithmDetails[selectedAlgo].rulesCount}
                          {selectedAlgo === 'SVM' && algorithmDetails[selectedAlgo].classes}
                          {selectedAlgo === 'XGBoost' && algorithmDetails[selectedAlgo].predictions}
                        </span>
                      </div>
                      <p className="text-xs text-white opacity-90">
                        {selectedAlgo === 'LSTM' && t('aiConfig.trainingDataLabel')}
                        {selectedAlgo === 'IsolationForest' && t('aiConfig.anomaliesDetected')}
                        {selectedAlgo === 'RandomForest' && t('aiConfig.adoptionRate')}
                        {selectedAlgo === 'GradientBoosting' && t('aiConfig.customersAtRisk')}
                        {selectedAlgo === 'DBSCAN' && t('aiConfig.segmentsIdentified')}
                        {selectedAlgo === 'Prophet' && t('aiConfig.forecastHorizon')}
                        {selectedAlgo === 'NetworkAnalysis' && t('aiConfig.patternsDetected')}
                        {selectedAlgo === 'SYSCOHADACompliance' && t('aiConfig.integratedRules')}
                        {selectedAlgo === 'SVM' && t('aiConfig.classesIdentified')}
                        {selectedAlgo === 'XGBoost' && t('aiConfig.predictionsPerMonth')}
                      </p>
                    </CardBody>
                  </ModernCard>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.descriptionTitle')}</h3>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed">
                    {algorithmDetails[selectedAlgo].description}
                  </p>
                </div>

                {selectedAlgo === 'LSTM' && algorithmDetails[selectedAlgo].parameters && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.modelParameters')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {algorithmDetails[selectedAlgo].parameters.map((param: AlgoParam, idx: number) => (
                        <div key={idx} className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <p className="text-sm text-[var(--color-text-secondary)] mb-1">{param.name}</p>
                          <p className="font-semibold text-[var(--color-text-primary)]">{param.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'LSTM' && algorithmDetails[selectedAlgo].inputVariables && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.inputVariablesTitle')}</h3>
                    <div className="space-y-3">
                      {algorithmDetails[selectedAlgo].inputVariables.map((variable: AlgoFeature, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <span className="text-[var(--color-text-primary)]">{variable.name}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-[var(--color-primary)] h-2 rounded-full"
                                style={{ width: variable.importance }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-[var(--color-primary)] w-12 text-right">{variable.importance}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'IsolationForest' && algorithmDetails[selectedAlgo].detectionCriteria && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.detectionCriteriaTitle')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {algorithmDetails[selectedAlgo].detectionCriteria.map((criteria: AlgoDetectionCriteria, idx: number) => (
                        <div key={idx} className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
                            <p className="font-medium text-[var(--color-text-primary)]">{criteria.name}</p>
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)]">{t('aiConfig.thresholdLabel')}: <span className="font-semibold text-[var(--color-primary)]">{criteria.threshold}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'RandomForest' && algorithmDetails[selectedAlgo].parameters && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.modelParameters')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {algorithmDetails[selectedAlgo].parameters.map((param: AlgoParam, idx: number) => (
                        <div key={idx} className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <p className="text-sm text-[var(--color-text-secondary)] mb-1">{param.name}</p>
                          <p className="font-semibold text-[var(--color-text-primary)]">{param.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'RandomForest' && algorithmDetails[selectedAlgo].features && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.featuresUsed')}</h3>
                    <div className="space-y-3">
                      {algorithmDetails[selectedAlgo].features.map((feature: AlgoFeature, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <span className="text-[var(--color-text-primary)]">{feature.name}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-[var(--color-primary)] h-2 rounded-full"
                                style={{ width: feature.importance }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-[var(--color-primary)] w-12 text-right">{feature.importance}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'GradientBoosting' && algorithmDetails[selectedAlgo].riskIndicators && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.riskIndicatorsTitle')}</h3>
                    <div className="space-y-3">
                      {algorithmDetails[selectedAlgo].riskIndicators.map((indicator: AlgoFeature, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <span className="text-[var(--color-text-primary)]">{indicator.name}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-[var(--color-warning)] h-2 rounded-full"
                                style={{ width: indicator.importance }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-[var(--color-warning)] w-12 text-right">{indicator.importance}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'DBSCAN' && algorithmDetails[selectedAlgo].parameters && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.modelParameters')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {algorithmDetails[selectedAlgo].parameters.map((param: AlgoParam, idx: number) => (
                        <div key={idx} className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <p className="text-sm text-[var(--color-text-secondary)] mb-1">{param.name}</p>
                          <p className="font-semibold text-[var(--color-text-primary)]">{param.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'DBSCAN' && algorithmDetails[selectedAlgo].features && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.featuresAnalyzed')}</h3>
                    <div className="space-y-3">
                      {algorithmDetails[selectedAlgo].features.map((feature: AlgoFeature, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <span className="text-[var(--color-text-primary)]">{feature.name}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-[var(--color-primary)] h-2 rounded-full"
                                style={{ width: feature.importance }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-[var(--color-primary)] w-12 text-right">{feature.importance}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'Prophet' && algorithmDetails[selectedAlgo].parameters && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.modelParameters')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {algorithmDetails[selectedAlgo].parameters.map((param: AlgoParam, idx: number) => (
                        <div key={idx} className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <p className="text-sm text-[var(--color-text-secondary)] mb-1">{param.name}</p>
                          <p className="font-semibold text-[var(--color-text-primary)]">{param.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'Prophet' && algorithmDetails[selectedAlgo].inputVariables && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.inputVariablesTitle')}</h3>
                    <div className="space-y-3">
                      {algorithmDetails[selectedAlgo].inputVariables.map((variable: AlgoFeature, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <span className="text-[var(--color-text-primary)]">{variable.name}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-[var(--color-primary)] h-2 rounded-full"
                                style={{ width: variable.importance }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-[var(--color-primary)] w-12 text-right">{variable.importance}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'NetworkAnalysis' && algorithmDetails[selectedAlgo].detectionCriteria && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.detectionCriteriaTitle')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {algorithmDetails[selectedAlgo].detectionCriteria.map((criteria: AlgoDetectionCriteria, idx: number) => (
                        <div key={idx} className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
                            <p className="font-medium text-[var(--color-text-primary)]">{criteria.name}</p>
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)]">{t('aiConfig.thresholdLabel')}: <span className="font-semibold text-[var(--color-primary)]">{criteria.threshold}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'SYSCOHADACompliance' && algorithmDetails[selectedAlgo].ruleCategories && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.syscohadaRulesByCategory')}</h3>
                    <div className="space-y-4">
                      {algorithmDetails[selectedAlgo].ruleCategories.map((category: AlgoRuleCategory, idx: number) => (
                        <div key={idx} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                          <div className="bg-[var(--color-primary-light)] px-4 py-2 border-b border-[var(--color-border)]">
                            <h4 className="font-semibold text-[var(--color-primary)] flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              {category.category}
                            </h4>
                          </div>
                          <div className="p-4 space-y-2">
                            {category.rules.map((rule: AlgoRule, ruleIdx: number) => (
                              <div key={ruleIdx} className="flex items-start gap-3 p-2 hover:bg-[var(--color-surface-hover)] rounded">
                                <span className="px-2 py-0.5 bg-[var(--color-primary)] text-white text-xs font-mono rounded">{rule.id}</span>
                                <div className="flex-1">
                                  <p className="font-medium text-[var(--color-text-primary)] text-sm">{rule.name}</p>
                                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{rule.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'SYSCOHADACompliance' && algorithmDetails[selectedAlgo].mlDetections && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.ohadaMlDetections')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {algorithmDetails[selectedAlgo].mlDetections.map((detection: AlgoMlDetection, idx: number) => (
                        <div key={idx} className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-4 h-4 text-[var(--color-primary)]" />
                            <p className="font-medium text-[var(--color-text-primary)]">{detection.name}</p>
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)]">{detection.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'SVM' && algorithmDetails[selectedAlgo].parameters && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.modelParameters')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {algorithmDetails[selectedAlgo].parameters.map((param: AlgoParam, idx: number) => (
                        <div key={idx} className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <p className="text-sm text-[var(--color-text-secondary)] mb-1">{param.name}</p>
                          <p className="font-semibold text-[var(--color-text-primary)]">{param.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'SVM' && algorithmDetails[selectedAlgo].features && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.featuresUsed')}</h3>
                    <div className="space-y-3">
                      {algorithmDetails[selectedAlgo].features.map((feature: AlgoFeature, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <span className="text-[var(--color-text-primary)]">{feature.name}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-[var(--color-primary)] h-2 rounded-full"
                                style={{ width: feature.importance }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-[var(--color-primary)] w-12 text-right">{feature.importance}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'SVM' && algorithmDetails[selectedAlgo].classifications && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.classificationsByCategory')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {algorithmDetails[selectedAlgo].classifications.map((classification: AlgoClassification, idx: number) => (
                        <div key={idx} className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-[var(--color-text-primary)]">{classification.name}</p>
                            <span className="px-2 py-1 bg-[var(--color-primary)] bg-opacity-20 text-[var(--color-primary)] text-sm font-semibold rounded">{classification.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'XGBoost' && algorithmDetails[selectedAlgo].parameters && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.modelParameters')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {algorithmDetails[selectedAlgo].parameters.map((param: AlgoParam, idx: number) => (
                        <div key={idx} className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <p className="text-sm text-[var(--color-text-secondary)] mb-1">{param.name}</p>
                          <p className="font-semibold text-[var(--color-text-primary)]">{param.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'XGBoost' && algorithmDetails[selectedAlgo].features && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.featuresUsed')}</h3>
                    <div className="space-y-3">
                      {algorithmDetails[selectedAlgo].features.map((feature: AlgoFeature, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <span className="text-[var(--color-text-primary)]">{feature.name}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-[var(--color-primary)] h-2 rounded-full"
                                style={{ width: feature.importance }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-[var(--color-primary)] w-12 text-right">{feature.importance}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'XGBoost' && algorithmDetails[selectedAlgo].useCases && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{t('aiConfig.useCasesTitle')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {algorithmDetails[selectedAlgo].useCases.map((useCase: AlgoUseCase, idx: number) => (
                        <div key={idx} className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-[var(--color-text-primary)]">{useCase.name}</p>
                            <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                          </div>
                          <p className="text-sm text-[var(--color-success)] font-semibold">{t('aiConfig.precisionLabel')}: {useCase.accuracy}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <ModernButton
                    className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    {t('aiConfig.exportModel')}
                  </ModernButton>
                  <ModernButton
                    variant="outline"
                    leftIcon={<Activity className="w-4 h-4" />}
                  >
                    {t('aiConfig.viewPerformance')}
                  </ModernButton>
                </div>
              </CardBody>
            </ModernCard>
          </div>
        </div>
      )}
        </>
      )}

      {activeTab === 'learning' && renderLearningView()}
      {activeTab === 'hybrid' && renderHybridView()}
    </div>
  );
};

export default IAConfigPage;