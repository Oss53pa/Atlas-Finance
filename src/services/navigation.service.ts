/**
 * Service Navigation Atlas Finance
 * Gestion de la navigation dynamique et des menus
 *
 * Fonctionnalités:
 * - Menu principal hiérarchique
 * - Breadcrumb (fil d'Ariane)
 * - Accès rapides personnalisables
 * - Recherche globale
 * - Navigation contextuelle
 * - Permissions par module
 *
 * Architecture: Standard apiService + BASE_PATH
 * Backend: apps/navigation/urls.py (APIs dynamiques)
 *
 * @module services/navigation
 * @version 4.1.0
 * @date 2025-10-19
 */

import { apiService } from './api';

const BASE_PATH = '/api/v1/navigation';

// ============================================================================
// INTERFACES TYPESCRIPT
// ============================================================================

/**
 * Item de menu
 */
export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  external?: boolean;

  // Hiérarchie
  parent_id?: string;
  children?: MenuItem[];
  level: number;
  order: number;

  // Permissions
  required_permission?: string;
  required_role?: string;
  is_visible: boolean;
  is_enabled: boolean;

  // Badge/Notification
  badge?: {
    count: number;
    type: 'info' | 'warning' | 'danger' | 'success';
  };

  // Métadonnées
  description?: string;
  tags?: string[];
  category?: string;
}

/**
 * Menu complet
 */
export interface NavigationMenu {
  workspace_id: string;
  workspace_name: string;

  // Sections principales
  sections: Array<{
    id: string;
    label: string;
    icon?: string;
    items: MenuItem[];
  }>;

  // Métadonnées
  user_permissions: string[];
  user_role: string;
  last_updated: string;
}

/**
 * Breadcrumb (Fil d'Ariane)
 */
export interface Breadcrumb {
  items: Array<{
    label: string;
    path?: string;
    is_current: boolean;
  }>;
  current_page: string;
}

/**
 * Accès rapide
 */
export interface QuickAccess {
  id: string;
  label: string;
  icon?: string;
  path: string;
  description?: string;

  // Fréquence d'utilisation
  usage_count: number;
  last_accessed?: string;

  // Personnalisation
  is_pinned: boolean;
  is_favorite: boolean;
  custom_order?: number;
}

/**
 * Résultat de recherche globale
 */
export interface SearchResult {
  id: string;
  type: 'page' | 'document' | 'transaction' | 'client' | 'fournisseur' | 'autre';
  title: string;
  description?: string;
  path: string;

  // Pertinence
  relevance_score: number;

  // Contexte
  module?: string;
  icon?: string;
  preview?: string;

  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

/**
 * Résultat de recherche globale complet
 */
export interface GlobalSearchResult {
  query: string;
  total_results: number;
  results: SearchResult[];

  // Par catégorie
  by_category: {
    pages: number;
    documents: number;
    transactions: number;
    clients: number;
    fournisseurs: number;
    autres: number;
  };

  search_time_ms: number;
}

/**
 * Navigation contextuelle
 */
export interface ContextualNavigation {
  current_module: string;
  current_path: string;

  // Navigation suggérée
  suggested_pages: Array<{
    label: string;
    path: string;
    reason: 'related' | 'frequently_used' | 'workflow_next';
  }>;

  // Actions rapides contextuelles
  quick_actions: Array<{
    label: string;
    action: string;
    icon?: string;
  }>;
}

/**
 * Historique de navigation
 */
export interface NavigationHistory {
  items: Array<{
    path: string;
    title: string;
    visited_at: string;
    duration_seconds?: number;
  }>;
  total_count: number;
}

/**
 * Statistiques de navigation
 */
export interface NavigationStats {
  most_visited: Array<{
    path: string;
    title: string;
    visit_count: number;
  }>;

  by_module: Array<{
    module: string;
    visit_count: number;
    avg_time_seconds: number;
  }>;

