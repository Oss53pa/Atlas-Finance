import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Building2, UserCheck, Clock, DollarSign, TrendingUp,
  ArrowLeft, Home, Plus, Download, Eye, Edit, Phone, Mail,
  MapPin, Calendar, Target, Activity, CheckCircle, AlertTriangle
} from 'lucide-react';

const CompleteThirdPartyModuleV2: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('clients');

  // Onglets gestion tiers
  const tabs = [
    { id: 'clients', label: 'Clients', icon: Users, badge: '156' },
    { id: 'fournisseurs', label: 'Fournisseurs', icon: Building2, badge: '89' },
    { id: 'contacts', label: 'Contacts', icon: UserCheck, badge: '234' },
    { id: 'echeances', label: 'Échéances', icon: Clock, badge: '12' },
    { id: 'recouvrement', label: 'Recouvrement', icon: DollarSign },
    { id: 'analytics', label: 'Analyses', icon: TrendingUp },
  ];

  // Top clients
  const topClients = [
    { nom: 'SARL CONGO BUSINESS', ca: 245000, encours: 15000, dso: 28, statut: 'excellent' },
    { nom: 'STE AFRICAINE TECH', ca: 189000, encours: 8500, dso: 22, statut: 'bon' },
    { nom: 'CAMEROUN INDUSTRIES', ca: 156000, encours: 25000, dso: 45, statut: 'attention' },
    { nom: 'GABON LOGISTICS', ca: 134000, encours: 5000, dso: 18, statut: 'excellent' }
  ];

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/dashboard/comptable')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Workspace</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#7A99AC] to-[#6A89AC] flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Gestion des Tiers</h1>
                <p className="text-sm text-[#767676]">Clients, fournisseurs et contacts</p>
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
              <span className="text-sm">Nouveau tiers</span>
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
                  {tab.badge && (
                    <span className={`
                      px-2 py-0.5 text-xs font-medium rounded-full
                      ${activeTab === tab.id ? 'bg-[#7A99AC] text-white' : 'bg-blue-100 text-blue-600'}
                    `}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu organisé */}
        <div className="p-6">
          {activeTab === 'clients' && (
            <div className="space-y-6">
              {/* Métriques clients */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { title: 'Total clients', value: '156', color: '#7A99AC', icon: Users },
                  { title: 'CA total', value: '2.4M€', color: '#B87333', icon: DollarSign },
                  { title: 'DSO moyen', value: '32j', color: '#6A8A82', icon: Clock },
                  { title: 'Encours', value: '125K€', color: '#B87333', icon: Target }
                ].map((metric, index) => {
                  const IconComponent = metric.icon;
                  return (
                    <div key={index} className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                      <div className="flex items-center justify-between mb-2">
                        <IconComponent className="w-5 h-5" style={{color: metric.color}} />
                      </div>
                      <h3 className="text-xl font-bold text-[#191919] mb-1">{metric.value}</h3>
                      <p className="text-sm text-[#444444]">{metric.title}</p>
                    </div>
                  );
                })}
              </div>

              {/* Top clients en cards */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#191919]">🏆 Top Clients</h3>
                  <button 
                    onClick={() => navigate('/third-party/customers')}
                    className="px-3 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors text-sm"
                  >
                    Voir tous
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topClients.map((client, index) => (
                    <div key={index} className="p-4 rounded-lg border border-[#E8E8E8] hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-[#191919] text-sm mb-1">{client.nom}</h4>
                          <div className="flex items-center space-x-4 text-xs text-[#767676]">
                            <span>CA: {client.ca.toLocaleString()}€</span>
                            <span>DSO: {client.dso}j</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          client.statut === 'excellent' ? 'bg-green-100 text-green-700' :
                          client.statut === 'bon' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {client.statut}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#444444]">Encours</span>
                        <span className={`font-bold ${
                          client.encours < 20000 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {client.encours.toLocaleString()}€
                        </span>
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-2">
                        <button className="flex-1 px-2 py-1 text-[#7A99AC] border border-[#7A99AC] rounded text-xs hover:bg-[#7A99AC]/5">
                          Fiche
                        </button>
                        <button className="flex-1 px-2 py-1 bg-[#B87333] text-white rounded text-xs hover:bg-[#A86323]">
                          Facturer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recouvrement' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Balance âgée */}
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-3">⏰ Balance Âgée</h4>
                  <div className="space-y-2">
                    {[
                      { tranche: 'Current (0-30j)', montant: 45000, color: '#6A8A82' },
                      { tranche: '30-60 jours', montant: 28000, color: '#B87333' },
                      { tranche: '60-90 jours', montant: 15000, color: '#7A99AC' },
                      { tranche: '> 90 jours', montant: 37000, color: '#B85450' }
                    ].map((tranche, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{backgroundColor: tranche.color}}></div>
                          <span className="text-sm text-[#444444]">{tranche.tranche}</span>
                        </div>
                        <span className="text-sm font-bold" style={{color: tranche.color}}>
                          {tranche.montant.toLocaleString()}€
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions recouvrement */}
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-3">🎯 Actions</h4>
                  <div className="space-y-2">
                    {[
                      { action: 'Relance automatique', cible: '12 clients', icon: Target },
                      { action: 'Lettres recommandées', cible: '3 clients', icon: Mail },
                      { action: 'Appels téléphoniques', cible: '5 clients', icon: Phone },
                      { action: 'Contentieux', cible: '1 client', icon: AlertTriangle }
                    ].map((action, index) => {
                      const IconComponent = action.icon;
                      return (
                        <button key={index} className="w-full flex items-center justify-between p-2 rounded-lg border border-[#E8E8E8] hover:border-[#B87333] hover:bg-[#B87333]/5 transition-colors">
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

                {/* Statistiques recouvrement */}
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-3">📊 Performance</h4>
                  <div className="space-y-3">
                    {[
                      { metric: 'Taux recouvrement', value: '94%', target: '95%', status: 'bon' },
                      { metric: 'DSO moyen', value: '32j', target: '30j', status: 'attention' },
                      { metric: 'Créances > 90j', value: '2.3%', target: '< 5%', status: 'excellent' }
                    ].map((perf, index) => (
                      <div key={index} className="text-center p-2 rounded-lg bg-gray-50">
                        <p className="text-xs text-[#767676]">{perf.metric}</p>
                        <p className="text-lg font-bold text-[#191919]">{perf.value}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          perf.status === 'excellent' ? 'bg-green-100 text-green-700' :
                          perf.status === 'bon' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {perf.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fournisseurs' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="font-semibold text-[#191919] mb-4">🏭 Fournisseurs Stratégiques</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { nom: 'CAMEROUN LOGISTIQUE SA', secteur: 'Transport', ca: 340000, delai: 45, evaluation: 'A' },
                    { nom: 'AFRICA TECH SUPPLIES', secteur: 'IT/Matériel', ca: 280000, delai: 30, evaluation: 'A+' },
                    { nom: 'DOUALA TRADING CORP', secteur: 'Import/Export', ca: 190000, delai: 60, evaluation: 'B+' },
                    { nom: 'YAOUNDÉ SERVICES', secteur: 'Services', ca: 145000, delai: 30, evaluation: 'A' }
                  ].map((fournisseur, index) => (
                    <div key={index} className="p-4 rounded-lg border border-[#E8E8E8] hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-[#191919] text-sm mb-1">{fournisseur.nom}</h4>
                          <p className="text-xs text-[#767676]">{fournisseur.secteur}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                          fournisseur.evaluation.startsWith('A') ? 'bg-green-100 text-green-700' :
                          fournisseur.evaluation.startsWith('B') ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {fournisseur.evaluation}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#767676]">CA annuel</span>
                          <span className="font-medium text-[#191919]">{fournisseur.ca.toLocaleString()}€</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#767676]">Délai paiement</span>
                          <span className="font-medium text-[#B87333]">{fournisseur.delai}j</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center space-x-2">
                        <button className="flex-1 px-2 py-1 text-[#7A99AC] border border-[#7A99AC] rounded text-xs hover:bg-[#7A99AC]/5">
                          Fiche
                        </button>
                        <button className="flex-1 px-2 py-1 bg-[#B87333] text-white rounded text-xs hover:bg-[#A86323]">
                          Commander
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'echeances' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="font-semibold text-[#191919] mb-4">📅 Échéances des 7 Prochains Jours</h3>
                
                <div className="space-y-3">
                  {[
                    { date: '11/09/2025', tiers: 'CAMEROUN LOGISTICS', type: 'fournisseur', montant: 45000, action: 'payer' },
                    { date: '12/09/2025', tiers: 'ABC CORPORATION', type: 'client', montant: 67500, action: 'encaisser' },
                    { date: '13/09/2025', tiers: 'DOUALA TRADING', type: 'fournisseur', montant: 23400, action: 'payer' },
                    { date: '15/09/2025', tiers: 'GABON VENTURES', type: 'client', montant: 89000, action: 'relancer' }
                  ].map((echeance, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-[#E8E8E8] hover:shadow-md transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-lg bg-[#B87333] text-white flex flex-col items-center justify-center">
                            <span className="text-xs font-bold">{echeance.date.slice(0, 2)}</span>
                            <span className="text-xs">SEP</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-[#191919] text-sm">{echeance.tiers}</h4>
                          <div className="flex items-center space-x-3 text-xs text-[#767676]">
                            <span className={`px-2 py-0.5 rounded-full ${
                              echeance.type === 'client' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {echeance.type}
                            </span>
                            <span>{echeance.date}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          echeance.type === 'client' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {echeance.type === 'client' ? '+' : '-'}{echeance.montant.toLocaleString()}€
                        </p>
                        <button className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                          echeance.action === 'payer' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                          echeance.action === 'encaisser' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                          'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        }`}>
                          {echeance.action === 'payer' ? 'À payer' : 
                           echeance.action === 'encaisser' ? 'À encaisser' : 'À relancer'}
                        </button>
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

export default CompleteThirdPartyModuleV2;