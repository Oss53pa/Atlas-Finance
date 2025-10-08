export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'cancelled' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  authorId: string;
  createdAt: Date;
  editedAt?: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  assigneeId?: string;
  assigneeTeam?: string;
  dueDate?: Date;
  startDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  completedAt?: Date;
  createdAt: Date;
  createdBy?: string;
  modifiedAt?: Date;
  modifiedBy?: string;
  progress?: number;
  category?: string;
  project?: string;
  subTasks?: SubTask[];
  attachments?: Attachment[];
  comments?: Comment[];
  dependencies?: string[];
  budget?: number;
  actualCost?: number;
  isRecurring?: boolean;
  recurringPattern?: string;
  blockedReason?: string;
}

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignee?: string[];
  tags?: string[];
  search?: string;
  dateRange?: { from: Date; to: Date };
  project?: string;
  category?: string;
}

export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  cancelled: number;
  blocked: number;
  overdue: number;
  completionRate: number;
  avgCompletionTime: number;
}

export type TaskView = 'list' | 'kanban' | 'calendar' | 'gantt';