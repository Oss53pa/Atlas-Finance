import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator, FileText, BookOpen, BarChart3, TrendingUp, PieChart,
  Download, ArrowLeft, Home, Clock, CheckCircle, Plus, Zap,
  ArrowUpRight, Eye, Edit, DollarSign, Users, Target, Activity,
  AlertCircle, Filter, RefreshCw, ExternalLink
} from 'lucide-react';

const CompleteAccountingDashboardV2: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Onglets comptabilité
  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'entries', label: 'Écritures', icon: FileText, badge: '8' },
    { id: 'journals', label: t('navigation.journals'), icon: BookOpen },
    { id: 'balance', label: t('accounting.balance'), icon: Calculator },
    { id: 'statements', label: 'États Financiers', icon: PieChart },
    { id: 'analysis', label: 'Analyses', icon: TrendingUp },
  ];

  // Métriques comptables
  const metrics = [
    { title: 'Écritures du mois', value: '2,547', change: '+12%', trend: 'up', color: '#6A8A82', icon: FileText },
    { title: 'En attente validation', value: '8', change: '-25%', trend: 'down', color: '#B87333', icon: Clock },
    { title: 'Balance équilibrée', value: '100%', change: 'OK', trend: 'up', color: '#7A99AC', icon: CheckCircle },
    { title: 'Conformité SYSCOHADA', value: '98.5%', change: '+1%', trend: 'up', color: '#6A8A82', icon: Target }
  ];

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/dashboard/comptable')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[var(--color-background-hover)] hover:bg-[var(--color-border)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Workspace</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Centre Comptable</h1>
                <p className="text-sm text-[#767676]">Gestion comptable complète SYSCOHADA</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/executive')}
              className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Executive</span>
            </button>
            
            <button className="p-2 border border-[#D9D9D9] rounded-lg hover:bg-[var(--color-background-secondary)]" aria-label="Actualiser">
              <RefreshCw className="w-4 h-4 text-[#767676]" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        <div className="px-6 border-b border-[#E8E8E8]">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id 
                      ? 'border-[#6A8A82] text-[#6A8A82]' 
                      : 'border-transparent text-[#767676] hover:text-[#444444]'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`
                      px-2 py-0.5 text-xs font-medium rounded-full
                      ${activeTab === tab.id ? 'bg-[#6A8A82] text-white' : 'bg-[var(--color-error-lighter)] text-[var(--color-error)]'}
                    `}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu organisé par onglets */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Métriques style workspace */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {metrics.map((metric, index) => {
                  const IconComponent = metric.icon;
                  return (
                    <div key={index} className="bg-white rounded-lg p-4 border border-[#E8E8E8] hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{backgroundColor: `${metric.color}20`}}
                        >
                          <IconComponent className="w-5 h-5" style={{color: metric.color}} />
                        </div>
                        <div className={`text-xs font-medium flex items-center space-x-1 ${
                          metric.trend === 'up' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                        }`}>
                          {metric.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{metric.change}</span>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-[#191919] mb-1">{metric.value}</h3>
                      <p className="text-sm text-[#444444]">{metric.title}</p>
                    </div>
                  );
                })}
              </div>

              {/* Actions rapides organisées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">⚡ Saisie & Validation</h3>
                  <div className="space-y-2">
                    {[
                      { action: 'Nouvelle écriture', path: '/accounting/entries', icon: Plus },
                      { action: 'Validation en lot', path: '/accounting/entries', icon: CheckCircle },
                      { action: 'Import Excel/CSV', path: '/accounting/entries', icon: Download },
                      { action: 'Lettrage automatique', path: '/accounting/lettrage', icon: Zap }
                    ].map((item, index) => {
                      const IconComponent = item.icon;
                      return (
                        <button 
                          key={index}
                          onClick={() => navigate(item.path)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[#E8E8E8] hover:border-[#6A8A82] hover:bg-[#6A8A82]/5 transition-colors group"
                        >
                          <div className="flex items-center space-x-2">
                            <IconComponent className="w-4 h-4 text-[#6A8A82]" />
                            <span className="text-sm text-[#444444]">{item.action}</span>
                          </div>
                          <ArrowUpRight className="w-3 h-3 text-[#767676] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📊 Consultation & Rapports</h3>
                  <div className="space-y-2">
                    {[
                      { action: 'Balance générale', path: '/accounting/balance', icon: BarChart3 },
                      { action: 'Grand livre', path: '/accounting/general-ledger', icon: BookOpen },
                      { action: 'États financiers', path: '/financial-statements', icon: PieChart },
                      { action: 'Analyse SIG', path: '/accounting/sig', icon: TrendingUp }
                    ].map((item, index) => {
                      const IconComponent = item.icon;
                      return (
                        <button 
                          key={index}
                          onClick={() => navigate(item.path)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[#E8E8E8] hover:border-[#B87333] hover:bg-[#B87333]/5 transition-colors group"
                        >
                          <div className="flex items-center space-x-2">
                            <IconComponent className="w-4 h-4 text-[#B87333]" />
                            <span className="text-sm text-[#444444]">{item.action}</span>
                          </div>
                          <ArrowUpRight className="w-3 h-3 text-[#767676] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'entries' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-[#E8E8E8]">
                <div className="p-4 border-b border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#191919]">Écritures en Attente de Validation</h3>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 border border-[#D9D9D9] rounded-lg hover:bg-[var(--color-background-secondary)]" aria-label="Filtrer">
                        <Filter className="w-4 h-4 text-[#767676]" />
                      </button>
                      <button 
                        onClick={() => navigate('/accounting/entries')}
                        className="px-3 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors text-sm"
                      >
                        Aller au module complet
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  {/* Table compacte */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#E8E8E8]">
                          <th className="text-left py-2 text-xs font-medium text-[#767676] uppercase">Référence</th>
                          <th className="text-left py-2 text-xs font-medium text-[#767676] uppercase">Description</th>
                          <th className="text-right py-2 text-xs font-medium text-[#767676] uppercase">Montant</th>
                          <th className="text-center py-2 text-xs font-medium text-[#767676] uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { ref: 'E2025001', desc: 'Vente ABC Corp', montant: 2500, type: 'credit' },
                          { ref: 'E2025002', desc: 'Achat fournitures', montant: 450, type: 'debit' },
                          { ref: 'E2025003', desc: 'Salaires septembre', montant: 15000, type: 'debit' },
                        ].map((entry, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-[var(--color-background-secondary)]">
                            <td className="py-2 text-sm font-mono text-[#191919]">{entry.ref}</td>
                            <td className="py-2 text-sm text-[#444444]">{entry.desc}</td>
                            <td className={`py-2 text-sm font-semibold text-right ${
                              entry.type === 'credit' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                            }`}>
                              {entry.montant.toLocaleString()}€
                            </td>
                            <td className="py-2 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button className="text-[#6A8A82] hover:text-[#5A7A72]" aria-label="Voir les détails">
                                  <Eye className="w-3 h-3" />
                                </button>
                                <button className="text-[#B87333] hover:text-[#A86323]">
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button className="text-[#7A99AC] hover:text-[#6A89AC]" aria-label="Valider">
                                  <CheckCircle className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'journals' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { nom: 'Journal des Ventes', code: 'VT', entries: 125, color: '#B87333', path: '/accounting/journals' },
                  { nom: 'Journal des Achats', code: 'AC', entries: 89, color: '#6A8A82', path: '/accounting/journals' },
                  { nom: 'Journal de Banque', code: 'BQ', entries: 234, color: '#7A99AC', path: '/accounting/journals' },
                  { nom: 'Journal de Caisse', code: 'CA', entries: 67, color: '#B87333', path: '/accounting/journals' },
                  { nom: 'Opérations Diverses', code: 'OD', entries: 45, color: '#6A8A82', path: '/accounting/journals' },
                  { nom: 'Journal de Paie', code: 'PAI', entries: 12, color: '#7A99AC', path: '/accounting/journals' }
                ].map((journal, index) => (
                  <button 
                    key={index}
                    onClick={() => navigate(journal.path)}
                    className="bg-white rounded-lg p-4 border border-[#E8E8E8] hover:shadow-lg transition-all group text-left"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{backgroundColor: journal.color}}
                      >
                        {journal.code}
                      </div>
                      <ExternalLink className="w-4 h-4 text-[#767676] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="font-semibold text-[#191919] mb-1">{journal.nom}</h3>
                    <p className="text-sm text-[#767676]">{journal.entries} écritures</p>
                    <div className="mt-2 text-xs font-medium" style={{color: journal.color}}>
                      Consulter →
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'balance' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#191919]">Balance par Classes SYSCOHADA</h3>
                  <button 
                    onClick={() => navigate('/accounting/balance')}
                    className="px-3 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors text-sm"
                  >
                    Balance complète
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { classe: '1', nom: 'Comptes de ressources', solde: 3250000, type: 'credit' },
                    { classe: '2', nom: 'Comptes d\'actif immobilisé', solde: 4640000, type: 'debit' },
                    { classe: '3', nom: 'Comptes de stocks', solde: 340000, type: 'debit' },
                    { classe: '4', nom: 'Comptes de tiers', solde: 125000, type: 'debit' },
                    { classe: '5', nom: 'Comptes de trésorerie', solde: 1010000, type: 'debit' },
                    { classe: '6', nom: 'Comptes de charges', solde: 1890000, type: 'debit' },
                    { classe: '7', nom: 'Comptes de produits', solde: 2450000, type: 'credit' },
                    { classe: '8', nom: 'Comptes spéciaux', solde: 0, type: 'equilibre' }
                  ].map((classe, index) => (
                    <div key={index} className="p-3 rounded-lg bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-hover)] transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-8 h-8 rounded bg-[#6A8A82] text-white text-sm font-bold flex items-center justify-center">
                            {classe.classe}
                          </span>
                          <span className="text-sm text-[#444444]">{classe.nom}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-bold ${
                            classe.type === 'credit' ? 'text-[var(--color-success)]' : 
                            classe.type === 'debit' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'
                          }`}>
                            {classe.solde > 0 ? (classe.solde / 1000000).toFixed(2) + 'M€' : 'Équilibré'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompleteAccountingDashboardV2;