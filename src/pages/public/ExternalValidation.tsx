/**
 * Page publique de validation externe (Doc Maître §B6) — hors shell authentifié.
 * Un validateur nominal (DG, expert-comptable…) sans compte FNA ouvre `/validate/:token`,
 * consulte le détail de la décision + le snapshot figé, puis approuve/rejette par OTP.
 * Périmètre strict : une seule décision, aucune navigation, seules les API approval-link.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const T = { cream: '#F2EFE8', surface: '#FFFFFF', petrol: '#1E5A64', orange: '#E8912D', gold: '#C97E12', green: '#2E9E6B', red: '#E24B4A', purple: '#7C5CBF', ink: '#1C2B2E', sub: '#607377', line: '#E6E0D4' };
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const fmt = (n?: number | null) => (n == null ? '—' : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '));

const API = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approval-link`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
async function call(body: any) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

const ERR: Record<string, string> = {
  LINK_INVALID: 'Ce lien est invalide.', LINK_REVOKED: 'Ce lien a été révoqué.', LINK_USED: 'Ce lien a déjà été utilisé.',
  LINK_EXPIRED: 'Ce lien a expiré.', INVALIDATED_OBJECT_CHANGED: 'La décision a changé depuis l\'émission du lien — dossier invalidé.',
  OTP_WRONG: 'Code incorrect.', OTP_FROZEN: 'Trop de tentatives — lien gelé.', OTP_REQUIRED: 'Demandez d\'abord un code.',
  STEP_NOT_ACTIONABLE: 'Cette étape n\'est plus en attente.', MOTIVE_REQUIRED: 'Motif de rejet obligatoire.',
};
const MOTIVES = [['piece_manquante', 'Pièce manquante'], ['montant_conteste', 'Montant contesté'], ['imputation_erronee', 'Imputation erronée'], ['opportunite', 'Opportunité'], ['autre', 'Autre']];

export default function ExternalValidation() {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<'load' | 'ready' | 'act' | 'done'>('load');
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [motive, setMotive] = useState('piece_manquante');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const load = useCallback(async () => {
    const { ok, data } = await call({ op: 'view', token });
    if (!ok) { setErr(ERR[data.error] || 'Lien inaccessible.'); setPhase('done'); return; }
    setView(data); setPhase('ready');
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const start = async (a: 'approve' | 'reject') => {
    setAction(a); setErr(null); setBusy(true);
    const { ok, data } = await call({ op: 'request_otp', token });
    setBusy(false);
    if (!ok) { setErr(ERR[data.error] || 'Échec.'); return; }
    if (data.demo && data.otp) setDemoOtp(data.otp);
    setPhase('act');
  };
  const submit = async () => {
    setErr(null); setBusy(true);
    const { ok, data } = await call({ op: 'act', token, otp, action, motive_code: action === 'reject' ? motive : undefined });
    setBusy(false);
    if (!ok) { setErr(ERR[data.error] || 'Échec.'); return; }
    setResult(data); setPhase('done');
  };

  const d = view?.decision;

  return (
    <div style={{ minHeight: '100vh', background: T.cream, color: T.ink, fontFamily: 'Exo 2, system-ui, sans-serif', padding: '0 0 40px' }}>
      {/* Bandeau consultation externe */}
      <div style={{ background: T.petrol, color: '#fff', padding: '9px 16px', fontSize: 12.5, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        🔒 Consultation externe · lien nominatif{view?.display_name ? ` · ${view.display_name}` : ''}{view?.expires_at ? ` · expire le ${new Date(view.expires_at).toLocaleString('fr-FR')}` : ''}
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ fontFamily: 'Grand Hotel, cursive', fontSize: 30, color: T.petrol, textAlign: 'center', marginBottom: 6 }}>Atlas FnA</div>

        {phase === 'load' && <Card><div style={{ color: T.sub, textAlign: 'center' }}>Chargement…</div></Card>}

        {phase === 'done' && err && <Card><div style={{ color: T.red, fontWeight: 700, textAlign: 'center' }}>⚠ {err}</div></Card>}

        {phase === 'done' && result && (
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 42 }}>{result.confirmation === 'approved' ? '✅' : '⛔'}</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginTop: 6 }}>
                {result.confirmation === 'approved' ? 'Validation enregistrée' : 'Décision rejetée'}
              </div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 8, lineHeight: 1.5 }}>
                {result.ref} · {result.final ? `étape finale ${result.step}/${result.total}` : result.next_role ? `étape ${result.step}/${result.total} — reste ${String(result.next_role).toUpperCase()}` : ''}
                <br />Enregistré le {new Date().toLocaleString('fr-FR')}. Un accusé vous a été adressé.
              </div>
              <div style={{ fontSize: 11.5, color: T.sub, marginTop: 12, fontStyle: 'italic' }}>Ce lien est désormais désactivé.</div>
            </div>
          </Card>
        )}

        {d && (phase === 'ready' || phase === 'act') && (
          <>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: 'uppercase', letterSpacing: .5 }}>{d.decision_type?.replace('_', ' ')}</span>
                <span style={{ fontFamily: MONO, fontSize: 12, color: T.orange, fontWeight: 700 }}>{d.ref}</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, marginTop: 6 }}>{d.title}</div>
              {d.body && <div style={{ fontSize: 13, color: T.ink, marginTop: 6, lineHeight: 1.5 }}>{d.body}</div>}
              {d.amount_xof != null && <div style={{ fontFamily: MONO, fontSize: 22, color: T.gold, fontWeight: 800, marginTop: 10 }}>{fmt(d.amount_xof)} FCFA</div>}
              {d.rule_label && <div style={{ fontSize: 11.5, color: T.sub, marginTop: 8 }}>🛡 {d.rule_label}</div>}
              {/* Chaîne */}
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {(view.chain || []).map((a: any) => {
                  const c = a.status === 'approved' ? T.green : a.status === 'rejected' ? T.red : a.position === d.current_step ? T.orange : T.sub;
                  const sym = a.status === 'approved' ? '✓' : a.status === 'rejected' ? '✗' : a.position === d.current_step ? '➤' : '·';
                  return <span key={a.position} style={{ fontSize: 11, fontWeight: 700, color: c, background: c + '15', borderRadius: 6, padding: '2px 9px' }}>{sym} {String(a.required_role).toUpperCase()}{a.approver_name ? ` · ${a.approver_name}` : ''}</span>;
                })}
              </div>
              {view.space && <div style={{ fontSize: 11.5, color: T.sub, marginTop: 10, borderTop: `1px solid ${T.line}`, paddingTop: 8 }}><b>Espace :</b> {view.space.name}{view.space.problem ? ` — ${view.space.problem}` : ''}</div>}
              <div style={{ fontSize: 11.5, color: T.petrol, marginTop: 8, fontWeight: 700 }}>Votre étape : {String(view.step?.required_role).toUpperCase()} (position {view.step?.position})</div>
            </Card>

            {/* Snapshot figé éventuel */}
            {view.snapshot && (
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <span style={{ color: T.purple }}>📸</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{view.snapshot.title || 'Snapshot'}</span>
                  {view.snapshot.hash && <span style={{ marginLeft: 'auto', fontSize: 10, color: T.sub, fontFamily: MONO }}>#{view.snapshot.hash}</span>}
                </div>
                {Array.isArray(view.snapshot.columns) && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ fontSize: 11.5, borderCollapse: 'collapse', width: '100%' }}>
                      <thead><tr>{view.snapshot.columns.map((c: string, i: number) => <th key={i} style={{ textAlign: 'left', padding: '3px 8px', color: T.sub, borderBottom: `1px solid ${T.line}` }}>{c}</th>)}</tr></thead>
                      <tbody>{(view.snapshot.rows || []).slice(0, 8).map((r: any[], ri: number) => <tr key={ri}>{r.map((cell, ci) => <td key={ci} style={{ padding: '3px 8px', fontFamily: typeof cell === 'number' ? MONO : undefined, color: typeof cell === 'number' ? T.gold : T.ink }}>{typeof cell === 'number' ? fmt(cell) : cell}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                )}
                <div style={{ fontSize: 10, color: T.sub, marginTop: 6 }}>Figé le {view.snapshot.frozenAt ? new Date(view.snapshot.frozenAt).toLocaleString('fr-FR') : '—'} · immuable</div>
              </Card>
            )}

            {/* Zone d'acte */}
            <Card>
              {err && <div style={{ color: T.red, fontSize: 12.5, marginBottom: 10, fontWeight: 600 }}>⚠ {err}</div>}
              {phase === 'ready' && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button disabled={busy} onClick={() => start('approve')} style={btn(T.green)}>Approuver</button>
                  <button disabled={busy} onClick={() => start('reject')} style={btn(T.red)}>Rejeter</button>
                </div>
              )}
              {phase === 'act' && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{action === 'approve' ? 'Confirmer l\'approbation' : 'Confirmer le rejet'}</div>
                  {action === 'reject' && (
                    <select value={motive} onChange={e => setMotive(e.target.value)} style={{ ...field, marginBottom: 8 }}>
                      {MOTIVES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  )}
                  {demoOtp && (
                    <div style={{ fontSize: 11.5, background: '#FFF6E5', border: `1px dashed ${T.orange}`, borderRadius: 8, padding: '7px 10px', marginBottom: 8, color: '#8a5a00' }}>
                      Mode démo (livraison non configurée) — code à usage unique : <b style={{ fontFamily: MONO }}>{demoOtp}</b>
                    </div>
                  )}
                  <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Code à 6 chiffres" inputMode="numeric" style={{ ...field, fontFamily: MONO, letterSpacing: 4, textAlign: 'center', fontSize: 18 }} />
                  <button disabled={busy || otp.length !== 6} onClick={submit} style={{ ...btn(action === 'approve' ? T.green : T.red), width: '100%', marginTop: 10, opacity: otp.length === 6 ? 1 : .5 }}>
                    {busy ? '…' : action === 'approve' ? 'Valider' : 'Confirmer le rejet'}
                  </button>
                </div>
              )}
            </Card>
          </>
        )}

        <div style={{ textAlign: 'center', fontSize: 10.5, color: T.sub, marginTop: 16 }}>Atlas FNA · gouvernance des validations · lien à usage unique</div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(30,90,100,.05)' }}>{children}</div>;
}
const btn = (bg: string): React.CSSProperties => ({ flex: 1, background: bg, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' });
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: `1px solid ${T.line}`, borderRadius: 9, padding: '10px 12px', fontSize: 14, outline: 'none', color: T.ink, background: T.surface };
