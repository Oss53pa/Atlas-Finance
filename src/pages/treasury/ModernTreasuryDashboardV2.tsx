import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, Activity, TrendingUp, BarChart3, Banknote, CreditCard,
  ArrowUpRight, ArrowDownRight, ArrowLeft, Home, Eye, Download,
  RefreshCw, Clock, CheckCircle, AlertCircle, Target, Zap,
  Building2, Users, PieChart, Calendar, Filter
} from 'lucide-react';

const ModernTreasuryDashboardV2: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('position');

  // Onglets trésorerie
  const tabs = [
    { id: 'position', label: 'Position', icon: DollarSign },
    { id: 'mouvements', label: 'Mouvements', icon: Activity },
    { id: 'previsions', label: 'Prévisions', icon: TrendingUp },
    { id: 'comptes', label: 'Comptes Bancaires', icon: Banknote },
    { id: 'rapprochements', label: 'Rapprochements', icon: CheckCircle },
    { id: 'financements', label: 'Financements', icon: CreditCard },
  ];

  // Position trésorerie temps réel
  const positionTresorerie = {
    soldeTotal: 2456700,
    soldeDisponible: 1890400,
    soldeBloque: 566300,
    evolution24h: +234500,
    comptes: [
      { nom: 'SGBC Douala', solde: 1234500, iban: 'CM21...4567', status: 'actif' },
      { nom: 'BOA Yaoundé', solde: 890200, iban: 'CM21...8901', status: 'actif' },
      { nom: 'UBA Garoua', solde: 332000, iban: 'CM21...2345', status: 'actif' }
    ]
  };

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header trésorerie */}
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#B87333] to-[#A86323] flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Centre de Trésorerie</h1>
                <p className="text-sm text-[#767676]">Gestion financière temps réel</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-[var(--color-success-lighter)] text-[var(--color-success-darker)] px-3 py-1 rounded-full text-sm">
              <div className="w-2 h-2 bg-[var(--color-success)] rounded-full animate-pulse"></div>
              <span>Temps réel</span>
            </div>
            
            <button 
              onClick={() => navigate('/executive')}
              className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors flex items-center space-x-2"
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
                      ? 'border-[#B87333] text-[#B87333]' 
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
          {activeTab === 'position' && (
            <div className="space-y-6">
              {/* Position consolidée */}
              <div className="bg-gradient-to-r from-[#B87333]/10 to-[#6A8A82]/10 rounded-lg p-6 border-2 border-[#B87333]/20">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <h3 className="font-semibold text-[#B87333] mb-2">Solde Total</h3>
                    <p className="text-3xl font-bold text-[#191919]">
                      {(positionTresorerie.soldeTotal / 1000000).toFixed(2)}M€
                    </p>
                    <div className={`text-sm flex items-center justify-center space-x-1 mt-1 ${
                      positionTresorerie.evolution24h > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                    }`}>
                      {positionTresorerie.evolution24h > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      <span>+{(positionTresorerie.evolution24h / 1000).toFixed(0)}K€ (24h)</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="font-semibold text-[#6A8A82] mb-2">Disponible</h3>
                    <p className="text-3xl font-bold text-[#6A8A82]">
                      {(positionTresorerie.soldeDisponible / 1000000).toFixed(2)}M€
                    </p>
                    <p className="text-sm text-[#767676] mt-1">77% du total</p>
                  </div>

                  <div className="text-center">
                    <h3 className="font-semibold text-[#7A99AC] mb-2">Bloqué</h3>
                    <p className="text-3xl font-bold text-[#7A99AC]">
                      {(positionTresorerie.soldeBloque / 1000).toFixed(0)}K€
                    </p>
                    <p className="text-sm text-[#767676] mt-1">Garanties/Cautions</p>
                  </div>

                  <div className="text-center">
                    <h3 className="font-semibold text-[#B87333] mb-2">Prévision 30j</h3>
                    <p className="text-3xl font-bold text-[#B87333]">+340K€</p>
                    <p className="text-sm text-[var(--color-success)] mt-1">Flux positif</p>
                  </div>
                </div>
              </div>

              {/* Comptes bancaires - Cards compactes */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="font-semibold text-[#191919] mb-4">🏦 Comptes Bancaires</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {positionTresorerie.comptes.map((compte, index) => (
                    <div key={index} className="p-4 rounded-lg border border-[#E8E8E8] hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Banknote className="w-5 h-5 text-[#B87333]" />
                          <span className="font-medium text-[#191919] text-sm">{compte.nom}</span>
                        </div>
                        <div className="w-2 h-2 bg-[var(--color-success)] rounded-full"></div>
                      </div>
                      <p className="text-xl font-bold text-[#B87333] mb-1">
                        {compte.solde.toLocaleString()}€
                      </p>
                      <p className="text-xs text-[#767676] font-mono">{compte.iban}</p>
                      <div className="mt-2 text-xs text-[#B87333]">Consulter →</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions trésorerie */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="font-semibold text-[#191919] mb-4">⚡ Actions Rapides</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Virement', icon: ArrowUpRight, path: '/treasury/payments', color: '#B87333' },
                    { label: 'Appel de fonds', icon: Target, path: '/treasury/fund-calls', color: '#6A8A82' },
                    { label: 'Rapprochement', icon: CheckCircle, path: '/treasury/reconciliation', color: '#7A99AC' },
                    { label: 'Position détaillée', icon: Eye, path: '/treasury/position', color: '#B87333' }
                  ].map((action, index) => {
                    const IconComponent = action.icon;
                    return (
                      <button 
                        key={index}
                        onClick={() => navigate(action.path)}
                        className="p-3 rounded-lg border-2 border-dashed border-[#D9D9D9] hover:border-[#B87333] hover:bg-[#B87333]/5 transition-colors group"
                      >
                        <div className="text-center">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-opacity-30 transition-colors"
                            style={{backgroundColor: `${action.color}20`}}
                          >
                            <IconComponent className="w-4 h-4" style={{color: action.color}} />
                          </div>
                          <span className="text-xs font-medium text-[#444444]">{action.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'previsions' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Prévisions court terme */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📈 Prévisions 30 jours</h3>
                  <div className="space-y-3">
                    {[
                      { periode: 'Semaine 1', entrees: 450000, sorties: 280000, solde: +170000 },
                      { periode: 'Semaine 2', entrees: 380000, sorties: 420000, solde: -40000 },
                      { periode: 'Semaine 3', entrees: 520000, sorties: 310000, solde: +210000 },
                      { periode: 'Semaine 4', entrees: 290000, sorties: 340000, solde: -50000 }
                    ].map((prev, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background-secondary)]">
                        <span className="text-sm font-medium text-[#444444]">{prev.periode}</span>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-[var(--color-success)]">+{(prev.entrees / 1000).toFixed(0)}K€</span>
                          <span className="text-[var(--color-error)]">-{(prev.sorties / 1000).toFixed(0)}K€</span>
                          <span className={`font-bold ${prev.solde > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                            {prev.solde > 0 ? '+' : ''}{(prev.solde / 1000).toFixed(0)}K€
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alertes trésorerie */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">🚨 Alertes Trésorerie</h3>
                  <div className="space-y-3">
                    {[
                      { type: 'success', message: 'Position consolidée positive', action: 'Voir détails' },
                      { type: 'warning', message: 'Échéance importante S+2', action: 'Planifier' },
                      { type: 'info', message: 'Opportunité placement court terme', action: 'Analyser' }
                    ].map((alerte, index) => (
                      <div key={index} className={`p-3 rounded-lg border-l-4 ${
                        alerte.type === 'success' ? 'bg-[var(--color-success-lightest)] border-green-400' :
                        alerte.type === 'warning' ? 'bg-[var(--color-warning-lightest)] border-yellow-400' :
                        'bg-[#6A8A82]/5 border-[#6A8A82]'
                      }`}>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-[#444444] flex-1">{alerte.message}</p>
                          <button className={`text-xs font-medium ${
                            alerte.type === 'success' ? 'text-[var(--color-success-dark)]' :
                            alerte.type === 'warning' ? 'text-[var(--color-warning-dark)]' : 'text-[#6A8A82]'
                          }`}>
                            {alerte.action} →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mouvements' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-[#E8E8E8]">
                <div className="p-4 border-b border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#191919]">Mouvements du Jour</h3>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 border border-[#D9D9D9] rounded-lg hover:bg-[var(--color-background-secondary)]" aria-label="Filtrer">
                        <Filter className="w-4 h-4 text-[#767676]" />
                      </button>
                      <button 
                        onClick={() => navigate('/treasury/bank-movements')}
                        className="px-3 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors text-sm"
                      >
                        Historique complet
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="space-y-2">
                    {[
                      { heure: '14:30', operation: 'Virement reçu ABC Corp', montant: +125000, compte: 'SGBC' },
                      { heure: '11:15', operation: 'Paiement fournisseur XYZ', montant: -45000, compte: 'BOA' },
                      { heure: '09:45', operation: 'Encaissement chèque', montant: +67500, compte: 'UBA' },
                      { heure: '08:30', operation: 'Prélèvement charges sociales', montant: -23400, compte: 'SGBC' }
                    ].map((mvt, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-hover)] transition-colors">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-mono text-[#767676] w-12">{mvt.heure}</span>
                          <div>
                            <p className="text-sm text-[#444444]">{mvt.operation}</p>
                            <p className="text-xs text-[#767676]">{mvt.compte}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-bold ${
                            mvt.montant > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                          }`}>
                            {mvt.montant > 0 ? '+' : ''}{mvt.montant.toLocaleString()}€
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comptes' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {positionTresorerie.comptes.map((compte, index) => (
                  <div key={index} className="bg-white rounded-lg p-6 border border-[#E8E8E8] hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-5 h-5 text-[#B87333]" />
                        <span className="font-semibold text-[#191919]">{compte.nom}</span>
                      </div>
                      <div className="w-3 h-3 bg-[var(--color-success)] rounded-full"></div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-[#767676]">Solde actuel</p>
                        <p className="text-2xl font-bold text-[#B87333]">
                          {compte.solde.toLocaleString()}€
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-[#767676]">IBAN</p>
                        <p className="text-xs font-mono text-[#444444]">{compte.iban}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2 pt-2">
                        <button 
                          onClick={() => navigate('/treasury/bank-accounts')}
                          className="flex-1 px-3 py-2 border border-[#B87333] text-[#B87333] rounded-lg hover:bg-[#B87333]/5 transition-colors text-sm"
                        >
                          Gérer
                        </button>
                        <button 
                          onClick={() => navigate('/treasury/bank-movements')}
                          className="flex-1 px-3 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors text-sm"
                        >
                          Mouvements
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernTreasuryDashboardV2;