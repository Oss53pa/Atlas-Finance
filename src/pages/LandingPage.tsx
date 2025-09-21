import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Calculator,
  Building2,
  Users,
  PieChart,
  TrendingUp,
  Shield,
  Globe,
  Zap,
  ArrowRight,
  Settings,
  FileText,
  BarChart3,
  Wallet,
  Package,
  Target,
  AlertCircle,
  CheckCircle,
  Star
} from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen" style={{backgroundColor: '#FFFFFF', fontFamily: 'Sometype Mono, sans-serif'}}>
      
      {/* Header/Navigation */}
      <header className="fixed top-0 w-full z-50" style={{backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #D5D0CD'}}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{backgroundColor: '#7A8B8E', color: '#FFFFFF'}}
              >
                <Calculator size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{color: '#353A3B', fontWeight: '700'}}>
                  WiseBook ERP
                </h1>
                <p className="text-sm" style={{color: '#7A8B8E', fontWeight: '500'}}>
                  Version 3.0.0 SYSCOHADA
                </p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-base font-medium hover:opacity-80 transition-opacity" style={{color: '#353A3B'}}>
                Fonctionnalités
              </a>
              <a href="#modules" className="text-base font-medium hover:opacity-80 transition-opacity" style={{color: '#353A3B'}}>
                Modules
              </a>
              <a href="#about" className="text-base font-medium hover:opacity-80 transition-opacity" style={{color: '#353A3B'}}>
                À propos
              </a>
              <Link 
                to="/dashboard" 
                className="px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
                style={{backgroundColor: '#353A3B', color: '#FFFFFF'}}
              >
                Accéder au Système
                <ArrowRight size={18} />
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20" style={{background: 'linear-gradient(135deg, #F7F3E9 0%, #D5D0CD 100%)'}}>
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
                style={{backgroundColor: '#7A8B8E'}}
              >
                <Building2 size={40} style={{color: '#FFFFFF'}} />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6" style={{color: '#353A3B', lineHeight: '1.1'}}>
              WiseBook ERP V3.0
            </h1>
            
            <p className="text-xl md:text-2xl mb-4 font-medium" style={{color: '#7A8B8E'}}>
              Système ERP Comptable et Financier
            </p>
            
            <p className="text-lg mb-8 max-w-2xl mx-auto" style={{color: '#353A3B', opacity: 0.8}}>
              Solution complète de gestion d'entreprise conforme aux standards SYSCOHADA, 
              conçue spécialement pour les entreprises africaines avec une interface moderne et intuitive.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/dashboard" 
                className="px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-lg"
                style={{backgroundColor: '#353A3B', color: '#FFFFFF'}}
              >
                <Zap size={22} />
                Démarrer Maintenant
              </Link>
              
              <Link 
                to="/parameters" 
                className="px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition-all border-2"
                style={{borderColor: '#7A8B8E', color: '#7A8B8E', backgroundColor: 'transparent'}}
              >
                <Settings size={22} />
                Configuration
              </Link>
            </div>
            
            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-3xl mx-auto">
              {[
                { icon: CheckCircle, label: 'SYSCOHADA', value: '100%' },
                { icon: Globe, label: 'Multi-Devises', value: '4+' },
                { icon: Shield, label: 'Sécurisé', value: 'SSL' },
                { icon: Star, label: 'Modules', value: '10+' }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <stat.icon size={32} style={{color: '#7A8B8E'}} className="mx-auto mb-2" />
                  <div className="text-2xl font-bold" style={{color: '#353A3B'}}>{stat.value}</div>
                  <div className="text-sm font-medium" style={{color: '#7A8B8E'}}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20" style={{backgroundColor: '#FFFFFF'}}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{color: '#353A3B'}}>
              Pourquoi Choisir WiseBook ?
            </h2>
            <p className="text-xl max-w-2xl mx-auto" style={{color: '#7A8B8E'}}>
              Une solution ERP moderne qui combine performance, sécurité et conformité SYSCOHADA
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Shield,
                title: 'Conformité SYSCOHADA',
                description: 'Plan comptable et processus entièrement conformes aux normes comptables africaines SYSCOHADA 2017.'
              },
              {
                icon: Globe,
                title: 'Multi-Devises',
                description: 'Support natif des principales devises africaines (XOF, XAF) et internationales (EUR, USD).'
              },
              {
                icon: Zap,
                title: 'Performance Optimale',
                description: 'Architecture haute performance avec cache Redis et optimisations PostgreSQL.'
              },
              {
                icon: Users,
                title: 'Multi-Utilisateurs',
                description: 'Gestion avancée des rôles et permissions avec authentification sécurisée 2FA.'
              },
              {
                icon: BarChart3,
                title: 'Reporting Avancé',
                description: 'Tableaux de bord interactifs et rapports financiers conformes aux standards internationaux.'
              },
              {
                icon: FileText,
                title: 'Audit Complet',
                description: 'Traçabilité complète de toutes les opérations avec journalisation détaillée.'
              }
            ].map((feature, index) => (
              <div 
                key={index} 
                className="p-8 rounded-2xl hover:shadow-lg transition-all duration-300"
                style={{backgroundColor: '#F7F3E9', border: '1px solid #D5D0CD'}}
              >
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                  style={{backgroundColor: '#7A8B8E'}}
                >
                  <feature.icon size={28} style={{color: '#FFFFFF'}} />
                </div>
                <h3 className="text-xl font-bold mb-3" style={{color: '#353A3B'}}>
                  {feature.title}
                </h3>
                <p style={{color: '#7A8B8E', lineHeight: '1.6'}}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-20" style={{backgroundColor: '#F7F3E9'}}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{color: '#353A3B'}}>
              Modules Intégrés
            </h2>
            <p className="text-xl max-w-2xl mx-auto" style={{color: '#7A8B8E'}}>
              Une suite complète de modules pour gérer tous les aspects de votre entreprise
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {[
              {
                icon: Calculator,
                title: 'Comptabilité',
                description: 'Plan comptable SYSCOHADA, écritures, journaux, grand livre',
                route: '/accounting',
                color: '#4F46E5'
              },
              {
                icon: Wallet,
                title: 'Trésorerie',
                description: 'Gestion bancaire, rapprochements, flux de trésorerie',
                route: '/treasury',
                color: '#059669'
              },
              {
                icon: Package,
                title: 'Immobilisations',
                description: 'Actifs fixes, amortissements, plus/moins-values',
                route: '/assets',
                color: '#DC2626'
              },
              {
                icon: PieChart,
                title: 'Analytique',
                description: 'Axes analytiques, centres de coûts, tableaux de bord',
                route: '/analytics',
                color: '#7C2D12'
              },
              {
                icon: Target,
                title: 'Budget',
                description: 'Budgets prévisionnels, contrôle budgétaire, écarts',
                route: '/budgeting',
                color: '#BE185D'
              },
              {
                icon: FileText,
                title: 'Fiscalité',
                description: 'Déclarations TVA, IS, télédéclarations fiscales',
                route: '/taxation',
                color: '#9333EA'
              },
              {
                icon: Users,
                title: 'Tiers',
                description: 'Clients, fournisseurs, contacts et recouvrement',
                route: '/third-party',
                color: '#0891B2'
              },
              {
                icon: BarChart3,
                title: 'Reporting',
                description: 'Rapports personnalisés, tableaux de bord dynamiques',
                route: '/reporting',
                color: '#EA580C'
              },
              {
                icon: Shield,
                title: 'Sécurité',
                description: 'Utilisateurs, rôles, permissions, audit de sécurité',
                route: '/security',
                color: '#1F2937'
              }
            ].map((module, index) => (
              <Link
                key={index}
                to={module.route}
                className="p-6 rounded-2xl hover:shadow-lg transition-all duration-300 group"
                style={{backgroundColor: '#FFFFFF', border: '1px solid #D5D0CD'}}
              >
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                  style={{backgroundColor: module.color + '15', color: module.color}}
                >
                  <module.icon size={24} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{color: '#353A3B'}}>
                  {module.title}
                </h3>
                <p className="text-sm mb-4" style={{color: '#7A8B8E', lineHeight: '1.5'}}>
                  {module.description}
                </p>
                <div className="flex items-center text-sm font-semibold group-hover:opacity-80" style={{color: module.color}}>
                  Accéder au module
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12" style={{backgroundColor: '#353A3B', color: '#FFFFFF'}}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <Calculator size={24} />
              <div>
                <div className="font-bold">WiseBook ERP V3.0</div>
                <div className="text-sm opacity-80">Système ERP SYSCOHADA</div>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8">
              <Link to="/parameters" className="text-sm hover:opacity-80 transition-opacity">
                Configuration Système
              </Link>
              <Link to="/dashboard" className="text-sm hover:opacity-80 transition-opacity">
                Interface Principale
              </Link>
              <div className="text-sm opacity-60">
                © 2025 WiseBook ERP. Tous droits réservés.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;