/**
 * Mock Data for Report Studio
 * Used for demonstration and development without backend
 */

import type {
  Report,
  ContentTree,
  Section,
  Insight,
  Recommendation,
  KPICard,
} from '@/types/reportStudio';

// ============================================================
// Mock Report Data
// ============================================================

export const mockReport: Report = {
  id: 'demo-report-001',
  workspaceId: 'workspace-001',
  title: 'Étude de Marché - Secteur Retail Côte d\'Ivoire Q4 2024',
  reportTypes: [],
  isCombinedReport: false,
  dataImports: [],
  executiveSummary: `Le marché du retail en Côte d'Ivoire représente un volume de 2.5 milliards FCFA en 2024, avec une croissance annuelle de 8.2%.

Les principaux acteurs du marché sont positionnés sur trois segments clés :
- Grande distribution (45% du marché)
- Commerce de proximité (35% du marché)
- E-commerce (20% du marché, en forte croissance)

L'analyse révèle des opportunités significatives dans le segment e-commerce, particulièrement dans les zones urbaines d'Abidjan et des capitales régionales.`,
  insights: [
    {
      id: 'insight-1',
      type: 'positive',
      title: 'Croissance du marché',
      description: 'Le marché affiche une croissance soutenue de 8.2% sur l\'année',
      value: '+8.2%',
      change: 8.2,
      confidence: 0.92,
      priority: 'high',
    },
    {
      id: 'insight-2',
      type: 'opportunity',
      title: 'Potentiel E-commerce',
      description: 'Le segment e-commerce représente une opportunité de croissance majeure avec +25% de progression',
      value: '+25%',
      change: 25,
      confidence: 0.88,
      priority: 'high',
    },
    {
      id: 'insight-3',
      type: 'positive',
      title: 'Chiffre d\'affaires total',
      description: 'Volume total du marché retail en Côte d\'Ivoire',
      value: '2.5 Mds FCFA',
      confidence: 0.95,
      priority: 'high',
    },
    {
      id: 'insight-4',
      type: 'warning',
      title: 'Concurrence accrue',
      description: 'L\'entrée de nouveaux acteurs internationaux intensifie la concurrence',
      confidence: 0.85,
      priority: 'medium',
    },
    {
      id: 'insight-5',
      type: 'negative',
      title: 'Pression sur les marges',
      description: 'Les marges du secteur sont sous pression (-2 points)',
      value: '-2pts',
      change: -2,
      confidence: 0.78,
      priority: 'high',
    },
    {
      id: 'insight-6',
      type: 'info',
      title: 'Part de marché',
      description: 'Part de marché actuelle dans le segment cible',
      value: '23%',
      confidence: 0.90,
      priority: 'medium',
    },
  ],
  recommendations: [
    {
      id: 'rec-1',
      title: 'Investir dans le e-commerce',
      description: 'Développer une plateforme e-commerce robuste pour capter la croissance du segment digital',
      priority: 'critical',
      impact: 'high',
      effort: 'high',
      status: 'pending',
      timeline: 'Q1-Q2 2025',
    },
    {
      id: 'rec-2',
      title: 'Renforcer la présence régionale',
      description: 'Étendre le réseau de distribution aux capitales régionales à fort potentiel',
      priority: 'high',
      impact: 'high',
      effort: 'medium',
      status: 'pending',
      timeline: 'Q2 2025',
    },
    {
      id: 'rec-3',
      title: 'Optimiser la chaîne logistique',
      description: 'Réduire les coûts logistiques de 15% pour maintenir la compétitivité',
      priority: 'medium',
      impact: 'medium',
      effort: 'medium',
      status: 'pending',
      timeline: 'Q3 2025',
    },
    {
      id: 'rec-4',
      title: 'Programme de fidélisation',
      description: 'Lancer un programme de fidélité pour améliorer la rétention client',
      priority: 'medium',
      impact: 'medium',
      effort: 'low',
      status: 'pending',
      timeline: 'Q1 2025',
    },
  ],
  chartsConfig: [],
  version: 2,
  status: 'draft',
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  confidenceScore: 0.87,
  dataCompleteness: 0.78,
  limitations: [
    'Données basées sur échantillon de 500 points de vente',
    'Période d\'analyse limitée à Q4 2024',
  ],
};

