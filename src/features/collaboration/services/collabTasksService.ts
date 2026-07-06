/**
 * Service collaboration — tâches d'équipe (board Kanban) + commentaires.
 * Persisté via DataAdapter.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBCollabTask, DBCollabTaskComment } from '../../../lib/db';
import type { Task, TaskComment, TaskStatus, TaskPriority } from '../types';

const now = () => new Date().toISOString();
const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e9)}`);

export async function listTasks(adapter: DataAdapter, tenantId: string, spaceId?: string): Promise<Task[]> {
  const all = await adapter.getAll<DBCollabTask>('collabTasks');
  return (all as DBCollabTask[])
    .filter(t => t.tenantId === tenantId && (spaceId === undefined || t.spaceId === spaceId))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || b.createdAt.localeCompare(a.createdAt)) as unknown as Task[];
}

export async function createTask(
  adapter: DataAdapter,
  data: {
    tenantId: string; title: string; description?: string; status?: TaskStatus; priority?: TaskPriority;
    assigneeId?: string; assigneeName?: string; dueDate?: string; tags?: string[]; watchers?: string[];
    linkedType?: string; linkedId?: string; createdBy: string;
    spaceId?: string; criticalPath?: boolean; blockedReason?: string; linkedRef?: string;
  },
): Promise<Task> {
  const t = await adapter.create<DBCollabTask>('collabTasks', {
    id: uid(), tenantId: data.tenantId, title: data.title, description: data.description,
    status: data.status || 'todo', priority: data.priority || 'medium',
    assigneeId: data.assigneeId, assigneeName: data.assigneeName, dueDate: data.dueDate,
    tags: data.tags ?? [], watchers: data.watchers ?? [], linkedType: data.linkedType, linkedId: data.linkedId,
    spaceId: data.spaceId, criticalPath: data.criticalPath, blockedReason: data.blockedReason, linkedRef: data.linkedRef,
    order: Date.now(), createdBy: data.createdBy, createdAt: now(), updatedAt: now(),
  } as DBCollabTask);
  return t as Task;
}

export async function updateTask(adapter: DataAdapter, id: string, patch: Partial<Task>): Promise<Task> {
  const updates: Partial<DBCollabTask> = { ...patch, updatedAt: now() } as Partial<DBCollabTask>;
  if (patch.status === 'done') updates.completedAt = now();
  if (patch.status && patch.status !== 'done') updates.completedAt = undefined;
  const t = await adapter.update<DBCollabTask>('collabTasks', id, updates);
  return t as Task;
}

export async function deleteTask(adapter: DataAdapter, id: string): Promise<void> {
  await adapter.delete('collabTasks', id);
}

export async function listTaskComments(adapter: DataAdapter, taskId: string): Promise<TaskComment[]> {
  const all = await adapter.getAll<DBCollabTaskComment>('collabTaskComments', { where: { taskId } });
  return (all as TaskComment[])
    .filter(c => c.taskId === taskId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addTaskComment(
  adapter: DataAdapter,
  data: { taskId: string; tenantId: string; authorId: string; authorName?: string; body: string; mentions?: string[] },
): Promise<TaskComment> {
  const c = await adapter.create<DBCollabTaskComment>('collabTaskComments', {
    id: uid(), taskId: data.taskId, tenantId: data.tenantId, authorId: data.authorId,
    authorName: data.authorName, body: data.body, mentions: data.mentions ?? [], createdAt: now(),
  } as DBCollabTaskComment);
  return c as TaskComment;
}
