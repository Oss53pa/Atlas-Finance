/**
 * PAGE PERSONNALISATION WORKSPACE
 *
 * Permet à l'utilisateur de personnaliser son workspace:
 * - Masquer/Afficher widgets
 * - Réorganiser widgets (drag & drop)
 * - Modifier préférences d'affichage
 */

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Eye,
  EyeOff,
  Grid,
  Save,
  RotateCcw,
  ArrowLeft,
  GripVertical,
  Loader
} from 'lucide-react';
import { WorkspaceDashboard, WorkspaceWidget, WorkspaceCustomization as CustomizationType } from '../../types/workspace.types';

const WorkspaceCustomization: React.FC = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État local pour la personnalisation
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [widgets, setWidgets] = useState<WorkspaceWidget[]>([]);

  // Drag & Drop state
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mode local — workspace par défaut
      const dashboardData: WorkspaceDashboard = {
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
      };
      setDashboard(dashboardData);
      setWidgets(dashboardData.widgets || []);

      // Charger les préférences existantes
      if (dashboardData.user_preferences) {
        setHiddenWidgets(dashboardData.user_preferences.hidden_widgets || []);
        setShowWelcome(dashboardData.user_preferences.show_welcome_message ?? true);
        setCompactMode(dashboardData.user_preferences.compact_mode ?? false);
      }
    } catch (err: unknown) {
      console.error('Erreur chargement dashboard:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    setHiddenWidgets(prev => {
      if (prev.includes(widgetId)) {
        return prev.filter(id => id !== widgetId);
      } else {
        return [...prev, widgetId];
      }
    });
  };

  const handleDragStart = (widgetId: string) => {
    setDraggedWidget(widgetId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetWidgetId: string) => {
    if (!draggedWidget || draggedWidget === targetWidgetId) return;

    const draggedIndex = widgets.findIndex(w => w.id === draggedWidget);
    const targetIndex = widgets.findIndex(w => w.id === targetWidgetId);

    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, removed);

    setWidgets(newWidgets);
    setDraggedWidget(null);
  };

  const handleSave = async () => {
    if (!dashboard?.workspace) return;

    try {
      setSaving(true);

      const customization: CustomizationType = {
        hidden_widgets: hiddenWidgets,
        show_welcome_message: showWelcome,
        compact_mode: compactMode,
        custom_widget_order: widgets.reduce((acc, widget, index) => {
          acc[widget.id] = index;
          return acc;
        }, {} as Record<string, number>),
      };

      // Mode local — no-op (pas de backend)
      void customization;

      // Succès
      toast.success('Personnalisation enregistrée avec succès!');
      navigate('/workspace');
    } catch (err: unknown) {
      console.error('Erreur sauvegarde:', err);
      toast.error(`Erreur: ${err instanceof Error ? err.message : 'Impossible de sauvegarder'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!dashboard?.workspace) return;
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser votre personnalisation?')) return;

    try {
      setSaving(true);
      // Mode local — no-op (pas de backend)

      // Recharger
      await loadDashboard();
      toast.success('Personnalisation réinitialisée!');
    } catch (err: unknown) {
      console.error('Erreur reset:', err);
      toast.error(`Erreur: ${err instanceof Error ? err.message : 'Impossible de réinitialiser'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#fafafa' }}>
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4" size={48} style={{ color: '#737373' }} />
          <p className="text-lg" style={{ color: '#404040' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#fafafa' }}>
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#404040' }}>Erreur</h2>
          <p className="mb-4" style={{ color: '#737373' }}>{error || 'Impossible de charger'}</p>
          <button
            onClick={() => navigate('/workspace')}
            className="px-6 py-2 rounded-lg font-semibold"
            style={{ backgroundColor: '#404040', color: '#FFFFFF' }}
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fafafa' }}>
      {/* Header */}
      <div className="bg-white border-b" style={{ borderColor: '#e5e5e5' }}>
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/workspace')}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft size={24} style={{ color: '#404040' }} />
              </button>
              <div>
                <h1 className="text-lg font-bold" style={{ color: '#404040' }}>
                  <Settings size={32} className="inline mr-2" />
                  Personnaliser mon Workspace
                </h1>
                <p style={{ color: '#737373' }}>
                  {dashboard.workspace.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                disabled={saving}
                className="px-4 py-2 rounded-lg border flex items-center gap-2 hover:opacity-80"
                style={{ borderColor: '#e5e5e5', color: '#ef4444' }}
              >
                <RotateCcw size={18} />
                Réinitialiser
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 rounded-lg flex items-center gap-2 hover:opacity-90"
                style={{ backgroundColor: '#404040', color: '#FFFFFF' }}
              >
                {saving ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Préférences d'affichage */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8" style={{ borderColor: '#e5e5e5' }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: '#404040' }}>
            Préférences d'Affichage
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#fafafa' }}>
              <div>
                <div className="font-semibold" style={{ color: '#404040' }}>
                  Message de bienvenue
                </div>
                <div className="text-sm" style={{ color: '#737373' }}>
                  Afficher le message de bienvenue au chargement
                </div>
              </div>
              <button
                onClick={() => setShowWelcome(!showWelcome)}
                className={`w-14 h-8 rounded-full transition-colors ${
                  showWelcome ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                    showWelcome ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#fafafa' }}>
              <div>
                <div className="font-semibold" style={{ color: '#404040' }}>
                  Mode compact
                </div>
                <div className="text-sm" style={{ color: '#737373' }}>
                  Affichage condensé pour plus de widgets
                </div>
              </div>
              <button
                onClick={() => setCompactMode(!compactMode)}
                className={`w-14 h-8 rounded-full transition-colors ${
                  compactMode ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                    compactMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Gestion des Widgets */}
        <div className="bg-white p-6 rounded-xl shadow-sm" style={{ borderColor: '#e5e5e5' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{ color: '#404040' }}>
              <Grid size={24} className="inline mr-2" />
              Widgets
            </h2>
            <p className="text-sm" style={{ color: '#737373' }}>
              Glissez-déposez pour réorganiser • Cliquez sur l'œil pour masquer
            </p>
          </div>

          <div className="space-y-3">
            {widgets.map((widget) => {
              const isHidden = hiddenWidgets.includes(widget.id);
              const isRequired = widget.is_required;

              return (
                <div
                  key={widget.id}
                  draggable={!isRequired}
                  onDragStart={() => handleDragStart(widget.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(widget.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    draggedWidget === widget.id ? 'opacity-50' : ''
                  } ${isHidden ? 'opacity-50' : ''} ${
                    isRequired ? 'cursor-not-allowed' : 'cursor-move hover:shadow-md'
                  }`}
                  style={{ borderColor: isHidden ? '#e5e5e5' : widget.color }}
                >
                  <div className="flex items-center gap-4">
                    {!isRequired && (
                      <GripVertical size={20} style={{ color: '#737373' }} />
                    )}

                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: widget.color + '20', color: widget.color }}
                    >
                      <Grid size={24} />
                    </div>

                    <div className="flex-1">
                      <div className="font-semibold" style={{ color: '#404040' }}>
                        {widget.title}
                      </div>
                      {widget.description && (
                        <div className="text-sm" style={{ color: '#737373' }}>
                          {widget.description}
                        </div>
                      )}
                      {isRequired && (
                        <div className="text-xs text-red-500 mt-1">
                          ⚠️ Widget obligatoire
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: '#fafafa', color: '#737373' }}>
                        {widget.widget_type}
                      </span>

                      {!isRequired && (
                        <button
                          onClick={() => toggleWidgetVisibility(widget.id)}
                          className="p-2 rounded-lg hover:bg-gray-100"
                          title={isHidden ? 'Afficher' : 'Masquer'}
                        >
                          {isHidden ? (
                            <EyeOff size={20} style={{ color: '#ef4444' }} />
                          ) : (
                            <Eye size={20} style={{ color: '#22c55e' }} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {widgets.length === 0 && (
            <div className="text-center py-12" style={{ color: '#737373' }}>
              <Grid size={48} className="mx-auto mb-4 opacity-30" />
              <p>Aucun widget disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceCustomization;
