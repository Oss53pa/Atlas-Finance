/**
 * BANNETTE — parapheur unifié du Moteur de Validation Atlas (Doc Maître §C7).
 * Une seule file « À valider », tous types d'objets confondus. Carte : type+réf,
 * montant, auteur, ancienneté, indicateur SLA, contexte de circuit ; actions
 * Approuver (signature si exigée) / Rejeter (motif). Souverain serveur.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { Avatar } from '../../components/ui';
import { Inbox, ShieldCheck, PenLine, Clock, AlertTriangle, Plus, X, Layers, History } from 'lucide-react';
import {
  listBannette, wfAct, wfSubmit, listInstanceEvents, mvaErr, OBJECT_TYPE_LABELS,
  type BannetteTask,
} from '../../features/validation/mvaService';

const T = { cream: '#F2EFE8', surface: '#FFFFFF', petrol: '#1E5A64', orange: '#E8912D', gold: '#C97E12', green: '#2E9E6B', red: '#E24B4A', ink: '#1C2B2E', sub: '#607377', line: '#E6E0D4', softLine: '#EFEAE0' };
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const fmt = (n?: number | null) => (n == null ? '—' : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
const MOTIVES = [['piece_manquante', 'Pièce manquante'], ['montant_conteste', 'Montant contesté'], ['imputation_erronee', 'Imputation erronée'], ['opportunite', 'Opportunité'], ['autre', 'Autre']];

function slaState(dueAt: string | null): { color: string; label: string } {
  if (!dueAt) return { color: T.sub, label: '—' };
  const ms = new Date(dueAt).getTime() - Date.now();
  if (ms < 0) return { color: T.red, label: 'En retard' };
  if (ms < 6 * 3600000) return { color: T.orange, label: `${Math.round(ms / 3600000)} h` };
  return { color: T.green, label: `${Math.round(ms / 3600000)} h` };
}

export default function BannettePage() {
  const { adapter } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const tenantId = user?.company_id || (typeof localStorage !== 'undefined' && localStorage.getItem('atlas-tenant-id')) || 'default';
  const me = useMemo(() => ({ id: user?.id || 'me', name: user?.name || user?.email || 'Moi', role: (user?.role || 'comptable') as string }), [user]);

  const [tasks, setTasks] = useState<BannetteTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [motive, setMotive] = useState('piece_manquante');
  const [showSubmit, setShowSubmit] = useState(false);
  const [auditFor, setAuditFor] = useState<string | null>(null);
  const [audit, setAudit] = useState<any[]>([]);

  const load = useCallback(async () => {
    try { setTasks(await listBannette(adapter, tenantId, me.role)); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [adapter, tenantId, me.role]);
  useEffect(() => { load(); }, [load]);

  const act = async (t: BannetteTask, action: 'approve' | 'reject', motiveCode?: string) => {
    // Si l'étape exige une signature, la fonction renvoie SIGNATURE_REQUIRED → on re-tente signé.
    try {
      const res = await wfAct(adapter, { taskId: t.id, action, motiveCode, actorName: me.name });
      toast.success(action === 'approve' ? (res.status === 'applied' ? 'Validé & appliqué' : `Étape validée${res.next_role ? ` · reste ${res.next_role.toUpperCase()}` : ''}`) : 'Rejeté');
      setRejecting(null); load();
    } catch (e: any) {
      if (e?.message === 'SIGNATURE_REQUIRED') {
        // Re-tente avec signature (v1 : clic authentifié tient lieu de signature).
        try { const res = await wfAct(adapter, { taskId: t.id, action, motiveCode, actorName: me.name, signed: true }); toast.success(res.status === 'applied' ? 'Signé, validé & appliqué' : 'Signé & validé'); setRejecting(null); load(); return; }
        catch (e2: any) { toast.error(mvaErr(e2?.message)); return; }
      }
      toast.error(mvaErr(e?.message));
    }
  };

  const openAudit = async (instanceId: string) => {
    setAuditFor(instanceId); setAudit(await listInstanceEvents(adapter, instanceId));
  };

  return (
    <div style={{ background: T.cream, minHeight: '100%', color: T.ink, fontFamily: 'Exo 2, system-ui, sans-serif', padding: '22px 26px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18, maxWidth: 980, margin: '0 auto 18px' }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, margin: 0, color: T.petrol, display: 'flex', alignItems: 'center', gap: 9 }}><Inbox size={22} /> Bannette · À valider</h1>
          <p style={{ margin: '4px 0 0', color: T.sub, fontSize: 13.5 }}>Parapheur unifié — tous les objets en attente de votre validation, tous types confondus.</p>
        </div>
        <button onClick={() => setShowSubmit(true)} style={btn(T.petrol)}><Plus size={16} /> Soumettre un objet</button>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {loading ? <div style={{ color: T.sub, textAlign: 'center', padding: 40 }}>Chargement…</div>
          : tasks.length === 0 ? (
            <div style={{ background: T.surface, border: `1px dashed ${T.line}`, borderRadius: 16, padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ width: 50, height: 50, borderRadius: 13, background: T.green + '15', color: T.green, display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}><ShieldCheck size={26} /></div>
              <h3 style={{ margin: 0, fontSize: 16 }}>Rien à valider</h3>
              <p style={{ color: T.sub, fontSize: 13, marginTop: 6 }}>Aucun objet en attente de votre rôle ({me.role}).</p>
            </div>
          ) : tasks.map(t => {
            const inst = t.instance!; const p = inst.object_preview || {};
            const sla = slaState(t.due_at);
            const mine = String(inst.submitted_by) === String(me.id);
            return (
              <div key={t.id} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 13, padding: 14, borderLeft: `3px solid ${sla.color}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: T.petrol, background: T.petrol + '12', borderRadius: 6, padding: '2px 8px' }}>{OBJECT_TYPE_LABELS[inst.object_type] || inst.object_type}</span>
                      {p.ref && <span style={{ fontFamily: MONO, fontSize: 11, color: T.orange, fontWeight: 700 }}>{p.ref}</span>}
                      <span style={{ fontSize: 11, color: T.sub, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Layers size={11} /> étape {inst.current_stage} · {t.required_role.toUpperCase()}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: sla.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{sla.color === T.red ? <AlertTriangle size={12} /> : <Clock size={12} />} {sla.label}</span>
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 6 }}>{p.title || inst.object_id}</div>
                    {p.amount_xof != null && <div style={{ fontFamily: MONO, fontSize: 17, color: T.gold, fontWeight: 800, marginTop: 3 }}>{fmt(p.amount_xof)} FCFA</div>}
                    {p.detail && <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>{p.detail}</div>}
                    <button onClick={() => openAudit(inst.id)} style={{ marginTop: 7, fontSize: 11, color: T.petrol, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}><History size={12} /> Piste d'audit</button>
                  </div>
                </div>
                {/* actions */}
                {rejecting === t.id ? (
                  <div style={{ marginTop: 10, borderTop: `1px solid ${T.softLine}`, paddingTop: 10 }}>
                    <select value={motive} onChange={e => setMotive(e.target.value)} style={{ ...field, marginBottom: 8, maxWidth: 240 }}>
                      {MOTIVES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => act(t, 'reject', motive)} style={miniBtn(T.red)}>Confirmer le rejet</button>
                      <button onClick={() => setRejecting(null)} style={miniBtn(T.sub)}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, borderTop: `1px solid ${T.softLine}`, paddingTop: 10 }}>
                    <button disabled={mine} title={mine ? 'SoD : vous êtes l\'auteur' : ''} onClick={() => act(t, 'approve')} style={{ ...miniBtn(T.green), opacity: mine ? .5 : 1, cursor: mine ? 'not-allowed' : 'pointer' }}><ShieldCheck size={13} /> Approuver</button>
                    <button disabled={mine} onClick={() => setRejecting(t.id)} style={{ ...miniBtn(T.sub), opacity: mine ? .5 : 1 }}>Rejeter</button>
                    {mine && <span style={{ fontSize: 11, color: T.sub, alignSelf: 'center' }}>Vous êtes l'auteur (SoD)</span>}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {showSubmit && <SubmitModal adapter={adapter} onClose={() => setShowSubmit(false)} onDone={() => { setShowSubmit(false); load(); }} />}
      {auditFor && <AuditDrawer events={audit} onClose={() => setAuditFor(null)} />}
    </div>
  );
}

