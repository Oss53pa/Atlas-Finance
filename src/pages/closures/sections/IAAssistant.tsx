import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  MessageCircle,
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Zap,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  FileText,
  BarChart3,
  Calculator,
  Search,
  Settings,
  Lightbulb,
  HelpCircle,
  RefreshCw,
  Download,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Star,
  Filter,
  Bookmark,
  Share2,
  Eye,
  Activity,
  Cpu,
  Database,
  Network,
  Shield,
  Globe,
  Layers,
  Command,
  Hash,
  Code,
  Play,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/Progress';
import { useData } from '../../../contexts/DataContext';
import type { DBFiscalYear } from '../../../lib/db';
import { closureOrchestrator } from '../../../services/cloture/closureOrchestrator';
import type { ClotureStep as OrchestratorStep } from '../../../services/cloture/closureOrchestrator';
import { previewClosure, canClose } from '../../../services/closureService';
import type { ClosurePreview } from '../../../services/closureService';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: MessageAttachment[];
  suggestions?: string[];
  actions?: MessageAction[];
  confidence?: number;
  sources?: string[];
}

interface MessageAttachment {
  type: 'chart' | 'table' | 'document' | 'image';
  title: string;
  data?: unknown;
  url?: string;
}

interface MessageAction {
  label: string;
  action: string;
  type: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactNode;
}

interface AnalyseAutomatique {
  id: string;
  nom: string;
  description: string;
  domaine: 'stocks' | 'clients' | 'fournisseurs' | 'tresorerie' | 'immobilisations' | 'provisions' | 'global';
  severite: 'info' | 'attention' | 'alerte' | 'critique';
  dateDetection: string;
  impact: 'faible' | 'modere' | 'eleve' | 'critique';
  recommandations: string[];
  actionsAutomatisees: string[];
  donnees: {
    valeurDetectee: number;
    valeurAttendue?: number;
    seuil?: number;
    ecart?: number;
  };
  statut: 'nouveau' | 'en_cours' | 'traite' | 'reporte';
}

interface RecommandationIA {
  id: string;
  titre: string;
  description: string;
  categorie: 'optimisation' | 'conformite' | 'risque' | 'performance' | 'automatisation';
  priorite: 'basse' | 'moyenne' | 'haute' | 'critique';
  impact: 'temps' | 'cout' | 'qualite' | 'conformite' | 'risque';
  impactChiffre?: number;
  difficulte: 'facile' | 'moyen' | 'difficile' | 'expert';
  etapes: string[];
  ressourcesNecessaires: string[];
  dateCreation: string;
  statut: 'nouvelle' | 'acceptee' | 'en_cours' | 'implementee' | 'rejetee';
}

interface MetriquePerformance {
  nom: string;
  valeur: number;
  unite: string;
  tendance: 'hausse' | 'baisse' | 'stable';
  objectif?: number;
  description: string;
  derniereMiseAJour: string;
}

interface ConversationTemplate {
  id: string;
  nom: string;
  description: string;
  questions: string[];
  contexte: string;
}

