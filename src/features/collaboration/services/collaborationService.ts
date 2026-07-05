/**
 * Service collaboration — discussions (canaux/messages), présence.
 * Persisté via DataAdapter (Dexie en local, Supabase en SaaS).
 */
import type { DataAdapter } from '@atlas/data';
import type {
  DBCollabChannel, DBCollabMessage, DBCollabPresence,
} from '../../../lib/db';
import type { Channel, Message, Presence, PresenceStatus } from '../types';

const now = () => new Date().toISOString();
const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e9)}`);

const DEFAULT_CHANNELS = [
  { name: 'général', description: 'Discussion générale de l\'équipe' },
  { name: 'comptabilité', description: 'Écritures, lettrage, questions comptables' },
  { name: 'clôture', description: 'Coordination des travaux de clôture' },
];

// ── CANAUX ──────────────────────────────────────────────────────────────────

export async function listChannels(adapter: DataAdapter, tenantId: string): Promise<Channel[]> {
  const all = await adapter.getAll<DBCollabChannel>('collabChannels');
  return (all as Channel[])
    .filter(c => c.tenantId === tenantId && !c.archived)
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'channel' ? -1 : 1));
}

export async function ensureDefaultChannels(adapter: DataAdapter, tenantId: string, userId: string): Promise<Channel[]> {
  const existing = await listChannels(adapter, tenantId);
  const channels = existing.filter(c => c.type === 'channel');
  if (channels.length > 0) return existing;
  for (const def of DEFAULT_CHANNELS) {
    await adapter.create<DBCollabChannel>('collabChannels', {
      id: uid(), tenantId, name: def.name, description: def.description,
      type: 'channel', isPrivate: false, createdBy: userId, createdAt: now(), updatedAt: now(),
    } as DBCollabChannel);
  }
  return listChannels(adapter, tenantId);
}

export async function createChannel(
  adapter: DataAdapter,
  data: { tenantId: string; name: string; description?: string; type?: 'channel' | 'dm'; isPrivate?: boolean; members?: string[]; createdBy: string },
): Promise<Channel> {
  const c = await adapter.create<DBCollabChannel>('collabChannels', {
    id: uid(), tenantId: data.tenantId, name: data.name.replace(/^#/, '').trim(),
    description: data.description, type: data.type || 'channel', isPrivate: data.isPrivate ?? false,
    members: data.members, createdBy: data.createdBy, createdAt: now(), updatedAt: now(),
  } as DBCollabChannel);
  return c as Channel;
}

export async function archiveChannel(adapter: DataAdapter, id: string): Promise<void> {
  await adapter.update<DBCollabChannel>('collabChannels', id, { archived: true, updatedAt: now() });
}

// ── MESSAGES ────────────────────────────────────────────────────────────────

export async function listMessages(adapter: DataAdapter, channelId: string): Promise<Message[]> {
  const all = await adapter.getAll<DBCollabMessage>('collabMessages', { where: { channelId } });
  return (all as Message[])
    .filter(m => m.channelId === channelId && !m.deletedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function postMessage(
  adapter: DataAdapter,
  data: { channelId: string; tenantId: string; authorId: string; authorName?: string; body: string; mentions?: string[]; parentId?: string },
): Promise<Message> {
  const m = await adapter.create<DBCollabMessage>('collabMessages', {
    id: uid(), channelId: data.channelId, tenantId: data.tenantId, authorId: data.authorId,
    authorName: data.authorName, body: data.body, mentions: data.mentions ?? [],
    parentId: data.parentId, reactions: {}, createdAt: now(),
  } as DBCollabMessage);
  // Touche le canal (pour le tri par activité).
  await adapter.update<DBCollabChannel>('collabChannels', data.channelId, { updatedAt: now() }).catch(() => {});
  return m as Message;
}

export async function editMessage(adapter: DataAdapter, id: string, body: string): Promise<void> {
  await adapter.update<DBCollabMessage>('collabMessages', id, { body, editedAt: now() });
}

export async function deleteMessage(adapter: DataAdapter, id: string): Promise<void> {
  await adapter.update<DBCollabMessage>('collabMessages', id, { deletedAt: now() });
}

export async function toggleReaction(adapter: DataAdapter, message: Message, emoji: string, userId: string): Promise<void> {
  const reactions: Record<string, string[]> = { ...(message.reactions || {}) };
  const set = new Set(reactions[emoji] || []);
  if (set.has(userId)) set.delete(userId); else set.add(userId);
  if (set.size === 0) delete reactions[emoji]; else reactions[emoji] = [...set];
  await adapter.update<DBCollabMessage>('collabMessages', message.id, { reactions });
}

// ── PRÉSENCE ────────────────────────────────────────────────────────────────

export async function heartbeatPresence(
  adapter: DataAdapter,
  data: { userId: string; tenantId: string; userName?: string; status?: PresenceStatus },
): Promise<void> {
  const existing = await adapter.getById<DBCollabPresence>('collabPresence', data.userId).catch(() => null);
  const payload = {
    id: data.userId, tenantId: data.tenantId, userName: data.userName,
    status: data.status || 'online', lastSeenAt: now(),
  } as DBCollabPresence;
  if (existing) await adapter.update<DBCollabPresence>('collabPresence', data.userId, payload);
  else await adapter.create<DBCollabPresence>('collabPresence', payload);
}

export async function listPresence(adapter: DataAdapter, tenantId: string): Promise<Presence[]> {
  const all = await adapter.getAll<DBCollabPresence>('collabPresence');
  const cutoff = Date.now() - 2 * 60 * 1000; // en ligne si vu < 2 min
  return (all as Presence[])
    .filter(p => p.tenantId === tenantId)
    .map(p => ({ ...p, status: (new Date(p.lastSeenAt).getTime() >= cutoff ? 'online' : 'offline') as PresenceStatus }));
}
