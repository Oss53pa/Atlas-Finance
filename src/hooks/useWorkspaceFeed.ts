import { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { listTasks, createTask, updateTask } from '../features/collaboration/services/collabTasksService';
import type { Task } from '../features/collaboration/types';
import type { DBCollabMessage, DBCollabChannel } from '../lib/db';

/**
 * Alimente les blocs « Mes tâches » et « Messages récents » des espaces de
 * travail avec les données réelles de l'espace collaboratif.
 *
 * Ces tâches et ces messages étaient déjà persistés (tables collab_tasks /
 * collab_messages, miroirs Dexie collabTasks / collabMessages) : les espaces
 * affichaient un renvoi vers un autre écran faute d'être branchés dessus, pas
 * faute de données.
 */

export interface WorkspaceMessage {
  id: string;
  body: string;
  authorName: string;
  channelName: string;
  createdAt: string;
  /** Message posté par quelqu'un d'autre après ma dernière lecture du canal */
  unread: boolean;
}

const tenantOf = (companyId?: string) =>
  companyId
  || (typeof localStorage !== 'undefined' && localStorage.getItem('atlas-tenant-id'))
  || 'default';

export function useWorkspaceFeed(limit = 5) {
  const { adapter } = useData();
  const { user } = useAuth();

  const me = useMemo(
    () => ({ id: user?.id || 'me', name: user?.name || 'Moi' }),
    [user?.id, user?.name],
  );
  const tenantId = tenantOf((user as { company_id?: string } | null)?.company_id);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [loading, setLoading] = useState(true);
  // Totaux, distincts des listes tronquées à `limit` : le bandeau annonce ce
  // qui reste à traiter, pas ce qui tient dans l'aperçu.
  const [openCount, setOpenCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadTasks = useCallback(async () => {
    const all = await listTasks(adapter, tenantId);
    // Priorité au travail qui m'incombe : mes tâches ouvertes d'abord, puis les
    // non assignées. Les tâches terminées ne remontent pas dans un aperçu.
    const open = all.filter((t) => t.status !== 'done');
    setOpenCount(open.length);
    const mine = open.filter((t) => t.assigneeId === me.id);
    const rest = open.filter((t) => t.assigneeId !== me.id);
    const rank = { urgent: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
    const byUrgency = (a: Task, b: Task) => {
      const p = (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
      if (p !== 0) return p;
      // À priorité égale, l'échéance la plus proche remonte ; sans échéance, en fin.
      return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
    };
    setTasks([...mine.sort(byUrgency), ...rest.sort(byUrgency)].slice(0, limit));
  }, [adapter, tenantId, me.id, limit]);

  const loadMessages = useCallback(async () => {
    const [rows, channels] = await Promise.all([
      adapter.getAll<DBCollabMessage>('collabMessages'),
      adapter.getAll<DBCollabChannel>('collabChannels').catch(() => [] as DBCollabChannel[]),
    ]);
    const channelName = new Map(channels.map((c) => [c.id, c.name]));
    const seen = readSeen();
    const visible = rows.filter((m) => m.tenantId === tenantId && !m.deletedAt && m.type !== 'system');
    setUnreadCount(visible.filter((m) => m.authorId !== me.id && m.createdAt > (seen[m.channelId] || '')).length);
    setMessages(
      visible
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map((m) => ({
          id: m.id,
          body: m.body,
          authorName: m.authorName || 'Inconnu',
          channelName: channelName.get(m.channelId) || 'Discussion',
          createdAt: m.createdAt,
          unread: m.authorId !== me.id && m.createdAt > (seen[m.channelId] || ''),
        })),
    );
  }, [adapter, tenantId, me.id, limit]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadTasks(), loadMessages()]);
    } catch (e) {
      console.error('[useWorkspaceFeed]', e);
    } finally {
      setLoading(false);
    }
  }, [loadTasks, loadMessages]);

  useEffect(() => { void reload(); }, [reload]);

  /** Ajout express depuis l'espace : un titre suffit, le reste prend ses défauts. */
  const addTask = useCallback(async (title: string) => {
    const clean = title.trim();
    if (!clean) return;
    await createTask(adapter, { tenantId, title: clean, assigneeId: me.id, assigneeName: me.name, createdBy: me.id });
    await loadTasks();
  }, [adapter, tenantId, me.id, me.name, loadTasks]);

  /** Coche / décoche depuis l'aperçu, sans quitter l'espace. */
  const toggleTask = useCallback(async (task: Task) => {
    await updateTask(adapter, task.id, { status: task.status === 'done' ? 'todo' : 'done' });
    await loadTasks();
  }, [adapter, loadTasks]);

  return { tasks, messages, loading, openCount, unreadCount, addTask, toggleTask, reload };
}

/**
 * Dernière lecture par canal — purement local (un badge « non lu » n'a pas à
 * voyager en base). Absent = tout est considéré comme non lu.
 */
const SEEN_KEY = 'atlas-collab-seen';
function readSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
  } catch {
    return {};
  }
}
