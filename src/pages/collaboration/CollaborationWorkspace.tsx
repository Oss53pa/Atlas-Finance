/**
 * ESPACE COLLABORATIF — module de résolution de problèmes (CDC v1.0).
 * « Slack fait parler les gens ; l'Espace Collaboratif fait converger un
 * problème vers zéro. » Deux écrans : Portefeuille (kanban par statut) et
 * Espace (3 colonnes : Méthode | Fil typé | Résolution). Données réelles :
 * convergence & critères dérivés du grand livre, décisions gouvernées par
 * seuils, snapshots hashés, clôture opposable. Aucun calcul par LLM.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { Avatar } from '../../components/ui';
import {
  Plus, Send, ArrowLeft, Target, ListChecks, Gavel, FileText, Radio, Camera,
  Lock, Unlock, ChevronRight, Circle, CheckCircle2, AlertTriangle, Sparkles,
  Link2, Hash, ShieldCheck, X, Clock, Flag, Layers, PenLine, TrendingUp,
} from 'lucide-react';
import {
  listSpaces, createSpace, getSpace, updateSpace, transitionSpace,
  computeConvergence, refreshConvergence, evaluateExitCriteria, satisfyCriterion,
  closeSpace, addSolution, decideSolution, listEvents, postMessage, postDecision,
  postEcriture, postSnapshot, approveDecision, rejectDecision, toggleReaction, buildSnapshotPayload,
  heartbeatPresence, isLate, listDocuments, addDocument, DECISION_TYPES, REJECT_MOTIVES,
  getPendingApprovalId, createApprovalLink, type ConvergenceResult,
} from '../../features/collaboration/services/collaborationService';
import type { DBCollabDocument } from '../../lib/db';
import { listTasks, createTask, updateTask } from '../../features/collaboration/services/collabTasksService';
import type {
  Space, SpaceEvent, Task, ExitCriterion, EventType, DecisionPayload, EcriturePayload,
  SnapshotPayload, SpaceStatus, GovernanceRule,
} from '../../features/collaboration/types';
import {
  SPACE_STATUS_LABELS, SPACE_STATUS_ORDER, ANCHOR_TYPE_LABELS, DEFAULT_GOVERNANCE,
  requiredRoleFor,
} from '../../features/collaboration/types';
import { parseNewSpaceParams, type ParsedNewSpace } from '../../features/collaboration/link';
import { SPACE_TEMPLATES, type SpaceTemplate } from '../../features/collaboration/templates';

// ── Palette (CDC §12.1 — thème clair Atlas FNA) ───────────────────────────────
const T = {
  cream: '#F2EFE8', surface: '#FFFFFF', petrol: '#1E5A64', orange: '#E8912D', gold: '#C97E12',
  green: '#2E9E6B', red: '#E24B4A', purple: '#7C5CBF', blue: '#3B7BD1',
  ink: '#1C2B2E', sub: '#607377', line: '#E6E0D4', softLine: '#EFEAE0',
};
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const EVENT_META: Record<EventType, { label: string; color: string; icon: React.ComponentType<any> }> = {
  ecriture: { label: 'Écriture', color: T.green, icon: PenLine },
  decision: { label: 'Décision', color: T.orange, icon: Gavel },
  snapshot: { label: 'Snapshot', color: T.purple, icon: Camera },
  message: { label: 'Message', color: T.blue, icon: Send },
  system: { label: 'Vigie PROPH3T', color: T.petrol, icon: Sparkles },
};

const fmtXof = (n?: number) => (n == null ? '—' : Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
const dayFR = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—');
const timeHM = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

// ════════════════════════════════════════════════════════════════════════════
export default function CollaborationWorkspace() {
  const { adapter } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const tenantId = user?.company_id || (typeof localStorage !== 'undefined' && localStorage.getItem('atlas-tenant-id')) || 'default';
  const me = useMemo(() => ({
    id: user?.id || 'me',
    name: user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Moi',
    role: (user?.role || 'comptable') as string,
  }), [user]);

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [prefill, setPrefill] = useState<ParsedNewSpace | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = useCallback(async () => {
    try { setSpaces(await listSpaces(adapter, tenantId)); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [adapter, tenantId]);

  useEffect(() => { load(); }, [load]);

  // Deux surfaces, un système (CDC §8) : ouverture depuis un écran métier via
  // query params — ?space=ID ouvre l'espace, ?new=1&… lance la création ancrée.
  useEffect(() => {
    const sid = searchParams.get('space');
    const np = parseNewSpaceParams(searchParams);
    if (sid) { setSelId(sid); setSearchParams({}, { replace: true }); }
    else if (np) { setPrefill(np); setShowCreate(true); setSearchParams({}, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  useEffect(() => {
    heartbeatPresence(adapter, { userId: me.id, tenantId, userName: me.name }).catch(() => {});
    const t = setInterval(() => heartbeatPresence(adapter, { userId: me.id, tenantId, userName: me.name }).catch(() => {}), 60000);
    return () => clearInterval(t);
  }, [adapter, tenantId, me.id, me.name]);

  const selected = spaces.find(s => s.id === selId) || null;

  return (
    <div style={{ background: T.cream, minHeight: '100%', color: T.ink, fontFamily: 'Exo 2, system-ui, sans-serif' }}>
      {selected ? (
        <SpaceView key={selected.id} space={selected} me={me} tenantId={tenantId}
          onBack={() => { setSelId(null); load(); }} onChanged={load} />
      ) : (
        <Portfolio spaces={spaces} loading={loading} onOpen={setSelId} onNew={() => setShowCreate(true)} />
      )}
      {showCreate && (
        <CreateSpaceModal me={me} tenantId={tenantId} prefill={prefill}
          onClose={() => { setShowCreate(false); setPrefill(undefined); }}
          onCreated={async (id) => { setShowCreate(false); setPrefill(undefined); await load(); setSelId(id); }} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════ PORTEFEUILLE (kanban) ══════
function Portfolio({ spaces, loading, onOpen, onNew }: {
  spaces: Space[]; loading: boolean; onOpen: (id: string) => void; onNew: () => void;
}) {
  const active = spaces.filter(s => s.status !== 'archive' && s.status !== 'abandonne');
  const late = active.filter(isLate);
  const resolved90 = spaces.filter(s => s.status === 'archive' && s.closedAt && (Date.now() - new Date(s.closedAt).getTime()) < 90 * 864e5);
  const cols = SPACE_STATUS_ORDER;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1500, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: T.petrol }}>Espaces de résolution</h1>
          <p style={{ margin: '4px 0 0', color: T.sub, fontSize: 13.5, maxWidth: 640 }}>
            Chaque espace naît d'un problème comptable ancré au grand livre et meurt résolu. La méthode fait converger l'écart vers zéro.
          </p>
        </div>
        <button onClick={onNew} style={btn(T.petrol)}>
          <Plus size={16} /> Nouvel espace
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <Stat label="En cours" value={active.length} color={T.petrol} icon={Layers} />
        <Stat label="En retard" value={late.length} color={T.red} icon={AlertTriangle} />
        <Stat label="Résolus / 90 j" value={resolved90.length} color={T.green} icon={CheckCircle2} />
      </div>

      {loading ? (
        <div style={{ color: T.sub, padding: 40, textAlign: 'center' }}>Chargement…</div>
      ) : spaces.length === 0 ? (
        <EmptyPortfolio onNew={onNew} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length}, minmax(240px, 1fr))`, gap: 12, alignItems: 'start' }}>
          {cols.map(st => {
            const items = spaces.filter(s => s.status === st);
            return (
              <div key={st} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 10, minHeight: 120 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px 10px' }}>
                  <span style={{ fontWeight: 700, fontSize: 12.5, color: T.ink }}>{SPACE_STATUS_LABELS[st]}</span>
                  <span style={{ fontSize: 11, color: T.sub, background: T.cream, borderRadius: 8, padding: '1px 7px' }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {items.map(s => <SpaceCard key={s.id} space={s} onOpen={() => onOpen(s.id)} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SpaceCard({ space, onOpen }: { space: Space; onOpen: () => void }) {
  const bp = space.convergenceBp ?? 0;
  const late = isLate(space);
  const anchor = space.anchors?.[0] || (space.linkedLabel ? { type: 'reconciliation', label: space.linkedLabel } as any : null);
  return (
    <button onClick={onOpen} style={{
      textAlign: 'left', width: '100%', background: T.surface, border: `1px solid ${late ? T.red + '55' : T.line}`,
      borderRadius: 12, padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 1px 2px rgba(30,90,100,.04)',
    }}>
      {anchor && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: T.petrol, background: T.petrol + '12', borderRadius: 7, padding: '2px 7px', width: 'fit-content' }}>
          <Link2 size={11} /> {anchor.label}
        </span>
      )}
      <span style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.3 }}>{space.title}</span>
      {space.objective && <span style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.35 }}>{space.objective}</span>}
      <ConvergenceBar bp={bp} compact />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: late ? T.red : T.sub, fontWeight: late ? 700 : 500 }}>
          {late ? <AlertTriangle size={12} /> : <Clock size={12} />} {dayFR(space.deadline)}
        </span>
        {space.responsibleName && <Avatar name={space.responsibleName} size="xs" />}
      </div>
    </button>
  );
}

function EmptyPortfolio({ onNew }: { onNew: () => void }) {
  return (
    <div style={{ background: T.surface, border: `1px dashed ${T.line}`, borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: T.petrol + '14', color: T.petrol, display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
        <Target size={26} />
      </div>
      <h3 style={{ margin: 0, fontSize: 17, color: T.ink }}>Aucun espace de résolution</h3>
      <p style={{ color: T.sub, fontSize: 13, maxWidth: 460, margin: '8px auto 18px' }}>
        Un espace se crée à partir d'un problème concret ancré au grand livre : un écart de rapprochement, une créance à recouvrer, une clôture de période. Il converge vers zéro puis s'archive avec un rapport opposable.
      </p>
      <button onClick={onNew} style={{ ...btn(T.petrol), margin: '0 auto' }}><Plus size={16} /> Ouvrir un espace</button>
    </div>
  );
}

// ════════════════════════════════════════════════ ESPACE (3 colonnes) ════════
function SpaceView({ space, me, tenantId, onBack, onChanged }: {
  space: Space; me: { id: string; name: string; role: string }; tenantId: string;
  onBack: () => void; onChanged: () => void;
}) {
  const { adapter } = useData();
  const { toast } = useToast();
  const [sp, setSp] = useState<Space>(space);
  const [events, setEvents] = useState<SpaceEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [criteria, setCriteria] = useState<ExitCriterion[]>(space.exitCriteria || []);
  const [conv, setConv] = useState<ConvergenceResult | null>(null);
  const [documents, setDocuments] = useState<DBCollabDocument[]>([]);
  const [rightTab, setRightTab] = useState<'actions' | 'decisions' | 'pieces' | 'diffusion'>('actions');
  const feedRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    const [fresh, ev, tk, docs] = await Promise.all([
      getSpace(adapter, space.id), listEvents(adapter, space.id), listTasks(adapter, tenantId, space.id),
      listDocuments(adapter, space.id),
    ]);
    if (fresh) {
      setSp(fresh);
      const [c, crit] = await Promise.all([computeConvergence(adapter, fresh), evaluateExitCriteria(adapter, fresh)]);
      setConv(c); setCriteria(crit);
    }
    setEvents(ev); setTasks(tk); setDocuments(docs);
  }, [adapter, space.id, tenantId]);

  useEffect(() => { reload(); }, [reload]);
  // Recalcule et fige la convergence à l'ouverture (dérivée du GL).
  useEffect(() => { refreshConvergence(adapter, space).catch(() => {}); }, [adapter, space]);
  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }, [events.length]);

  const allCriteriaMet = criteria.length > 0 && criteria.every(c => c.met);
  const readOnly = sp.status === 'archive' || sp.status === 'abandonne';

  const doClose = async () => {
    if (!allCriteriaMet) { toast.warning(`Clôture verrouillée · ${criteria.filter(c => c.met).length}/${criteria.length} critères`); return; }
    const { hash } = await closeSpace(adapter, sp, events);
    toast.success(`Espace clôturé · rapport scellé ${hash.slice(0, 10)}…`);
    await reload(); onChanged();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* En-tête */}
      <header style={{ background: T.surface, borderBottom: `1px solid ${T.line}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={iconBtn}><ArrowLeft size={18} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.title}</h2>
            <StatusPill status={sp.status} />
          </div>
          {(sp.anchors?.[0] || sp.linkedLabel) && (
            <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Link2 size={12} /> Ouvert depuis : {sp.anchors?.[0]?.label || sp.linkedLabel}
              {sp.anchors?.[0]?.path && <span style={{ color: T.petrol }}> · ouvrir l'écran source</span>}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10.5, color: T.sub, textTransform: 'uppercase', letterSpacing: .5 }}>Convergence</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 20, color: T.gold }}>{conv ? conv.pct : sp.convergenceBp ? Math.round(sp.convergenceBp / 100) : 0}%</div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr 340px', gap: 0, minHeight: 0 }}>
        {/* ── Colonne MÉTHODE ── */}
        <MethodColumn sp={sp} criteria={criteria} conv={conv} readOnly={readOnly} me={me}
          adapter={adapter} tenantId={tenantId} allCriteriaMet={allCriteriaMet}
          onClose={doClose} onReload={reload} />

        {/* ── Colonne FIL TYPÉ ── */}
        <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, background: T.cream }}>
          <div style={{ padding: '10px 16px', borderBottom: `1px solid ${T.line}`, background: T.surface }}>
            <ProphetSynthesis sp={sp} conv={conv} events={events} criteria={criteria} tasks={tasks} />
          </div>
          <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
            {events.length === 0 && <div style={{ color: T.sub, textAlign: 'center', paddingTop: 30, fontSize: 13 }}>Le fil est vide — énoncez le problème, proposez une solution.</div>}
            {events.map(ev => <FeedEvent key={ev.id} ev={ev} me={me} adapter={adapter} onReload={reload} readOnly={readOnly} />)}
          </div>
          {!readOnly && <Composer sp={sp} me={me} tenantId={tenantId} adapter={adapter} onSent={reload} />}
        </section>

        {/* ── Colonne RÉSOLUTION ── */}
        <aside style={{ borderLeft: `1px solid ${T.line}`, background: T.surface, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <ObjectiveCard sp={sp} conv={conv} criteria={criteria} readOnly={readOnly} me={me}
            adapter={adapter} onReload={reload} />
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}`, padding: '0 8px' }}>
            {([['actions', 'Actions', ListChecks], ['decisions', 'Décisions', Gavel], ['pieces', 'Pièces', FileText], ['diffusion', 'Diffusion', Radio]] as const).map(([k, lbl, Ic]) => (
              <button key={k} onClick={() => setRightTab(k)} style={{
                flex: 1, padding: '9px 4px', border: 'none', background: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${rightTab === k ? T.orange : 'transparent'}`,
                color: rightTab === k ? T.ink : T.sub, fontSize: 11.5, fontWeight: 600,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              }}><Ic size={14} />{lbl}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {rightTab === 'actions' && <ActionsTab sp={sp} tasks={tasks} me={me} tenantId={tenantId} adapter={adapter} onReload={reload} readOnly={readOnly} />}
            {rightTab === 'decisions' && <DecisionsTab events={events} me={me} adapter={adapter} onReload={reload} readOnly={readOnly} />}
            {rightTab === 'pieces' && <PiecesTab events={events} documents={documents} sp={sp} me={me} adapter={adapter} onReload={reload} readOnly={readOnly} />}
            {rightTab === 'diffusion' && <DiffusionTab sp={sp} events={events} />}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Colonne Méthode ───────────────────────────────────────────────────────────
function MethodColumn({ sp, criteria, conv, readOnly, me, adapter, tenantId, allCriteriaMet, onClose, onReload }: any) {
  const { toast } = useToast();
  const [solTitle, setSolTitle] = useState('');
  const kept = (sp.solutions || []).find((s: any) => s.state === 'kept');

  const propose = async () => {
    if (!solTitle.trim()) return;
    await addSolution(adapter, sp, { title: solTitle.trim(), authorId: me.id, authorName: me.name });
    setSolTitle(''); toast.success('Solution proposée'); onReload();
  };
  const decide = async (id: string, state: 'kept' | 'rejected') => {
    let motif: string | undefined;
    if (state === 'rejected') { motif = window.prompt('Motif de l\'écartement (tracé) :') || undefined; if (!motif) return; }
    await decideSolution(adapter, sp, id, state, me, motif); toast.success(state === 'kept' ? 'Solution retenue' : 'Solution écartée'); onReload();
  };

  return (
    <div style={{ borderRight: `1px solid ${T.line}`, background: T.surface, overflowY: 'auto', padding: '14px 14px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ① Problème */}
      <Step n="①" label="Problème">
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: T.ink }}>{sp.problem || '—'}</p>
        {conv && conv.initialGap > 0 && (
          <div style={{ marginTop: 8, fontSize: 11.5, color: T.sub }}>
            Écart initial <b style={{ fontFamily: MONO, color: T.gold }}>{fmtXof(conv.initialGap)}</b> FCFA
          </div>
        )}
      </Step>

      {/* ② Solutions */}
      <Step n="②" label="Solutions">
        {(sp.solutions || []).length === 0 && <div style={{ fontSize: 11.5, color: T.sub }}>Aucune solution proposée.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {(sp.solutions || []).map((s: any) => (
            <div key={s.id} style={{ border: `1px solid ${T.softLine}`, borderRadius: 9, padding: '7px 9px', background: s.state === 'kept' ? T.green + '0d' : s.state === 'rejected' ? '#0000000a' : T.surface }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {s.state === 'kept' && <CheckCircle2 size={13} color={T.green} />}
                {s.state === 'rejected' && <X size={13} color={T.sub} />}
                {s.state === 'proposed' && <Circle size={13} color={T.orange} />}
                <span style={{ fontSize: 12, fontWeight: 600, textDecoration: s.state === 'rejected' ? 'line-through' : 'none', color: s.state === 'rejected' ? T.sub : T.ink }}>{s.title}</span>
              </div>
              {s.motif && <div style={{ fontSize: 10.5, color: T.sub, marginTop: 3, paddingLeft: 19 }}>Motif : {s.motif}</div>}
              {s.decisionRef && <div style={{ fontSize: 10.5, color: T.orange, marginTop: 3, paddingLeft: 19, fontFamily: MONO }}>{s.decisionRef}</div>}
              {!readOnly && s.state === 'proposed' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6, paddingLeft: 19 }}>
                  <button onClick={() => decide(s.id, 'kept')} style={miniBtn(T.green)}>Retenir</button>
                  <button onClick={() => decide(s.id, 'rejected')} style={miniBtn(T.sub)}>Écarter</button>
                </div>
              )}
            </div>
          ))}
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input value={solTitle} onChange={e => setSolTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && propose()}
              placeholder="Proposer une solution…" style={inp} />
            <button onClick={propose} style={iconBtn}><Plus size={16} /></button>
          </div>
        )}
      </Step>

      {/* ③ Échéances */}
      <Step n="③" label="Échéances">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {(sp.milestones || []).map((m: any, i: number) => (
            <div key={m.id} style={{ display: 'flex', gap: 9, position: 'relative', paddingBottom: i === (sp.milestones.length - 1) ? 0 : 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: m.state === 'done' ? T.green : m.state === 'late' ? T.red : m.state === 'now' ? T.orange : T.line, marginTop: 3 }} />
                {i < sp.milestones.length - 1 && <div style={{ width: 2, flex: 1, background: T.softLine }} />}
              </div>
              <div style={{ paddingBottom: 4 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: 10.5, color: T.sub, fontFamily: MONO }}>{dayFR(m.date)}</div>
              </div>
            </div>
          ))}
        </div>
      </Step>

      {/* ④ Clôture */}
      <Step n="④" label="Clôture">
        <div style={{ fontSize: 11.5, color: T.sub, marginBottom: 8 }}>
          {criteria.filter((c: ExitCriterion) => c.met).length}/{criteria.length} critères de sortie satisfaits
        </div>
        {readOnly ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: T.green, fontWeight: 700 }}>
            <ShieldCheck size={16} /> Archivé le {dayFR(sp.closedAt)}
            {sp.closureHash && <span style={{ fontFamily: MONO, fontSize: 10, color: T.sub }}>· {sp.closureHash.slice(0, 10)}…</span>}
          </div>
        ) : (
          <button onClick={onClose} disabled={!allCriteriaMet} style={{
            ...btn(allCriteriaMet ? T.green : T.line), width: '100%', justifyContent: 'center',
            cursor: allCriteriaMet ? 'pointer' : 'not-allowed', color: allCriteriaMet ? '#fff' : T.sub,
          }}>
            {allCriteriaMet ? <Unlock size={15} /> : <Lock size={15} />}
            Clôturer & sceller le rapport
          </button>
        )}
      </Step>
    </div>
  );
}

// ── Synthèse PROPH3T épinglée ─────────────────────────────────────────────────
function ProphetSynthesis({ sp, conv, events, criteria, tasks }: any) {
  const openActions = (tasks as Task[]).filter(t => t.status !== 'done').length;
  const kept = (sp.solutions || []).find((s: any) => s.state === 'kept');
  const line = `Convergence ${conv?.pct ?? 0} %${conv?.initialGap ? ` · écart restant ${fmtXof(conv.currentGap)} / ${fmtXof(conv.initialGap)} FCFA` : ''}. `
    + `${(sp.solutions || []).length} solution(s), ${kept ? `retenue : « ${kept.title} »` : 'aucune retenue'}. `
    + `${openActions} action(s) ouverte(s), ${criteria.filter((c: ExitCriterion) => c.met).length}/${criteria.length} critères verts.`;
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: T.petrol + '15', color: T.petrol, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Sparkles size={15} /></div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.petrol }}>Synthèse PROPH3T <span style={{ color: T.sub, fontWeight: 500 }}>· mode strict, chiffres issus du GL</span></div>
        <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.45, marginTop: 2 }}>{line}</div>
      </div>
    </div>
  );
}

// ── Événement du fil ──────────────────────────────────────────────────────────
function FeedEvent({ ev, me, adapter, onReload, readOnly }: { ev: SpaceEvent; me: any; adapter: any; onReload: () => void; readOnly: boolean }) {
  const meta = EVENT_META[ev.type];
  const Icon = meta.icon;
  const react = async (emoji: string) => { await toggleReaction(adapter, ev, emoji, me.id); onReload(); };

  if (ev.type === 'system') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
        <span style={{ fontSize: 11, color: T.petrol, background: T.petrol + '10', borderRadius: 12, padding: '3px 12px', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <Sparkles size={12} /> {ev.body} · {timeAgo(ev.createdAt)}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <Avatar name={ev.authorName || 'Utilisateur'} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 12.5 }}>{ev.authorName || 'Utilisateur'}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: meta.color, background: meta.color + '15', borderRadius: 6, padding: '1px 6px' }}>
            <Icon size={11} /> {meta.label}
          </span>
          {ev.via && <span style={{ fontSize: 10.5, color: T.sub }}>via {ev.via}</span>}
          <span style={{ fontSize: 10.5, color: T.sub, fontFamily: MONO }}>{timeHM(ev.createdAt)}</span>
        </div>

        {ev.type === 'message' && <div style={{ fontSize: 13, color: T.ink, marginTop: 3, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{renderRefs(ev.body)}</div>}
        {ev.type === 'ecriture' && <EcritureChip p={ev.payload as EcriturePayload} body={ev.body} />}
        {ev.type === 'decision' && <DecisionChip p={ev.payload as DecisionPayload} />}
        {ev.type === 'snapshot' && <SnapshotChip p={ev.payload as SnapshotPayload} />}

        {/* réactions */}
        <div style={{ display: 'flex', gap: 5, marginTop: 6, alignItems: 'center' }}>
          {Object.entries(ev.reactions || {}).map(([em, ids]) => (ids as string[]).length > 0 && (
            <button key={em} onClick={() => react(em)} style={{ fontSize: 11, border: `1px solid ${T.line}`, borderRadius: 10, padding: '0 7px', background: (ids as string[]).includes(me.id) ? T.orange + '22' : T.surface, cursor: 'pointer' }}>
              {em} {(ids as string[]).length}
            </button>
          ))}
          {!readOnly && <button onClick={() => react('👍')} style={{ fontSize: 11, color: T.sub, border: 'none', background: 'none', cursor: 'pointer' }}>+</button>}
        </div>
      </div>
    </div>
  );
}

function renderRefs(body: string) {
  // Surligne les #références (compte / pièce) — liens résolus vers FNA (CDC §6.4).
  const parts = body.split(/(#[0-9A-Za-z-]+)/g);
  return parts.map((p, i) => p.startsWith('#')
    ? <span key={i} style={{ color: T.petrol, fontWeight: 700, fontFamily: MONO }}>{p}</span>
    : <React.Fragment key={i}>{p}</React.Fragment>);
}

function EcritureChip({ p, body }: { p: EcriturePayload; body: string }) {
  return (
    <div style={{ marginTop: 5 }}>
      {body && <div style={{ fontSize: 13, color: T.ink, marginBottom: 5 }}>{body}</div>}
      <div style={{ border: `1px solid ${T.green}33`, background: T.green + '0c', borderRadius: 9, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <PenLine size={16} color={T.green} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO }}>{p.entryNumber}{p.journal ? ` · ${p.journal}` : ''}</div>
          <div style={{ fontSize: 11, color: T.sub }}>{p.accounts}{p.amount != null ? ` · ${fmtXof(p.amount)} FCFA` : ''}</div>
        </div>
        <span style={{ fontSize: 11, color: T.green, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>Ouvrir dans FNA <ChevronRight size={13} /></span>
      </div>
    </div>
  );
}

function DecisionChip({ p }: { p: DecisionPayload }) {
  const pp = p as any;
  const status: string = pp.status || (pp.approvedAt ? 'approved' : 'in_approval');
  const chain: string[] = Array.isArray(pp.chain) ? pp.chain : (p.requiredRole ? [p.requiredRole] : []);
  const step: number = pp.currentStep || 1;
  const borderC = status === 'rejected' ? T.red : status === 'approved' ? T.green : T.orange;
  return (
    <div style={{ marginTop: 5, border: `1px solid ${borderC}44`, background: borderC + '0c', borderRadius: 9, padding: '9px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800 }}>{p.title}</span>
        {p.ref && <span style={{ fontFamily: MONO, fontSize: 10.5, color: borderC, fontWeight: 700 }}>{p.ref}</span>}
      </div>
      {p.detail && <div style={{ fontSize: 12, color: T.ink, marginTop: 3 }}>{p.detail}</div>}
      {p.amount != null && <div style={{ fontFamily: MONO, fontSize: 13, color: T.gold, fontWeight: 800, marginTop: 4 }}>{fmtXof(p.amount)} FCFA</div>}
      {p.governanceRule && (
        <div style={{ fontSize: 11, color: T.sub, marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
          <ShieldCheck size={13} color={borderC} /> {p.governanceRule}
        </div>
      )}
      {/* Chaîne de validation (cumul multi-validateurs) */}
      {chain.length > 0 && status !== 'cancelled' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
          {chain.map((role, i) => {
            const pos = i + 1;
            const done = status === 'approved' || pos < step;
            const pending = status === 'in_approval' && pos === step;
            const rejectedHere = status === 'rejected' && pos === step;
            const c = done ? T.green : rejectedHere ? T.red : pending ? T.orange : T.sub;
            const sym = done ? '✓' : rejectedHere ? '✗' : pending ? '②'.replace('②', String(pos)) : String(pos);
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: c, background: c + '15', borderRadius: 6, padding: '2px 8px' }}>
                {sym} {role.toUpperCase()}{pending ? ' · en attente' : ''}
              </span>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: status === 'approved' ? T.green : status === 'rejected' ? T.red : status === 'cancelled' ? T.sub : T.orange }}>
        {status === 'approved' && `✓ Validée${pp.approvedByName ? ` · ${pp.approvedByName}` : ''}${pp.approvedAt ? ` · ${dayFR(pp.approvedAt)}` : ''}${pp.effect ? ` · effet ${pp.effect}` : ''}`}
        {status === 'rejected' && `✗ Rejetée${pp.rejectMotive ? ` : ${pp.rejectMotive}` : ''}`}
        {status === 'cancelled' && 'Annulée'}
        {status === 'in_approval' && `En attente · étape ${step}/${chain.length || 1} — ${(chain[step - 1] || p.requiredRole || '').toUpperCase()}`}
      </div>
    </div>
  );
}

function SnapshotChip({ p }: { p: SnapshotPayload }) {
  return (
    <div style={{ marginTop: 5, border: `1px solid ${T.purple}44`, background: T.purple + '0a', borderRadius: 9, padding: '9px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <Camera size={15} color={T.purple} />
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{p.title}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: T.sub, fontFamily: MONO }}>#{p.hash}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ fontSize: 11, borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr>{p.columns.map((c, i) => <th key={i} style={{ textAlign: 'left', padding: '3px 8px', color: T.sub, borderBottom: `1px solid ${T.line}`, fontWeight: 600 }}>{c}</th>)}</tr></thead>
          <tbody>{p.rows.slice(0, 6).map((r, ri) => <tr key={ri}>{r.map((cell, ci) => <td key={ci} style={{ padding: '3px 8px', fontFamily: typeof cell === 'number' ? MONO : undefined, color: typeof cell === 'number' ? T.gold : T.ink }}>{typeof cell === 'number' ? fmtXof(cell) : cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div style={{ fontSize: 10, color: T.sub, marginTop: 5 }}>Figé le {new Date(p.frozenAt).toLocaleString('fr-FR')} · {p.source} · immuable</div>
    </div>
  );
}

// ── Composeur multi-type ──────────────────────────────────────────────────────
function Composer({ sp, me, tenantId, adapter, onSent }: any) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'message' | 'ecriture' | 'decision' | 'snapshot'>('message');
  const [text, setText] = useState('');
  // Écriture (liée à une VRAIE pièce GL)
  const [entryNumber, setEntryNumber] = useState('');
  const [accounts, setAccounts] = useState('');
  const [amount, setAmount] = useState('');
  const [entryId, setEntryId] = useState<string | undefined>(undefined);
  const [journal, setJournal] = useState<string | undefined>(undefined);
  const [entryQuery, setEntryQuery] = useState('');
  const [hits, setHits] = useState<import('../../features/collaboration/services/collaborationService').EntryHit[]>([]);
  // Décision
  const [decTitle, setDecTitle] = useState('');
  const [decType, setDecType] = useState('regularisation');

  useEffect(() => {
    if (mode !== 'ecriture') return;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const { searchJournalEntries } = await import('../../features/collaboration/services/collaborationService');
        const r = await searchJournalEntries(adapter, entryQuery, 8);
        if (alive) setHits(r);
      } catch { /* ignore */ }
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [mode, entryQuery, adapter]);

  const send = async () => {
    try {
      if (mode === 'message') {
        if (!text.trim()) return;
        await postMessage(adapter, { spaceId: sp.id, tenantId, authorId: me.id, authorName: me.name, body: text.trim(), via: 'Atlas FNA · Espace' });
      } else if (mode === 'ecriture') {
        if (!entryNumber.trim()) return;
        await postEcriture(adapter, {
          spaceId: sp.id, tenantId, authorId: me.id, authorName: me.name,
          body: text.trim(), via: 'Atlas FNA · Journaux',
          payload: { entryId, entryNumber: entryNumber.trim(), journal, accounts: accounts.trim(), amount: amount ? Number(amount) : undefined },
        });
        // Un geste comptable rapproche l'écart → recalcul convergence.
        await refreshConvergence(adapter, sp).catch(() => {});
      } else if (mode === 'decision') {
        if (!decTitle.trim()) return;
        const { ref, chain } = await postDecision(adapter, {
          space: sp, tenantId, authorId: me.id, authorName: me.name, decisionType: decType,
          title: decTitle.trim(), detail: text.trim() || undefined, amount: amount ? Number(amount) : undefined,
        });
        toast.success(`Décision ${ref} soumise${chain && chain.length ? ` · chaîne ${chain.map(r => r.toUpperCase()).join(' → ')}` : ''}`);
      } else if (mode === 'snapshot') {
        const payload = await buildSnapshotPayload(
          text.trim() || 'Snapshot convergence',
          'Atlas FNA · Espace',
          ['Indicateur', 'Valeur'],
          [['Écart restant', sp.convergence?.source?.kind === 'manual' ? sp.convergence.source.currentGap : 0], ['Convergence bp', sp.convergenceBp || 0]],
        );
        await postSnapshot(adapter, { spaceId: sp.id, tenantId, authorId: me.id, authorName: me.name, body: '', payload, via: 'Atlas FNA' });
      }
      setText(''); setEntryNumber(''); setAccounts(''); setAmount(''); setDecTitle(''); setDecType('regularisation');
      setEntryId(undefined); setJournal(undefined); setEntryQuery(''); setHits([]);
      onSent();
    } catch (e) { console.error(e); toast.error('Échec de l\'envoi'); }
  };

  const modes: [typeof mode, string, React.ComponentType<any>][] = [
    ['message', 'Message', Send], ['ecriture', 'Écriture', PenLine], ['decision', 'Décision', Gavel], ['snapshot', 'Snapshot', Camera],
  ];
  const amt = amount ? Number(amount) : 0;

  return (
    <div style={{ borderTop: `1px solid ${T.line}`, background: T.surface, padding: 12 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 9 }}>
        {modes.map(([k, lbl, Ic]) => (
          <button key={k} onClick={() => setMode(k)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600,
            border: `1px solid ${mode === k ? EVENT_META[k].color : T.line}`, color: mode === k ? EVENT_META[k].color : T.sub,
            background: mode === k ? EVENT_META[k].color + '12' : T.surface, borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
          }}><Ic size={13} /> {lbl}</button>
        ))}
      </div>

      {mode === 'ecriture' && (
        <div style={{ marginBottom: 7 }}>
          {entryId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${T.green}44`, background: T.green + '0c', borderRadius: 9, padding: '7px 10px' }}>
              <PenLine size={15} color={T.green} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO }}>{entryNumber}{journal ? ` · ${journal}` : ''}</div>
                <div style={{ fontSize: 11, color: T.sub }}>{accounts}{amount ? ` · ${fmtXof(Number(amount))} FCFA` : ''}</div>
              </div>
              <button onClick={() => { setEntryId(undefined); setEntryNumber(''); setAccounts(''); setAmount(''); setJournal(undefined); }} style={{ ...iconBtn, width: 28, height: 28 }}><X size={14} /></button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input value={entryQuery} onChange={e => setEntryQuery(e.target.value)} placeholder="Rechercher une pièce réelle (n°, compte, libellé)…" style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
              {hits.length > 0 && (
                <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 220, overflowY: 'auto', zIndex: 5 }}>
                  {hits.map(h => (
                    <button key={h.id} onClick={() => { setEntryId(h.id); setEntryNumber(h.entryNumber); setJournal(h.journal); setAccounts(h.accounts); setAmount(String(Math.round(h.amount))); setHits([]); }}
                      style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 8, padding: '7px 10px', border: 'none', borderBottom: `1px solid ${T.softLine}`, background: 'none', cursor: 'pointer' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, fontFamily: MONO }}>{h.entryNumber}{h.journal ? ` · ${h.journal}` : ''}</div>
                        <div style={{ fontSize: 10.5, color: T.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.accounts}{h.date ? ` · ${dayFR(h.date)}` : ''}</div>
                      </div>
                      <span style={{ fontSize: 11, fontFamily: MONO, color: T.gold }}>{fmtXof(h.amount)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {mode === 'decision' && (
        <div style={{ marginBottom: 7 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <select value={decType} onChange={e => setDecType(e.target.value)} style={{ ...inp, flex: '0 0 160px' }}>
              {DECISION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Montant FCFA" type="number" style={{ ...inp, width: 130 }} />
          </div>
          <input value={decTitle} onChange={e => setDecTitle(e.target.value)} placeholder="Intitulé de la décision" style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
          <div style={{ fontSize: 11, color: T.sub, marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
            <ShieldCheck size={13} color={T.orange} /> La chaîne de validation ({DECISION_TYPES.find(t => t.value === decType)?.label} · {fmtXof(amt)} FCFA) sera résolue par la matrice du tenant — cumul possible (ex. DAF puis DG).
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
          placeholder={mode === 'message' ? 'Écrire un message (#521100 pour référencer)…' : mode === 'decision' ? 'Corps / justification (optionnel)…' : mode === 'ecriture' ? 'Contexte de l\'écriture…' : 'Titre du snapshot…'}
          rows={2} style={{ ...inp, resize: 'none', flex: 1, fontFamily: 'inherit' }} />
        <button onClick={send} style={{ ...btn(T.petrol), padding: '9px 14px' }}><Send size={16} /></button>
      </div>
    </div>
  );
}

// ── Carte Objectif & critères ─────────────────────────────────────────────────
function ObjectiveCard({ sp, conv, criteria, readOnly, me, adapter, onReload }: any) {
  const { toast } = useToast();
  const check = async (c: ExitCriterion) => {
    if (c.auto) { toast.info('Critère calculé — se satisfait automatiquement depuis le GL'); return; }
    await satisfyCriterion(adapter, sp, c.id, me); toast.success('Critère validé'); onReload();
  };
  return (
    <div style={{ padding: 14, borderBottom: `1px solid ${T.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Target size={15} color={T.petrol} />
        <span style={{ fontWeight: 800, fontSize: 13 }}>Objectif</span>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: T.ink, lineHeight: 1.4 }}>{sp.objective || '—'}</p>
      {conv && (
        <>
          <ConvergenceBar bp={conv.bp} />
          {conv.formula && <div style={{ fontSize: 9.5, color: T.sub, fontFamily: MONO, marginTop: 4 }}>{conv.formula}</div>}
          <div style={{ fontSize: 9.5, color: T.petrol, marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 4 }}><TrendingUp size={11} /> calculé · jamais saisi</div>
        </>
      )}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: 'uppercase', letterSpacing: .4 }}>Critères de sortie</span>
        {criteria.length === 0 && <span style={{ fontSize: 11.5, color: T.sub }}>Aucun critère.</span>}
        {criteria.map((c: ExitCriterion) => (
          <button key={c.id} onClick={() => !readOnly && !c.met && check(c)} disabled={readOnly || c.met}
            style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: readOnly || c.met ? 'default' : 'pointer' }}>
            {c.met ? <CheckCircle2 size={16} color={T.green} /> : <Circle size={16} color={T.line} />}
            <span style={{ flex: 1, fontSize: 12, color: c.met ? T.ink : T.sub }}>{c.label}</span>
            {c.auto && <span style={{ fontSize: 9, color: T.petrol, background: T.petrol + '12', borderRadius: 5, padding: '1px 5px' }}>calculé</span>}
            {c.value && <span style={{ fontSize: 10.5, color: c.met ? T.green : T.gold, fontFamily: MONO }}>{c.value}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Onglet Actions (checklist de résolution) ──────────────────────────────────
function ActionsTab({ sp, tasks, me, tenantId, adapter, onReload, readOnly }: any) {
  const { toast } = useToast();
  const [label, setLabel] = useState('');
  const [critical, setCritical] = useState(false);

  const add = async () => {
    if (!label.trim()) return;
    await createTask(adapter, { tenantId, spaceId: sp.id, title: label.trim(), createdBy: me.id, assigneeId: me.id, assigneeName: me.name, criticalPath: critical });
    setLabel(''); setCritical(false); onReload();
  };
  const toggle = async (t: Task) => {
    await updateTask(adapter, t.id, { status: t.status === 'done' ? 'todo' : 'done' });
    if (t.status !== 'done') toast.success('Action complétée');
    onReload();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(tasks as Task[]).length === 0 && <div style={{ fontSize: 11.5, color: T.sub }}>Aucune action.</div>}
      {(tasks as Task[]).map(t => (
        <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', border: `1px solid ${T.softLine}`, borderRadius: 9, padding: '8px 9px', borderLeft: t.criticalPath ? `3px solid ${T.red}` : `1px solid ${T.softLine}` }}>
          <button onClick={() => !readOnly && toggle(t)} style={{ background: 'none', border: 'none', padding: 0, cursor: readOnly ? 'default' : 'pointer', marginTop: 1 }}>
            {t.status === 'done' ? <CheckCircle2 size={16} color={T.green} /> : <Circle size={16} color={T.line} />}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? T.sub : T.ink }}>{t.title}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
              {t.criticalPath && <span style={{ fontSize: 9.5, color: T.red, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Flag size={10} /> chemin critique</span>}
              {t.assigneeName && <span style={{ fontSize: 10.5, color: T.sub }}>{t.assigneeName}</span>}
              {t.linkedRef && <span style={{ fontSize: 10, color: T.green, fontFamily: MONO }}>{t.linkedRef}</span>}
            </div>
          </div>
        </div>
      ))}
      {!readOnly && (
        <div style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Nouvelle action…" style={inp} />
            <button onClick={add} style={iconBtn}><Plus size={16} /></button>
          </div>
          <label style={{ fontSize: 10.5, color: T.sub, display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, cursor: 'pointer' }}>
            <input type="checkbox" checked={critical} onChange={e => setCritical(e.target.checked)} /> chemin critique (bloquant)
          </label>
        </div>
      )}
    </div>
  );
}

// ── Onglet Décisions (registre + matrice de validation) ───────────────────────
function DecisionsTab({ events, me, adapter, onReload, readOnly }: any) {
  const { toast } = useToast();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [motive, setMotive] = useState('piece_manquante');
  const decisions = (events as SpaceEvent[]).filter(e => e.type === 'decision');

  // Rôle requis de l'étape courante (chaîne) — hint UI ; le serveur fait foi.
  const currentRole = (p: any): string => Array.isArray(p.chain) ? (p.chain[(p.currentStep || 1) - 1] || p.requiredRole) : p.requiredRole;
  const isOpen = (p: any) => (p.status || (p.approvedAt ? 'approved' : 'in_approval')) === 'in_approval';

  const approve = async (ev: SpaceEvent) => {
    try { await approveDecision(adapter, ev, me, 'space'); toast.success('Étape validée'); onReload(); }
    catch (e: any) { toast.error(mapErr(e?.message)); }
  };
  const reject = async (ev: SpaceEvent) => {
    try { await rejectDecision(adapter, ev, me, motive); toast.success('Décision rejetée'); setRejecting(null); onReload(); }
    catch (e: any) { toast.error(mapErr(e?.message)); }
  };
  const makeLink = async (ev: SpaceEvent) => {
    const decisionId = (ev.payload as any)?.decisionId;
    if (!decisionId) { toast.warning('Lien externe disponible en mode SaaS (décision serveur).'); return; }
    const name = window.prompt('Nom du validateur externe (ex. Cheick Sanankoua (DG)) :'); if (!name) return;
    const contact = window.prompt('E-mail du validateur :'); if (!contact) return;
    try {
      const step = await getPendingApprovalId(adapter, decisionId);
      if (!step) { toast.error('Aucune étape en attente.'); return; }
      const { url, delivery } = await createApprovalLink(adapter, { approvalId: step.id, contactKind: 'email', contactValue: contact, displayName: name });
      try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
      toast.success(delivery === 'sent' ? `Lien envoyé à ${contact} · copié` : `Lien créé (démo, non envoyé) · copié : ${url}`);
      onReload();
    } catch (e: any) { toast.error(mapErr(e?.message)); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {decisions.length === 0 && <div style={{ fontSize: 11.5, color: T.sub }}>Aucune décision enregistrée.</div>}
      {decisions.map(ev => {
        const p = ev.payload as any;
        const req = (currentRole(p) || '').toUpperCase();
        return (
          <div key={ev.id}>
            <DecisionChip p={p} />
            {!readOnly && isOpen(p) && (
              rejecting === ev.id ? (
                <div style={{ marginTop: 6, border: `1px solid ${T.line}`, borderRadius: 8, padding: 8 }}>
                  <select value={motive} onChange={e => setMotive(e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 6 }}>
                    {REJECT_MOTIVES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => reject(ev)} style={miniBtn(T.red)}>Confirmer le rejet</button>
                    <button onClick={() => setRejecting(null)} style={{ ...miniBtn(T.sub) }}>Annuler</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                  <button onClick={() => approve(ev)} style={miniBtn(T.green)}><ShieldCheck size={12} /> Valider ({req})</button>
                  <button onClick={() => setRejecting(ev.id)} style={miniBtn(T.sub)}>Rejeter</button>
                  <button onClick={() => makeLink(ev)} style={miniBtn(T.petrol)}><Link2 size={12} /> Faire valider par lien</button>
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Traduit les codes d'erreur de gouvernance serveur en message lisible. */
function mapErr(code?: string): string {
  const m: Record<string, string> = {
    ROLE_REQUIRED: 'Validation réservée au rôle requis de cette étape.',
    SOD_AUTHOR: 'Séparation des tâches : l\'auteur ne valide pas sa décision.',
    SOD_DISTINCT: 'Séparation des tâches : validateurs distincts par étape.',
    NOT_IN_APPROVAL: 'Décision déjà clôturée.',
    NO_PENDING_STEP: 'Aucune étape en attente.',
    MOTIVE_REQUIRED: 'Motif de rejet obligatoire.',
    NO_GOVERNANCE_RULE: 'Aucune règle de gouvernance pour ce type/montant.',
  };
  return (code && m[code]) || code || 'Échec de l\'opération';
}

// ── Onglet Pièces (3 familles juridiques distinctes) ──────────────────────────
function PiecesTab({ events, documents, sp, me, adapter, onReload, readOnly }: {
  events: SpaceEvent[]; documents: DBCollabDocument[]; sp: Space; me: any; adapter: any; onReload: () => void; readOnly: boolean;
}) {
  const { toast } = useToast();
  const ecritures = events.filter(e => e.type === 'ecriture');
  const snaps = events.filter(e => e.type === 'snapshot');
  const fileRef = useRef<HTMLInputElement>(null);

  // Regroupe par nom → version courante (max) + historique.
  const byName = new Map<string, DBCollabDocument[]>();
  for (const d of documents) { const a = byName.get(d.name) || []; a.push(d); byName.set(d.name, a); }

  const onFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.warning('Fichier > 3 Mo (limite v1 inline)'); return; }
    const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
    await addDocument(adapter, { spaceId: sp.id, tenantId: sp.tenantId, name: file.name, dataUrl, size: file.size, mime: file.type, uploadedBy: me.id, uploadedByName: me.name });
    toast.success('Document joint'); onReload();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PieceGroup title="Écritures référencées" color={T.green} count={ecritures.length}>
        {ecritures.length === 0 && <div style={{ fontSize: 11, color: T.sub }}>Aucune écriture liée.</div>}
        {ecritures.map(e => <EcritureChip key={e.id} p={e.payload as EcriturePayload} body={e.body} />)}
      </PieceGroup>
      <PieceGroup title="Snapshots figés" color={T.purple} count={snaps.length}>
        {snaps.length === 0 && <div style={{ fontSize: 11, color: T.sub }}>Aucun snapshot.</div>}
        {snaps.map(e => <SnapshotChip key={e.id} p={e.payload as SnapshotPayload} />)}
      </PieceGroup>
      <PieceGroup title="Documents versionnés" color={T.blue} count={byName.size}>
        {byName.size === 0 && <div style={{ fontSize: 11, color: T.sub }}>Aucun document joint.</div>}
        {[...byName.entries()].map(([name, versions]) => {
          const cur = versions.slice().sort((a, b) => b.version - a.version)[0];
          return (
            <div key={name} style={{ border: `1px solid ${T.blue}33`, background: T.blue + '0a', borderRadius: 9, padding: '8px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={15} color={T.blue} />
                <a href={cur.dataUrl} download={cur.name} style={{ flex: 1, fontSize: 12, fontWeight: 700, color: T.ink, textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</a>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.blue, background: T.blue + '18', borderRadius: 6, padding: '1px 6px' }}>v{cur.version}</span>
              </div>
              {cur.checksum && <div style={{ fontSize: 9.5, color: T.sub, fontFamily: MONO, marginTop: 3 }}>#{cur.checksum} · {versions.length} version(s)</div>}
            </div>
          );
        })}
        {!readOnly && (
          <div>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => onFile(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} style={{ ...miniBtn(T.blue), marginTop: 2 }}><Plus size={12} /> Joindre / versionner un document</button>
          </div>
        )}
      </PieceGroup>
    </div>
  );
}
function PieceGroup({ title, color, count, children }: any) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
        <span style={{ fontSize: 11.5, fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: 10.5, color: T.sub }}>· {count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
    </div>
  );
}

// ── Onglet Diffusion (routage) ────────────────────────────────────────────────
function DiffusionTab({ sp, events }: { sp: Space; events: SpaceEvent[] }) {
  const mentions = events.filter(e => (e.mentions || []).length > 0).length;
  const decisions = events.filter(e => e.type === 'decision' && !(e.payload as DecisionPayload)?.approvedAt).length;
  const rows = [
    { who: sp.responsibleName || 'Responsable', surface: 'Workspace FNA', what: 'Synthèse + validations', state: decisions > 0 ? `${decisions} en attente` : 'à jour' },
    { who: 'Équipe', surface: 'Dock « Mes espaces »', what: 'Mentions + relances', state: `${mentions} mention(s)` },
    { who: 'DAF', surface: 'Digest e-mail 18h', what: 'Décisions > seuil', state: 'programmé' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ fontSize: 11, color: T.sub, marginBottom: 2 }}>Qui reçoit quoi, où — routage rendu visible (CDC §8.4).</div>
      {rows.map((r, i) => (
        <div key={i} style={{ border: `1px solid ${T.softLine}`, borderRadius: 9, padding: '8px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{r.who}</span>
            <span style={{ fontSize: 10, color: T.petrol, background: T.petrol + '10', borderRadius: 6, padding: '1px 7px' }}>{r.surface}</span>
          </div>
          <div style={{ fontSize: 11, color: T.sub, marginTop: 3 }}>{r.what} · <b style={{ color: T.ink }}>{r.state}</b></div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════ CRÉATION D'ESPACE ══════════
function CreateSpaceModal({ me, tenantId, prefill, onClose, onCreated }: {
  me: { id: string; name: string; role: string }; tenantId: string; prefill?: ParsedNewSpace;
  onClose: () => void; onCreated: (id: string) => void;
}) {
  const { adapter } = useData();
  const { toast } = useToast();
  const [title, setTitle] = useState(prefill?.title || '');
  const [problem, setProblem] = useState(prefill?.problem || '');
  const [objective, setObjective] = useState(prefill?.objective || '');
  const [deadline, setDeadline] = useState('');
  const [anchorType, setAnchorType] = useState<keyof typeof ANCHOR_TYPE_LABELS>((prefill?.anchorType as any) || 'reconciliation');
  const [anchorLabel, setAnchorLabel] = useState(prefill?.anchorLabel || '');
  const [account, setAccount] = useState(prefill?.accountCode || '');
  const [initialGap, setInitialGap] = useState(prefill?.initialGap != null ? String(prefill.initialGap) : '');
  const [critLabel, setCritLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const partnerId = prefill?.partnerId;
  const entryId = prefill?.entryId;

  const applyTemplate = (t: SpaceTemplate) => {
    setTemplateId(t.id);
    setAnchorType(t.anchorType as any);
    if (!problem.trim()) setProblem(t.problem);
    if (!objective.trim()) setObjective(t.objective);
    if (!critLabel.trim() && t.manualCriterion) setCritLabel(t.manualCriterion);
  };

  const submit = async () => {
    if (!title.trim() || !problem.trim() || !objective.trim()) { toast.warning('Titre, problème et objectif sont requis'); return; }
    if (!anchorLabel.trim()) { toast.warning('Un espace ne vit pas sans ancrage métier'); return; }
    setBusy(true);
    try {
      // Critère calculé obligatoire : compte à solder si un compte est fourni,
      // sinon un critère manuel saisi.
      const criteria: ExitCriterion[] = [];
      if (account.trim()) criteria.push({ id: crypto.randomUUID?.() || String(Date.now()), label: `Écart ${account.trim()} soldé`, met: false, auto: { kind: 'account_zero', accountCode: account.trim() } });
      if (critLabel.trim()) criteria.push({ id: (crypto.randomUUID?.() || String(Date.now())) + 'm', label: critLabel.trim(), met: false });
      if (criteria.length === 0) criteria.push({ id: 'c0', label: 'Objectif atteint (validation responsable)', met: false });

      const convergence = account.trim() && initialGap
        ? { initialGap: Number(initialGap), source: { kind: 'account_balance' as const, accountCode: account.trim() }, label: `écart ${account.trim()}` }
        : undefined;

      const space = await createSpace(adapter, {
        tenantId, title: title.trim(), problem: problem.trim(), objective: objective.trim(),
        createdBy: me.id, responsibleId: me.id, responsibleName: me.name, deadline: deadline || undefined,
        convergence, exitCriteria: criteria,
        anchors: [{
          type: anchorType, app: 'fna', label: anchorLabel.trim(), isPrimary: true,
          ref: {
            ...(account.trim() ? { accountCode: account.trim() } : {}),
            ...(partnerId ? { partnerId } : {}),
            ...(entryId ? { entryId } : {}),
            ...(prefill?.period ? { period: prefill.period } : {}),
          },
        }],
      });
      // Template → actions types pré-chargées comme checklist de résolution.
      const tpl = SPACE_TEMPLATES.find(t => t.id === templateId);
      if (tpl) {
        for (const label of tpl.actions) {
          await createTask(adapter, { tenantId, spaceId: space.id, title: label, createdBy: me.id }).catch(() => {});
        }
      }
      toast.success('Espace de résolution ouvert');
      onCreated(space.id);
    } catch (e) { console.error(e); toast.error('Échec de la création'); } finally { setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,43,46,.45)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, width: 'min(600px, 100%)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, color: T.petrol, fontWeight: 800 }}>Ouvrir un espace de résolution</h3>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: T.sub, display: 'block', marginBottom: 6 }}>Partir d'un template</span>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {SPACE_TEMPLATES.map(t => (
                <button key={t.id} type="button" onClick={() => applyTemplate(t)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600,
                  border: `1px solid ${templateId === t.id ? T.petrol : T.line}`, color: templateId === t.id ? T.petrol : T.sub,
                  background: templateId === t.id ? T.petrol + '10' : T.surface, borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                }}>{t.icon} {t.label}</button>
              ))}
            </div>
          </div>
          <Field label="Titre">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. Écarts BICICI 521100 — Mars 2026" style={inpFull} />
          </Field>
          <Field label="Problème (constat chiffré, impact, origine)">
            <textarea value={problem} onChange={e => setProblem(e.target.value)} rows={3} placeholder="Ex. 14 120 000 FCFA d'écarts non justifiés sur le compte 521100 constatés à la clôture de mars par la DAF." style={{ ...inpFull, resize: 'vertical' }} />
          </Field>
          <Field label="Objectif de résolution">
            <input value={objective} onChange={e => setObjective(e.target.value)} placeholder="Ex. Ramener l'écart 521100 à zéro, justifié pièce par pièce." style={inpFull} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Type d'ancrage">
              <select value={anchorType} onChange={e => setAnchorType(e.target.value as any)} style={inpFull}>
                {Object.entries(ANCHOR_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Échéance">
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inpFull} />
            </Field>
          </div>
          <Field label="Objet ancré (libellé)">
            <input value={anchorLabel} onChange={e => setAnchorLabel(e.target.value)} placeholder="Ex. Rapprochement 521100 · Mars 2026" style={inpFull} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Compte GL (convergence calculée)">
              <input value={account} onChange={e => setAccount(e.target.value)} placeholder="Ex. 521100" style={{ ...inpFull, fontFamily: MONO }} />
            </Field>
            <Field label="Écart initial (FCFA)">
              <input value={initialGap} onChange={e => setInitialGap(e.target.value)} type="number" placeholder="Ex. 14120000" style={{ ...inpFull, fontFamily: MONO }} />
            </Field>
          </div>
          <Field label="Critère de sortie manuel (optionnel)">
            <input value={critLabel} onChange={e => setCritLabel(e.target.value)} placeholder="Ex. Liasse validée par la DAF" style={inpFull} />
          </Field>
          <div style={{ fontSize: 11, color: T.sub, background: T.cream, borderRadius: 9, padding: '8px 11px', display: 'flex', gap: 7 }}>
            <Sparkles size={14} color={T.petrol} style={{ flexShrink: 0, marginTop: 1 }} />
            La convergence sera <b>calculée depuis le grand livre</b> (jamais saisie). Un critère « compte à solder » se satisfait automatiquement quand le solde atteint zéro.
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${T.line}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ ...btn('#0000'), color: T.sub, border: `1px solid ${T.line}` }}>Annuler</button>
          <button onClick={submit} disabled={busy} style={btn(T.petrol)}>{busy ? 'Création…' : 'Ouvrir l\'espace'}</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════ PETITS COMPOSANTS ══════════
function ConvergenceBar({ bp, compact }: { bp: number; compact?: boolean }) {
  const pct = Math.round(bp / 100);
  const color = pct >= 100 ? T.green : pct >= 50 ? T.gold : T.orange;
  return (
    <div>
      {!compact && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: T.sub, marginBottom: 3 }}>
        <span>Convergence</span><span style={{ fontFamily: MONO, color, fontWeight: 700 }}>{pct}%</span>
      </div>}
      <div style={{ height: compact ? 5 : 7, background: T.softLine, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .4s' }} />
      </div>
    </div>
  );
}
function StatusPill({ status }: { status: SpaceStatus }) {
  const map: Record<SpaceStatus, string> = { ouvert: T.blue, analyse: T.orange, action: T.petrol, resolu: T.green, archive: T.sub, abandonne: T.red };
  const c = map[status];
  return <span style={{ fontSize: 10.5, fontWeight: 700, color: c, background: c + '15', borderRadius: 7, padding: '2px 9px' }}>{SPACE_STATUS_LABELS[status]}</span>;
}
function Stat({ label, value, color, icon: Icon }: any) {
  return (
    <div style={{ flex: 1, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: color + '15', color, display: 'grid', placeItems: 'center' }}><Icon size={17} /></div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: MONO, color: T.ink, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}
function Step({ n, label, children }: { n: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: T.orange }}>{n}</span>
        <span style={{ fontWeight: 800, fontSize: 13, color: T.ink }}>{label}</span>
      </div>
      <div style={{ paddingLeft: 2 }}>{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: T.sub, display: 'block', marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const btn = (bg: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 7, background: bg, color: '#fff', border: 'none',
  borderRadius: 10, padding: '9px 15px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
});
const iconBtn: React.CSSProperties = { display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9, border: `1px solid ${T.line}`, background: T.surface, color: T.sub, cursor: 'pointer' };
const miniBtn = (c: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color: '#fff', background: c, border: 'none', borderRadius: 7, padding: '3px 10px', cursor: 'pointer' });
const inp: React.CSSProperties = { flex: 1, border: `1px solid ${T.line}`, borderRadius: 9, padding: '8px 11px', fontSize: 12.5, outline: 'none', color: T.ink, background: T.surface, minWidth: 0 };
const inpFull: React.CSSProperties = { ...inp, width: '100%', boxSizing: 'border-box' };