// ── Soumission d'un objet (démo/manuel) ───────────────────────────────────────
function SubmitModal({ adapter, onClose, onDone }: { adapter: any; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [objectType, setObjectType] = useState('journal_entry');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [journal, setJournal] = useState('OD');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) { toast.warning('Libellé requis'); return; }
    setBusy(true);
    try {
      const amt = amount ? Number(amount) : 0;
      const objectId = `manual-${objectType}-${Date.now()}`;
      const res = await wfSubmit(adapter, {
        objectType, objectId,
        preview: { title: title.trim(), amount_xof: amt, ref: objectId.slice(-8).toUpperCase(), detail: `${objectType} · journal ${journal}` },
        payload: { amount_xof: amt, journal_code: journal },
      });
      toast.success(`Soumis · circuit « ${res.definition} » (${res.stages.length} étape(s))`);
      onDone();
    } catch (e: any) { toast.error(mvaErr(e?.message)); } finally { setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,43,46,.45)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, width: 'min(460px, 100%)', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ padding: '15px 18px', borderBottom: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 15.5, color: T.petrol, fontWeight: 800 }}>Soumettre un objet à validation</h3>
          <button onClick={onClose} style={{ ...miniBtn(T.sub), padding: 6 }}><X size={16} /></button>
        </div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 11 }}>
          <label><span style={lbl}>Type d'objet</span>
            <select value={objectType} onChange={e => setObjectType(e.target.value)} style={field}>
              <option value="journal_entry">Écriture (OD)</option>
              <option value="entry_reversal">Extourne</option>
            </select>
          </label>
          <label><span style={lbl}>Libellé</span><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. OD régularisation charges" style={field} /></label>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ flex: 1 }}><span style={lbl}>Montant FCFA</span><input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0" style={{ ...field, fontFamily: MONO }} /></label>
            <label style={{ width: 110 }}><span style={lbl}>Journal</span><input value={journal} onChange={e => setJournal(e.target.value)} style={field} /></label>
          </div>
          <div style={{ fontSize: 11, color: T.sub, background: T.cream, borderRadius: 9, padding: '8px 11px' }}>Le circuit est résolu par la matrice du tenant (ex. OD ≥ 1 000 000 → Comptable puis DAF). L'objet est figé par hash à la soumission.</div>
        </div>
        <div style={{ padding: '13px 18px', borderTop: `1px solid ${T.line}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ ...miniBtn(T.sub), background: 'none', color: T.sub, border: `1px solid ${T.line}` }}>Annuler</button>
          <button onClick={submit} disabled={busy} style={btn(T.petrol)}>{busy ? 'Soumission…' : 'Soumettre'}</button>
        </div>
      </div>
    </div>
  );
}

function AuditDrawer({ events, onClose }: { events: any[]; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,43,46,.4)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(420px, 100%)', background: T.surface, height: '100%', overflowY: 'auto', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: T.petrol, fontWeight: 800, display: 'flex', gap: 7, alignItems: 'center' }}><History size={17} /> Piste d'audit</h3>
          <button onClick={onClose} style={{ ...miniBtn(T.sub), padding: 6 }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {events.map((e, i) => (
            <div key={e.id} style={{ display: 'flex', gap: 10, paddingBottom: 14, position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 9, height: 9, borderRadius: 5, background: T.petrol, marginTop: 4 }} />
                {i < events.length - 1 && <div style={{ width: 2, flex: 1, background: T.softLine }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{e.event_type}</div>
                <div style={{ fontSize: 10.5, color: T.sub, fontFamily: MONO }}>{new Date(e.created_at).toLocaleString('fr-FR')} · {e.actor_kind}</div>
                {e.event_hash && <div style={{ fontSize: 9, color: T.sub, fontFamily: MONO, marginTop: 2 }}>#{String(e.event_hash).slice(0, 16)}…</div>}
              </div>
            </div>
          ))}
          {events.length === 0 && <div style={{ fontSize: 12, color: T.sub }}>Aucun événement.</div>}
        </div>
      </div>
    </div>
  );
}

const btn = (bg: string): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 7, background: bg, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 15px', fontSize: 13, fontWeight: 700, cursor: 'pointer' });
const miniBtn = (c: string): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#fff', background: c, border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' });
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: `1px solid ${T.line}`, borderRadius: 9, padding: '8px 11px', fontSize: 13, outline: 'none', color: T.ink, background: T.surface };
const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: T.sub, display: 'block', marginBottom: 4 };
