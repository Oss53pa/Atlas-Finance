// @ts-nocheck

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
      title: 'Prédiction de Trésorerie',
      type: 'LSTM Neural Network',
      accuracy: '94.2%',
      trainingData: '24,567 transactions',
      description: 'Ce modèle utilise un réseau de neurones LSTM (Long Short-Term Memory) pour analyser les flux de trésorerie historiques et prédire les mouvements futurs avec une haute précision. L\'algorithme prend en compte les tendances saisonnières, les cycles de paiement clients, et les patterns de dépenses.',
      parameters: [
        { name: 'Couches cachées', value: '3 couches (128, 64, 32 neurones)' },
        { name: 'Taux d\'apprentissage', value: '0.001' },
        { name: 'Fenêtre temporelle', value: '90 jours' },
        { name: 'Dropout', value: '0.2' }
      ],
      inputVariables: [
        { name: 'Soldes bancaires historiques', importance: '32%' },
        { name: 'Factures clients en attente', importance: '28%' },
        { name: 'Échéances fournisseurs', importance: '24%' },
        { name: 'Tendances saisonnières', importance: '16%' }
      ]
    },
    'IsolationForest': {
      name: 'Isolation Forest',
      title: 'Détection d\'Anomalies',
      type: 'Isolation Forest',
      accuracy: '89.7%',
      detected: '147 ce mois',
      description: 'Cet algorithme utilise la méthode Isolation Forest pour détecter les transactions inhabituelles qui pourraient indiquer des erreurs, des fraudes ou des comportements anormaux. Il apprend continuellement des patterns normaux pour mieux identifier les anomalies.',
      detectionCriteria: [
        { name: 'Montant inhabituel', threshold: '±3σ' },
        { name: 'Fréquence anormale', threshold: '±2.5σ' },
        { name: 'Bénéficiaire inhabituel', threshold: 'Score < 0.3' },
        { name: 'Timing suspect', threshold: 'Hors heures: 22h-6h' }
      ]
    },
    'RandomForest': {
      name: 'Random Forest',
      title: 'Recommandations Comptables',
      type: 'Random Forest',
      accuracy: '96.1%',
      adoption: '87%',
      description: 'Ce modèle utilise un ensemble d\'arbres de décision (Random Forest) pour suggérer les comptes comptables appropriés et proposer des écritures automatiques basées sur l\'analyse de milliers de transactions similaires passées.',
      parameters: [
        { name: 'Nombre d\'arbres', value: '500 arbres' },
        { name: 'Profondeur maximale', value: '15 niveaux' },
        { name: 'Variables par split', value: '√n features' },
        { name: 'Min samples leaf', value: '10 échantillons' }
      ],
      features: [
        { name: 'Libellé de la transaction', importance: '38%' },
        { name: 'Montant et devise', importance: '22%' },
        { name: 'Tiers (client/fournisseur)', importance: '25%' },
        { name: 'Historique des comptes utilisés', importance: '15%' }
      ]
    },
    'GradientBoosting': {
      name: 'Gradient Boosting',
      title: 'Analyse de Risques Clients',
      type: 'Gradient Boosting',
      accuracy: '91.3%',
      atRisk: '12 actuellement',
      description: 'Cet algorithme de Gradient Boosting analyse le comportement de paiement des clients pour prédire le risque de défaut. Il combine plusieurs modèles faibles pour créer une prédiction robuste et fiable du risque client.',
      riskIndicators: [
        { name: 'Historique de retards', importance: '35%' },
        { name: 'Montant des créances', importance: '28%' },
        { name: 'Secteur d\'activité', importance: '18%' },
        { name: 'Ancienneté du client', importance: '19%' }
      ]
    },
    'DBSCAN': {
      name: 'DBSCAN Clustering',
      title: 'Segmentation Comportementale',
      type: 'DBSCAN Clustering',
      accuracy: '88.5%',
      segments: '7 segments',
      description: 'Algorithme de clustering DBSCAN pour identifier les segments de comportement clients et détecter les comportements anormaux. Détecte automatiquement les anomalies comme du bruit dans les clusters.',
      parameters: [
        { name: 'Epsilon (eps)', value: '0.3' },
        { name: 'Min samples', value: '5 échantillons' },
        { name: 'Métrique', value: 'Euclidean' },
        { name: 'Dimensions', value: '12 features' }
      ],
      features: [
        { name: 'Variance des paiements', importance: '32%' },
        { name: 'Fréquence de commande', importance: '28%' },
        { name: 'Changements d\'adresse', importance: '18%' },
        { name: 'Montant moyen', importance: '22%' }
      ]
    },
    'Prophet': {
      name: 'Prophet Time Series',
      title: 'Prévision de Trésorerie',
      type: 'Prophet (Facebook)',
      accuracy: '93.8%',
      forecasts: '90 jours',
      description: 'Modèle Prophet de Facebook pour la prévision de séries temporelles et la détection d\'anomalies saisonnières dans les flux de trésorerie. Prend en compte les tendances, saisonnalités et jours fériés.',
      parameters: [
        { name: 'Changepoint prior', value: '0.05' },
        { name: 'Seasonality mode', value: 'Multiplicative' },
        { name: 'Interval width', value: '95%' },
        { name: 'Horizon', value: '90 jours' }
      ],
      inputVariables: [
        { name: 'Flux de trésorerie historiques', importance: '40%' },
        { name: 'Saisonnalité mensuelle', importance: '25%' },
        { name: 'Tendances annuelles', importance: '20%' },
        { name: 'Jours fériés et événements', importance: '15%' }
      ]
    },
    'NetworkAnalysis': {
      name: 'Network Analysis',
      title: 'Détection de Fraude par Graphes',
      type: 'Graph Analytics (NetworkX)',
      accuracy: '90.2%',
      detected: '23 patterns',
      description: 'Analyse de réseaux de transactions pour détecter les flux circulaires suspects, les hubs anormaux et les patterns de blanchiment d\'argent. Utilise la théorie des graphes pour identifier les structures anormales.',
      detectionCriteria: [
        { name: 'Flux circulaires', threshold: '> 10,000€' },
        { name: 'Centralité anormale', threshold: '> 3σ' },
        { name: 'Clusters isolés', threshold: 'Score < 0.4' },
        { name: 'Vélocité suspecte', threshold: '> 5 trans/30min' }
      ]
    },
    'SYSCOHADACompliance': {
      name: 'SYSCOHADA Compliance',
      title: 'Conformité SYSCOHADA & OHADA',
      type: 'Rule-Based System + ML',
      accuracy: '98.5%',
      rulesCount: '17 règles',
      description: 'Système hybride combinant règles métier SYSCOHADA et machine learning pour garantir la conformité comptable, fiscale et réglementaire selon les normes OHADA (UEMOA/CEMAC).',
      ruleCategories: [
        {
          category: 'Conformité Comptable',
          rules: [
            { id: 'RS001', name: 'Plan comptable SYSCOHADA', description: 'Vérification structure comptes classe 1-9' },
            { id: 'RS002', name: 'TVA OHADA et exonérations', description: 'Contrôle taux TVA (18%) et régimes' },
            { id: 'RS003', name: 'États financiers DSF/TAFIRE', description: 'Présence états obligatoires' },
            { id: 'RS011', name: 'Structure bilan SYSCOHADA', description: 'Actif/Passif selon SYSCOHADA' },
            { id: 'RS012', name: 'Compte de résultat & SIG', description: 'Cohérence charges/produits' },
            { id: 'RS013', name: 'Équilibre TAFIRE', description: 'Variation trésorerie cohérente' }
          ]
        },
        {
          category: 'Provisions & Amortissements',
          rules: [
            { id: 'RS004', name: 'Provisionnement créances', description: '25% à 3 mois, 50% à 6 mois, 100% à 1 an' },
            { id: 'RS005', name: 'Durées amortissement', description: 'Conformes barème SYSCOHADA' }
          ]
        },
        {
          category: 'Comptes & Journaux',
          rules: [
            { id: 'RS007', name: 'Comptes tiers lettrables', description: 'Classes 4 avec soldes normaux' },
            { id: 'RS010', name: 'Journaux obligatoires', description: 'JA, JV, JT, JO, JP présents' }
          ]
        },
        {
          category: 'Obligations Fiscales',
          rules: [
            { id: 'RS014', name: 'Acomptes IS', description: '2,5% CA ou 1/3 IS N-1 trimestriels' },
            { id: 'RS015', name: 'Patente & contributions', description: 'Taxes locales calculées' },
            { id: 'RS016', name: 'Précompte achats', description: 'Retenue 5% sur achats locaux' }
          ]
        },
        {
          category: 'Formalités Juridiques',
          rules: [
            { id: 'RS017', name: 'RCCM & AG annuelle', description: 'Dépôt états financiers obligatoire' }
          ]
        }
      ],
      mlDetections: [
        { name: 'Anomalies DSF', description: 'Incohérences déclaration statistique fiscale' },
        { name: 'Transactions UEMOA/CEMAC', description: 'Prix de transfert et flux intra-zone' },
        { name: 'Seuils cash 1M FCFA', description: 'Détection fractionnement transactions' },
        { name: 'Parité CFA fixe', description: 'Contrôle taux change 655.957 FCFA/EUR' },
        { name: 'Marchés publics', description: 'Vérification garanties et procédures' }
      ]
    },
    'SVM': {
      name: 'Support Vector Machine',
      title: 'Classification Avancée Multi-Classes',
      type: 'SVM (Kernel RBF)',
      accuracy: '89.5%',
      classes: '8 catégories',
      description: 'Machine à vecteurs de support (SVM) avec noyau RBF pour la classification avancée de transactions et la catégorisation automatique des opérations comptables. Particulièrement efficace pour séparer des classes complexes dans des espaces de haute dimension.',
      parameters: [
        { name: 'Kernel', value: 'RBF (Radial Basis Function)' },
        { name: 'Gamma', value: '0.1' },
        { name: 'C (regularization)', value: '10.0' },
        { name: 'Multi-class strategy', value: 'One-vs-Rest' }
      ],
      features: [
        { name: 'Montant et variance', importance: '30%' },
        { name: 'Fréquence des transactions', importance: '25%' },
        { name: 'Type de tiers (client/fournisseur)', importance: '22%' },
        { name: 'Patterns temporels', importance: '23%' }
      ],
      classifications: [
        { name: 'Opérations bancaires', count: '2,453' },
        { name: 'Achats & Fournisseurs', count: '1,892' },
        { name: 'Ventes & Clients', count: '3,214' },
        { name: 'Charges de personnel', count: '1,067' },
        { name: 'Charges fiscales', count: '845' },
        { name: 'Investissements', count: '234' },
        { name: t('journals.miscellaneous'), count: '567' },
        { name: 'Opérations exceptionnelles', count: '123' }
      ]
    },
    'XGBoost': {
      name: 'XGBoost',
      title: 'Optimisation Prédictive Gradient Boosting',
      type: 'XGBoost (Extreme Gradient Boosting)',
      accuracy: '93.1%',
      predictions: '1,847/mois',
      description: 'XGBoost est un algorithme de gradient boosting optimisé pour des performances maximales. Il combine plusieurs arbres de décision faibles pour créer un modèle puissant, idéal pour prédire les comportements de paiement, optimiser les recommandations de lettrage et anticiper les risques financiers.',
      parameters: [
        { name: 'Max depth', value: '8 niveaux' },
        { name: 'Learning rate', value: '0.05' },
        { name: 'N estimators', value: '300 arbres' },
        { name: 'Subsample', value: '0.8' },
        { name: 'Colsample bytree', value: '0.8' }
      ],
      features: [
        { name: 'Historique de paiements', importance: '35%' },
        { name: 'Score crédit client', importance: '28%' },
        { name: 'Saisonnalité & tendances', importance: '20%' },
        { name: 'Indicateurs macroéconomiques', importance: '17%' }
      ],
      useCases: [
        { name: 'Prédiction défauts de paiement', accuracy: '94.2%' },
        { name: 'Optimisation lettrage automatique', accuracy: '96.5%' },
        { name: 'Recommandations de recouvrement', accuracy: '91.8%' },
        { name: 'Scoring risque fournisseurs', accuracy: '89.3%' }
      ]
    }
  };

  const allAlgorithms = [
    { name: 'LSTM', title: 'LSTM Neural Network', desc: 'Prédiction de Trésorerie', accuracy: '94.2%', icon: TrendingUp },
    { name: 'IsolationForest', title: 'Isolation Forest', desc: 'Détection d\'Anomalies', accuracy: '91.7%', icon: AlertTriangle },
    { name: 'RandomForest', title: 'Random Forest', desc: 'Recommandations Comptables', accuracy: '88.9%', icon: Brain },
    { name: 'GradientBoosting', title: 'Gradient Boosting', desc: 'Analyse de Risques Clients', accuracy: '92.4%', icon: BarChart3 },
    { name: 'DBSCAN', title: 'DBSCAN Clustering', desc: 'Segmentation Comportementale', accuracy: '88.5%', icon: GitBranch },
    { name: 'Prophet', title: 'Prophet Time Series', desc: 'Prévision de Trésorerie', accuracy: '93.8%', icon: Calendar },
    { name: 'NetworkAnalysis', title: 'Network Analysis', desc: 'Détection de Fraude par Graphes', accuracy: '90.2%', icon: Network },
    { name: 'SYSCOHADACompliance', title: 'SYSCOHADA Compliance', desc: 'Conformité SYSCOHADA & OHADA', accuracy: '98.5%', icon: Shield },
    { name: 'SVM', title: 'Support Vector Machine', desc: 'Classification avancée', accuracy: '89.5%', icon: Brain },
    { name: 'XGBoost', title: 'XGBoost', desc: 'Optimisation prédictive', accuracy: '93.1%', icon: BarChart3 }
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
            title={isActive ? "Désactiver" : "Activer"}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                isActive ? "tranprimary-x-6" : "tranprimary-x-1"
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
              {isActive ? 'Actif' : 'Inactif'}
            </span>
            {isActive && (
              <>
                <span className="text-xs text-[var(--color-text-tertiary)]">•</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{algo.accuracy} précision</span>
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
            icon={<Eye className="w-4 h-4" />}
          >
            Voir Algorithme
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
          <span>Algorithmes Actifs ({activeAlgorithms.length})</span>
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
          <span>Algorithmes Inactifs ({inactiveAlgorithms.length})</span>
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
        <span>Liste des Algorithmes ({allAlgorithms.length})</span>
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
                        {isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)]">{algo.desc}</p>
                    {isActive && (
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        Précision: {algo.accuracy}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleAlgorithm(algo.name)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors mr-3",
                      isActive ? "bg-[var(--color-primary)]" : "bg-gray-300"
                    )}
                    title={isActive ? "Désactiver" : "Activer"}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        isActive ? "tranprimary-x-6" : "tranprimary-x-1"
                      )}
                    />
                  </button>
                  <ModernButton
                    onClick={isActive ? () => handleViewAlgorithm(algo.name) : undefined}
                    disabled={!isActive}
                    variant="outline"
                    size="sm"
                    icon={<Eye className="w-4 h-4" />}
                  >
                    Détails
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
          <h3 className="font-semibold text-[var(--color-text-primary)]">Actifs ({activeAlgorithms.length})</h3>
        </div>
        <div className="space-y-3">
          {activeAlgorithms.map(algo => renderAlgorithmCard(algo, true))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-[var(--color-text-tertiary)]" />
          <h3 className="font-semibold text-[var(--color-text-secondary)]">Inactifs ({inactiveAlgorithms.length})</h3>
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
          <span>Approche Hybride Innovante</span>
        </CardHeader>
        <CardBody>
          <p className="text-[var(--color-text-secondary)] mb-6">
            Le système Atlas F&A combine intelligemment règles métier déterministes et intelligence artificielle probabiliste pour une détection optimale des anomalies et recommandations précises.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] rounded-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-6 h-6" />
                <h3 className="font-bold text-lg">40%</h3>
              </div>
              <p className="text-sm opacity-90 font-semibold mb-2">Règles Déterministes</p>
              <p className="text-xs opacity-75">Détection immédiate des violations évidentes: équilibre comptable, limites crédit, cohérence TVA</p>
            </div>

            <div className="bg-gradient-to-br from-[var(--color-text-secondary)] to-[#404040] rounded-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-6 h-6" />
                <h3 className="font-bold text-lg">60%</h3>
              </div>
              <p className="text-sm opacity-90 font-semibold mb-2">ML Probabiliste</p>
              <p className="text-xs opacity-75">Identification de patterns subtils et anomalies complexes via apprentissage continu</p>
            </div>

            <div className="bg-gradient-to-br from-[var(--color-text-tertiary)] to-[var(--color-text-secondary)] rounded-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-6 h-6" />
                <h3 className="font-bold text-lg">Fusion</h3>
              </div>
              <p className="text-sm opacity-90 font-semibold mb-2">Scoring Composite</p>
              <p className="text-xs opacity-75">Boost de corrélation x2 quand règles et ML convergent sur la même détection</p>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[var(--color-primary)]" />
          <span>Règles Métier Spécialisées</span>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="bg-[var(--color-primary-light)] px-4 py-2 border-b border-[var(--color-border)]">
                <h4 className="font-semibold text-[var(--color-primary)] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Règles Comptables (15 règles)
                </h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Équilibre Débit/Crédit</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Débit = Crédit pour toute écriture</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Lettrage Automatique</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Factures/Paiements avec montants = 0</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">TVA Cohérente</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Taux TVA selon régime fiscal</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Comptes Clés Obligatoires</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Présence comptes 401, 411, 512...</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="bg-[var(--color-primary-light)] px-4 py-2 border-b border-[var(--color-border)]">
                <h4 className="font-semibold text-[var(--color-primary)] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Règles de Limites (8 règles)
                </h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Limite de Crédit Client</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Créances ≤ plafond autorisé</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Découvert Bancaire</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Solde ≥ découvert max autorisé</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Montants Suspects</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Transaction &gt; 3σ du montant moyen</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Seuil Cash OHADA</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Paiements cash &gt; 1M FCFA</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="bg-[var(--color-primary-light)] px-4 py-2 border-b border-[var(--color-border)]">
                <h4 className="font-semibold text-[var(--color-primary)] flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Règles de Délais (6 règles)
                </h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Échéances Dépassées</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Date paiement &gt; date échéance</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Retards Répétés</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">&gt; 3 retards en 6 mois = risque</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Provisions SYSCOHADA</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">25% à 3 mois, 50% à 6 mois, 100% à 1 an</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Délais Fournisseurs</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Respect conditions négociées</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="bg-[var(--color-primary-light)] px-4 py-2 border-b border-[var(--color-border)]">
                <h4 className="font-semibold text-[var(--color-primary)] flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Règles Anti-Fraude (12 règles)
                </h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Transactions Rondes</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Montants arrondis suspects (1000.00)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Flux Circulaires</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">A→B→C→A avec montants similaires</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Modifications Suspectes</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Édition après validation comptable</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Fractionnement Transactions</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Multiple petits montants = gros montant</p>
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
          <span>Algorithmes ML Diversifiés</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">Isolation Forest</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">Détection d'anomalies complexes que les règles ne capturent pas</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-[var(--color-warning)] bg-opacity-20 text-[var(--color-warning)] rounded">89.7% précision</span>
                <span className="text-[var(--color-text-tertiary)]">147 détections ce mois</span>
              </div>
            </div>

            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">DBSCAN Clustering</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">Segmentation comportementale des clients et fournisseurs</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-[var(--color-primary)] bg-opacity-20 text-[var(--color-primary)] rounded">88.5% précision</span>
                <span className="text-[var(--color-text-tertiary)]">7 segments identifiés</span>
              </div>
            </div>

            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">LSTM Neural Network</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">Prévisions de trésorerie et détection de dérives temporelles</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-success)] rounded">94.2% précision</span>
                <span className="text-[var(--color-text-tertiary)]">24,567 transactions</span>
              </div>
            </div>

            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-3">
                <Network className="w-5 h-5 text-[var(--color-error)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">Graph Analysis</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">Détection flux circulaires et réseaux de transactions suspects</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-error)] rounded">90.2% précision</span>
                <span className="text-[var(--color-text-tertiary)]">23 patterns détectés</span>
              </div>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[var(--color-primary)]" />
          <span>Explainability Complète</span>
        </CardHeader>
        <CardBody>
          <p className="text-[var(--color-text-secondary)] mb-4">
            Chaque détection est accompagnée d'une justification complète combinant règles métier et insights ML.
          </p>

          <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border-l-4 border-[var(--color-warning)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">Exemple: Transaction Suspecte Détectée</h4>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)] mb-1">🎯 Score de Risque: 87/100</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div className="bg-[var(--color-warning)] h-2 rounded-full" style={{width: '87%'}}></div>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-[var(--color-text-primary)] mb-1">📋 Règles Violées (40 points):</p>
                    <ul className="list-disc list-inside text-[var(--color-text-secondary)] space-y-1 ml-2">
                      <li>Montant &gt; 3σ du profil client (+25 pts)</li>
                      <li>Transaction hors heures ouvrées 23h (+15 pts)</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium text-[var(--color-text-primary)] mb-1">🤖 Détection ML (47 points):</p>
                    <ul className="list-disc list-inside text-[var(--color-text-secondary)] space-y-1 ml-2">
                      <li>Isolation Forest: anomalie score 0.92 (+30 pts)</li>
                      <li>Graph Analysis: flux circulaire détecté (+17 pts)</li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-[var(--color-border)]">
                    <p className="font-medium text-[var(--color-text-primary)] mb-1">💡 Actions Recommandées:</p>
                    <ul className="list-disc list-inside text-[var(--color-text-secondary)] space-y-1 ml-2">
                      <li>Demander justificatif au client</li>
                      <li>Vérifier l'identité du bénéficiaire</li>
                      <li>Marquer pour audit si répétition</li>
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
          <span>Use Cases Métier</span>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="border border-[var(--color-border)] rounded-lg p-4 hover:border-[var(--color-primary)] transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-error)] bg-opacity-20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-[var(--color-error)]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">1. Détection de Fraude</h4>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                    Règle Anti-Fraude (flux circulaires) + Graph Analysis ML détecte un réseau de transactions suspectes A→B→C→A.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-[var(--color-error)] bg-opacity-20 text-[var(--color-error)] text-xs rounded">Règle: 35 pts</span>
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
                  <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">2. Prévention Impayés</h4>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                    Règles Délais (&gt;3 retards) + Gradient Boosting ML (analyse historique) identifie un client à risque élevé.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-[var(--color-warning)] bg-opacity-20 text-[var(--color-warning)] text-xs rounded">Règle: 30 pts</span>
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
                  <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">3. Lettrage Intelligent</h4>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                    Règles Comptables (montant exact) + Random Forest ML (matching intelligent) optimise le lettrage automatique.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-[var(--color-success)] bg-opacity-20 text-[var(--color-success)] text-xs rounded">Règle: 40 pts</span>
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
          <span>Architecture Scalable</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">Pipeline Asynchrone</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Traitement parallèle règles + ML avec fusion intelligente des résultats</p>
            </div>

            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">Cache Hybride</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Redis pour règles rapides, PostgreSQL pour historique ML</p>
            </div>

            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">REST API</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">Endpoints unifiés /detect, /explain, /recommend pour intégration facile</p>
            </div>

            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="font-semibold text-[var(--color-text-primary)]">{t('dashboard.performance')}</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">&lt; 100ms latence moyenne pour détection temps réel</p>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[var(--color-primary)]" />
          <span>Innovations Clés</span>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-semibold text-[var(--color-text-primary)] mb-1">Correlation Scoring</h4>
                <p className="text-sm text-[var(--color-text-secondary)]">Quand règles et ML détectent la même anomalie, le score final est boosté (x2) car la convergence renforce la confiance.</p>
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
                <p className="text-sm text-[var(--color-text-secondary)]">Les seuils de détection s'ajustent automatiquement selon le contexte (secteur, taille entreprise, saisonnalité) pour réduire les faux positifs.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-semibold text-[var(--color-text-primary)] mb-1">Feedback Loop</h4>
                <p className="text-sm text-[var(--color-text-secondary)]">Les validations/corrections utilisateur aprimaryntent à la fois les règles (seuils ajustés) et le ML (réentraînement) pour amélioration continue.</p>
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
          <span>Apprentissage Continu</span>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <p className="text-[var(--color-text-secondary)]">
              Les modèles d'IA de Atlas F&A s'améliorent constamment grâce à l'apprentissage continu basé sur vos données et votre feedback.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-[var(--color-primary)]" />
                  <h3 className="font-semibold text-[var(--color-text-primary)]">Collecte de Données</h3>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Les modèles collectent en continu les nouvelles transactions, factures et paiements pour enrichir leur base d'apprentissage.
                </p>
              </div>

              <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-[var(--color-primary)]" />
                  <h3 className="font-semibold text-[var(--color-text-primary)]">Feedback Utilisateur</h3>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Chaque validation ou correction que vous faites permet aux modèles d'apprendre de leurs erreurs et d'améliorer leurs prédictions.
                </p>
              </div>

              <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-[var(--color-primary)]" />
                  <h3 className="font-semibold text-[var(--color-text-primary)]">Réentraînement Automatique</h3>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Les modèles sont automatiquement réentraînés toutes les semaines avec les nouvelles données pour maintenir une précision optimale.
                </p>
              </div>

              <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-[var(--color-primary)]" />
                  <h3 className="font-semibold text-[var(--color-text-primary)]">Détection de Drift</h3>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Le système détecte automatiquement les dérives de performance et déclenche un réentraînement si nécessaire.
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--color-primary)]" />
          <span>Processus de Mise à Jour</span>
        </CardHeader>
        <CardBody>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--color-primary)] font-bold">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">Collecte des Données</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Les nouvelles transactions et feedbacks sont collectés et stockés dans un buffer d'apprentissage.
                  Seuil: 1000 nouveaux échantillons minimum.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--color-primary)] font-bold">2</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">Préparation des Features</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Les données brutes sont transformées en features exploitables par les algorithmes avec normalisation et encodage.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--color-primary)] font-bold">3</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">Réentraînement</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Chaque modèle est réentraîné avec les données historiques + nouvelles données.
                  Durée moyenne: 2-4 heures selon l'algorithme.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--color-primary)] font-bold">4</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">Validation</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Le nouveau modèle est validé sur un jeu de test. Si les métriques sont meilleures (+2% minimum), le modèle est déployé.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--color-primary)] font-bold">5</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">Déploiement</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Le nouveau modèle remplace l'ancien de manière transparente. L'ancien est gardé en backup pendant 30 jours.
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
          <span>Historique des Mises à Jour</span>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">LSTM Neural Network</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Dernière mise à jour: 15 janvier 2025</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--color-success)]">+3.2%</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">Amélioration</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">Random Forest</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Dernière mise à jour: 12 janvier 2025</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--color-success)]">+2.8%</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">Amélioration</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-[var(--color-warning)]" />
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">Prophet Time Series</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Réentraînement en cours...</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--color-warning)]">{t('status.inProgress')}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">45% complété</p>
              </div>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[var(--color-primary)]" />
          <span>Métriques de Performance</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <p className="text-lg font-bold text-[var(--color-primary)]">92.4%</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">Précision Moyenne</p>
              <p className="text-xs text-[var(--color-success)] mt-1">+2.1% ce mois</p>
            </div>
            <div className="text-center p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <p className="text-lg font-bold text-[var(--color-primary)]">15,247</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">Feedbacks Collectés</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Ce trimestre</p>
            </div>
            <div className="text-center p-4 bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)]">
              <p className="text-lg font-bold text-[var(--color-primary)]">7j</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">Fréquence de Mise à Jour</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Automatique</p>
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
            Configuration IA & Algorithmes
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Gestion des algorithmes d'intelligence artificielle et machine learning
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
              title="Vue liste"
            >
              <List className="w-4 h-4" />
              <span className="text-sm hidden md:inline">Liste</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                "px-3 py-1.5 rounded flex items-center gap-2 transition-colors",
                viewMode === 'kanban'
                  ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
              title="Vue kanban"
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
              title="Vue cartes"
            >
              <Grid3x3 className="w-4 h-4" />
              <span className="text-sm hidden md:inline">Cartes</span>
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
          Algorithmes IA
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
          Apprentissage & Mises à Jour
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
          Système Hybride
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
            <p className="text-sm text-white opacity-90">Modèles Actifs</p>
          </CardBody>
        </ModernCard>
        <ModernCard className="bg-gradient-to-br from-[var(--color-text-secondary)] to-[#404040]">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-white opacity-80" />
              <span className="text-lg font-bold text-white">92.4%</span>
            </div>
            <p className="text-sm text-white opacity-90">Précision Moyenne</p>
          </CardBody>
        </ModernCard>
        <ModernCard className="bg-gradient-to-br from-[var(--color-text-tertiary)] to-[var(--color-text-secondary)]">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-8 h-8 text-white opacity-80" />
              <span className="text-lg font-bold text-white">1,247</span>
            </div>
            <p className="text-sm text-white opacity-90">Prédictions/jour</p>
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
                      <p className="text-xs text-white opacity-90">Type d'Algorithme</p>
                    </CardBody>
                  </ModernCard>
                  <ModernCard className="bg-gradient-to-br from-[var(--color-text-secondary)] to-[#404040]">
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <BarChart3 className="w-6 h-6 text-white opacity-80" />
                        <span className="text-lg font-bold text-white">{algorithmDetails[selectedAlgo].accuracy}</span>
                      </div>
                      <p className="text-xs text-white opacity-90">Précision</p>
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
                        {selectedAlgo === 'LSTM' && 'Données d\'Entraînement'}
                        {selectedAlgo === 'IsolationForest' && 'Anomalies Détectées'}
                        {selectedAlgo === 'RandomForest' && 'Taux d\'Adoption'}
                        {selectedAlgo === 'GradientBoosting' && 'Clients à Risque'}
                        {selectedAlgo === 'DBSCAN' && 'Segments Identifiés'}
                        {selectedAlgo === 'Prophet' && 'Horizon de Prévision'}
                        {selectedAlgo === 'NetworkAnalysis' && 'Patterns Détectés'}
                        {selectedAlgo === 'SYSCOHADACompliance' && 'Règles Intégrées'}
                        {selectedAlgo === 'SVM' && 'Classes Identifiées'}
                        {selectedAlgo === 'XGBoost' && 'Prédictions/Mois'}
                      </p>
                    </CardBody>
                  </ModernCard>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Description</h3>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed">
                    {algorithmDetails[selectedAlgo].description}
                  </p>
                </div>

                {selectedAlgo === 'LSTM' && algorithmDetails[selectedAlgo].parameters && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Paramètres du Modèle</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Variables d'Entrée</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Critères de Détection</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {algorithmDetails[selectedAlgo].detectionCriteria.map((criteria: AlgoDetectionCriteria, idx: number) => (
                        <div key={idx} className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
                            <p className="font-medium text-[var(--color-text-primary)]">{criteria.name}</p>
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)]">Seuil: <span className="font-semibold text-[var(--color-primary)]">{criteria.threshold}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'RandomForest' && algorithmDetails[selectedAlgo].parameters && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Paramètres du Modèle</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Features Utilisées</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Indicateurs de Risque</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Paramètres du Modèle</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Features Analysées</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Paramètres du Modèle</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Variables d'Entrée</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Critères de Détection</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {algorithmDetails[selectedAlgo].detectionCriteria.map((criteria: AlgoDetectionCriteria, idx: number) => (
                        <div key={idx} className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
                            <p className="font-medium text-[var(--color-text-primary)]">{criteria.name}</p>
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)]">Seuil: <span className="font-semibold text-[var(--color-primary)]">{criteria.threshold}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlgo === 'SYSCOHADACompliance' && algorithmDetails[selectedAlgo].ruleCategories && (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Règles SYSCOHADA par Catégorie</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Détections ML OHADA</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Paramètres du Modèle</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Features Utilisées</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Classifications par Catégorie</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Paramètres du Modèle</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Features Utilisées</h3>
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Cas d'Usage</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {algorithmDetails[selectedAlgo].useCases.map((useCase: AlgoUseCase, idx: number) => (
                        <div key={idx} className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-[var(--color-text-primary)]">{useCase.name}</p>
                            <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                          </div>
                          <p className="text-sm text-[var(--color-success)] font-semibold">Précision: {useCase.accuracy}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <ModernButton
                    className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                    icon={<Download className="w-4 h-4" />}
                  >
                    Exporter Modèle
                  </ModernButton>
                  <ModernButton
                    variant="outline"
                    icon={<Activity className="w-4 h-4" />}
                  >
                    Voir Performances
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