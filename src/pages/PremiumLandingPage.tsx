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

const PremiumLandingPage: React.FC = () => {
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
      gradient: 'from-blue-500 to-blue-600',
      color: 'blue',
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
      gradient: 'from-green-500 to-green-600',
      color: 'green',
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
      gradient: 'from-purple-500 to-purple-600',
      color: 'purple',
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
      navigate(role.dashboardPath);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header Premium */}
      <header className="relative overflow-hidden bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  WiseBook ERP
                </h1>
                <p className="text-sm text-gray-600">Plateforme comptable professionnelle</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="text-sm text-gray-600">Version 3.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              <span>Nouvelle interface premium</span>
            </div>
            <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Choisissez votre
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> rôle</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Interface personnalisée selon votre fonction. Accédez directement aux outils 
              et informations pertinents pour votre métier.
            </p>
          </div>
        </div>
      </section>

      {/* Sélection des rôles */}
      <section className="relative pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {userRoles.map((role) => {
              const IconComponent = role.icon;
              const isSelected = selectedRole === role.id;
              
              return (
                <div
                  key={role.id}
                  onClick={() => handleRoleSelection(role)}
                  className={`
                    relative group cursor-pointer transform transition-all duration-300 hover:scale-105
                    ${isSelected ? 'scale-105 shadow-2xl' : 'hover:shadow-xl'}
                  `}
                >
                  {/* Card */}
                  <div className={`
                    relative overflow-hidden bg-white rounded-2xl p-8 border-2 transition-all duration-300
                    ${isSelected 
                      ? `border-${role.color}-500 shadow-${role.color}-200/50 shadow-2xl` 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}>
                    {/* Gradient Background */}
                    <div className={`
                      absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-0 transition-opacity duration-300
                      ${isSelected ? 'opacity-5' : 'group-hover:opacity-3'}
                    `}></div>
                    
                    {/* Content */}
                    <div className="relative z-10">
                      {/* Icon */}
                      <div className={`
                        w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-all duration-300
                        bg-gradient-to-r ${role.gradient} 
                        ${isSelected ? 'shadow-lg' : 'group-hover:shadow-md'}
                      `}>
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>

                      {/* Title */}
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {role.title}
                      </h3>
                      <p className={`text-${role.color}-600 font-medium mb-4`}>
                        {role.subtitle}
                      </p>
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        {role.description}
                      </p>

                      {/* Features */}
                      <div className="space-y-3 mb-8">
                        {role.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <CheckCircle className={`w-5 h-5 text-${role.color}-500 flex-shrink-0`} />
                            <span className="text-gray-700 text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <button className={`
                        w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-xl
                        font-semibold transition-all duration-300 transform
                        bg-gradient-to-r ${role.gradient} text-white
                        hover:shadow-lg active:scale-95
                        ${isSelected ? 'shadow-lg scale-105' : ''}
                      `}>
                        <span>Accéder à mon espace</span>
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className={`absolute top-4 right-4 w-6 h-6 bg-${role.color}-500 rounded-full flex items-center justify-center`}>
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Pourquoi choisir WiseBook ERP ?
            </h3>
            <p className="text-lg text-gray-600">
              La solution comptable la plus avancée du marché
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Conformité SYSCOHADA</h4>
              <p className="text-gray-600">100% conforme aux normes comptables OHADA</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Performance IA</h4>
              <p className="text-gray-600">Intelligence artificielle pour l'automatisation</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Multi-utilisateurs</h4>
              <p className="text-gray-600">Gestion des rôles et permissions avancée</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">WiseBook ERP v3.0</span>
          </div>
          <p className="text-gray-700">
            © 2025 Praedium Tech. Plateforme comptable professionnelle SYSCOHADA.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PremiumLandingPage;