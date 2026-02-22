/**
 * PAGE WORKSPACE DASHBOARD - Intégration complète avec API Backend
 *
 * Cette page charge dynamiquement le workspace de l'utilisateur
 * et affiche tous les widgets, statistiques et actions rapides
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/formatters';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Settings,
  RefreshCw,
  Grid,
  Zap,
  Bell,
  Activity,
  AlertCircle,
  Loader
} from 'lucide-react';
import { WorkspaceDashboard as WorkspaceDashboardType } from '../../types/workspace.types';

const WorkspaceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<WorkspaceDashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mode local — workspace par défaut
      setDashboard({
        workspace: {
          id: 'default',
          role: 'comptable',
          role_display: 'Comptable',
          name: 'Espace Comptable',
          description: 'Tableau de bord comptable',
          icon: 'Calculator',
          color: '#171717',
          is_active: true,
          order: 1,
          widget_count: 0,
          action_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        statistics: [],
        widgets: [],
        quick_actions: [],
        pending_tasks: 0,
      });
    } catch (err: any) {
      console.error('Erreur chargement workspace:', err);
      setError(err?.message || 'Erreur lors du chargement du workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handleQuickAction = (action: any) => {
    switch (action.action_type) {
      case 'navigate':
        navigate(action.action_target);
        break;
      case 'external':
        window.open(action.action_target, '_blank');
        break;
      case 'modal':
        // TODO: Implémenter la gestion des modals
        break;
      case 'api_call':
        // TODO: Implémenter les appels API
        break;
      default:
    }
  };

  const getTrendIcon = (direction?: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp size={16} className="text-green-500" />;
      case 'down':
        return <TrendingDown size={16} className="text-red-500" />;
      default:
        return <Minus size={16} className="text-gray-400" />;
    }
  };

  const formatValue = (value: string, type: string) => {
    switch (type) {
      case 'currency':
        return formatCurrency(parseFloat(value));
      case 'percentage':
        return `${value}%`;
      default:
        return value;
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#fafafa' }}>
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4" size={48} style={{ color: '#737373' }} />
          <p className="text-lg" style={{ color: '#404040' }}>Chargement de votre workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#fafafa' }}>
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-lg font-bold mb-2" style={{ color: '#404040' }}>Erreur</h2>
          <p className="mb-4" style={{ color: '#737373' }}>{error || 'Impossible de charger le workspace'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 rounded-lg font-semibold"
            style={{ backgroundColor: '#404040', color: '#FFFFFF' }}
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  const { workspace, statistics, widgets, quick_actions, user_preferences } = dashboard;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fafafa' }}>
      {/* Header */}
      <div className="bg-white border-b" style={{ borderColor: '#e5e5e5' }}>
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: workspace.color }}
              >
                <Briefcase size={32} style={{ color: '#FFFFFF' }} />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: '#404040' }}>
                  {workspace.name}
                </h1>
                <p style={{ color: '#737373' }}>{workspace.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 rounded-lg border flex items-center gap-2 hover:opacity-80 transition-opacity"
                style={{ borderColor: '#e5e5e5', color: '#404040' }}
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                Actualiser
              </button>
              <button
                onClick={() => navigate('/settings/workspace')}
                className="px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#404040', color: '#FFFFFF' }}
              >
                <Settings size={18} />
                Personnaliser
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Statistiques principales */}
        {statistics && statistics.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#404040' }}>
              Statistiques clés
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statistics.map((stat) => (
                <div
                  key={stat.id}
                  className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow"
                  style={{ borderColor: '#e5e5e5' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: '#737373' }}>
                      {stat.stat_label}
                    </span>
                    {getTrendIcon(stat.trend_direction)}
                  </div>
                  <div className="text-lg font-bold mb-1" style={{ color: '#404040' }}>
                    {formatValue(stat.stat_value, stat.stat_type)}
                  </div>
                  {stat.trend !== null && stat.trend !== undefined && (
                    <div className="text-sm">
                      <span
                        className={
                          stat.trend_direction === 'up'
                            ? 'text-green-600'
                            : stat.trend_direction === 'down'
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }
                      >
                        {stat.trend > 0 ? '+' : ''}
                        {stat.trend}%
                      </span>
                      <span style={{ color: '#737373' }}> vs période précédente</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions rapides */}
        {quick_actions && quick_actions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#404040' }}>
              Actions rapides
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quick_actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  className="bg-white p-5 rounded-xl border text-left hover:shadow-md transition-all group"
                  style={{ borderColor: '#e5e5e5' }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: action.color + '20', color: action.color }}
                    >
                      <Zap size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold" style={{ color: '#404040' }}>
                        {action.label}
                      </div>
                      {action.description && (
                        <div className="text-sm" style={{ color: '#737373' }}>
                          {action.description}
                        </div>
                      )}
                    </div>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" style={{ color: '#737373' }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Widgets */}
        {widgets && widgets.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#404040' }}>
              <Grid size={24} className="inline mr-2" />
              Widgets personnalisés
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow"
                  style={{
                    borderColor: '#e5e5e5',
                    gridColumn: `span ${widget.width}`,
                    gridRow: `span ${widget.height}`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: widget.color + '20', color: widget.color }}
                    >
                      <Activity size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold" style={{ color: '#404040' }}>
                        {widget.title}
                      </h3>
                      {widget.description && (
                        <p className="text-sm" style={{ color: '#737373' }}>
                          {widget.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-center py-8" style={{ color: '#737373' }}>
                    <Activity size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Widget {widget.widget_type}</p>
                    <p className="text-xs">Configuration à implémenter</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message si aucun contenu */}
        {(!statistics || statistics.length === 0) &&
          (!widgets || widgets.length === 0) &&
          (!quick_actions || quick_actions.length === 0) && (
            <div className="text-center py-16 bg-white rounded-xl" style={{ borderColor: '#e5e5e5' }}>
              <Bell size={48} className="mx-auto mb-4 opacity-30" style={{ color: '#737373' }} />
              <h3 className="text-lg font-bold mb-2" style={{ color: '#404040' }}>
                Workspace vide
              </h3>
              <p className="mb-6" style={{ color: '#737373' }}>
                Aucun contenu disponible pour ce workspace
              </p>
              <button
                onClick={() => navigate('/settings/workspace')}
                className="px-6 py-3 rounded-lg font-semibold"
                style={{ backgroundColor: '#404040', color: '#FFFFFF' }}
              >
                Configurer votre workspace
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default WorkspaceDashboard;
