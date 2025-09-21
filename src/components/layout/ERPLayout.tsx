import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Home,
  Calculator,
  Users,
  Wallet,
  Package,
  PieChart,
  Target,
  FileText,
  BarChart3,
  Shield,
  Settings,
  LogOut
} from 'lucide-react';

interface ERPLayoutProps {
  children: React.ReactNode;
}

const ERPLayout: React.FC<ERPLayoutProps> = ({ children }) => {
  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Tableau de bord' },
    { path: '/accounting', icon: Calculator, label: 'Comptabilité' },
    { path: '/third-party', icon: Users, label: 'Tiers' },
    { path: '/treasury', icon: Wallet, label: 'Trésorerie' },
    { path: '/assets', icon: Package, label: 'Immobilisations' },
    { path: '/analytics', icon: PieChart, label: 'Analytique' },
    { path: '/budgeting', icon: Target, label: 'Budget' },
    { path: '/taxation', icon: FileText, label: 'Fiscalité' },
    { path: '/reporting', icon: BarChart3, label: 'Reporting' },
    { path: '/security', icon: Shield, label: 'Sécurité' },
  ];

  return (
    <div className="min-h-screen" style={{backgroundColor: '#FFFFFF'}}>
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64" style={{backgroundColor: '#353A3B', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}>
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4" style={{borderBottom: '1px solid #7A8B8E', backgroundColor: '#F7F3E9'}}>
          <Link to="/" className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{backgroundColor: '#7A8B8E', color: '#FFFFFF'}}
            >
              <Calculator size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{color: '#353A3B', fontFamily: 'Sometype Mono, sans-serif', fontWeight: '700'}}>
                WiseBook ERP
              </h1>
              <p className="text-xs" style={{color: '#7A8B8E', fontWeight: '500'}}>
                Version 3.0.0
              </p>
            </div>
          </Link>
        </div>
        
        {/* Navigation */}
        <nav style={{marginTop: '1rem', padding: '0 1rem'}}>
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className="flex items-center rounded-lg transition-all group"
                style={{
                  padding: '12px 16px',
                  color: '#D5D0CD',
                  fontFamily: 'Sometype Mono, sans-serif',
                  fontWeight: '500',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#7A8B8E';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#D5D0CD';
                }}
              >
                <item.icon size={20} className="mr-3" />
                {item.label}
              </Link>
            ))}
          </div>
          
          {/* Divider */}
          <div className="my-6" style={{borderTop: '1px solid #7A8B8E'}}></div>
          
          {/* Settings and Logout */}
          <div className="space-y-1">
            <Link 
              to="/parameters" 
              className="flex items-center rounded-lg transition-all"
              style={{
                padding: '12px 16px',
                color: '#D5D0CD',
                fontFamily: 'Sometype Mono, sans-serif',
                fontWeight: '500',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#7A8B8E';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#D5D0CD';
              }}
            >
              <Settings size={20} className="mr-3" />
              Paramètres
            </Link>
            
            <Link 
              to="/" 
              className="flex items-center rounded-lg transition-all"
              style={{
                padding: '12px 16px',
                color: '#D5D0CD',
                fontFamily: 'Sometype Mono, sans-serif',
                fontWeight: '500',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EF4444';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#D5D0CD';
              }}
            >
              <LogOut size={20} className="mr-3" />
              Retour Accueil
            </Link>
          </div>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="pl-64">
        <main style={{padding: '2rem 1.5rem', backgroundColor: '#F7F3E9', minHeight: '100vh'}}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default ERPLayout;