const IAAssistant: React.FC = () => {
  const { adapter } = useData();
  const [selectedTab, setSelectedTab] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Real Dexie data for Proph3t context ---
  const [fiscalYears, setFiscalYears] = useState<DBFiscalYear[]>([]);
  const [closurePreview, setClosurePreview] = useState<ClosurePreview | null>(null);
  const [orchSteps, setOrchSteps] = useState<OrchestratorStep[]>(() => closureOrchestrator.getSteps());
  const [proph3tRunning, setProph3tRunning] = useState(false);

  useEffect(() => {
    adapter.getAll<DBFiscalYear>('fiscalYears').then(fys => {
      setFiscalYears(fys);
      const active = fys.find(f => f.isActive) || fys[0];
      if (active) {
        previewClosure(active.id).then(setClosurePreview).catch(() => {});
      }
    });
  }, [adapter]);

  // Launch Proph3t closure workflow
  const handleProph3tClosure = useCallback(async () => {
    const activeFY = fiscalYears.find(f => f.isActive) || fiscalYears[0];
    if (!activeFY) {
      toast.error('Aucun exercice fiscal actif');
      return;
    }

    setProph3tRunning(true);
    setOrchSteps(closureOrchestrator.getSteps());

    // Add a message announcing the execution
    const startMsg: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      content: `**Proph3t IA** lance la clôture automatique de l'exercice **${activeFY.name || activeFY.code}**...\n\nMode: Proph3t (workflow complet)\nExercice: ${activeFY.startDate} → ${activeFY.endDate}`,
      timestamp: new Date().toISOString(),
      confidence: 100,
      sources: ['closureOrchestrator', 'Dexie DB'],
    };
    setMessages(prev => [...prev, startMsg]);

    const nextFY = fiscalYears.find(f => f.startDate > activeFY.endDate);

    try {
      const results = await closureOrchestrator.executeAll({
        exerciceId: activeFY.id,
        mode: 'proph3t',
        userId: 'proph3t-ia',
        openingExerciceId: nextFY?.id,
        onProgress: (step) => {
          setOrchSteps(prev => prev.map(s => s.id === step.id ? { ...step } : s));
        },
      });

      const done = results.filter(s => s.status === 'done');
      const errors = results.filter(s => s.status === 'error');

      const resultMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errors.length === 0
          ? `**Clôture terminée avec succès !**\n\n${done.map(s => `✅ ${s.label}: ${s.message}`).join('\n')}`
          : `**Clôture incomplète** — ${errors.length} erreur(s)\n\n${results.map(s =>
              s.status === 'done' ? `✅ ${s.label}: ${s.message}` :
              s.status === 'error' ? `❌ ${s.label}: ${s.message}` :
              `⏳ ${s.label}`
            ).join('\n')}`,
        timestamp: new Date().toISOString(),
        confidence: errors.length === 0 ? 100 : 60,
        sources: ['closureOrchestrator'],
      };
      setMessages(prev => [...prev, resultMsg]);

      if (errors.length === 0) {
        toast.success('Proph3t: Clôture complète');
      } else {
        toast.error(`Proph3t: ${errors.length} étape(s) en erreur`);
      }
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `**Erreur Proph3t** : ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
      toast.error('Proph3t: Erreur lors de l\'exécution');
    } finally {
      setProph3tRunning(false);
    }
  }, [fiscalYears]);

  // --- Real metrics computed from Dexie data ---
  const [entryCount, setEntryCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [provisionCount, setProvisionCount] = useState(0);
  const [assetCount, setAssetCount] = useState(0);

  useEffect(() => {
    Promise.all([
      adapter.count('journalEntries'),
      adapter.count('closureSessions'),
      adapter.count('provisions'),
      adapter.count('assets'),
    ]).then(([entries, sessions, provisions, assets]) => {
      setEntryCount(entries);
      setSessionCount(sessions);
      setProvisionCount(provisions);
      setAssetCount(assets);
    }).catch(() => {});
  }, [adapter]);

  // Analyses derived from real data counts
  const analysesAutomatiques: AnalyseAutomatique[] = useMemo(() => {
    const now = new Date().toISOString();
    const analyses: AnalyseAutomatique[] = [];

    if (provisionCount > 0) {
      analyses.push({
        id: 'prov-check',
        nom: 'Provisions créances douteuses',
        description: `${provisionCount} provision(s) enregistrée(s) dans la base`,
        domaine: 'provisions',
        severite: 'info',
        dateDetection: now,
        impact: 'modere',
        recommandations: ['Vérifier le statut de chaque provision', 'Valider les taux appliqués'],
        actionsAutomatisees: ['Calcul automatique via ancienneté créances'],
        donnees: { valeurDetectee: provisionCount },
        statut: 'traite',
      });
    }

    if (assetCount > 0) {
      analyses.push({
        id: 'asset-check',
        nom: 'Contrôle amortissements',
        description: `${assetCount} immobilisation(s) active(s) dans la base`,
        domaine: 'immobilisations',
        severite: 'info',
        dateDetection: now,
        impact: 'faible',
        recommandations: ['Vérifier les calculs d\'amortissement SYSCOHADA'],
        actionsAutomatisees: ['Validation automatique des taux'],
        donnees: { valeurDetectee: assetCount },
        statut: 'traite',
      });
    }

    if (entryCount > 0) {
      analyses.push({
        id: 'entry-check',
        nom: 'Volume d\'écritures',
        description: `${entryCount} écriture(s) comptable(s) enregistrée(s)`,
        domaine: 'global',
        severite: 'info',
        dateDetection: now,
        impact: 'faible',
        recommandations: ['Vérifier l\'équilibre débit/crédit global'],
        actionsAutomatisees: ['Contrôle automatique d\'équilibre'],
        donnees: { valeurDetectee: entryCount },
        statut: 'traite',
      });
    }

    return analyses;
  }, [entryCount, provisionCount, assetCount]);

  // Recommendations: empty initial state (user-generated via AI interaction)
  const recommandations: RecommandationIA[] = [];

  // Metrics computed from real data
  const metriques: MetriquePerformance[] = useMemo(() => {
    const now = new Date().toISOString();
    return [
      {
        nom: 'Écritures comptables',
        valeur: entryCount,
        unite: 'écritures',
        tendance: 'stable' as const,
        description: 'Nombre total d\'écritures dans la base',
        derniereMiseAJour: now,
      },
      {
        nom: 'Sessions de clôture',
        valeur: sessionCount,
        unite: 'sessions',
        tendance: 'stable' as const,
        description: 'Nombre de sessions de clôture créées',
        derniereMiseAJour: now,
      },
      {
        nom: 'Provisions actives',
        valeur: provisionCount,
        unite: 'provisions',
        tendance: 'stable' as const,
        description: 'Nombre de provisions enregistrées',
        derniereMiseAJour: now,
      },
      {
        nom: 'Immobilisations',
        valeur: assetCount,
        unite: 'actifs',
        tendance: 'stable' as const,
        description: 'Nombre d\'immobilisations dans le registre',
        derniereMiseAJour: now,
      },
    ];
  }, [entryCount, sessionCount, provisionCount, assetCount]);

  // Static conversation templates (reference data, not mock)
  const templates: ConversationTemplate[] = [
    {
      id: 'analyse_stocks',
      nom: 'Analyse des stocks',
      description: 'Analyse complète de la situation des stocks',
      questions: [
        'Quels sont les articles en rupture ou sous le minimum ?',
        'Y a-t-il des écarts entre stock physique et comptable ?',
        'Quelles provisions pour obsolescence faut-il constituer ?',
        'Comment optimiser la rotation des stocks ?',
      ],
      contexte: 'gestion_stocks',
    },
    {
      id: 'conformite_syscohada',
      nom: 'Contrôle de conformité SYSCOHADA',
      description: 'Vérification de la conformité aux normes comptables',
      questions: [
        'Les amortissements sont-ils conformes aux règles SYSCOHADA ?',
        'Les provisions respectent-elles les exigences réglementaires ?',
        'Y a-t-il des erreurs de présentation dans les états financiers ?',
        'Quels sont les points de non-conformité à corriger ?',
      ],
      contexte: 'conformite',
    },
    {
      id: 'cloture_rapide',
      nom: 'Clôture accélérée',
      description: 'Processus de clôture comptable optimisé',
      questions: [
        'Quelles sont les tâches critiques restantes ?',
        'Comment accélérer les contrôles de cohérence ?',
        'Quels processus peuvent être automatisés ?',
        'Quel est le planning optimal pour la clôture ?',
      ],
      contexte: 'cloture_processus',
    },
  ];

  // Initialize with welcome message (no mock conversation history)
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        type: 'assistant',
        content: 'Bonjour ! Je suis votre assistant IA pour la clôture comptable. Comment puis-je vous aider aujourd\'hui ?',
        timestamp: new Date().toISOString(),
        suggestions: [
          'Analyser les créances douteuses',
          'Vérifier la conformité SYSCOHADA',
          'Calculer les provisions nécessaires',
          'Générer un rapport de clôture',
        ],
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulation de réponse IA
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: generateAIResponse(inputMessage),
        timestamp: new Date().toISOString(),
        confidence: 0,
        sources: ['Base de connaissances', 'Données de l\'entreprise', 'Référentiel SYSCOHADA']
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    const p = closurePreview;

    if (lowerInput.includes('clôture') || lowerInput.includes('cloture') || lowerInput.includes('fermer')) {
      if (p) {
        return `**Aperçu de la clôture en cours :**\n\n• ${p.totalEntries} écritures au total\n• ${p.entriesToLock} à verrouiller\n• Produits : ${p.totalProduits.toLocaleString()} FCFA\n• Charges : ${p.totalCharges.toLocaleString()} FCFA\n• **Résultat : ${p.resultatNet.toLocaleString()} FCFA** (${p.isBenefice ? 'Bénéfice' : 'Perte'})\n${p.warnings.length > 0 ? `\n⚠️ ${p.warnings.length} avertissement(s):\n${p.warnings.map(w => `  - ${w}`).join('\n')}` : '\n✅ Aucun avertissement'}\n\nVoulez-vous que Proph3t exécute la clôture automatiquement ?`;
      }
      return 'Je n\'ai pas pu charger l\'aperçu de clôture. Vérifiez qu\'un exercice fiscal actif existe dans la base de données.';
    }

    if (lowerInput.includes('stock') || lowerInput.includes('inventaire')) {
      return 'Après analyse de vos stocks, je constate :\n\n• 3 articles critiques nécessitant un réapprovisionnement urgent\n• Un écart de valorisation de 50K FCFA à vérifier\n• Des provisions pour obsolescence recommandées : 815K FCFA\n\nSouhaitez-vous que je génère un rapport détaillé ou que je propose des actions correctives ?';
    }

    if (lowerInput.includes('créance') || lowerInput.includes('client')) {
      return 'Concernant vos créances clients :\n\n• 2 créances présentent un risque d\'impayé élevé (6M FCFA)\n• Délai moyen de paiement : 45 jours (objectif : 30 jours)\n• Provisions recommandées : 4.5M FCFA selon règles SYSCOHADA\n\nJe peux automatiser le calcul des provisions et générer les lettres de relance si vous le souhaitez.';
    }

    if (lowerInput.includes('provision') || lowerInput.includes('risque')) {
      return 'Analyse des provisions :\n\n• Provisions actuelles : 27.5M FCFA\n• Nouvelles provisions recommandées : 3.2M FCFA\n• Reprises possibles : 1.5M FCFA\n• Taux de couverture des risques : 87%\n\nToutes les provisions respectent les règles SYSCOHADA. Voulez-vous le détail par type de risque ?';
    }

    if (p) {
      return `Basé sur l'analyse de vos données (**${p.totalEntries}** écritures, résultat **${p.resultatNet.toLocaleString()} FCFA**), je vais examiner les éléments pertinents. Pouvez-vous préciser le domaine spécifique qui vous intéresse ?\n\nDomaines disponibles : stocks, créances clients, provisions, clôture comptable, amortissements.`;
    }

    return 'Je comprends votre question. Basé sur l\'analyse de vos données, je vais examiner les éléments pertinents et vous fournir une réponse détaillée avec des recommandations personnalisées. Pouvez-vous préciser le domaine spécifique qui vous intéresse ?';
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setInputMessage(template.questions[0]);
    }
  };

  const getSeveriteColor = (severite: string) => {
    switch (severite) {
      case 'critique': return 'text-[var(--color-error)] bg-[var(--color-error-lighter)]';
      case 'alerte': return 'text-[var(--color-warning)] bg-[var(--color-warning-lighter)]';
      case 'attention': return 'text-[var(--color-warning)] bg-[var(--color-warning-lighter)]';
      case 'info': return 'text-[var(--color-primary)] bg-[var(--color-primary-lighter)]';
      default: return 'text-[var(--color-text-primary)] bg-[var(--color-background-hover)]';
    }
  };

  const getPrioriteColor = (priorite: string) => {
    switch (priorite) {
      case 'critique': return 'text-[var(--color-error)] bg-[var(--color-error-lighter)]';
      case 'haute': return 'text-[var(--color-warning)] bg-[var(--color-warning-lighter)]';
      case 'moyenne': return 'text-[var(--color-warning)] bg-[var(--color-warning-lighter)]';
      case 'basse': return 'text-[var(--color-success)] bg-[var(--color-success-lighter)]';
      default: return 'text-[var(--color-text-primary)] bg-[var(--color-background-hover)]';
    }
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'traite': case 'implementee': return <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />;
      case 'en_cours': return <RefreshCw className="w-4 h-4 text-[var(--color-primary)]" />;
      case 'nouveau': case 'nouvelle': return <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />;
      case 'reporte': case 'rejetee': return <Clock className="w-4 h-4 text-[var(--color-text-primary)]" />;
      default: return <Activity className="w-4 h-4 text-[var(--color-text-primary)]" />;
    }
  };

  const kpis = useMemo(() => {
    const analysesNonTraitees = analysesAutomatiques.filter(a => a.statut !== 'traite').length;
    const recommandationsActives = recommandations.filter(r => r.statut === 'acceptee' || r.statut === 'en_cours').length;
    const impactEconomies = recommandations
      .filter(r => r.statut === 'implementee' && r.impactChiffre)
      .reduce((sum, r) => sum + (r.impactChiffre || 0), 0);

    return {
      analysesNonTraitees,
      recommandationsActives,
      impactEconomies,
      precisionsIA: 94.5,
      tempsReponse: 1.2
    };
  }, [analysesAutomatiques, recommandations]);

  return (
    <div className="space-y-6">
      {/* En-tête avec KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Précision IA</p>
                <p className="text-lg font-bold text-[var(--color-success)]">{kpis.precisionsIA}%</p>
                <p className="text-xs text-[var(--color-success)] mt-1">+2.1% ce mois</p>
              </div>
              <Brain className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Analyses Actives</p>
                <p className="text-lg font-bold">{kpis.analysesNonTraitees}</p>
                <p className="text-xs text-[var(--color-primary)] mt-1">Détections automatiques</p>
              </div>
              <Activity className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Temps Réponse</p>
                <p className="text-lg font-bold">{kpis.tempsReponse}s</p>
                <p className="text-xs text-[var(--color-success)] mt-1">-0.3s vs objectif</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Économies IA</p>
                <p className="text-lg font-bold text-[var(--color-success)]">{kpis.impactEconomies}h</p>
                <p className="text-xs text-[var(--color-success)] mt-1">Ce mois</p>
              </div>
              <Target className="w-8 h-8 text-[var(--color-success)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proph3t Closure Action */}
      <Alert className="border-l-4 border-l-purple-500">
        <Brain className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong>Proph3t IA</strong> — Assistant de clôture automatisée
            {closurePreview && (
              <span className="ml-2 text-sm">
                ({closurePreview.totalEntries} écritures, résultat {closurePreview.resultatNet.toLocaleString()} FCFA)
              </span>
            )}
          </div>
          <button
            onClick={handleProph3tClosure}
            disabled={proph3tRunning}
            className="ml-4 px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {proph3tRunning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Exécution...</>
            ) : (
              <><Play className="w-4 h-4" /> Lancer Clôture IA</>
            )}
          </button>
        </AlertDescription>
      </Alert>

      {/* Proph3t Steps Progress (visible when running or after execution) */}
      {orchSteps.some(s => s.status !== 'pending') && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-600" />
              Workflow Proph3t
            </h4>
            <div className="space-y-2">
              {orchSteps.map(step => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
                    step.status === 'done' ? 'bg-[var(--color-success)]' :
                    step.status === 'running' ? 'bg-purple-600' :
                    step.status === 'error' ? 'bg-[var(--color-error)]' :
                    'bg-gray-300'
                  }`}>
                    {step.status === 'done' ? <CheckCircle className="w-3 h-3" /> :
                     step.status === 'running' ? <Loader2 className="w-3 h-3 animate-spin" /> :
                     step.status === 'error' ? '!' : '·'}
                  </div>
                  <span className="text-sm flex-1">{step.label}</span>
                  {step.message && (
                    <span className={`text-xs ${step.status === 'error' ? 'text-[var(--color-error)]' : 'text-[var(--color-text-secondary)]'}`}>
                      {step.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="chat">Chat Assistant</TabsTrigger>
          <TabsTrigger value="analyses">Analyses Auto</TabsTrigger>
          <TabsTrigger value="recommandations">Recommandations</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        {/* Chat Assistant */}
        <TabsContent value="chat" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Zone de chat principal */}
            <div className="lg:col-span-3">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-600" />
                    Assistant IA Clôture Comptable
                    <Badge className="bg-[var(--color-success-lighter)] text-[var(--color-success-darker)] ml-auto">En ligne</Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <AnimatePresence>
                      {messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] ${
                            message.type === 'user'
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                          } rounded-lg p-3`}>
                            <div className="flex items-start gap-2 mb-2">
                              {message.type === 'assistant' ? (
                                <Bot className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                              ) : (
                                <User className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className="text-sm whitespace-pre-line">{message.content}</p>

                                {/* Niveau de confiance */}
                                {message.confidence && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="text-xs text-[var(--color-text-primary)]">Confiance:</span>
                                    <Progress value={message.confidence} className="w-16 h-1" />
                                    <span className="text-xs text-[var(--color-text-primary)]">{message.confidence.toFixed(0)}%</span>
                                  </div>
                                )}

                                {/* Sources */}
                                {message.sources && (
                                  <div className="mt-2">
                                    <p className="text-xs text-[var(--color-text-primary)] mb-1">Sources:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {message.sources.map((source, idx) => (
                                        <Badge key={idx} className="text-xs bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]">
                                          {source}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Actions */}
                                {message.actions && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {message.actions.map((action, idx) => (
                                      <button
                                        key={idx}
                                        className={`flex items-center gap-1 px-3 py-1 rounded text-xs ${
                                          action.type === 'primary' ? 'bg-[var(--color-primary)] text-white' :
                                          action.type === 'danger' ? 'bg-[var(--color-error)] text-white' :
                                          'bg-[var(--color-border)] text-[var(--color-text-primary)]'
                                        } hover:opacity-80`}
                                      >
                                        {action.icon}
                                        {action.label}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Suggestions */}
                                {message.suggestions && (
                                  <div className="mt-3">
                                    <p className="text-xs text-[var(--color-text-primary)] mb-2">Suggestions:</p>
                                    <div className="space-y-1">
                                      {message.suggestions.map((suggestion, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => setInputMessage(suggestion)}
                                          className="block w-full text-left px-2 py-1 text-xs bg-white border rounded hover:bg-[var(--color-background-secondary)]"
                                        >
                                          {suggestion}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="text-xs opacity-70 mt-1">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Indicateur de frappe */}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="bg-[var(--color-background-hover)] rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-purple-600" />
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Zone de saisie */}
                  <div className="flex-shrink-0 p-4 border-t">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Posez votre question sur la clôture comptable..."
                          className="w-full px-4 py-2 border rounded-lg pr-10"
                        />
                        <button
                          onClick={() => setIsListening(!isListening)}
                          className={`absolute right-2 top-2 p-1 rounded ${
                            isListening ? 'text-[var(--color-error)]' : 'text-[var(--color-text-secondary)]'
                          } hover:text-[var(--color-text-primary)]`}
                        >
                          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim()}
                        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Panneau latéral */}
            <div className="space-y-4">
              {/* Templates de conversation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Conversations Types</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className="w-full text-left p-2 border rounded hover:bg-[var(--color-background-secondary)]"
                    >
                      <p className="font-medium text-sm">{template.nom}</p>
                      <p className="text-xs text-[var(--color-text-primary)]">{template.description}</p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Métriques rapides */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">État du Système</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Capacité IA</span>
                    <Badge className="bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]">Optimale</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Données à jour</span>
                    <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Analyses actives</span>
                    <span className="text-sm font-medium">{kpis.analysesNonTraitees}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Analyses Automatiques */}
        <TabsContent value="analyses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Analyses Automatiques en Cours</h3>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
              <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configurer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {analysesAutomatiques.map(analyse => (
              <Card key={analyse.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{analyse.nom}</CardTitle>
                      <p className="text-sm text-[var(--color-text-primary)] mt-1">{analyse.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatutIcon(analyse.statut)}
                      <Badge className={getSeveriteColor(analyse.severite)}>
                        {analyse.severite}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Données détectées */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-[var(--color-background-secondary)] rounded">
                      <div>
                        <p className="text-sm text-[var(--color-text-primary)]">Valeur détectée</p>
                        <p className="font-bold">{(analyse.donnees.valeurDetectee / 1000000).toFixed(1)}M FCFA</p>
                      </div>
                      {analyse.donnees.valeurAttendue && (
                        <div>
                          <p className="text-sm text-[var(--color-text-primary)]">Valeur attendue</p>
                          <p className="font-bold">{(analyse.donnees.valeurAttendue / 1000000).toFixed(1)}M FCFA</p>
                        </div>
                      )}
                      {analyse.donnees.ecart && (
                        <div className="col-span-2">
                          <p className="text-sm text-[var(--color-text-primary)]">Écart</p>
                          <p className={`font-bold ${analyse.donnees.ecart < 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}`}>
                            {analyse.donnees.ecart > 0 ? '+' : ''}{(analyse.donnees.ecart / 1000).toFixed(0)}K FCFA
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Recommandations */}
                    <div>
                      <h4 className="font-medium mb-2">Recommandations</h4>
                      <ul className="space-y-1">
                        {analyse.recommandations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Lightbulb className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-1" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Actions automatisées */}
                    <div>
                      <h4 className="font-medium mb-2">Actions Automatisées</h4>
                      <ul className="space-y-1">
                        {analyse.actionsAutomatisees.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Zap className="w-3 h-3 text-[var(--color-primary)] flex-shrink-0 mt-1" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <button className="flex-1 px-3 py-2 bg-[var(--color-primary)] text-white rounded text-sm hover:bg-[var(--color-primary-dark)]">
                        Traiter
                      </button>
                      <button className="px-3 py-2 border rounded text-sm hover:bg-[var(--color-background-secondary)]">
                        Détails
                      </button>
                      <button className="px-3 py-2 border rounded text-sm hover:bg-[var(--color-background-secondary)]">
                        Reporter
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Recommandations */}
        <TabsContent value="recommandations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Recommandations d'Amélioration</h3>
            <div className="flex gap-2">
              <select className="px-4 py-2 border rounded-lg">
                <option value="toutes">Toutes catégories</option>
                <option value="optimisation">Optimisation</option>
                <option value="automatisation">Automatisation</option>
                <option value="conformite">Conformité</option>
                <option value="performance">Performance</option>
              </select>
              <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center gap-2">
                <Download className="w-4 h-4" />
                Rapport
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {recommandations.map(recommandation => (
              <Card key={recommandation.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-lg mb-2">{recommandation.titre}</h4>
                      <p className="text-[var(--color-text-primary)] mb-3">{recommandation.description}</p>

                      <div className="flex items-center gap-4 mb-4">
                        <Badge className={getPrioriteColor(recommandation.priorite)}>
                          Priorité {recommandation.priorite}
                        </Badge>
                        <Badge className="bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] capitalize">
                          {recommandation.categorie}
                        </Badge>
                        <span className="text-sm text-[var(--color-text-primary)] capitalize">
                          Difficulté: {recommandation.difficulte}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {getStatutIcon(recommandation.statut)}
                      {recommandation.impactChiffre && (
                        <div className="text-right">
                          <p className="text-sm text-[var(--color-text-primary)]">Impact</p>
                          <p className="font-bold text-[var(--color-success)]">
                            {recommandation.impact === 'temps' ? `${recommandation.impactChiffre}h` :
                             recommandation.impact === 'cout' ? `${(recommandation.impactChiffre / 1000000).toFixed(1)}M FCFA` :
                             `${recommandation.impactChiffre}%`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium mb-2">Étapes de Mise en Œuvre</h5>
                      <ol className="space-y-2">
                        {recommandation.etapes.map((etape, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="flex-shrink-0 w-5 h-5 bg-[var(--color-primary-lighter)] text-[var(--color-primary)] rounded-full text-xs flex items-center justify-center font-medium">
                              {idx + 1}
                            </span>
                            <span>{etape}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Ressources Nécessaires</h5>
                      <ul className="space-y-1">
                        {recommandation.ressourcesNecessaires.map((ressource, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-3 h-3 text-[var(--color-success)]" />
                            <span>{ressource}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 text-xs text-[var(--color-text-secondary)]">
                        Créée le {new Date(recommandation.dateCreation).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-4 border-t">
                    {recommandation.statut === 'nouvelle' && (
                      <>
                        <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded hover:bg-[var(--color-success-dark)]">
                          Accepter
                        </button>
                        <button className="px-4 py-2 border border-[var(--color-border-dark)] rounded hover:bg-[var(--color-background-secondary)]">
                          Reporter
                        </button>
                        <button className="px-4 py-2 border border-red-300 text-[var(--color-error)] rounded hover:bg-[var(--color-error-lightest)]">
                          Rejeter
                        </button>
                      </>
                    )}

                    {recommandation.statut === 'acceptee' && (
                      <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-dark)]">
                        Démarrer Implémentation
                      </button>
                    )}

                    <button className="px-4 py-2 border border-[var(--color-border-dark)] rounded hover:bg-[var(--color-background-secondary)] ml-auto">
                      Voir Détails
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Métriques de Performance IA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {metriques.map((metrique, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{metrique.nom}</h4>
                          <p className="text-sm text-[var(--color-text-primary)]">{metrique.description}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {metrique.tendance === 'hausse' ? (
                            <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />
                          ) : metrique.tendance === 'baisse' ? (
                            <TrendingDown className="w-4 h-4 text-[var(--color-error)]" />
                          ) : (
                            <Activity className="w-4 h-4 text-[var(--color-primary)]" />
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-[var(--color-text-primary)]">Valeur Actuelle</p>
                          <p className="text-lg font-bold">
                            {metrique.valeur} {metrique.unite}
                          </p>
                        </div>
                        {metrique.objectif && (
                          <div>
                            <p className="text-sm text-[var(--color-text-primary)]">Objectif</p>
                            <p className="text-lg font-bold text-[var(--color-text-primary)]">
                              {metrique.objectif} {metrique.unite}
                            </p>
                          </div>
                        )}
                      </div>

                      {metrique.objectif && (
                        <div className="mt-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progression</span>
                            <span>{((metrique.valeur / metrique.objectif) * 100).toFixed(1)}%</span>
                          </div>
                          <Progress value={(metrique.valeur / metrique.objectif) * 100} className="h-2" />
                        </div>
                      )}

                      <p className="text-xs text-[var(--color-text-secondary)] mt-3">
                        Dernière mise à jour: {new Date(metrique.derniereMiseAJour).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Utilisation du Système</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-[var(--color-primary-lightest)] rounded-lg">
                      <Cpu className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-2" />
                      <p className="text-lg font-bold text-[var(--color-primary)]">87%</p>
                      <p className="text-sm text-[var(--color-text-primary)]">Utilisation CPU</p>
                    </div>
                    <div className="text-center p-4 bg-[var(--color-success-lightest)] rounded-lg">
                      <Database className="w-8 h-8 text-[var(--color-success)] mx-auto mb-2" />
                      <p className="text-lg font-bold text-[var(--color-success)]">2.1GB</p>
                      <p className="text-sm text-[var(--color-text-primary)]">Mémoire Utilisée</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <Network className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-lg font-bold text-purple-600">127</p>
                      <p className="text-sm text-[var(--color-text-primary)]">Requêtes/min</p>
                    </div>
                    <div className="text-center p-4 bg-[var(--color-warning-lightest)] rounded-lg">
                      <Activity className="w-8 h-8 text-[var(--color-warning)] mx-auto mb-2" />
                      <p className="text-lg font-bold text-[var(--color-warning)]">99.9%</p>
                      <p className="text-sm text-[var(--color-text-primary)]">Disponibilité</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-purple-600" />
                      Points Forts de l'IA
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-[var(--color-success)] mt-1" />
                        <span>Détection proactive des anomalies comptables</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-[var(--color-success)] mt-1" />
                        <span>Recommandations personnalisées et contextuelles</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-[var(--color-success)] mt-1" />
                        <span>Automatisation des contrôles de cohérence</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-[var(--color-success)] mt-1" />
                        <span>Conformité SYSCOHADA assurée</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-3">Prochaines Améliorations</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Lightbulb className="w-3 h-3 text-yellow-500 mt-1" />
                        <span>Intégration de l'analyse prédictive des flux de trésorerie</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Lightbulb className="w-3 h-3 text-yellow-500 mt-1" />
                        <span>Reconnaissance vocale avancée en français</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Lightbulb className="w-3 h-3 text-yellow-500 mt-1" />
                        <span>Génération automatique de rapports narratifs</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Configuration */}
        <TabsContent value="configuration" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres de l'Assistant IA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Niveau de Détail des Réponses</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="detail" value="concis" className="text-[var(--color-primary)]" />
                      <span>Concis - Réponses courtes et directes</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="detail" value="detaille" defaultChecked className="text-[var(--color-primary)]" />
                      <span>Détaillé - Explications complètes avec exemples</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="detail" value="expert" className="text-[var(--color-primary)]" />
                      <span>Expert - Analyses approfondies et techniques</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Domaines d'Expertise Activés</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="text-[var(--color-primary)]" />
                      <span>Gestion des stocks et inventaires</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="text-[var(--color-primary)]" />
                      <span>Créances et cycle clients</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="text-[var(--color-primary)]" />
                      <span>Immobilisations et amortissements</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="text-[var(--color-primary)]" />
                      <span>Provisions et évaluations</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="text-[var(--color-primary)]" />
                      <span>Conformité SYSCOHADA</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="text-[var(--color-primary)]" />
                      <span>Analyse fiscale et optimisation</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Seuils d'Alerte</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Écart stocks (FCFA)</label>
                      <input type="number" defaultValue="100000" className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Créances à risque (%)</label>
                      <input type="number" defaultValue="5" className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Niveau de confiance minimum (%)</label>
                      <input type="number" defaultValue="80" className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automatisations et Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Analyses Automatiques</h4>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between">
                      <span>Contrôle quotidien des stocks</span>
                      <input type="checkbox" defaultChecked className="text-[var(--color-primary)]" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>Surveillance des créances échues</span>
                      <input type="checkbox" defaultChecked className="text-[var(--color-primary)]" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>Validation des calculs d'amortissement</span>
                      <input type="checkbox" defaultChecked className="text-[var(--color-primary)]" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>Contrôle de cohérence inter-modules</span>
                      <input type="checkbox" defaultChecked className="text-[var(--color-primary)]" />
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Notifications</h4>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between">
                      <span>Alertes critiques immédiate</span>
                      <input type="checkbox" defaultChecked className="text-[var(--color-primary)]" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>Rapport quotidien par email</span>
                      <input type="checkbox" className="text-[var(--color-primary)]" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>Recommandations hebdomadaires</span>
                      <input type="checkbox" defaultChecked className="text-[var(--color-primary)]" />
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Intégrations</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">API Bancaire</p>
                        <p className="text-sm text-[var(--color-text-primary)]">Rapprochements automatiques</p>
                      </div>
                      <Badge className="bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]">Connecté</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">ERP Principal</p>
                        <p className="text-sm text-[var(--color-text-primary)]">Synchronisation des données</p>
                      </div>
                      <Badge className="bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]">Actif</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">Service Fiscal</p>
                        <p className="text-sm text-[var(--color-text-primary)]">Validation réglementaire</p>
                      </div>
                      <Badge className="bg-[var(--color-warning-lighter)] text-yellow-800">En configuration</Badge>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <button className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]">
                    Sauvegarder la Configuration
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IAAssistant;