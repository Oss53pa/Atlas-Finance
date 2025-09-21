import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, Users, FileText, DollarSign, Clock, CheckCircle,
  ArrowLeft, Home, Plus, TrendingUp, Calculator, Building2,
  Target, Activity, PieChart, Eye, ArrowUpRight
} from 'lucide-react';

const ModernDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header Vue d'ensemble */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Workspaces</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Vue d'Ensemble - WiseBook</h1>
                <p className="text-sm text-[#767676]">Accès rapide à tous les modules</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/executive')}
              className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors flex items-center space-x-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Tableau Exécutif</span>
            </button>
          </div>
        </div>
      </div>

      {/* DASHBOARD DE SYNTHÈSE AVEC KPIs UNIQUEMENT */}
      <div className="space-y-6">
        {/* KPIs globaux de synthèse */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { 
              titre: 'Activité Comptable', 
              valeur: '2,547', 
              evolution: '+12%',
              description: 'Écritures ce mois',
              color: '#6A8A82', 
              icon: FileText 
            },
            { 
              titre: 'Position Trésorerie', 
              valeur: '2.4M€', 
              evolution: '+8.5%',
              description: 'Solde consolidé',
              color: '#B87333', 
              icon: DollarSign 
            },
            { 
              titre: 'Performance Globale', 
              valeur: '94%', 
              evolution: '+2.1%',
              description: 'Conformité SYSCOHADA',
              color: '#7A99AC', 
              icon: Target 
            },
            { 
              titre: 'Utilisateurs Actifs', 
              valeur: '24', 
              evolution: '+3',
              description: 'Connectés aujourd\'hui',
              color: '#6A8A82', 
              icon: Users 
            }
          ].map((kpi, index) => {
            const IconComponent = kpi.icon;
            return (
              <div key={index} className="bg-white rounded-lg p-4 border border-[#E8E8E8] hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{backgroundColor: `${kpi.color}20`}}
                  >
                    <IconComponent className="w-6 h-6" style={{color: kpi.color}} />
                  </div>
                  <span className="text-xs font-medium text-green-600">{kpi.evolution}</span>
                </div>
                <h3 className="text-2xl font-bold text-[#191919] mb-1">{kpi.valeur}</h3>
                <p className="text-sm font-medium text-[#444444] mb-1">{kpi.titre}</p>
                <p className="text-xs text-[#767676]">{kpi.description}</p>
              </div>
            );
          })}
        </div>


        {/* Activité récente du système */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="font-semibold text-[#191919] mb-4">📈 Activité Récente</h3>
            <div className="space-y-3">
              {[
                { module: 'Comptabilité', action: '47 écritures saisies', temps: '2h', color: '#6A8A82' },
                { module: 'Trésorerie', action: 'Position mise à jour', temps: '1h', color: '#B87333' },
                { module: 'Clients', action: '3 nouveaux clients', temps: '3h', color: '#7A99AC' },
                { module: 'États', action: 'Balance générée', temps: '4h', color: '#6A8A82' }
              ].map((activite, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: activite.color}}></div>
                    <div>
                      <p className="text-sm font-medium text-[#191919]">{activite.module}</p>
                      <p className="text-xs text-[#767676]">{activite.action}</p>
                    </div>
                  </div>
                  <span className="text-xs text-[#767676]">Il y a {activite.temps}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="font-semibold text-[#191919] mb-4">🎯 Tâches Prioritaires</h3>
            <div className="space-y-2">
              {[
                { tache: 'Valider 8 écritures en attente', module: 'Comptabilité', priorite: 'haute', path: '/accounting/entries' },
                { tache: 'Finaliser clôture septembre', module: 'Clôtures', priorite: 'haute', path: '/closures' },
                { tache: 'Relancer 12 clients en retard', module: 'Clients', priorite: 'moyenne', path: '/customers/recovery' },
                { tache: 'Mettre à jour prévisions', module: 'Trésorerie', priorite: 'basse', path: '/treasury/cash-flow' }
              ].map((tache, index) => (
                <button 
                  key={index}
                  onClick={() => navigate(tache.path)}
                  className={`w-full p-3 text-left rounded-lg border-l-4 hover:shadow-md transition-all ${
                    tache.priorite === 'haute' ? 'bg-red-50 border-red-400' :
                    tache.priorite === 'moyenne' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-blue-50 border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#191919]">{tache.tache}</p>
                      <p className="text-xs text-[#767676]">{tache.module}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      tache.priorite === 'haute' ? 'bg-red-100 text-red-700' :
                      tache.priorite === 'moyenne' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {tache.priorite}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ModernDashboardPage;