// ============================================================
// Mock Content Tree
// ============================================================

export const mockContentTree: ContentTree = {
  sections: [
    {
      id: 'section-exec-summary',
      type: 'section',
      title: 'Résumé Exécutif',
      icon: 'clipboard-list',
      level: 1,
      status: 'generated',
      isLocked: false,
      isCollapsed: false,
      children: [],
      blocks: [
        {
          id: 'block-exec-1',
          type: 'paragraph',
          content: `Cette étude présente une analyse complète du marché du retail en Côte d'Ivoire pour le quatrième trimestre 2024. Le marché affiche une dynamique positive avec une croissance de 8.2% sur l'année, portée principalement par l'essor du e-commerce (+25%) et la résilience du commerce de proximité.`,
        },
        {
          id: 'block-exec-2',
          type: 'callout',
          variant: 'info',
          title: 'Points clés',
          content: `• Marché total : 2.5 milliards FCFA\n• Croissance annuelle : +8.2%\n• Segment le plus dynamique : E-commerce (+25%)\n• Part de marché cible : 23%`,
          icon: 'lightbulb',
        },
      ],
      metadata: {
        completionStatus: 'complete',
        aiConfidence: 0.92,
      },
    },
    {
      id: 'section-market-analysis',
      type: 'section',
      title: '1. Analyse du Marché',
      icon: 'bar-chart-3',
      level: 1,
      status: 'generated',
      isLocked: false,
      isCollapsed: false,
      children: [
        {
          id: 'section-market-size',
          type: 'section',
          title: '1.1 Taille du Marché',
          level: 2,
          status: 'generated',
          isLocked: false,
          children: [],
          blocks: [
            {
              id: 'block-market-1',
              type: 'paragraph',
              content: `Le marché du retail en Côte d'Ivoire représente un volume total de 2.5 milliards FCFA en 2024. Cette valeur place le pays parmi les marchés les plus dynamiques de la région UEMOA.`,
            },
            {
              id: 'block-market-chart',
              type: 'chart',
              chartType: 'bar',
              data: {
                labels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'],
                datasets: [
                  {
                    label: 'Chiffre d\'affaires (Mds FCFA)',
                    data: [580, 620, 650, 650],
                    backgroundColor: '#1C3163',
                  },
                ],
              },
              config: {
                title: 'Évolution du CA trimestriel',
                colorScheme: 'corporate',
                legend: { show: true, position: 'top' },
              },
            },
          ],
        },
        {
          id: 'section-market-trends',
          type: 'section',
          title: '1.2 Tendances du Marché',
          level: 2,
          status: 'generated',
          isLocked: false,
          children: [],
          blocks: [
            {
              id: 'block-trends-1',
              type: 'paragraph',
              content: `Trois tendances majeures façonnent le marché retail ivoirien en 2024 :`,
            },
            {
              id: 'block-trends-list',
              type: 'list',
              listType: 'numbered',
              items: [
                { id: 'item-1', content: 'Digitalisation accélérée des canaux de distribution' },
                { id: 'item-2', content: 'Montée en puissance du commerce de proximité' },
                { id: 'item-3', content: 'Évolution des comportements d\'achat post-pandémie' },
              ],
            },
          ],
        },
      ],
      blocks: [
        {
          id: 'block-market-intro',
          type: 'heading',
          level: 2,
          content: 'Vue d\'ensemble du marché',
        },
      ],
      metadata: {
        completionStatus: 'complete',
        aiConfidence: 0.89,
      },
    },
    {
      id: 'section-competition',
      type: 'section',
      title: '2. Analyse Concurrentielle',
      icon: 'trending-up',
      level: 1,
      status: 'generated',
      isLocked: false,
      isCollapsed: false,
      children: [],
      blocks: [
        {
          id: 'block-comp-1',
          type: 'paragraph',
          content: `Le paysage concurrentiel du retail ivoirien est dominé par trois catégories d'acteurs : les grands distributeurs internationaux, les chaînes locales et les commerçants indépendants.`,
        },
        {
          id: 'block-comp-table',
          type: 'table',
          headers: [
            { id: 'h1', label: 'Acteur', key: 'actor', sortable: true },
            { id: 'h2', label: 'Part de marché', key: 'share', align: 'center' },
            { id: 'h3', label: 'Croissance', key: 'growth', align: 'center' },
            { id: 'h4', label: 'Position', key: 'position', align: 'center' },
          ],
          rows: [
            { actor: { value: 'Carrefour' }, share: { value: '18%' }, growth: { value: '+5%' }, position: { value: 'Leader' } },
            { actor: { value: 'Prosuma' }, share: { value: '15%' }, growth: { value: '+3%' }, position: { value: 'Challenger' } },
            { actor: { value: 'Casino' }, share: { value: '12%' }, growth: { value: '+2%' }, position: { value: 'Challenger' } },
            { actor: { value: 'CDCI' }, share: { value: '8%' }, growth: { value: '+7%' }, position: { value: 'Suiveur' } },
          ],
          config: {
            striped: true,
            bordered: true,
          },
        },
        {
          id: 'block-comp-chart',
          type: 'chart',
          chartType: 'pie',
          data: {
            labels: ['Carrefour', 'Prosuma', 'Casino', 'CDCI', 'Autres'],
            datasets: [
              {
                label: 'Parts de marché',
                data: [18, 15, 12, 8, 47],
                backgroundColor: ['#1C3163', '#D6B585', '#2563eb', '#10b981', '#6b7280'],
              },
            ],
          },
          config: {
            title: 'Répartition des parts de marché',
            colorScheme: 'corporate',
            legend: { show: true, position: 'right' },
          },
        },
      ],
      metadata: {
        completionStatus: 'complete',
        aiConfidence: 0.85,
      },
    },
    {
      id: 'section-opportunities',
      type: 'section',
      title: '3. Opportunités Identifiées',
      icon: 'lightbulb',
      level: 1,
      status: 'generated',
      isLocked: false,
      isCollapsed: false,
      children: [],
      blocks: [
        {
          id: 'block-opp-1',
          type: 'paragraph',
          content: `L'analyse du marché révèle plusieurs opportunités stratégiques à fort potentiel pour les acteurs du secteur.`,
        },
        {
          id: 'block-opp-callout-1',
          type: 'callout',
          variant: 'success',
          title: 'Opportunité #1 : E-commerce',
          content: `Le segment e-commerce affiche une croissance de 25% et reste sous-pénétré avec seulement 20% du marché. Potentiel estimé à +500M FCFA d'ici 2026.`,
          icon: 'rocket',
        },
        {
          id: 'block-opp-callout-2',
          type: 'callout',
          variant: 'success',
          title: 'Opportunité #2 : Expansion régionale',
          content: `Les capitales régionales (Bouaké, San Pedro, Yamoussoukro) présentent un potentiel de croissance de 15% avec une concurrence limitée.`,
          icon: 'map-pin',
        },
      ],
      metadata: {
        completionStatus: 'complete',
        aiConfidence: 0.87,
      },
    },
    {
      id: 'section-risks',
      type: 'section',
      title: '4. Analyse des Risques',
      icon: 'alert-triangle',
      level: 1,
      status: 'generated',
      isLocked: false,
      isCollapsed: false,
      children: [],
      blocks: [
        {
          id: 'block-risk-1',
          type: 'paragraph',
          content: `Cette section présente les principaux risques identifiés et leur niveau de criticité.`,
        },
        {
          id: 'block-risk-callout-1',
          type: 'callout',
          variant: 'warning',
          title: 'Risque concurrentiel',
          content: `L'arrivée de nouveaux acteurs internationaux (Amazon, Jumia expansion) pourrait intensifier la pression concurrentielle. Impact potentiel : -3% de part de marché.`,
          icon: 'alert-triangle',
        },
        {
          id: 'block-risk-callout-2',
          type: 'callout',
          variant: 'error',
          title: 'Risque logistique',
          content: `Les difficultés d'approvisionnement liées aux infrastructures routières restent un défi majeur, particulièrement en saison des pluies.`,
          icon: 'alert-circle',
        },
      ],
      metadata: {
        completionStatus: 'draft',
        aiConfidence: 0.82,
      },
    },
    {
      id: 'section-recommendations',
      type: 'section',
      title: '5. Recommandations',
      icon: 'check-circle',
      level: 1,
      status: 'generated',
      isLocked: false,
      isCollapsed: false,
      children: [],
      blocks: [
        {
          id: 'block-rec-1',
          type: 'paragraph',
          content: `Sur la base de cette analyse, nous formulons les recommandations stratégiques suivantes :`,
        },
        {
          id: 'block-rec-list',
          type: 'list',
          listType: 'numbered',
          items: [
            { id: 'rec-item-1', content: 'Investir massivement dans le canal e-commerce (budget recommandé : 200M FCFA)' },
            { id: 'rec-item-2', content: 'Développer un réseau de points relais en partenariat avec les commerces de proximité' },
            { id: 'rec-item-3', content: 'Lancer un programme de fidélisation digitale' },
            { id: 'rec-item-4', content: 'Optimiser la chaîne logistique pour réduire les coûts de 15%' },
          ],
        },
        {
          id: 'block-rec-divider',
          type: 'divider',
          style: 'solid',
        },
        {
          id: 'block-rec-conclusion',
          type: 'callout',
          variant: 'info',
          title: 'Prochaines étapes',
          content: `Un plan d'action détaillé sera élaboré lors de la prochaine phase du projet. Les priorités seront définies en fonction des ressources disponibles et des objectifs stratégiques de l'entreprise.`,
          icon: 'clipboard-list',
        },
      ],
      metadata: {
        completionStatus: 'complete',
        aiConfidence: 0.90,
      },
    },
  ],
};

