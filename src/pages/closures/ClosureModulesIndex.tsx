import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Link } from 'react-router-dom';
import {
  Lock,
  Bot,
  GitBranch,
  Calculator,
  FileText,
  Layers,
  Calendar,
  Settings,
  ArrowRight,
  Zap,
  Brain,
  Workflow,
  CheckCircle,
  Clock,
  Users,
  Shield
} from 'lucide-react';

interface ClosureModule {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ElementType;
  color: string;
  features: string[];
  status: 'active' | 'new' | 'enhanced';
  badge?: string;
}

const ClosureModulesIndex: React.FC = () => {
  const { t } = useLanguage();
  const modules: ClosureModule[] = [
    {
      id: 'periodic',
      title: 'Clôtures Périodiques Automatisées',
      description: 'Workflow intelligent BPMN 2.0 avec IA intégrée - Réduction 50% temps de clôture',
      path: '/closures',
      icon: Bot,
      color: 'bg-purple-500',
      features: [
        'Workflow BPMN 2.0 intelligent',
        'IA prédictive et optimisation',
        '200+ contrôles automatiques',
        'Dashboard temps réel',
        'Conformité SYSCOHADA 98.7%'
      ],
      status: 'enhanced',
      badge: 'Nouvelle Génération'
    },
    {
      id: 'workflow-designer',
      title: 'Designer de Workflow BPMN 2.0',
      description: 'Créez vos workflows de clôture personnalisés avec éditeur graphique',
      path: '/closures/workflow-designer',
      icon: GitBranch,
      color: 'bg-[var(--color-primary)]',
      features: [
        'Éditeur graphique drag & drop',
        'Templates SYSCOHADA prédéfinis',
        'Conditions dynamiques SI/ALORS',
        'Validation temps réel',
        'Export/Import BPMN'
      ],
      status: 'new',
      badge: 'Nouveau'
    },
    {
      id: 'formula-editor',
      title: 'Éditeur de Formules Avancé',
      description: 'Créez des formules complexes avec variables contextuelles et validation SYSCOHADA',
      path: '/closures/formula-editor',
      icon: Calculator,
      color: 'bg-[var(--color-success)]',
      features: [
        'Syntaxe Excel/Python compatible',
        'Variables contextuelles SYSCOHADA',
        'Templates de formules prédéfinis',
        'Test en temps réel',
        'Documentation intégrée'
      ],
      status: 'new',
      badge: 'Nouveau'
    },
    {
      id: 'complete',
      title: 'Module Clôture Complet',
      description: 'Interface complète avec toutes les fonctionnalités de clôture avancées',
      path: '/closures/complete',
      icon: Layers,
      color: 'bg-indigo-500',
      features: [
        'Gestion complète des exercices',
        'Provisions automatiques',
        'États financiers SYSCOHADA',
        'Audit trail complet',
        'Multi-sociétés'
      ],
      status: 'active'
    },
    {
      id: 'enhanced',
      title: 'Clôtures Améliorées',
      description: 'Module enhanced avec fonctionnalités avancées et analytics',
      path: '/closures/enhanced',
      icon: Zap,
      color: 'bg-[var(--color-warning)]',
      features: [
        'Analytics avancés',
        'Reporting automatisé',
        'Notifications intelligentes',
        'Tableaux de bord',
        'Optimisations ML'
      ],
      status: 'enhanced'
    },
    {
      id: 'basic',
      title: 'Clôture Standard',
      description: 'Module de base pour clôtures simples et apprentissage',
      path: '/closures/basic',
      icon: Lock,
      color: 'bg-gray-500',
      features: [
        'Interface simplifiée',
        'Workflow de base',
        'Contrôles essentiels',
        'Formation utilisateur',
        'Mode débutant'
      ],
      status: 'active'
    },
    {
      id: 'annex-notes',
      title: 'Générateur d\'Annexes',
      description: 'Génération automatique des notes annexes aux états financiers',
      path: '/closures/annex-notes',
      icon: FileText,
      color: 'bg-teal-500',
      features: [
        'Notes annexes automatiques',
        'Templates SYSCOHADA',
        'Références réglementaires',
        'Export multi-formats',
        'Validation juridique'
      ],
      status: 'active'
    },
    {
      id: 'carry-forward',
      title: 'Gestionnaire de Reports',
      description: 'Gestion des reports à nouveau et ouverture d\'exercice',
      path: '/closures/carry-forward',
      icon: Calendar,
      color: 'bg-[var(--color-warning)]',
      features: [
        'Reports automatiques',
        'Ouverture exercice',
        'Validation des soldes',
        'Audit des reports',
        'Conformité légale'
      ],
      status: 'active'
    }
  ];

  const getStatusBadge = (status: string, badge?: string) => {
    if (badge) {
      return (
        <span className="px-3 py-1 bg-[var(--color-error)] text-white text-xs font-bold rounded-full animate-pulse">
          {badge}
        </span>
      );
    }

    switch (status) {
      case 'new':
        return <span className="px-2 py-1 bg-[var(--color-success-lighter)] text-[var(--color-success-darker)] text-xs font-medium rounded-full">{t('actions.new')}</span>;
      case 'enhanced':
        return <span className="px-2 py-1 bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] text-xs font-medium rounded-full">Amélioré</span>;
      default:
        return <span className="px-2 py-1 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] text-xs font-medium rounded-full">Actif</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)]">
      {/* En-tête */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[var(--color-text-primary)] flex items-center">
                  <Lock className="h-8 w-8 mr-3 text-purple-600" />
                  Modules de Gestion des Clôtures
                </h1>
                <p className="mt-2 text-[var(--color-text-primary)]">
                  Suite complète d'outils pour l'automatisation des clôtures comptables SYSCOHADA
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-[var(--color-text-primary)]">WiseBook v3.0</div>
                <div className="text-lg font-bold text-purple-600">8 Modules Disponibles</div>
              </div>
            </div>

            {/* Métriques globales */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600">Automatisation</p>
                    <p className="text-2xl font-bold text-purple-900">89%</p>
                  </div>
                  <Bot className="h-8 w-8 text-purple-500" />
                </div>
              </div>
              <div className="bg-[var(--color-success-lightest)] p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-success)]">Gain de Temps</p>
                    <p className="text-2xl font-bold text-green-900">-50%</p>
                  </div>
                  <Clock className="h-8 w-8 text-[var(--color-success)]" />
                </div>
              </div>
              <div className="bg-[var(--color-primary-lightest)] p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-primary)]">Conformité</p>
                    <p className="text-2xl font-bold text-[var(--color-primary-darker)]">98.7%</p>
                  </div>
                  <Shield className="h-8 w-8 text-[var(--color-primary)]" />
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-warning)]">Utilisateurs</p>
                    <p className="text-2xl font-bold text-orange-900">50+</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grille des modules */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => {
            const IconComponent = module.icon;

            return (
              <Link
                key={module.id}
                to={module.path}
                className="group bg-white rounded-xl border border-[var(--color-border)] p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`${module.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  {getStatusBadge(module.status, module.badge)}
                </div>

                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 group-hover:text-[var(--color-primary-darker)]">
                  {module.title}
                </h3>

                <p className="text-[var(--color-text-primary)] text-sm leading-relaxed mb-4">
                  {module.description}
                </p>

                {/* Liste des fonctionnalités */}
                <div className="space-y-1 mb-4">
                  {module.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 text-xs text-[var(--color-text-secondary)]">
                      <CheckCircle className="h-3 w-3 text-[var(--color-success)]" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {module.features.length > 3 && (
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      +{module.features.length - 3} autres fonctionnalités...
                    </div>
                  )}
                </div>

                <div className="flex items-center text-[var(--color-primary)] font-medium text-sm group-hover:text-[var(--color-primary-dark)]">
                  <span>Accéder au module</span>
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Section raccourcis rapides */}
        <div className="mt-12 bg-white rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6 flex items-center">
            <Zap className="h-6 w-6 mr-3 text-yellow-500" />
            Accès Rapides
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/closures"
              className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Bot className="h-8 w-8 text-purple-600" />
              <div>
                <div className="font-medium text-purple-900">Démarrer Clôture</div>
                <div className="text-sm text-purple-700">Workflow automatisé</div>
              </div>
            </Link>

            <Link
              to="/closures/workflow-designer"
              className="flex items-center space-x-3 p-4 bg-[var(--color-primary-lightest)] rounded-lg hover:bg-[var(--color-primary-lighter)] transition-colors"
            >
              <GitBranch className="h-8 w-8 text-[var(--color-primary)]" />
              <div>
                <div className="font-medium text-[var(--color-primary-darker)]">Designer BPMN</div>
                <div className="text-sm text-[var(--color-primary-dark)]">Créer workflow</div>
              </div>
            </Link>

            <Link
              to="/closures/formula-editor"
              className="flex items-center space-x-3 p-4 bg-[var(--color-success-lightest)] rounded-lg hover:bg-[var(--color-success-lighter)] transition-colors"
            >
              <Calculator className="h-8 w-8 text-[var(--color-success)]" />
              <div>
                <div className="font-medium text-green-900">Formules</div>
                <div className="text-sm text-[var(--color-success-dark)]">Calculs avancés</div>
              </div>
            </Link>

            <Link
              to="/closures/enhanced"
              className="flex items-center space-x-3 p-4 bg-[var(--color-warning-lightest)] rounded-lg hover:bg-[var(--color-warning-lighter)] transition-colors"
            >
              <Brain className="h-8 w-8 text-[var(--color-warning)]" />
              <div>
                <div className="font-medium text-yellow-900">Analytics IA</div>
                <div className="text-sm text-[var(--color-warning-dark)]">Insights avancés</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Statistiques d'utilisation */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-[var(--color-primary)]" />
              Performance Temps Réel
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-primary)]">Temps moyen clôture</span>
                <span className="font-bold text-[var(--color-success)]">7.2 jours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-primary)]">Objectif cible</span>
                <span className="font-bold text-[var(--color-primary)]">7 jours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-primary)]">Amélioration</span>
                <span className="font-bold text-purple-600">-52%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-[var(--color-success)]" />
              Conformité SYSCOHADA
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-primary)]">Score moyen</span>
                <span className="font-bold text-[var(--color-success)]">98.7%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-primary)]">Contrôles automatiques</span>
                <span className="font-bold text-[var(--color-primary)]">247/jour</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-primary)]">Taux de réussite</span>
                <span className="font-bold text-[var(--color-success)]">98.9%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-orange-500" />
              Adoption Utilisateurs
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-primary)]">Utilisateurs actifs</span>
                <span className="font-bold text-[var(--color-warning)]">50+</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-primary)]">Satisfaction</span>
                <span className="font-bold text-[var(--color-success)]">9/10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-primary)]">Adoption IA</span>
                <span className="font-bold text-purple-600">+18%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Documentation et formation */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-[var(--color-primary-light)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--color-primary-darker)] flex items-center">
              <FileText className="h-6 w-6 mr-3" />
              Documentation & Formation
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-[var(--color-primary-light)]">
              <h4 className="font-medium text-[var(--color-primary-darker)] mb-2">📚 Guide Utilisateur</h4>
              <p className="text-sm text-[var(--color-primary-darker)] mb-3">
                Documentation complète des workflows et fonctionnalités
              </p>
              <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)] text-sm font-medium">
                Consulter →
              </button>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[var(--color-primary-light)]">
              <h4 className="font-medium text-[var(--color-primary-darker)] mb-2">🎓 Formation SYSCOHADA</h4>
              <p className="text-sm text-[var(--color-primary-darker)] mb-3">
                Modules e-learning sur les normes comptables
              </p>
              <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)] text-sm font-medium">
                Commencer →
              </button>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[var(--color-primary-light)]">
              <h4 className="font-medium text-[var(--color-primary-darker)] mb-2">🛠️ Support Technique</h4>
              <p className="text-sm text-[var(--color-primary-darker)] mb-3">
                Assistance pour configuration et utilisation avancée
              </p>
              <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)] text-sm font-medium">
                Contacter →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClosureModulesIndex;