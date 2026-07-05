/**
 * Espace Collaboratif — discussions d'équipe, tâches (Kanban), fil d'activité.
 * Persisté via DataAdapter (Dexie local / Supabase SaaS). @mentions + présence.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { Avatar } from '../../components/ui';
import {
  MessageSquare, CheckSquare, Activity, Hash, Plus, Send, Smile, Users,
  Search, X, Circle, Clock, Flag, Trash2, CornerUpLeft, MoreHorizontal, Calendar,
} from 'lucide-react';
import {
  listChannels, ensureDefaultChannels, createChannel, listMessages, postMessage,
  deleteMessage, toggleReaction, heartbeatPresence, listPresence,
} from '../../features/collaboration/services/collaborationService';
import {
  listTasks, createTask, updateTask, deleteTask, listTaskComments, addTaskComment,
} from '../../features/collaboration/services/collabTasksService';
import type {
  Channel, Message, Task, TaskComment, TeamMember, Presence, TaskStatus, TaskPriority,
} from '../../features/collaboration/types';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../features/collaboration/types';

const REACTIONS = ['👍', '✅', '🎉', '❤️', '👀', '🙏'];

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: '#7FA3AF', medium: '#E89A2E', high: '#C77E2C', urgent: '#E24B4A',
};
const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString('fr-FR');
}
function timeHM(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const CollaborationWorkspace: React.FC = () => {
  const { adapter } = useData();
  const { user } = useAuth();
  const { toast } = useToast();

  const tenantId = user?.company_id || (typeof localStorage !== 'undefined' && localStorage.getItem('atlas-tenant-id')) || 'default';
  const me: TeamMember = useMemo(() => ({
    id: user?.id || 'me',
    name: user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Moi',
    email: user?.email, role: user?.role, avatarUrl: user?.photo_url,
  }), [user]);

  const [tab, setTab] = useState<'discussions' | 'tasks' | 'activity'>('discussions');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);

  // Membres d'équipe = utilisateur courant + toute présence vue dans l'espace.
  const members: TeamMember[] = useMemo(() => {
    const map = new Map<string, TeamMember>();
    map.set(me.id, me);
    for (const p of presence) {
      if (!map.has(p.id)) map.set(p.id, { id: p.id, name: p.userName || p.id });
    }
    return [...map.values()];
  }, [me, presence]);

  const reload = useCallback(async () => {
    try {
      const chs = await ensureDefaultChannels(adapter, tenantId, me.id);
      setChannels(chs);
    } catch { /* ignore */ }
  }, [adapter, tenantId, me.id]);

  useEffect(() => { reload(); }, [reload]);

  // Battement de présence + rafraîchissement de la liste des présents.
  useEffect(() => {
    let active = true;
    const beat = async () => {
      try {
        await heartbeatPresence(adapter, { userId: me.id, tenantId, userName: me.name, status: 'online' });
        const p = await listPresence(adapter, tenantId);
        if (active) setPresence(p);
      } catch { /* ignore */ }
    };
    beat();
    const t = setInterval(beat, 30000);
    return () => { active = false; clearInterval(t); };
  }, [adapter, tenantId, me.id, me.name]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--color-background)]">
      {/* En-tête + onglets */}
      <div className="px-5 pt-4 pb-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: 'var(--color-primary)' }}>
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Espace Collaboratif</h1>
            <p className="text-xs text-[var(--color-text-secondary)]">Discussions, tâches et activité de l'équipe</p>
          </div>
          <div className="ml-auto flex items-center -space-x-2">
            {presence.filter(p => p.status === 'online').slice(0, 6).map(p => (
              <Avatar key={p.id} name={p.userName || p.id} size="sm" status="online" className="ring-2 ring-[var(--color-surface)]" />
            ))}
            {presence.filter(p => p.status === 'online').length > 0 && (
              <span className="pl-4 text-xs text-[var(--color-text-secondary)]">{presence.filter(p => p.status === 'online').length} en ligne</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {([
            ['discussions', 'Discussions', MessageSquare],
            ['tasks', 'Tâches', CheckSquare],
            ['activity', 'Activité', Activity],
          ] as const).map(([k, lbl, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t-lg border-b-2 transition-colors ${tab === k ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-medium' : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>
              <Icon className="w-4 h-4" /> {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'discussions' && (
          <DiscussionsView adapter={adapter} tenantId={tenantId} me={me} members={members}
            channels={channels} onChannelsChanged={reload} toast={toast} />
        )}
        {tab === 'tasks' && (
          <TasksView adapter={adapter} tenantId={tenantId} me={me} members={members} toast={toast} />
        )}
        {tab === 'activity' && (
          <ActivityView adapter={adapter} />
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// DISCUSSIONS
// ══════════════════════════════════════════════════════════════════════════

interface ViewProps {
  adapter: any; tenantId: string; me: TeamMember; members: TeamMember[];
  toast: ReturnType<typeof useToast>['toast'];
}

const DiscussionsView: React.FC<ViewProps & { channels: Channel[]; onChannelsChanged: () => void }> = ({
  adapter, tenantId, me, members, toast, channels, onChannelsChanged,
}) => {
  const [activeId, setActiveId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = channels.find(c => c.id === activeId) || channels[0];

  useEffect(() => { if (!activeId && channels[0]) setActiveId(channels[0].id); }, [channels, activeId]);

  const loadMessages = useCallback(async () => {
    if (!active) return;
    try { setMessages(await listMessages(adapter, active.id)); } catch { /* ignore */ }
  }, [adapter, active]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  // Rafraîchissement léger (polling) tant que le canal est ouvert.
  useEffect(() => {
    const t = setInterval(loadMessages, 5000);
    return () => clearInterval(t);
  }, [loadMessages]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const onInputChange = (v: string) => {
    setInput(v);
    const m = v.match(/@([\w.\-]*)$/);
    setMentionQuery(m ? m[1].toLowerCase() : null);
  };
  const insertMention = (member: TeamMember) => {
    setInput(prev => prev.replace(/@([\w.\-]*)$/, `@${member.name} `));
    setMentionIds(prev => prev.includes(member.id) ? prev : [...prev, member.id]);
    setMentionQuery(null);
  };

  const send = async () => {
    const body = input.trim();
    if (!body || !active) return;
    setInput(''); setMentionQuery(null);
    const usedMentions = mentionIds.filter(id => body.includes(`@${members.find(m => m.id === id)?.name}`));
    setMentionIds([]);
    try {
      await postMessage(adapter, { channelId: active.id, tenantId, authorId: me.id, authorName: me.name, body, mentions: usedMentions });
      await loadMessages();
    } catch { toast.error('Message non envoyé'); }
  };

  const onCreateChannel = async () => {
    const name = window.prompt('Nom du nouveau canal :');
    if (!name?.trim()) return;
    try {
      const c = await createChannel(adapter, { tenantId, name, createdBy: me.id });
      onChannelsChanged();
      setActiveId(c.id);
    } catch { toast.error('Canal non créé'); }
  };

  const mentionMatches = mentionQuery !== null
    ? members.filter(m => m.name.toLowerCase().includes(mentionQuery)).slice(0, 5)
    : [];

  return (
    <div className="flex h-full min-h-0">
      {/* Rail canaux */}
      <div className="w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Canaux</span>
          <button onClick={onCreateChannel} className="p-1 rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]" title="Nouveau canal"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {channels.filter(c => c.type === 'channel').map(c => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm ${active?.id === c.id ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}>
              <Hash className="w-4 h-4 shrink-0" /> <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-[var(--color-border)]">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Équipe</span>
          <div className="mt-1.5 space-y-1">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <Avatar name={m.name} size="xs" status="online" />
                <span className="truncate">{m.name}{m.id === me.id ? ' (vous)' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fil de messages */}
      <div className="flex-1 min-w-0 flex flex-col bg-[var(--color-background)]">
        <div className="px-4 py-2.5 border-b border-[var(--color-border)] flex items-center gap-2 bg-[var(--color-surface)]">
          <Hash className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <span className="font-semibold text-[var(--color-text-primary)]">{active?.name || '—'}</span>
          {active?.description && <span className="text-xs text-[var(--color-text-tertiary)] ml-1">— {active.description}</span>}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-[var(--color-text-tertiary)]">
              <MessageSquare className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">Aucun message. Lancez la discussion !</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const prev = messages[i - 1];
            const grouped = prev && prev.authorId === msg.authorId && (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000);
            return (
              <MessageRow key={msg.id} msg={msg} grouped={!!grouped} me={me} members={members}
                onReact={async (emoji) => { await toggleReaction(adapter, msg, emoji, me.id); loadMessages(); }}
                onDelete={async () => { await deleteMessage(adapter, msg.id); loadMessages(); }} />
            );
          })}
        </div>

        {/* Composer */}
        <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] relative">
          {mentionMatches.length > 0 && (
            <div className="absolute bottom-full left-4 mb-1 w-64 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden z-10">
              {mentionMatches.map(m => (
                <button key={m.id} onClick={() => insertMention(m)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-surface-hover)] text-left">
                  <Avatar name={m.name} size="xs" /> <span>{m.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={`Message ${active ? '#' + active.name : ''}   (@ pour mentionner)`}
              className="flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 max-h-32"
            />
            <button onClick={send} disabled={!input.trim()}
              className="p-2.5 rounded-lg text-white disabled:opacity-40" style={{ background: 'var(--color-primary)' }} title="Envoyer">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageRow: React.FC<{
  msg: Message; grouped: boolean; me: TeamMember; members: TeamMember[];
  onReact: (emoji: string) => void; onDelete: () => void;
}> = ({ msg, grouped, me, members, onReact, onDelete }) => {
  const [hover, setHover] = useState(false);
  const [showReacts, setShowReacts] = useState(false);
  const author = msg.authorName || members.find(m => m.id === msg.authorId)?.name || 'Utilisateur';

  // Rendu du corps avec @mentions surlignées.
  const rendered = useMemo(() => {
    const parts = msg.body.split(/(@[\w.\-]+(?:\s[\w.\-]+)?)/g);
    return parts.map((part, i) => part.startsWith('@')
      ? <span key={i} className="text-[var(--color-primary)] font-medium bg-[var(--color-primary)]/10 rounded px-0.5">{part}</span>
      : <span key={i}>{part}</span>);
  }, [msg.body]);

  return (
    <div className={`group flex gap-2.5 px-1 rounded-md hover:bg-[var(--color-surface-hover)] relative ${grouped ? 'py-0.5' : 'pt-2 pb-0.5'}`}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setShowReacts(false); }}>
      <div className="w-9 shrink-0">
        {!grouped && <Avatar name={author} size="sm" />}
      </div>
      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{author}</span>
            <span className="text-[11px] text-[var(--color-text-tertiary)]">{timeHM(msg.createdAt)}</span>
          </div>
        )}
        <div className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap break-words">{rendered}{msg.editedAt && <span className="text-[10px] text-[var(--color-text-tertiary)] ml-1">(modifié)</span>}</div>
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(msg.reactions).map(([emoji, ids]) => ids.length > 0 && (
              <button key={emoji} onClick={() => onReact(emoji)}
                className={`text-xs px-1.5 py-0.5 rounded-full border ${ids.includes(me.id) ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
                {emoji} {ids.length}
              </button>
            ))}
          </div>
        )}
      </div>
      {hover && (
        <div className="absolute -top-3 right-2 flex items-center gap-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-sm px-1 py-0.5">
          <button onClick={() => setShowReacts(s => !s)} className="p-1 rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]" title="Réagir"><Smile className="w-3.5 h-3.5" /></button>
          {msg.authorId === me.id && <button onClick={onDelete} className="p-1 rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-error)]" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>}
          {showReacts && (
            <div className="absolute top-full right-0 mt-1 flex gap-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg p-1">
              {REACTIONS.map(e => <button key={e} onClick={() => { onReact(e); setShowReacts(false); }} className="text-base hover:scale-125 transition-transform px-0.5">{e}</button>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// TÂCHES (Kanban)
// ══════════════════════════════════════════════════════════════════════════

const TasksView: React.FC<ViewProps> = ({ adapter, tenantId, me, members, toast }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [detail, setDetail] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try { setTasks(await listTasks(adapter, tenantId)); } catch { /* ignore */ }
  }, [adapter, tenantId]);
  useEffect(() => { load(); }, [load]);

  const move = async (task: Task, status: TaskStatus) => {
    await updateTask(adapter, task.id, { status });
    load();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <span className="text-sm text-[var(--color-text-secondary)]">{tasks.length} tâche(s)</span>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-white" style={{ background: 'var(--color-primary)' }}>
          <Plus className="w-4 h-4" /> Nouvelle tâche
        </button>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-4 h-full min-w-max">
          {STATUS_ORDER.map(status => {
            const items = tasks.filter(t => t.status === status);
            return (
              <div key={status} className="w-72 flex flex-col rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border)]">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{TASK_STATUS_LABELS[status]}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]">{items.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {items.length === 0 && <p className="text-xs text-[var(--color-text-tertiary)] text-center py-4">—</p>}
                  {items.map(t => (
                    <div key={t.id} onClick={() => setDetail(t)}
                      className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-2.5 cursor-pointer hover:shadow-sm">
                      <div className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 mt-1.5 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[t.priority] }} />
                        <span className="text-sm text-[var(--color-text-primary)] flex-1">{t.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {t.assigneeName && <Avatar name={t.assigneeName} size="xs" />}
                        {t.dueDate && <span className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-0.5"><Calendar className="w-3 h-3" />{new Date(t.dueDate).toLocaleDateString('fr-FR')}</span>}
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: PRIORITY_COLOR[t.priority] + '22', color: PRIORITY_COLOR[t.priority] }}>{TASK_PRIORITY_LABELS[t.priority]}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {STATUS_ORDER.filter(s => s !== status).map(s => (
                          <button key={s} onClick={(e) => { e.stopPropagation(); move(t, s); }}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]">
                            → {TASK_STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {creating && (
        <TaskModal adapter={adapter} tenantId={tenantId} me={me} members={members} toast={toast}
          onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />
      )}
      {detail && (
        <TaskDetail adapter={adapter} tenantId={tenantId} me={me} members={members} task={detail} toast={toast}
          onClose={() => setDetail(null)} onChanged={() => { load(); }} />
      )}
    </div>
  );
};

const TaskModal: React.FC<ViewProps & { onClose: () => void; onSaved: () => void }> = ({
  adapter, tenantId, me, members, toast, onClose, onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const save = async () => {
    if (!title.trim()) { toast.error('Titre requis'); return; }
    const assignee = members.find(m => m.id === assigneeId);
    try {
      await createTask(adapter, {
        tenantId, title: title.trim(), description: description.trim() || undefined, priority,
        assigneeId: assignee?.id, assigneeName: assignee?.name, dueDate: dueDate || undefined, createdBy: me.id,
      });
      toast.success('Tâche créée');
      onSaved();
    } catch { toast.error('Tâche non créée'); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--color-surface)] rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Nouvelle tâche</h3>
          <button onClick={onClose} className="text-[var(--color-text-secondary)]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de la tâche"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Description (optionnel)"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--color-text-secondary)]">Priorité</label>
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="w-full mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm">
                {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map(p => <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-secondary)]">Échéance</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-secondary)]">Assigné à</label>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm">
              <option value="">Non assigné</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-[var(--color-border)]">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]">Annuler</button>
          <button onClick={save} className="px-4 py-1.5 text-sm rounded-lg text-white" style={{ background: 'var(--color-primary)' }}>Créer</button>
        </div>
      </div>
    </div>
  );
};

const TaskDetail: React.FC<ViewProps & { task: Task; onClose: () => void; onChanged: () => void }> = ({
  adapter, tenantId, me, members, task, toast, onClose, onChanged,
}) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [input, setInput] = useState('');

  const loadComments = useCallback(async () => {
    try { setComments(await listTaskComments(adapter, task.id)); } catch { /* ignore */ }
  }, [adapter, task.id]);
  useEffect(() => { loadComments(); }, [loadComments]);

  const addComment = async () => {
    if (!input.trim()) return;
    const body = input.trim(); setInput('');
    try { await addTaskComment(adapter, { taskId: task.id, tenantId, authorId: me.id, authorName: me.name, body }); loadComments(); }
    catch { toast.error('Commentaire non ajouté'); }
  };
  const setAssignee = async (id: string) => {
    const m = members.find(x => x.id === id);
    await updateTask(adapter, task.id, { assigneeId: m?.id, assigneeName: m?.name });
    onChanged();
  };
  const removeTask = async () => {
    if (!window.confirm('Supprimer cette tâche ?')) return;
    await deleteTask(adapter, task.id); onChanged(); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={onClose}>
      <div className="bg-[var(--color-surface)] w-full max-w-md h-full flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)]">
          <span className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Tâche</span>
          <div className="flex items-center gap-1">
            <button onClick={removeTask} className="p-1.5 rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-error)]"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{task.title}</h3>
          {task.description && <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{task.description}</p>}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Statut</div>
              <span className="px-2 py-1 rounded bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]">{TASK_STATUS_LABELS[task.status]}</span>
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Priorité</div>
              <span className="px-2 py-1 rounded" style={{ background: PRIORITY_COLOR[task.priority] + '22', color: PRIORITY_COLOR[task.priority] }}>{TASK_PRIORITY_LABELS[task.priority]}</span>
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Échéance</div>
              <span className="text-[var(--color-text-primary)]">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : '—'}</span>
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Assigné à</div>
              <select value={task.assigneeId || ''} onChange={e => setAssignee(e.target.value)} className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm">
                <option value="">Non assigné</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--color-border)]">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-2">Commentaires</div>
            <div className="space-y-2.5">
              {comments.length === 0 && <p className="text-sm text-[var(--color-text-tertiary)]">Aucun commentaire.</p>}
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <Avatar name={c.authorName || c.authorId} size="xs" />
                  <div>
                    <div className="text-xs"><span className="font-semibold text-[var(--color-text-primary)]">{c.authorName || 'Utilisateur'}</span> <span className="text-[var(--color-text-tertiary)]">{timeAgo(c.createdAt)}</span></div>
                    <div className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{c.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
            placeholder="Ajouter un commentaire…" className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
          <button onClick={addComment} className="p-2 rounded-lg text-white" style={{ background: 'var(--color-primary)' }}><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// ACTIVITÉ (audit logs)
// ══════════════════════════════════════════════════════════════════════════

const ActivityView: React.FC<{ adapter: any }> = ({ adapter }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const all = await adapter.getAll('auditLogs');
        setLogs((all as any[]).sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || ''))).slice(0, 100));
      } catch { setLogs([]); }
      setLoading(false);
    })();
  }, [adapter]);

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-2xl mx-auto">
        {loading ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">Chargement…</p>
        ) : logs.length === 0 ? (
          <div className="text-center text-[var(--color-text-tertiary)] py-16">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucune activité enregistrée.</p>
          </div>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2 top-1 bottom-1 w-px bg-[var(--color-border)]" />
            {logs.map((l, i) => (
              <div key={l.id || i} className="relative mb-4">
                <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full border-2 border-[var(--color-surface)]" style={{ background: 'var(--color-primary)' }} />
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-[var(--color-text-primary)]">{String(l.action || 'Action')}</span>
                    {l.entityType && <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]">{l.entityType}</span>}
                    <span className="ml-auto text-[11px] text-[var(--color-text-tertiary)]">{l.timestamp ? timeAgo(l.timestamp) : ''}</span>
                  </div>
                  {(l.details || l.entityId) && <div className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">{String(l.details || l.entityId)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaborationWorkspace;
