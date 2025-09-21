import React from 'react';
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
      color: 'bg-blue-500',
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
      color: 'bg-green-500',
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
      color: 'bg-yellow-500',
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
      color: 'bg-orange-500',
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
        <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
          {badge}
        </span>
      );
    }

    switch (status) {
      case 'new':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Nouveau</span>;
      case 'enhanced':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">Amélioré</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">Actif</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Lock className="h-8 w-8 mr-3 text-purple-600" />
                  Modules de Gestion des Clôtures
                </h1>
                <p className="mt-2 text-gray-600">
                  Suite complète d'outils pour l'automatisation des clôtures comptables SYSCOHADA
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">WiseBook v3.0</div>
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
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Gain de Temps</p>
                    <p className="text-2xl font-bold text-green-900">-50%</p>
                  </div>
                  <Clock className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Conformité</p>
                    <p className="text-2xl font-bold text-blue-900">98.7%</p>
                  </div>
                  <Shield className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600">Utilisateurs</p>
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
                className="group bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`${module.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  {getStatusBadge(module.status, module.badge)}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-900">
                  {module.title}
                </h3>

                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {module.description}
                </p>

                {/* Liste des fonctionnalités */}
                <div className="space-y-1 mb-4">
                  {module.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 text-xs text-gray-500">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {module.features.length > 3 && (
                    <div className="text-xs text-gray-400">
                      +{module.features.length - 3} autres fonctionnalités...
                    </div>
                  )}
                </div>

                <div className="flex items-center text-blue-600 font-medium text-sm group-hover:text-blue-700">
                  <span>Accéder au module</span>
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Section raccourcis rapides */}
        <div className="mt-12 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
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
              className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <GitBranch className="h-8 w-8 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">Designer BPMN</div>
                <div className="text-sm text-blue-700">Créer workflow</div>
              </div>
            </Link>

            <Link
              to="/closures/formula-editor"
              className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Calculator className="h-8 w-8 text-green-600" />
              <div>
                <div className="font-medium text-green-900">Formules</div>
                <div className="text-sm text-green-700">Calculs avancés</div>
              </div>
            </Link>

            <Link
              to="/closures/enhanced"
              className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <Brain className="h-8 w-8 text-yellow-600" />
              <div>
                <div className="font-medium text-yellow-900">Analytics IA</div>
                <div className="text-sm text-yellow-700">Insights avancés</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Statistiques d'utilisation */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-500" />
              Performance Temps Réel
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Temps moyen clôture</span>
                <span className="font-bold text-green-600">7.2 jours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Objectif cible</span>
                <span className="font-bold text-blue-600">7 jours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amélioration</span>
                <span className="font-bold text-purple-600">-52%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-500" />
              Conformité SYSCOHADA
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Score moyen</span>
                <span className="font-bold text-green-600">98.7%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Contrôles automatiques</span>
                <span className="font-bold text-blue-600">247/jour</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taux de réussite</span>
                <span className="font-bold text-green-600">98.9%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-orange-500" />
              Adoption Utilisateurs
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Utilisateurs actifs</span>
                <span className="font-bold text-orange-600">50+</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Satisfaction</span>
                <span className="font-bold text-green-600">9/10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Adoption IA</span>
                <span className="font-bold text-purple-600">+18%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Documentation et formation */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-blue-900 flex items-center">
              <FileText className="h-6 w-6 mr-3" />
              Documentation & Formation
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">📚 Guide Utilisateur</h4>
              <p className="text-sm text-blue-800 mb-3">
                Documentation complète des workflows et fonctionnalités
              </p>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Consulter →
              </button>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">🎓 Formation SYSCOHADA</h4>
              <p className="text-sm text-blue-800 mb-3">
                Modules e-learning sur les normes comptables
              </p>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Commencer →
              </button>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">🛠️ Support Technique</h4>
              <p className="text-sm text-blue-800 mb-3">
                Assistance pour configuration et utilisation avancée
              </p>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
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