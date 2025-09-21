import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { 
  Calculator, 
  FileText, 
  BookOpen,
  BarChart3,
  Users,
  Banknote,
  PieChart,
  TrendingUp,
  Clock,
  CheckCircle,
  Plus,
  DollarSign,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Home,
  Target,
  AlertCircle
} from 'lucide-react';

const ComptableWorkspaceV2Complete: React.FC = () => {
  const [activeModule, setActiveModule] = useState('dashboard');
  const navigate = useNavigate();

  // Liens directs vers WiseBook
  const wiseBookLinks = [
    { id: 'entries', label: 'Saisie d\'écritures', icon: FileText, badge: '5', path: '/accounting/entries' },
    { id: 'journals', label: 'Journaux', icon: BookOpen, path: '/accounting/journals' },
    { id: 'ledger', label: 'Grand livre', icon: Calculator, path: '/accounting/general-ledger' },
    { id: 'balance', label: 'Balance générale', icon: PieChart, path: '/accounting/balance' },
    { id: 'statements', label: 'États financiers', icon: TrendingUp, path: '/accounting/financial-statements' },
    { id: 'thirds', label: 'Gestion tiers', icon: Users, path: '/third-party' },
    { id: 'banking', label: 'Banque', icon: Banknote, path: '/treasury' },
  ];

  // Sidebar du comptable avec vrais liens
  const sidebar = (
    <div className="p-4">
      {/* Bouton accès direct WiseBook complet */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/executive')}
          className="w-full p-4 bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] rounded-lg text-white hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Home className="w-5 h-5" />
            <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-sm font-semibold">WiseBook Complet</div>
          <div className="text-xs opacity-90">Accès intégral à tous les modules</div>
        </button>
      </div>

      {/* Séparateur */}
      <div className="border-b border-[#E8E8E8] mb-4 pb-4">
        <div className="text-xs font-semibold text-[#767676] uppercase tracking-wide">Modules Comptables</div>
      </div>

      {/* Tableau de bord local */}
      <div className="mb-4">
        <button
          onClick={() => setActiveModule('dashboard')}
          className={`
            w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
            ${activeModule === 'dashboard'
              ? 'bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] text-white' 
              : 'text-[#444444] hover:text-[#6A8A82] hover:bg-gray-50'
            }
          `}
        >
          <BarChart3 className="w-4 h-4" />
          <span className="text-sm font-medium">Vue d'ensemble</span>
        </button>
      </div>

      {/* Liens rapides vers WiseBook */}
      <div className="space-y-1">
        {wiseBookLinks.map((item) => {
          const IconComponent = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#6A8A82] hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <IconComponent className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <div className="flex items-center space-x-1">
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-600">
                    {item.badge}
                  </span>
                )}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Section raccourcis */}
      <div className="mt-6 pt-4 border-t border-[#E8E8E8]">
        <div className="text-xs font-semibold text-[#767676] uppercase tracking-wide mb-3">Raccourcis Rapides</div>
        <div className="space-y-2">
          <button 
            onClick={() => navigate('/accounting/lettrage')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#6A8A82] hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm">Lettrage automatique</span>
            </div>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <button 
            onClick={() => navigate('/financial-statements')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#6A8A82] hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4" />
              <span className="text-sm">États SYSCOHADA</span>
            </div>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>
    </div>
  );

  // Dashboard avec métriques et liens rapides
  const renderDashboard = () => (
    <div className="p-6 space-y-6">
      {/* Métriques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Écritures du jour', value: '47', icon: FileText, color: '#6A8A82', change: '+12%', trend: 'up' },
          { title: 'En attente validation', value: '8', icon: Clock, color: '#B87333', change: '-3%', trend: 'down' },
          { title: 'Lettrage automatique', value: '156', icon: CheckCircle, color: '#7A99AC', change: '+23%', trend: 'up' },
          { title: 'Solde trésorerie', value: '2.4M€', icon: DollarSign, color: '#6A8A82', change: '+8.5%', trend: 'up' }
        ].map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-4 border border-[#E8E8E8] hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{backgroundColor: `${metric.color}20`}}
                >
                  <IconComponent className="w-5 h-5" style={{color: metric.color}} />
                </div>
                <div className={`text-xs font-medium flex items-center space-x-1 ${
                  metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{metric.change}</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-[#191919] mb-1">{metric.value}</h3>
              <p className="text-sm text-[#444444]">{metric.title}</p>
            </div>
          );
        })}
      </div>

      {/* Actions rapides WiseBook */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
        <h2 className="text-lg font-semibold text-[#191919] mb-4">Actions Rapides WiseBook</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Nouvelle écriture', icon: Plus, path: '/accounting/entries', color: '#6A8A82' },
            { label: 'Lettrage auto', icon: Zap, path: '/accounting/lettrage', color: '#B87333' },
            { label: 'Balance du jour', icon: BarChart3, path: '/accounting/balance', color: '#7A99AC' },
            { label: 'États SYSCOHADA', icon: TrendingUp, path: '/financial-statements', color: '#6A8A82' }
          ].map((action, index) => {
            const IconComponent = action.icon;
            return (
              <button 
                key={index}
                onClick={() => navigate(action.path)}
                className="p-3 rounded-lg border-2 border-dashed border-[#D9D9D9] hover:border-[#6A8A82] hover:bg-[#6A8A82]/5 transition-colors group"
              >
                <div className="text-center">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 transition-colors"
                    style={{backgroundColor: `${action.color}20`}}
                  >
                    <IconComponent className="w-4 h-4" style={{color: action.color}} />
                  </div>
                  <span className="text-xs font-medium text-[#444444] block">{action.label}</span>
                  <ExternalLink className="w-3 h-3 text-[#767676] mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Écritures récentes avec accès WiseBook */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-[#E8E8E8]">
          <div className="p-4 border-b border-[#E8E8E8]">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#191919]">Écritures Récentes</h3>
              <button 
                onClick={() => navigate('/accounting/entries')}
                className="text-[#6A8A82] text-sm hover:underline flex items-center space-x-1"
              >
                <span>Voir toutes</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[
                { ref: 'E2025001', desc: 'Achat fournitures bureau', amount: '450.00€', status: 'validated' },
                { ref: 'E2025002', desc: 'Vente ABC Corp', amount: '2,500.00€', status: 'pending' },
                { ref: 'E2025003', desc: 'Salaires équipe', amount: '15,000.00€', status: 'validated' },
              ].map((entry, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 rounded cursor-pointer" onClick={() => navigate('/accounting/entries')}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#191919]">{entry.ref}</p>
                    <p className="text-xs text-[#767676]">{entry.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-[#191919]">{entry.amount}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      entry.status === 'validated' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {entry.status === 'validated' ? 'Validé' : 'En attente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* CTA vers module complet */}
            <button 
              onClick={() => navigate('/accounting/entries')}
              className="w-full mt-4 p-3 border-2 border-dashed border-[#6A8A82]/30 rounded-lg text-[#6A8A82] hover:bg-[#6A8A82]/5 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Saisir nouvelle écriture dans WiseBook</span>
            </button>
          </div>
        </div>

        {/* Alertes et tâches avec liens */}
        <div className="bg-white rounded-lg border border-[#E8E8E8]">
          <div className="p-4 border-b border-[#E8E8E8]">
            <h3 className="font-semibold text-[#191919]">Alertes & Tâches</h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[
                { 
                  type: 'warning', 
                  message: '8 écritures en attente de validation', 
                  action: 'Valider dans WiseBook',
                  path: '/accounting/entries',
                  icon: AlertCircle
                },
                { 
                  type: 'info', 
                  message: 'Balance septembre à vérifier', 
                  action: 'Consulter balance',
                  path: '/accounting/balance',
                  icon: BarChart3
                },
                { 
                  type: 'success', 
                  message: '156 lignes lettrées automatiquement', 
                  action: 'Voir lettrage',
                  path: '/accounting/lettrage',
                  icon: CheckCircle
                },
              ].map((alert, index) => {
                const IconComponent = alert.icon;
                return (
                  <div key={index} className={`p-3 rounded-lg border-l-4 cursor-pointer hover:bg-opacity-20 transition-colors ${
                    alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                    alert.type === 'info' ? 'bg-blue-50 border-blue-400' :
                    'bg-green-50 border-green-400'
                  }`} onClick={() => navigate(alert.path)}>
                    <div className="flex items-start space-x-3">
                      <IconComponent className={`w-4 h-4 mt-0.5 ${
                        alert.type === 'warning' ? 'text-yellow-600' :
                        alert.type === 'info' ? 'text-blue-600' : 'text-green-600'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm text-[#444444] mb-1">{alert.message}</p>
                        <button className={`text-xs font-medium hover:underline flex items-center space-x-1 ${
                          alert.type === 'warning' ? 'text-yellow-700' :
                          alert.type === 'info' ? 'text-blue-700' : 'text-green-700'
                        }`}>
                          <span>{alert.action}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Raccourcis SYSCOHADA avec liens réels */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
        <h2 className="text-lg font-semibold text-[#191919] mb-4">Raccourcis SYSCOHADA</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Bilan Actif/Passif', path: '/financial-statements/balance' },
            { label: 'Compte de résultat', path: '/financial-statements/income' }, 
            { label: 'TAFIRE', path: '/accounting/sig' },
            { label: 'Grand livre', path: '/accounting/general-ledger' }
          ].map((shortcut, index) => (
            <button 
              key={index}
              onClick={() => navigate(shortcut.path)}
              className="p-3 text-left rounded-lg border border-[#E8E8E8] hover:border-[#6A8A82] hover:bg-[#6A8A82]/5 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#444444] flex-1">{shortcut.label}</span>
                <ExternalLink className="w-3 h-3 text-[#767676] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Statut en temps réel */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
        <h2 className="text-lg font-semibold text-[#191919] mb-4">Statut Système</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { 
              label: 'Conformité SYSCOHADA', 
              status: '100%', 
              color: '#6A8A82',
              description: 'Toutes validations OK'
            },
            { 
              label: 'Performance WiseBook', 
              status: 'Optimal', 
              color: '#7A99AC',
              description: 'Temps réponse < 200ms'
            },
            { 
              label: 'Dernière sauvegarde', 
              status: '2h ago', 
              color: '#B87333',
              description: 'Auto-backup activé'
            }
          ].map((item, index) => (
            <div key={index} className="text-center p-4 rounded-lg bg-gray-50">
              <div 
                className="w-3 h-3 rounded-full mx-auto mb-2"
                style={{backgroundColor: item.color}}
              ></div>
              <h4 className="font-medium text-[#191919] text-sm mb-1">{item.label}</h4>
              <p className="text-lg font-bold mb-1" style={{color: item.color}}>{item.status}</p>
              <p className="text-xs text-[#767676]">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <WorkspaceLayout
      workspaceTitle="Espace Comptable"
      workspaceIcon={Calculator}
      sidebar={sidebar}
      userRole="comptable"
      notifications={5}
    >
      {renderDashboard()}
    </WorkspaceLayout>
  );
};

export default ComptableWorkspaceV2Complete;