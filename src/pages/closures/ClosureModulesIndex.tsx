import React from 'react';
import { Link } from 'react-router-dom';
import {
  Lock,
  Calendar,
  ArrowRight,
  CheckCircle,
  RefreshCw,
  Shield,
  Search,
  Zap
} from 'lucide-react';

interface ClosureModule {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ElementType;
  color: string;
  features: string[];
}

const ClosureModulesIndex: React.FC = () => {
  const modules: ClosureModule[] = [
    {
      id: 'periodic',
      title: 'Clôture Mensuelle & Annuelle',
      description: 'Module unifié : clôture mensuelle réversible (6 étapes) et annuelle irréversible (7 étapes) conformes SYSCOHADA',
      path: '/closures/periodic',
      icon: Calendar,
      color: 'bg-purple-500',
      features: [
        'Clôture mensuelle (vérification, régularisations, verrouillage)',
        '17 contrôles de cohérence (9 mensuels, 7 bloquants annuels)',
        'Affectation du résultat, reports à nouveau, états financiers'
      ]
    },
    {
      id: 'revisions',
      title: 'Révisions Comptables',
      description: 'Cycle de révision conforme aux normes ISA avec assertions et ajustements',
      path: '/closures/revisions',
      icon: Search,
      color: 'bg-blue-500',
      features: [
        'Assertions par cycle comptable',
        'Ajustements d\'audit',
        'Rapports de révision'
      ]
    },
    {
      id: 'carry-forward',
      title: 'Reports à Nouveau',
      description: 'Ouverture d\'exercice avec report automatique des soldes et validation',
      path: '/closures/carry-forward',
      icon: RefreshCw,
      color: 'bg-amber-500',
      features: [
        'Report automatique des soldes',
        'Validation des à-nouveaux',
        'Journal d\'ouverture AN'
      ]
    },
    {
      id: 'audit-trail',
      title: 'Piste d\'Audit',
      description: 'Traçabilité complète des opérations pour conformité réglementaire',
      path: '/closures/audit-trail',
      icon: Shield,
      color: 'bg-green-600',
      features: [
        'Historique complet des modifications',
        'Export PDF horodaté',
        'Conformité DGI / CEMAC'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)]">
      {/* En-tête */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
                  <Lock className="h-8 w-8 mr-3 text-purple-600" />
                  Gestion des Clôtures
                </h1>
                <p className="mt-2 text-[var(--color-text-secondary)]">
                  Outils de clôture comptable conformes SYSCOHADA
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grille des modules */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>

                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 group-hover:text-[var(--color-primary-darker)]">
                  {module.title}
                </h3>

                <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-4">
                  {module.description}
                </p>

                <div className="space-y-1 mb-4">
                  {module.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 text-xs text-[var(--color-text-secondary)]">
                      <CheckCircle className="h-3 w-3 text-[var(--color-success)]" />
                      <span>{feature}</span>
                    </div>
                  ))}
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
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6 flex items-center">
            <Zap className="h-6 w-6 mr-3 text-yellow-500" />
            Accès Rapides
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/closures/periodic"
              className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Calendar className="h-8 w-8 text-purple-600" />
              <div>
                <div className="font-medium text-purple-900">Démarrer Clôture</div>
                <div className="text-sm text-purple-700">Workflow périodique</div>
              </div>
            </Link>

            <Link
              to="/closures/revisions"
              className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Search className="h-8 w-8 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">Révisions</div>
                <div className="text-sm text-blue-700">Cycle de révision</div>
              </div>
            </Link>

            <Link
              to="/closures/carry-forward"
              className="flex items-center space-x-3 p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <RefreshCw className="h-8 w-8 text-amber-600" />
              <div>
                <div className="font-medium text-amber-900">Reports AN</div>
                <div className="text-sm text-amber-700">Ouverture exercice</div>
              </div>
            </Link>

            <Link
              to="/closures/audit-trail"
              className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Shield className="h-8 w-8 text-green-600" />
              <div>
                <div className="font-medium text-green-900">Piste d'Audit</div>
                <div className="text-sm text-green-700">Traçabilité</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClosureModulesIndex;