// ============================================================
// Mock KPIs
// ============================================================

// ============================================================
// Mock Document Info (for DocumentInfoPanel)
// ============================================================

export interface DocumentInfo {
  id: string;
  title: string;
  type: string;
  size: string;
  version: string;
  pages: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  metadata: Record<string, string>;
  owner: {
    id: string;
    name: string;
    avatar?: string;
    initials: string;
  };
  workflow?: WorkflowInfo;
  versions: VersionInfo[];
  linkedDocuments: LinkedDocument[];
  comments: CommentInfo[];
  activities: ActivityInfo[];
}

export interface WorkflowInfo {
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  currentStep: number;
  totalSteps: number;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  assignee: string;
  assigneeInitials: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface VersionInfo {
  version: string;
  label: string;
  description: string;
  author: string;
  date: string;
  isCurrent: boolean;
}

export interface LinkedDocument {
  id: string;
  title: string;
  type: 'annexe' | 'parent' | 'related';
  status: 'valid' | 'expired' | 'draft';
}

export interface CommentInfo {
  id: string;
  author: string;
  authorInitials: string;
  date: string;
  content: string;
  resolved?: boolean;
}

export interface ActivityInfo {
  id: string;
  action: string;
  author: string;
  time: string;
}

export const mockDocumentInfo: DocumentInfo = {
  id: 'doc-001',
  title: 'Étude de Marché - Secteur Retail Côte d\'Ivoire Q4 2024',
  type: 'Étude de marché',
  size: '2.4 MB',
  version: 'v2.1',
  pages: 24,
  createdAt: '2024-10-15T09:30:00Z',
  updatedAt: '2024-12-28T14:45:00Z',
  tags: ['Retail', 'Côte d\'Ivoire', 'Q4 2024', 'Stratégie'],
  metadata: {
    'Client': 'SODECI Distribution',
    'Montant': '15 000 000 FCFA',
    'Date limite': '15 Janvier 2025',
    'Référence': 'ETM-2024-CI-042',
    'Secteur': 'Distribution / Retail',
  },
  owner: {
    id: 'user-001',
    name: 'Kouamé Yao',
    initials: 'KY',
  },
  workflow: {
    name: 'Validation rapport',
    status: 'in_progress',
    currentStep: 2,
    totalSteps: 4,
    steps: [
      {
        id: 'step-1',
        name: 'Rédaction initiale',
        assignee: 'Kouamé Yao',
        assigneeInitials: 'KY',
        dueDate: '20 Déc 2024',
        status: 'completed',
      },
      {
        id: 'step-2',
        name: 'Revue qualité',
        assignee: 'Aminata Diallo',
        assigneeInitials: 'AD',
        dueDate: '28 Déc 2024',
        status: 'completed',
      },
      {
        id: 'step-3',
        name: 'Validation Manager',
        assignee: 'Jean-Pierre Mensah',
        assigneeInitials: 'JPM',
        dueDate: '5 Jan 2025',
        status: 'in_progress',
      },
      {
        id: 'step-4',
        name: 'Approbation finale',
        assignee: 'Directeur Général',
        assigneeInitials: 'DG',
        dueDate: '10 Jan 2025',
        status: 'pending',
      },
    ],
  },
  versions: [
    {
      version: 'v2.1',
      label: 'Version actuelle',
      description: 'Ajout graphiques concurrentiels et mise à jour données Q4',
      author: 'Kouamé Yao',
      date: '28 Déc 2024',
      isCurrent: true,
    },
    {
      version: 'v2.0',
      label: 'Révision majeure',
      description: 'Restructuration complète des sections',
      author: 'Aminata Diallo',
      date: '20 Déc 2024',
      isCurrent: false,
    },
    {
      version: 'v1.5',
      label: 'Mise à jour données',
      description: 'Intégration données marché novembre',
      author: 'Kouamé Yao',
      date: '15 Déc 2024',
      isCurrent: false,
    },
    {
      version: 'v1.0',
      label: 'Version initiale',
      description: 'Première version du rapport',
      author: 'Kouamé Yao',
      date: '1 Déc 2024',
      isCurrent: false,
    },
  ],
  linkedDocuments: [
    {
      id: 'linked-1',
      title: 'Données brutes Q4 2024',
      type: 'annexe',
      status: 'valid',
    },
    {
      id: 'linked-2',
      title: 'Rapport Q3 2024',
      type: 'parent',
      status: 'valid',
    },
    {
      id: 'linked-3',
      title: 'Benchmark concurrentiel',
      type: 'related',
      status: 'draft',
    },
  ],
  comments: [
    {
      id: 'comment-1',
      author: 'Aminata Diallo',
      authorInitials: 'AD',
      date: 'Aujourd\'hui, 14h30',
      content: 'Excellente analyse du segment e-commerce. Peut-on ajouter une projection sur 3 ans ?',
      resolved: false,
    },
    {
      id: 'comment-2',
      author: 'Jean-Pierre Mensah',
      authorInitials: 'JPM',
      date: 'Hier, 16h45',
      content: 'Merci de vérifier les chiffres de parts de marché avec le service études.',
      resolved: true,
    },
    {
      id: 'comment-3',
      author: 'Kouamé Yao',
      authorInitials: 'KY',
      date: '26 Déc, 10h15',
      content: 'J\'ai mis à jour les données selon les dernières informations disponibles.',
      resolved: false,
    },
  ],
  activities: [
    {
      id: 'activity-1',
      action: 'Document modifié',
      author: 'Kouamé Yao',
      time: 'Il y a 2 heures',
    },
    {
      id: 'activity-2',
      action: 'Commentaire ajouté',
      author: 'Aminata Diallo',
      time: 'Il y a 3 heures',
    },
    {
      id: 'activity-3',
      action: 'Étape workflow validée',
      author: 'Aminata Diallo',
      time: 'Hier',
    },
    {
      id: 'activity-4',
      action: 'Version v2.1 créée',
      author: 'Kouamé Yao',
      time: '28 Déc 2024',
    },
    {
      id: 'activity-5',
      action: 'Document partagé avec l\'équipe',
      author: 'Kouamé Yao',
      time: '20 Déc 2024',
    },
    {
      id: 'activity-6',
      action: 'Document créé',
      author: 'Kouamé Yao',
      time: '15 Oct 2024',
    },
  ],
};

// ============================================================
// Mock KPIs
// ============================================================

export const mockKPIs: KPICard[] = [
  {
    id: 'kpi-1',
    label: 'Chiffre d\'affaires',
    value: '2.5 Mds',
    unit: 'FCFA',
    change: 8.2,
    changeType: 'positive',
  },
  {
    id: 'kpi-2',
    label: 'Croissance',
    value: '+8.2%',
    change: 8.2,
    changeType: 'positive',
  },
  {
    id: 'kpi-3',
    label: 'Part de marché',
    value: '23%',
    change: 2.5,
    changeType: 'positive',
  },
  {
    id: 'kpi-4',
    label: 'Marge nette',
    value: '12.5%',
    change: -2,
    changeType: 'negative',
  },
];

export default {
  mockReport,
  mockContentTree,
  mockKPIs,
  mockDocumentInfo,
};
