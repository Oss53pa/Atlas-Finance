import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Code
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/progress';

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
  data?: any;
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
  const [selectedTab, setSelectedTab] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Données simulées
  const mockMessages: Message[] = [
    {
      id: '1',
      type: 'assistant',
      content: 'Bonjour ! Je suis votre assistant IA pour la clôture comptable. Comment puis-je vous aider aujourd\'hui ?',
      timestamp: '2024-12-20T08:00:00',
      suggestions: [
        'Analyser les créances douteuses',
        'Vérifier la conformité SYSCOHADA',
        'Calculer les provisions nécessaires',
        'Générer un rapport de clôture'
      ]
    },
    {
      id: '2',
      type: 'user',
      content: 'Peux-tu analyser l\'état de nos stocks et identifier les risques potentiels ?',
      timestamp: '2024-12-20T08:05:00'
    },
    {
      id: '3',
      type: 'assistant',
      content: 'J\'ai analysé vos stocks et détecté plusieurs points d\'attention :\n\n**Stocks critiques :**\n- 3 articles sous le minimum (ordinateurs portables, imprimantes laser)\n- Écart de valorisation de 50K FCFA entre stock physique et comptable\n\n**Recommandations :**\n1. Réapprovisionner urgently les articles critiques\n2. Vérifier les derniers mouvements pour expliquer l\'écart\n3. Réviser les méthodes de valorisation FIFO/CMUP\n\n**Provisions suggérées :**\n- Obsolescence : 540K FCFA sur articles informatiques anciens\n- Dépréciation : 275K FCFA sur stocks à rotation lente',
      timestamp: '2024-12-20T08:06:00',
      confidence: 92,
      sources: ['Module Gestion Stocks', 'Inventaire physique', 'Valorisation comptable'],
      attachments: [
        {
          type: 'chart',
          title: 'Évolution des stocks par catégorie',
          data: {}
        }
      ],
      actions: [
        {
          label: 'Générer rapport détaillé',
          action: 'generate_stock_report',
          type: 'primary',
          icon: <FileText className="w-4 h-4" />
        },
        {
          label: 'Créer provisions automatiquement',
          action: 'create_provisions',
          type: 'secondary',
          icon: <Zap className="w-4 h-4" />
        }
      ]
    }
  ];

  const mockAnalysesAutomatiques: AnalyseAutomatique[] = [
    {
      id: '1',
      nom: 'Écart valorisation stocks',
      description: 'Écart détecté entre valorisation physique et comptable des stocks',
      domaine: 'stocks',
      severite: 'attention',
      dateDetection: '2024-12-20T11:15:00',
      impact: 'modere',
      recommandations: [
        'Vérifier les derniers mouvements de stock du jour',
        'Contrôler les méthodes de valorisation FIFO/CMUP',
        'Ajuster les écritures si nécessaire'
      ],
      actionsAutomatisees: [
        'Génération rapport d\'écart détaillé',
        'Identification des articles concernés',
        'Proposition d\'écriture d\'ajustement'
      ],
      donnees: {
        valeurDetectee: 25450000,
        valeurAttendue: 25500000,
        seuil: 100000,
        ecart: -50000
      },
      statut: 'nouveau'
    },
    {
      id: '2',
      nom: 'Créances clients à risque',
      description: 'Identification de créances présentant un risque d\'impayé élevé',
      domaine: 'clients',
      severite: 'alerte',
      dateDetection: '2024-12-20T10:30:00',
      impact: 'eleve',
      recommandations: [
        'Renforcer le suivi des créances de plus de 60 jours',
        'Revoir les conditions de crédit accordées',
        'Considérer une assurance crédit pour les gros montants'
      ],
      actionsAutomatisees: [
        'Calcul automatique des provisions nécessaires',
        'Génération des lettres de relance',
        'Mise à jour du scoring client'
      ],
      donnees: {
        valeurDetectee: 6000000,
        seuil: 5000000,
        ecart: 1000000
      },
      statut: 'en_cours'
    },
    {
      id: '3',
      nom: 'Contrôle amortissements SYSCOHADA',
      description: 'Vérification automatique de la conformité des calculs d\'amortissement',
      domaine: 'immobilisations',
      severite: 'info',
      dateDetection: '2024-12-20T14:20:00',
      impact: 'faible',
      recommandations: [
        'Tous les calculs sont conformes aux règles SYSCOHADA',
        'Maintenir la documentation à jour',
        'Planifier les tests de dépréciation annuels'
      ],
      actionsAutomatisees: [
        'Validation automatique des taux d\'amortissement',
        'Contrôle des durées par rapport aux minima/maxima',
        'Génération du rapport de conformité'
      ],
      donnees: {
        valeurDetectee: 60500000,
        valeurAttendue: 60500000,
        ecart: 0
      },
      statut: 'traite'
    }
  ];

  const mockRecommandations: RecommandationIA[] = [
    {
      id: '1',
      titre: 'Automatiser le calcul des provisions créances douteuses',
      description: 'Mise en place d\'un calcul automatique des provisions basé sur l\'ancienneté et le scoring client',
      categorie: 'automatisation',
      priorite: 'haute',
      impact: 'temps',
      impactChiffre: 15,
      difficulte: 'moyen',
      etapes: [
        'Configurer les règles de provisionnement par tranche d\'ancienneté',
        'Intégrer le scoring client dans le calcul',
        'Paramétrer les seuils d\'alerte automatiques',
        'Tester et valider les calculs'
      ],
      ressourcesNecessaires: ['Paramétrage système', 'Formation utilisateurs', 'Tests'],
      dateCreation: '2024-12-20',
      statut: 'nouvelle'
    },
    {
      id: '2',
      titre: 'Optimiser la gestion du besoin en fonds de roulement',
      description: 'Améliorer les délais de paiement clients et négocier avec les fournisseurs',
      categorie: 'optimisation',
      priorite: 'haute',
      impact: 'cout',
      impactChiffre: 2500000,
      difficulte: 'difficile',
      etapes: [
        'Analyser les délais de paiement actuels',
        'Négocier des délais plus courts avec les clients importants',
        'Renégocier les délais fournisseurs',
        'Mettre en place un suivi quotidien du BFR'
      ],
      ressourcesNecessaires: ['Équipe commerciale', 'Service achats', 'Outils de reporting'],
      dateCreation: '2024-12-19',
      statut: 'acceptee'
    },
    {
      id: '3',
      titre: 'Implémenter des contrôles de cohérence avancés',
      description: 'Développer des contrôles automatiques cross-modules pour détecter les incohérences',
      categorie: 'qualite',
      priorite: 'moyenne',
      impact: 'qualite',
      difficulte: 'expert',
      etapes: [
        'Identifier tous les points de contrôle nécessaires',
        'Développer les algorithmes de détection',
        'Intégrer dans les processus de clôture',
        'Former les équipes aux nouveaux contrôles'
      ],
      ressourcesNecessaires: ['Développement', 'Tests', 'Formation'],
      dateCreation: '2024-12-18',
      statut: 'en_cours'
    }
  ];

  const mockMetriques: MetriquePerformance[] = [
    {
      nom: 'Temps de traitement des requêtes',
      valeur: 1.2,
      unite: 'secondes',
      tendance: 'baisse',
      objectif: 1.0,
      description: 'Temps moyen de réponse de l\'IA aux questions',
      derniereMiseAJour: '2024-12-20T15:30:00'
    },
    {
      nom: 'Précision des recommandations',
      valeur: 94.5,
      unite: '%',
      tendance: 'hausse',
      objectif: 95.0,
      description: 'Pourcentage de recommandations jugées pertinentes',
      derniereMiseAJour: '2024-12-20T15:30:00'
    },
    {
      nom: 'Anomalies détectées automatiquement',
      valeur: 127,
      unite: 'détections',
      tendance: 'hausse',
      description: 'Nombre d\'anomalies détectées proactivement ce mois',
      derniereMiseAJour: '2024-12-20T15:30:00'
    },
    {
      nom: 'Temps économisé',
      valeur: 24.5,
      unite: 'heures',
      tendance: 'hausse',
      objectif: 30.0,
      description: 'Temps économisé grâce à l\'automatisation ce mois',
      derniereMiseAJour: '2024-12-20T15:30:00'
    }
  ];

  const mockTemplates: ConversationTemplate[] = [
    {
      id: 'analyse_stocks',
      nom: 'Analyse des stocks',
      description: 'Analyse complète de la situation des stocks',
      questions: [
        'Quels sont les articles en rupture ou sous le minimum ?',
        'Y a-t-il des écarts entre stock physique et comptable ?',
        'Quelles provisions pour obsolescence faut-il constituer ?',
        'Comment optimiser la rotation des stocks ?'
      ],
      contexte: 'gestion_stocks'
    },
    {
      id: 'conformite_syscohada',
      nom: 'Contrôle de conformité SYSCOHADA',
      description: 'Vérification de la conformité aux normes comptables',
      questions: [
        'Les amortissements sont-ils conformes aux règles SYSCOHADA ?',
        'Les provisions respectent-elles les exigences réglementaires ?',
        'Y a-t-il des erreurs de présentation dans les états financiers ?',
        'Quels sont les points de non-conformité à corriger ?'
      ],
      contexte: 'conformite'
    },
    {
      id: 'cloture_rapide',
      nom: 'Clôture accélérée',
      description: 'Processus de clôture comptable optimisé',
      questions: [
        'Quelles sont les tâches critiques restantes ?',
        'Comment accélérer les contrôles de cohérence ?',
        'Quels processus peuvent être automatisés ?',
        'Quel est le planning optimal pour la clôture ?'
      ],
      contexte: 'cloture_processus'
    }
  ];

  useEffect(() => {
    if (messages.length === 0) {
      setMessages(mockMessages);
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
        confidence: Math.random() * 20 + 80, // 80-100%
        sources: ['Base de connaissances', 'Données de l\'entreprise', 'Référentiel SYSCOHADA']
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('stock') || lowerInput.includes('inventaire')) {
      return 'Après analyse de vos stocks, je constate :\n\n• 3 articles critiques nécessitant un réapprovisionnement urgent\n• Un écart de valorisation de 50K FCFA à vérifier\n• Des provisions pour obsolescence recommandées : 815K FCFA\n\nSouhaitez-vous que je génère un rapport détaillé ou que je propose des actions correctives ?';
    }

    if (lowerInput.includes('créance') || lowerInput.includes('client')) {
      return 'Concernant vos créances clients :\n\n• 2 créances présentent un risque d\'impayé élevé (6M FCFA)\n• Délai moyen de paiement : 45 jours (objectif : 30 jours)\n• Provisions recommandées : 4.5M FCFA selon règles SYSCOHADA\n\nJe peux automatiser le calcul des provisions et générer les lettres de relance si vous le souhaitez.';
    }

    if (lowerInput.includes('provision') || lowerInput.includes('risque')) {
      return 'Analyse des provisions :\n\n• Provisions actuelles : 27.5M FCFA\n• Nouvelles provisions recommandées : 3.2M FCFA\n• Reprises possibles : 1.5M FCFA\n• Taux de couverture des risques : 87%\n\nToutes les provisions respectent les règles SYSCOHADA. Voulez-vous le détail par type de risque ?';
    }

    return 'Je comprends votre question. Basé sur l\'analyse de vos données, je vais examiner les éléments pertinents et vous fournir une réponse détaillée avec des recommandations personnalisées. Pouvez-vous préciser le domaine spécifique qui vous intéresse ?';
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = mockTemplates.find(t => t.id === templateId);
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
    const analysesNonTraitees = mockAnalysesAutomatiques.filter(a => a.statut !== 'traite').length;
    const recommandationsActives = mockRecommandations.filter(r => r.statut === 'acceptee' || r.statut === 'en_cours').length;
    const impactEconomies = mockRecommandations
      .filter(r => r.statut === 'implementee' && r.impactChiffre)
      .reduce((sum, r) => sum + (r.impactChiffre || 0), 0);

    return {
      analysesNonTraitees,
      recommandationsActives,
      impactEconomies,
      precisionsIA: 94.5,
      tempsReponse: 1.2
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* En-tête avec KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Précision IA</p>
                <p className="text-2xl font-bold text-[var(--color-success)]">{kpis.precisionsIA}%</p>
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
                <p className="text-2xl font-bold">{kpis.analysesNonTraitees}</p>
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
                <p className="text-2xl font-bold">{kpis.tempsReponse}s</p>
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
                <p className="text-2xl font-bold text-[var(--color-success)]">{kpis.impactEconomies}h</p>
                <p className="text-xs text-[var(--color-success)] mt-1">Ce mois</p>
              </div>
              <Target className="w-8 h-8 text-[var(--color-success)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes IA */}
      <Alert className="border-l-4 border-l-purple-500">
        <Brain className="h-4 w-4" />
        <AlertDescription>
          <strong>Assistant IA Actif:</strong> 3 nouvelles analyses automatiques disponibles.
          2 recommandations d'optimisation en attente de validation.
        </AlertDescription>
      </Alert>

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
                  {mockTemplates.map(template => (
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
            {mockAnalysesAutomatiques.map(analyse => (
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
            {mockRecommandations.map(recommandation => (
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
                  {mockMetriques.map((metrique, index) => (
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
                          <p className="text-2xl font-bold">
                            {metrique.valeur} {metrique.unite}
                          </p>
                        </div>
                        {metrique.objectif && (
                          <div>
                            <p className="text-sm text-[var(--color-text-primary)]">Objectif</p>
                            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
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
                      <p className="text-2xl font-bold text-[var(--color-primary)]">87%</p>
                      <p className="text-sm text-[var(--color-text-primary)]">Utilisation CPU</p>
                    </div>
                    <div className="text-center p-4 bg-[var(--color-success-lightest)] rounded-lg">
                      <Database className="w-8 h-8 text-[var(--color-success)] mx-auto mb-2" />
                      <p className="text-2xl font-bold text-[var(--color-success)]">2.1GB</p>
                      <p className="text-sm text-[var(--color-text-primary)]">Mémoire Utilisée</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <Network className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-purple-600">127</p>
                      <p className="text-sm text-[var(--color-text-primary)]">Requêtes/min</p>
                    </div>
                    <div className="text-center p-4 bg-[var(--color-warning-lightest)] rounded-lg">
                      <Activity className="w-8 h-8 text-[var(--color-warning)] mx-auto mb-2" />
                      <p className="text-2xl font-bold text-[var(--color-warning)]">99.9%</p>
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