  recent_searches: string[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class NavigationService {

  // ==========================================================================
  // SECTION 1: MENU PRINCIPAL
  // ==========================================================================

  /**
   * Récupère le menu de navigation complet
   */
  async getMenu(params?: {
    workspace_id?: string;
    include_disabled?: boolean;
  }): Promise<NavigationMenu> {
    const response = await apiService.get(`${BASE_PATH}/api/navigation/menu/`, { params });
    return response.data;
  }

  /**
   * Rafraîchit le menu (force reload)
   */
  async refreshMenu(): Promise<NavigationMenu> {
    const response = await apiService.post(`${BASE_PATH}/api/navigation/menu/refresh/`);
    return response.data;
  }

  // ==========================================================================
  // SECTION 2: BREADCRUMB (FIL D'ARIANE)
  // ==========================================================================

  /**
   * Récupère le breadcrumb pour un chemin
   */
  async getBreadcrumb(path: string): Promise<Breadcrumb> {
    const response = await apiService.get(`${BASE_PATH}/api/navigation/breadcrumb/`, {
      params: { path },
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 3: ACCÈS RAPIDES
  // ==========================================================================

  /**
   * Récupère les accès rapides de l'utilisateur
   */
  async getQuickAccess(): Promise<QuickAccess[]> {
    const response = await apiService.get(`${BASE_PATH}/api/navigation/quick-access/`);
    return response.data;
  }

  /**
   * Ajoute un accès rapide
   */
  async addQuickAccess(data: {
    label: string;
    path: string;
    icon?: string;
    description?: string;
  }): Promise<QuickAccess> {
    const response = await apiService.post(`${BASE_PATH}/api/navigation/quick-access/`, data);
    return response.data;
  }

  /**
   * Met à jour un accès rapide
   */
  async updateQuickAccess(id: string, data: Partial<QuickAccess>): Promise<QuickAccess> {
    const response = await apiService.patch(`${BASE_PATH}/api/navigation/quick-access/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un accès rapide
   */
  async deleteQuickAccess(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/api/navigation/quick-access/${id}/`);
  }

  /**
   * Épingle/désépingle un accès rapide
   */
  async togglePin(id: string): Promise<QuickAccess> {
    const response = await apiService.post(`${BASE_PATH}/api/navigation/quick-access/${id}/toggle-pin/`);
    return response.data;
  }

  /**
   * Ajoute aux favoris
   */
  async toggleFavorite(id: string): Promise<QuickAccess> {
    const response = await apiService.post(`${BASE_PATH}/api/navigation/quick-access/${id}/toggle-favorite/`);
    return response.data;
  }

  /**
   * Réorganise les accès rapides
   */
  async reorderQuickAccess(orderedIds: string[]): Promise<QuickAccess[]> {
    const response = await apiService.post(`${BASE_PATH}/api/navigation/quick-access/reorder/`, {
      ordered_ids: orderedIds,
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 4: RECHERCHE GLOBALE
  // ==========================================================================

  /**
   * Recherche globale
   */
  async search(params: {
    query: string;
    types?: ('page' | 'document' | 'transaction' | 'client' | 'fournisseur')[];
    modules?: string[];
    limit?: number;
  }): Promise<GlobalSearchResult> {
    const response = await apiService.get(`${BASE_PATH}/api/navigation/search/`, { params });
    return response.data;
  }

  /**
   * Suggestions de recherche (autocomplétion)
   */
  async searchSuggestions(query: string): Promise<string[]> {
    const response = await apiService.get(`${BASE_PATH}/api/navigation/search/suggestions/`, {
      params: { query },
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 5: NAVIGATION CONTEXTUELLE
  // ==========================================================================

  /**
   * Récupère la navigation contextuelle
   */
  async getContextualNavigation(params: {
    module: string;
    current_path: string;
  }): Promise<ContextualNavigation> {
    const response = await apiService.get(`${BASE_PATH}/api/navigation/contextual/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 6: HISTORIQUE & STATISTIQUES
  // ==========================================================================

  /**
   * Enregistre une visite de page
   */
  async recordVisit(params: {
    path: string;
    title: string;
  }): Promise<void> {
    await apiService.post(`${BASE_PATH}/api/navigation/record-visit/`, params);
  }

  /**
   * Récupère l'historique de navigation
   */
  async getHistory(params?: {
    limit?: number;
    date_debut?: string;
    date_fin?: string;
  }): Promise<NavigationHistory> {
    const response = await apiService.get(`${BASE_PATH}/api/navigation/history/`, { params });
    return response.data;
  }

  /**
   * Efface l'historique
   */
  async clearHistory(): Promise<void> {
    await apiService.delete(`${BASE_PATH}/api/navigation/history/`);
  }

  /**
   * Récupère les statistiques de navigation
   */
  async getStats(params?: {
    periode?: 'week' | 'month' | 'year';
  }): Promise<NavigationStats> {
    const response = await apiService.get(`${BASE_PATH}/api/navigation/stats/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 7: MÉTHODES HELPERS
  // ==========================================================================

  /**
   * Construit un chemin de breadcrumb
   */
  buildBreadcrumbPath(items: Breadcrumb['items']): string {
    return items.map(item => item.label).join(' > ');
  }

  /**
   * Trouve un menu item par path
   */
  findMenuItemByPath(menu: NavigationMenu, path: string): MenuItem | undefined {
    const searchInItems = (items: MenuItem[]): MenuItem | undefined => {
      for (const item of items) {
        if (item.path === path) return item;
        if (item.children) {
          const found = searchInItems(item.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    for (const section of menu.sections) {
      const found = searchInItems(section.items);
      if (found) return found;
    }

    return undefined;
  }

  /**
   * Filtre le menu selon les permissions
   */
  filterMenuByPermissions(menu: NavigationMenu, userPermissions: string[]): NavigationMenu {
    const filterItems = (items: MenuItem[]): MenuItem[] => {
      return items.filter(item => {
        if (item.required_permission && !userPermissions.includes(item.required_permission)) {
          return false;
        }
        if (item.children) {
          item.children = filterItems(item.children);
        }
        return item.is_visible;
      });
    };

    return {
      ...menu,
      sections: menu.sections.map(section => ({
        ...section,
        items: filterItems(section.items),
      })),
    };
  }

  /**
   * Compte le nombre total d'items dans le menu
   */
  countMenuItems(menu: NavigationMenu): number {
    const countItems = (items: MenuItem[]): number => {
      return items.reduce((count, item) => {
        return count + 1 + (item.children ? countItems(item.children) : 0);
      }, 0);
    };

    return menu.sections.reduce((count, section) => {
      return count + countItems(section.items);
    }, 0);
  }

  /**
   * Détermine l'icône selon le type de résultat
   */
  getResultIcon(type: string): string {
    const icons: Record<string, string> = {
      'page': '📄',
      'document': '📁',
      'transaction': '💰',
      'client': '👤',
      'fournisseur': '🏢',
      'autre': '📋',
    };
    return icons[type] || '📋';
  }

  /**
   * Formate un score de pertinence
   */
  formatRelevanceScore(score: number): string {
    return `${(score * 100).toFixed(0)}%`;
  }

  /**
   * Détermine si un chemin est actif
   */
  isPathActive(currentPath: string, itemPath: string): boolean {
    return currentPath.startsWith(itemPath);
  }

  /**
   * Génère un ID unique pour un item de menu
   */
  generateMenuItemId(label: string, level: number): string {
    return `menu-${level}-${label.toLowerCase().replace(/\s+/g, '-')}`;
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const navigationService = new NavigationService();
export default navigationService;
