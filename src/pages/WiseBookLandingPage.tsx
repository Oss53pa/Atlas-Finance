import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator, 
  TrendingUp, 
  Settings,
  ArrowRight,
  Shield,
  BarChart3,
  Users,
  Zap,
  CheckCircle,
  Star
} from 'lucide-react';

interface UserRole {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<any>;
  gradient: string;
  features: string[];
  dashboardPath: string;
  color: string;
}

const WiseBookLandingPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const userRoles: UserRole[] = [
    {
      id: 'comptable',
      title: 'Comptable',
      subtitle: 'Opérations quotidiennes',
      description: 'Interface optimisée pour la saisie et la validation des écritures comptables',
      icon: Calculator,
      gradient: 'linear-gradient(135deg, #6A8A82 0%, #5A7A72 100%)',
      color: '#6A8A82',
      features: [
        'Saisie d\'écritures intelligente',
        'Validation automatique SYSCOHADA',
        'Lettrage automatique',
        'États financiers temps réel'
      ],
      dashboardPath: '/dashboard/comptable'
    },
    {
      id: 'manager',
      title: 'Manager',
      subtitle: 'Supervision & Pilotage',
      description: 'Tableaux de bord exécutifs et outils de supervision avancés',
      icon: TrendingUp,
      gradient: 'linear-gradient(135deg, #B87333 0%, #A86323 100%)',
      color: '#B87333',
      features: [
        'Dashboards exécutifs',
        'Analyses financières avancées',
        'Reporting automatisé',
        'KPIs en temps réel'
      ],
      dashboardPath: '/dashboard/manager'
    },
    {
      id: 'admin',
      title: 'Administrateur',
      subtitle: 'Contrôle total',
      description: 'Administration complète du système et gestion des utilisateurs',
      icon: Settings,
      gradient: 'linear-gradient(135deg, #7A99AC 0%, #6A89AC 100%)',
      color: '#7A99AC',
      features: [
        'Gestion des utilisateurs',
        'Configuration système',
        'Audit et sécurité',
        'Paramétrage avancé'
      ],
      dashboardPath: '/dashboard/admin'
    }
  ];

  const handleRoleSelection = (role: UserRole) => {
    setSelectedRole(role.id);
    setTimeout(() => {
      // Rediriger vers la page de login avec le rôle sélectionné
      navigate('/login', { state: { selectedRole: role.id, targetPath: role.dashboardPath } });
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#ECECEC] font-['Sometype Mono']">
      {/* Header WiseBook */}
      <header className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-b border-[#D9D9D9]">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, rgba(106, 138, 130, 0.05) 0%, rgba(184, 115, 51, 0.05) 100%)'}}></div>
        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{background: 'linear-gradient(135deg, #6A8A82 0%, #B87333 100%)'}}
              >
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#191919]">
                  WiseBook ERP
                </h1>
                <p className="text-sm text-[#444444]">Plateforme comptable professionnelle SYSCOHADA</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-[#B87333]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="text-sm text-[#767676]">Version 3.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section compact */}
      <section className="relative py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="mb-8">
            <div 
              className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
              style={{backgroundColor: 'rgba(106, 138, 130, 0.1)', color: '#6A8A82'}}
            >
              <Zap className="w-3 h-3" />
              <span>Interface personnalisée</span>
            </div>
            <h2 className="text-3xl font-bold text-[#191919] mb-4 leading-tight">
              Choisissez votre
              <span 
                className="bg-clip-text text-transparent ml-2"
                style={{background: 'linear-gradient(135deg, #6A8A82 0%, #B87333 100%)', WebkitBackgroundClip: 'text'}}
              > 
                espace de travail
              </span>
            </h2>
            <p className="text-base text-[#444444] max-w-2xl mx-auto leading-relaxed">
              Interface adaptée à votre fonction. Accédez directement aux outils 
              essentiels pour votre métier comptable.
            </p>
          </div>
        </div>
      </section>

      {/* Sélection des rôles - Style Kads Agency compact */}
      <section className="relative pb-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {userRoles.map((role) => {
              const IconComponent = role.icon;
              const isSelected = selectedRole === role.id;
              
              return (
                <div
                  key={role.id}
                  onClick={() => handleRoleSelection(role)}
                  className={`
                    relative group cursor-pointer transform transition-all duration-200 hover:scale-102
                    ${isSelected ? 'scale-102' : ''}
                  `}
                >
                  {/* Card compacte */}
                  <div className={`
                    relative overflow-hidden bg-white rounded-lg p-6 border transition-all duration-200
                    ${isSelected 
                      ? 'shadow-lg border-2' 
                      : 'border-[#E8E8E8] hover:border-[#D9D9D9] hover:shadow-md'
                    }
                  `}
                  style={{
                    borderColor: isSelected ? role.color : undefined
                  }}>
                    
                    {/* Content compact */}
                    <div className="relative z-10">
                      {/* Icon & Title sur la même ligne */}
                      <div className="flex items-center space-x-4 mb-3">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{background: role.gradient}}
                        >
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-[#191919]">
                            {role.title}
                          </h3>
                          <p 
                            className="text-sm font-medium"
                            style={{color: role.color}}
                          >
                            {role.subtitle}
                          </p>
                        </div>
                        {/* Selection Indicator */}
                        {isSelected && (
                          <div 
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{backgroundColor: role.color}}
                          >
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Description courte */}
                      <p className="text-[#444444] text-sm mb-4 leading-relaxed">
                        {role.description}
                      </p>

                      {/* Features compactes (2 principales seulement) */}
                      <div className="space-y-2 mb-5">
                        {role.features.slice(0, 2).map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" style={{color: role.color}} />
                            <span className="text-[#444444] text-xs">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA Button compact */}
                      <button 
                        className={`
                          w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg
                          font-medium transition-all duration-200 transform text-white text-sm
                          hover:shadow-md active:scale-95
                          ${isSelected ? 'shadow-md' : ''}
                        `}
                        style={{background: role.gradient}}
                      >
                        <span>Accéder</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section compacte */}
      <section className="relative py-12 bg-white/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-[#191919] mb-3">
              Pourquoi choisir WiseBook ERP ?
            </h3>
            <p className="text-base text-[#444444]">
              Solution comptable avancée conforme SYSCOHADA
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
                style={{background: 'linear-gradient(135deg, #6A8A82 0%, #5A7A72 100%)'}}
              >
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-[#191919] mb-2">Conformité SYSCOHADA</h4>
              <p className="text-[#444444] text-sm">100% conforme aux normes comptables OHADA</p>
            </div>

            <div className="text-center p-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
                style={{background: 'linear-gradient(135deg, #B87333 0%, #A86323 100%)'}}
              >
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-[#191919] mb-2">Performance IA</h4>
              <p className="text-[#444444] text-sm">Intelligence artificielle pour l'automatisation</p>
            </div>

            <div className="text-center p-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
                style={{background: 'linear-gradient(135deg, #7A99AC 0%, #6A89AC 100%)'}}
              >
                <Users className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-[#191919] mb-2">Multi-utilisateurs</h4>
              <p className="text-[#444444] text-sm">Gestion des rôles et permissions avancée</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#191919] text-white py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{background: 'linear-gradient(135deg, #6A8A82 0%, #B87333 100%)'}}
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">WiseBook ERP v3.0</span>
          </div>
          <p className="text-[#767676]">
            © 2025 Praedium Tech. Plateforme comptable professionnelle SYSCOHADA.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default WiseBookLandingPage;