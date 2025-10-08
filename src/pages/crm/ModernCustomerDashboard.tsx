import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, BarChart3, DollarSign, TrendingUp, ArrowLeft, Home, Plus,
  Eye, Edit, Phone, Mail, Calendar, Target, AlertTriangle, CheckCircle
} from 'lucide-react';

const ModernCustomerDashboard: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Onglets Clients
  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'clients', label: 'Fiches Clients', icon: Users },
    { id: 'recouvrement', label: t('thirdParty.collection'), icon: DollarSign },
  ];

  // Top clients
  const topClients = [
    { nom: 'SARL CONGO BUSINESS', ca: 245000, encours: 15000, dso: 28, statut: 'excellent', contact: 'Jean Mbeki' },
    { nom: 'STE AFRICAINE TECH', ca: 189000, encours: 8500, dso: 22, statut: 'bon', contact: 'Marie Koné' },
    { nom: 'CAMEROUN INDUSTRIES', ca: 156000, encours: 25000, dso: 45, statut: 'attention', contact: 'Paul Ndiaye' },
    { nom: 'GABON LOGISTICS', ca: 134000, encours: 5000, dso: 18, statut: 'excellent', contact: 'Sophie Bongo' }
  ];

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/dashboard/manager')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[var(--color-background-hover)] hover:bg-[var(--color-border)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Manager</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#7A99AC] to-[#6A89AC] flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Dashboard Clients</h1>
                <p className="text-sm text-[#767676]">CRM et gestion de la relation client</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/executive')}
              className="px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Executive</span>
            </button>
            
            <button className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span className="text-sm">Nouveau client</span>
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
                      ? 'border-[#7A99AC] text-[#7A99AC]' 
                      : 'border-transparent text-[#767676] hover:text-[#444444]'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu organisé */}
        <div className="p-6">
          {/* ONGLET 1 : VUE D'ENSEMBLE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPIs Clients */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { title: 'Total Clients', value: '156', color: '#7A99AC', icon: Users },
                  { title: 'CA Total', value: '2.4M€', color: '#B87333', icon: DollarSign },
                  { title: 'DSO Moyen', value: '32j', color: '#6A8A82', icon: Calendar },
                  { title: 'Encours', value: '125K€', color: '#B87333', icon: Target }
                ].map((kpi, index) => {
                  const IconComponent = kpi.icon;
                  return (
                    <div key={index} className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                      <div className="flex items-center justify-between mb-2">
                        <IconComponent className="w-5 h-5" style={{color: kpi.color}} />
                      </div>
                      <h3 className="text-xl font-bold text-[#191919] mb-1">{kpi.value}</h3>
                      <p className="text-sm text-[#444444]">{kpi.title}</p>
                    </div>
                  );
                })}
              </div>

              {/* Balance âgée */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">⏰ Balance Âgée</h3>
                  <div className="space-y-3">
                    {[
                      { tranche: 'Current (0-30j)', montant: 45000, color: '#6A8A82', pourcentage: 36 },
                      { tranche: '30-60 jours', montant: 28000, color: '#B87333', pourcentage: 22 },
                      { tranche: '60-90 jours', montant: 15000, color: '#7A99AC', pourcentage: 12 },
                      { tranche: '> 90 jours', montant: 37000, color: '#B85450', pourcentage: 30 }
                    ].map((tranche, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background-secondary)]">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{backgroundColor: tranche.color}}></div>
                          <span className="text-sm text-[#444444]">{tranche.tranche}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-bold" style={{color: tranche.color}}>
                            {tranche.montant.toLocaleString()}€
                          </span>
                          <span className="text-xs text-[#767676]">({tranche.pourcentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">🚨 Alertes Recouvrement</h3>
                  <div className="space-y-2">
                    {[
                      { client: 'CAMEROUN INDUSTRIES', probleme: 'DSO > 45 jours', niveau: 'attention' },
                      { client: 'DOUALA TRADING', probleme: 'Facture échue', niveau: 'urgent' },
                      { client: 'YAOUNDÉ CORP', probleme: 'Paiement en retard', niveau: 'moyen' }
                    ].map((alerte, index) => (
                      <div key={index} className={`p-3 rounded-lg border-l-4 ${
                        alerte.niveau === 'urgent' ? 'bg-[var(--color-error-lightest)] border-red-400' :
                        alerte.niveau === 'attention' ? 'bg-[var(--color-warning-lightest)] border-yellow-400' :
                        'bg-[var(--color-primary-lightest)] border-blue-400'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#191919]">{alerte.client}</p>
                            <p className="text-xs text-[#767676]">{alerte.probleme}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            alerte.niveau === 'urgent' ? 'bg-[var(--color-error-lighter)] text-[var(--color-error-dark)]' :
                            alerte.niveau === 'attention' ? 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]' :
                            'bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)]'
                          }`}>
                            {alerte.niveau}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 2 : FICHES CLIENTS */}
          {activeTab === 'clients' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topClients.map((client, index) => (
                  <div key={index} className="bg-white rounded-lg p-6 border border-[#E8E8E8] hover:shadow-lg transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-[#191919] text-sm mb-1">{client.nom}</h4>
                        <p className="text-xs text-[#767676] mb-2">Contact: {client.contact}</p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          client.statut === 'excellent' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-dark)]' :
                          client.statut === 'bon' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)]' :
                          'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]'
                        }`}>
                          {client.statut}
                        </span>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-[#7A99AC] text-white flex items-center justify-center font-bold">
                        {client.nom.charAt(0)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                      <div className="text-center p-2 rounded bg-[var(--color-background-secondary)]">
                        <p className="font-bold text-[#191919]">{client.ca.toLocaleString()}€</p>
                        <p className="text-[#767676]">CA annuel</p>
                      </div>
                      <div className="text-center p-2 rounded bg-[var(--color-background-secondary)]">
                        <p className="font-bold text-[#191919]">{client.dso}j</p>
                        <p className="text-[#767676]">DSO</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-[#444444]">Encours</span>
                      <span className={`font-bold text-sm ${
                        client.encours < 20000 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'
                      }`}>
                        {client.encours.toLocaleString()}€
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button className="flex-1 px-2 py-1 text-[#7A99AC] border border-[#7A99AC] rounded text-xs hover:bg-[#7A99AC]/5">
                        Voir
                      </button>
                      <button className="flex-1 px-2 py-1 bg-[#B87333] text-white rounded text-xs hover:bg-[#A86323]">
                        Facturer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ONGLET 3 : RECOUVREMENT */}
          {activeTab === 'recouvrement' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Actions recouvrement */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-4">🎯 Actions Recommandées</h4>
                  <div className="space-y-2">
                    {[
                      { action: 'Relances automatiques', cible: '12 clients', type: 'email' },
                      { action: 'Appels téléphoniques', cible: '5 clients', type: 'phone' },
                      { action: 'Lettres recommandées', cible: '3 clients', type: 'mail' },
                      { action: 'Mise en contentieux', cible: '1 client', type: 'legal' }
                    ].map((action, index) => {
                      const icons = { email: Mail, phone: Phone, mail: Mail, legal: AlertTriangle };
                      const IconComponent = icons[action.type];
                      return (
                        <button key={index} className="w-full flex items-center justify-between p-3 rounded-lg border border-[#E8E8E8] hover:border-[#B87333] hover:bg-[#B87333]/5 transition-colors">
                          <div className="flex items-center space-x-2">
                            <IconComponent className="w-4 h-4 text-[#B87333]" />
                            <span className="text-sm text-[#444444]">{action.action}</span>
                          </div>
                          <span className="text-xs text-[#767676]">{action.cible}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-4">📊 Performance</h4>
                  <div className="space-y-3">
                    {[
                      { metric: 'Taux recouvrement', value: '94%', target: '95%', status: 'bon' },
                      { metric: 'DSO moyen', value: '32j', target: '30j', status: 'attention' },
                      { metric: 'Créances > 90j', value: '2.3%', target: '< 5%', status: 'excellent' }
                    ].map((perf, index) => (
                      <div key={index} className="text-center p-3 rounded-lg bg-[var(--color-background-secondary)]">
                        <p className="text-xs text-[#767676] mb-1">{perf.metric}</p>
                        <p className="text-lg font-bold text-[#191919] mb-1">{perf.value}</p>
                        <p className="text-xs text-[#444444]">Objectif: {perf.target}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                          perf.status === 'excellent' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-dark)]' :
                          perf.status === 'bon' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)]' :
                          'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]'
                        }`}>
                          {perf.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-4">📈 Évolution</h4>
                  <div className="space-y-3">
                    {[
                      { periode: 'Ce mois', nouveau: 12, perdu: 2, net: +10 },
                      { periode: 'Trimestre', nouveau: 34, perdu: 8, net: +26 },
                      { periode: 'Année', nouveau: 89, perdu: 15, net: +74 }
                    ].map((evo, index) => (
                      <div key={index} className="p-3 rounded-lg bg-[var(--color-background-secondary)]">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-[#191919]">{evo.periode}</span>
                          <span className="text-sm font-bold text-[var(--color-success)]">+{evo.net}</span>
                        </div>
                        <div className="flex justify-between text-xs text-[#767676]">
                          <span>Nouveaux: {evo.nouveau}</span>
                          <span>Perdus: {evo.perdu}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernCustomerDashboard;