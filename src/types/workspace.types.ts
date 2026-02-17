/**
 * TYPES TYPESCRIPT - MODULE WORKSPACES
 *
 * Types pour les espaces de travail personnalisés par rôle
 */

export type WorkspaceRole = 'admin' | 'manager' | 'comptable' | 'controller' | 'viewer';

export type WidgetType = 'stat' | 'chart' | 'list' | 'action' | 'link' | 'notification';

export type StatType = 'number' | 'currency' | 'percentage' | 'text';

export type TrendDirection = 'up' | 'down' | 'stable';

export type ActionType = 'navigate' | 'modal' | 'api_call' | 'external';

export interface Workspace {
  id: string;
  role: WorkspaceRole;
  role_display: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  order: number;
  widgets?: WorkspaceWidget[];
  quick_actions?: WorkspaceQuickAction[];
  statistics?: WorkspaceStatistic[];
  widget_count: number;
  action_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceWidget {
  id: string;
  workspace: string;
  widget_type: WidgetType;
  title: string;
  description?: string;
  icon: string;
  color: string;
  config: Record<string, any>;
  url?: string;
  api_endpoint?: string;
  order: number;
  width: number;
  height: number;
  is_visible: boolean;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceStatistic {
  id: string;
  workspace: string;
  stat_key: string;
  stat_label: string;
  stat_value: string;
  stat_type: StatType;
  trend?: number;
  trend_direction?: TrendDirection;
  target_value?: string;
  progress?: number;
  metadata: Record<string, any>;
  cache_duration: number;
  last_calculated: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceQuickAction {
  id: string;
  workspace: string;
  label: string;
  description?: string;
  icon: string;
  color: string;
  action_type: ActionType;
  action_target: string;
  required_permission?: string;
  order: number;
  is_visible: boolean;
  show_badge: boolean;
  badge_api_endpoint?: string;
  created_at: string;
  updated_at: string;
}

export interface UserWorkspacePreference {
  id: string;
  user: number;
  user_username: string;
  default_workspace?: string;
  default_workspace_name?: string;
  hidden_widgets: string[];
  custom_widget_order: Record<string, number>;
  custom_layout: Record<string, any>;
  show_welcome_message: boolean;
  compact_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceDashboard {
  workspace: Workspace;
  user_preferences?: UserWorkspacePreference;
  statistics: WorkspaceStatistic[];
  widgets: WorkspaceWidget[];
  quick_actions: WorkspaceQuickAction[];
  recent_activities?: RecentActivity[];
  notifications?: WorkspaceNotification[];
  pending_tasks?: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  user: string;
  timestamp: string;
  icon?: string;
  color?: string;
  url?: string;
}

export interface WorkspaceNotification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  url?: string;
  icon?: string;
  color?: string;
}

export interface WorkspaceCustomization {
  hidden_widgets?: string[];
  custom_widget_order?: Record<string, number>;
  custom_layout?: Record<string, any>;
  show_welcome_message?: boolean;
  compact_mode?: boolean;
}

export interface CreateWorkspaceDto {
  role: WorkspaceRole;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  order?: number;
}

export interface UpdateWorkspaceDto extends Partial<CreateWorkspaceDto> {}

export interface CreateWidgetDto {
  workspace: string;
  widget_type: WidgetType;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  config?: Record<string, any>;
  url?: string;
  api_endpoint?: string;
  order?: number;
  width?: number;
  height?: number;
  is_visible?: boolean;
  is_required?: boolean;
}

export interface UpdateWidgetDto extends Partial<CreateWidgetDto> {}

export interface CreateStatisticDto {
  workspace: string;
  stat_key: string;
  stat_label: string;
  stat_value: string;
  stat_type?: StatType;
  trend?: number;
  trend_direction?: TrendDirection;
  target_value?: string;
  progress?: number;
  metadata?: Record<string, any>;
  cache_duration?: number;
}

export interface UpdateStatisticDto extends Partial<CreateStatisticDto> {}

export interface CreateQuickActionDto {
  workspace: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  action_type: ActionType;
  action_target: string;
  required_permission?: string;
  order?: number;
  is_visible?: boolean;
  show_badge?: boolean;
  badge_api_endpoint?: string;
}

export interface UpdateQuickActionDto extends Partial<CreateQuickActionDto> {}

export interface WorkspaceQueryParams {
  role?: WorkspaceRole;
  is_active?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}