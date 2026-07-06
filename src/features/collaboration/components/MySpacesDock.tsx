/**
 * Dock « Mes espaces » (CDC §8.2) — projeté dans tout workspace FNA.
 * Bouton flottant + panneau : mes espaces de résolution (convergence, non-lus),
 * mes actions inter-espaces (cochables sur place), validations demandées, et
 * réponse contextuelle vers le fil d'un espace SANS quitter l'écran métier
 * (événement porté avec origin_surface = workspace FNA).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, Send, CheckCircle2, Circle, ChevronRight, Target, ShieldCheck } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../hooks/useToast';
import {
  listSpaces, listEvents, postMessage, approveDecision,
} from '../services/collaborationService';
import { listTasks, updateTask } from '../services/collabTasksService';
import { useCollabUnread } from '../hooks/useCollabUnread';
import { openSpaceUrl } from '../link';
import type { Space, Task, SpaceEvent, DecisionPayload } from '../types';

const T = { petrol: '#1E5A64', orange: '#E8912D', gold: '#C97E12', green: '#2E9E6B', red: '#E24B4A', ink: '#1C2B2E', sub: '#607377', line: '#E6E0D4', surface: '#fff', cream: '#F2EFE8' };
const ROLE_ORDER = ['comptable', 'daf', 'dg'];

export const MySpacesDock: React.FC = () => {
  const { adapter } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const tenantId = user?.company_id || (typeof localStorage !== 'undefined' && localStorage.getItem('atlas-tenant-id')) || 'default';
  const me = useMemo(() => ({
    id: user?.id || 'me',
    name: user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Moi',
    role: (user?.role || 'comptable') as string,
  }), [user]);

  const [open, setOpen] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [pending, setPending] = useState<{ ev: SpaceEvent; space: Space }[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const { total, mentions, refresh: refreshUnread } = useCollabUnread(20000);

  const canApprove = useCallback((p: DecisionPayload) => ROLE_ORDER.indexOf(me.role) >= ROLE_ORDER.indexOf(p.requiredRole || 'comptable'), [me.role]);

  const load = useCallback(async () => {
    try {
      const [sp, tk] = await Promise.all([listSpaces(adapter, tenantId), listTasks(adapter, tenantId)]);
      const active = sp.filter(s => s.status !== 'archive' && s.status !== 'abandonne');
      setSpaces(active);
      setMyTasks(tk.filter(t => t.spaceId && t.status !== 'done' && (t.assigneeId === me.id || !t.assigneeId)));
      // Validations demandées : décisions non validées que mon rôle peut approuver.
      const pend: { ev: SpaceEvent; space: Space }[] = [];
      for (const s of active) {
        const evs = await listEvents(adapter, s.id);
        for (const ev of evs) {
          if (ev.type === 'decision') {
            const p = ev.payload as DecisionPayload;
            if (p && !p.approvedAt && canApprove(p)) pend.push({ ev, space: s });
          }
        }
      }
      setPending(pend);
    } catch { /* ignore */ }
  }, [adapter, tenantId, me.id, canApprove]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const badge = total + pending.length;
  const doReply = async (spaceId: string) => {
    if (!replyText.trim()) return;
    await postMessage(adapter, { spaceId, tenantId, authorId: me.id, authorName: me.name, body: replyText.trim(), via: 'Atlas FNA · Workspace' });
    setReplyText(''); setReplyTo(null); toast.success('Réponse publiée dans l\'espace'); refreshUnread(); load();
  };
  const toggleTask = async (t: Task) => { await updateTask(adapter, t.id, { status: 'done' }); toast.success('Action complétée'); load(); };
  const approve = async (ev: SpaceEvent) => {
    await approveDecision(adapter, ev, me); toast.success(`${(ev.payload as DecisionPayload).ref || 'Décision'} validée`); load(); refreshUnread();
  };

  return (
    <>
      {/* Bouton flottant */}
      <button onClick={() => setOpen(v => !v)} title="Mes espaces de résolution"
        style={{
          position: 'fixed', right: 20, bottom: 20, zIndex: 55, width: 52, height: 52, borderRadius: 26,
          background: T.petrol, color: '#fff', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center',
          boxShadow: '0 8px 24px rgba(30,90,100,.35)',
        }}>
        <MessageSquare size={22} />
        {badge > 0 && (
          <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, padding: '0 5px', borderRadius: 10, background: mentions > 0 ? T.red : T.orange, color: '#fff', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', border: '2px solid #fff' }}>
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'fixed', right: 20, bottom: 84, zIndex: 55, width: 360, maxHeight: '72vh', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.petrol, color: '#fff' }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>Mes espaces</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={18} /></button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {/* Validations demandées */}
            {pending.length > 0 && (
              <Section title={`Validations demandées (${pending.length})`} color={T.orange}>
                {pending.map(({ ev, space }) => {
                  const p = ev.payload as DecisionPayload;
                  return (
                    <div key={ev.id} style={box}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{p.title} <span style={{ fontFamily: 'monospace', color: T.orange, fontSize: 10.5 }}>{p.ref}</span></div>
                      <div style={{ fontSize: 10.5, color: T.sub }}>{space.title}{p.amount != null ? ` · ${Math.round(p.amount).toLocaleString('fr-FR')} FCFA` : ''}</div>
                      <button onClick={() => approve(ev)} style={{ ...miniBtn(T.green), marginTop: 6 }}><ShieldCheck size={12} /> Valider ({(p.requiredRole || '').toUpperCase()})</button>
                    </div>
                  );
                })}
              </Section>
            )}

            {/* Mes actions */}
            <Section title={`Mes actions (${myTasks.length})`} color={T.petrol}>
              {myTasks.length === 0 && <Empty>Aucune action ouverte.</Empty>}
              {myTasks.map(t => {
                const s = spaces.find(x => x.id === t.spaceId);
                return (
                  <div key={t.id} style={{ ...box, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <button onClick={() => toggleTask(t)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginTop: 1 }}><Circle size={15} color={T.line} /></button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{t.title}</div>
                      {s && <div style={{ fontSize: 10.5, color: T.sub }}>{s.title}</div>}
                    </div>
                  </div>
                );
              })}
            </Section>

            {/* Mes espaces */}
            <Section title={`Espaces actifs (${spaces.length})`} color={T.gold}>
              {spaces.length === 0 && <Empty>Aucun espace actif.</Empty>}
              {spaces.map(s => {
                const conv = s.convergenceBp != null ? Math.round(s.convergenceBp / 100) : 0;
                return (
                  <div key={s.id} style={box}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                        <div style={{ height: 4, background: '#EFEAE0', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${conv}%`, height: '100%', background: conv >= 100 ? T.green : conv >= 50 ? T.gold : T.orange }} />
                        </div>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: T.gold, fontWeight: 700 }}>{conv}%</span>
                      <button onClick={() => navigate(openSpaceUrl(s.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.petrol, display: 'grid', placeItems: 'center' }} title="Ouvrir l'espace"><ChevronRight size={16} /></button>
                    </div>
                    {replyTo === s.id ? (
                      <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                        <input autoFocus value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && doReply(s.id)}
                          placeholder="Répondre d'ici…" style={{ flex: 1, border: `1px solid ${T.line}`, borderRadius: 7, padding: '5px 8px', fontSize: 11.5, outline: 'none' }} />
                        <button onClick={() => doReply(s.id)} style={miniBtn(T.petrol)}><Send size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setReplyTo(s.id); setReplyText(''); }} style={{ marginTop: 5, fontSize: 10.5, color: T.petrol, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Répondre d'ici</button>
                    )}
                  </div>
                );
              })}
            </Section>

            <button onClick={() => navigate('/collaboration')} style={{ width: '100%', marginTop: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: T.petrol, background: T.petrol + '10', border: 'none', borderRadius: 9, padding: '9px', cursor: 'pointer' }}>
              <Target size={14} /> Ouvrir le portefeuille
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const box: React.CSSProperties = { border: `1px solid #EFEAE0`, borderRadius: 9, padding: '8px 10px', marginBottom: 7 };
const miniBtn = (c: string): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#fff', background: c, border: 'none', borderRadius: 7, padding: '4px 9px', cursor: 'pointer' });
function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 7 }}>{title}</div>
      {children}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, color: T.sub, padding: '2px 2px 6px' }}>{children}</div>;
}

export default MySpacesDock;
