/**
 * Espace collaboratif — types publics.
 */
export type ChannelType = 'channel' | 'dm';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type PresenceStatus = 'online' | 'away' | 'offline';

export interface Channel {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ChannelType;
  isPrivate?: boolean;
  members?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

export interface Message {
  id: string;
  channelId: string;
  tenantId: string;
  authorId: string;
  authorName?: string;
  body: string;
  mentions?: string[];
  parentId?: string;
  reactions?: Record<string, string[]>;
  attachments?: { name: string; url?: string; size?: number }[];
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  tags?: string[];
  watchers?: string[];
  linkedType?: string;
  linkedId?: string;
  order?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  tenantId: string;
  authorId: string;
  authorName?: string;
  body: string;
  mentions?: string[];
  createdAt: string;
}

export interface Presence {
  id: string;
  tenantId: string;
  userName?: string;
  status: PresenceStatus;
  lastSeenAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  review: 'En revue',
  done: 'Terminé',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};
