/**
 * ÉTATS DE GOUVERNANCE (Doc Maître §C10) — console lecture seule. Registre des
 * circuits actifs, matrice « qui valide quoi » générée des données (document du
 * CAC), statistiques de validation. Source : tables wf_* (RLS SELECT tenant).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { ShieldCheck, GitBranch, Table2, BarChart3, KeyRound, Clock, PlayCircle } from 'lucide-react';
import { loadGovernance, simulateCircuit, wfAdmin, OBJECT_TYPE_LABELS, type GovernanceData, type CircuitStage } from '../../features/validation/mvaGovernanceService';

const T = { cream: '#F2EFE8', surface: '#FFFFFF', petrol: '#1E5A64', orange: '#E8912D', gold: '#C97E12', green: '#2E9E6B', red: '#E24B4A', purple: '#7C5CBF', ink: '#1C2B2E', sub: '#607377', line: '#E6E0D4', softLine: '#EFEAE0' };
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const ROLE_C: Record<string, string> = { comptable: T.petrol, daf: T.orange, dg: T.red };
const MOTIVE_LABELS: Record<string, string> = { piece_manquante: 'Pièce manquante', montant_conteste: 'Montant contesté', imputation_erronee: 'Imputation erronée', opportunite: 'Opportunité', autre: 'Autre' };

function RoleChip({ role }: { role: string }) {
  const c = ROLE_C[role] || T.sub;
  return <span style={{ fontSize: 10.5, fontWeight: 700, color: c, background: c + '15', borderRadius: 6, padding: '2px 8px' }}>{role.toUpperCase()}</span>;
}
function SigIcon({ level }: { level: string }) {
  if (level === 'otp') return <span title="Signature OTP" style={{ color: T.orange, display: 'inline-flex' }}><KeyRound size={12} /></span>;
  if (level === 'webauthn') return <span title="WebAuthn" style={{ color: T.red, display: 'inline-flex' }}><ShieldCheck size={12} /></span>;
  return null;
}

export default function GouvernancePage() {
  const { adapter } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const tenantId = user?.company_id || (typeof localStorage !== 'undefined' && localStorage.getItem('atlas-tenant-id')) || 'default';
  const isAdmin = ['admin', 'owner', 'super_admin', 'manager', 'daf', 'dg', 'directeur'].includes((user?.role || '').toLowerCase());
  const [data, setData] = useState<GovernanceData | null>(null);
  const [loading, setLoading] = useState(true);
  // Simulation à blanc
  const [simType, setSimType] = useState('journal_entry');
  const [simAmount, setSimAmount] = useState('');
  const [simFlags, setSimFlags] = useState('');
  const [simRes, setSimRes] = useState<{ definitionName: string; stages: CircuitStage[] } | null>(null);

  const load = useCallback(async () => {
    try { setData(await loadGovernance(adapter, tenantId)); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [adapter, tenantId]);
  useEffect(() => { load(); }, [load]);

  const runSim = async () => {
    const payload: any = {};
    if (simAmount) payload.amount_xof = Number(simAmount);
    if (simFlags.trim()) payload.flags = simFlags.split(',').map(s => s.trim()).filter(Boolean);
    try { setSimRes(await simulateCircuit(adapter, tenantId, simType, payload)); }
    catch (e: any) { toast.error(e?.message || 'Échec de la simulation'); }
  };
  const toggleRule = async (ruleId: string, active: boolean) => {
    try { await wfAdmin(adapter, { op: 'toggle_rule', rule_id: ruleId, active }); toast.success(active ? 'Règle activée' : 'Règle désactivée'); load(); }
    catch (e: any) { toast.error(e?.message === 'ADMIN_REQUIRED' ? 'Réservé aux administrateurs / DAF.' : (e?.message || 'Échec')); }
  };

  const circuitsByType = useMemo(() => {
    const m: Record<string, GovernanceData['circuits']> = {};
    for (const c of data?.circuits ?? []) (m[c.object_type] ||= []).push(c);
    return m;
  }, [data]);

  if (loading) return <div style={{ padding: 40, color: T.sub, background: T.cream, minHeight: '100%' }}>Chargement…</div>;
  if (!data) return <div style={{ padding: 40, color: T.sub, background: T.cream, minHeight: '100%' }}>Gouvernance disponible en mode SaaS.</div>;

  const s = data.stats;
  return (
    <div style={{ background: T.cream, minHeight: '100%', color: T.ink, fontFamily: 'Exo 2, system-ui, sans-serif', padding: '22px 26px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <h1 style={{ fontSize: 23, fontWeight: 800, margin: 0, color: T.petrol, display: 'flex', alignItems: 'center', gap: 9 }}><ShieldCheck size={22} /> États de gouvernance</h1>
        <p style={{ margin: '4px 0 18px', color: T.sub, fontSize: 13.5 }}>Registre des circuits de validation, matrice « qui valide quoi » (générée des données), statistiques. Le document opposable au commissaire aux comptes.</p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
          <Stat label="Dossiers en cours" value={s.inReview} color={T.petrol} icon={Clock} />
          <Stat label="Appliqués" value={s.applied} color={T.green} icon={ShieldCheck} />
          <Stat label="Rejetés" value={s.rejected} color={T.red} icon={BarChart3} />
          <Stat label="Taux de rejet" value={`${Math.round(s.rejectionRate * 100)}%`} color={T.orange} icon={BarChart3} />
        </div>

        {/* Simulation à blanc */}
        <Section title="Simulation à blanc" icon={PlayCircle}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label><span style={simLbl}>Type d'objet</span>
              <select value={simType} onChange={e => { setSimType(e.target.value); setSimRes(null); }} style={simField}>
                {data.registry.map(r => <option key={r.object_type} value={r.object_type}>{r.label}</option>)}
              </select>
            </label>
            <label><span style={simLbl}>Montant FCFA</span><input value={simAmount} onChange={e => setSimAmount(e.target.value)} type="number" placeholder="0" style={{ ...simField, width: 140, fontFamily: MONO }} /></label>
            <label><span style={simLbl}>Indicateurs (ex. rib_change)</span><input value={simFlags} onChange={e => setSimFlags(e.target.value)} placeholder="séparés par ," style={{ ...simField, width: 180 }} /></label>
            <button onClick={runSim} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.petrol, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 15px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><PlayCircle size={15} /> Simuler</button>
          </div>
          {simRes && (
            <div style={{ marginTop: 12, border: `1px solid ${T.softLine}`, borderRadius: 10, padding: 12, background: T.cream }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>Circuit résolu : {simRes.definitionName}</div>
              {simRes.stages.length === 0 ? <div style={{ fontSize: 12, color: T.red }}>Aucun circuit (NO_WORKFLOW).</div> :
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {simRes.stages.map((st, i) => <React.Fragment key={i}>{i > 0 && <span style={{ color: T.sub }}>→</span>}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${T.line}`, borderRadius: 8, padding: '3px 8px', background: T.surface }}><RoleChip role={st.required_role} /><SigIcon level={st.signature_level} /><span style={{ fontSize: 10, color: T.sub }}>SLA {st.sla_hours}h</span></span>
                  </React.Fragment>)}
                </div>}
            </div>
          )}
        </Section>

        {/* Matrice qui valide quoi */}
        <Section title="Matrice « qui valide quoi »" icon={Table2}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead><tr style={{ background: T.cream }}>
                <th style={th}>Objet</th><th style={th}>Condition</th><th style={th}>Circuit</th><th style={th}>Chaîne de validation</th>{isAdmin && <th style={th}>État</th>}
              </tr></thead>
              <tbody>
                {data.matrix.map((r, i) => {
                  const inactive = r.active === false;
                  return (
                    <tr key={i} style={{ opacity: inactive ? 0.5 : 1 }}>
                      <td style={td}>{OBJECT_TYPE_LABELS[r.object_type] || r.object_type}</td>
                      <td style={{ ...td, color: r.is_default ? T.sub : T.ink, fontStyle: r.is_default ? 'italic' : 'normal' }}>{r.condition}</td>
                      <td style={td}>{r.definition_name}</td>
                      <td style={td}><span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>{r.chain.map((role, j) => <React.Fragment key={j}>{j > 0 && <span style={{ color: T.sub }}>→</span>}<RoleChip role={role} /></React.Fragment>)}</span></td>
                      {isAdmin && <td style={td}>{r.rule_id ? (
                        <button onClick={() => toggleRule(r.rule_id!, inactive)} style={{ fontSize: 10.5, fontWeight: 700, border: `1px solid ${inactive ? T.line : T.green}`, color: inactive ? T.sub : T.green, background: inactive ? T.surface : T.green + '12', borderRadius: 6, padding: '2px 9px', cursor: 'pointer' }}>{inactive ? 'Inactif' : 'Actif'}</button>
                      ) : <span style={{ fontSize: 10.5, color: T.sub }}>défaut</span>}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Circuits actifs */}
        <Section title="Circuits actifs" icon={GitBranch}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Object.entries(circuitsByType).map(([type, list]) => (
              <div key={type}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: T.petrol, marginBottom: 7 }}>{OBJECT_TYPE_LABELS[type] || type}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {list!.map(c => (
                    <div key={c.id} style={{ border: `1px solid ${T.softLine}`, borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{c.name}</span>
                        <span style={{ fontSize: 10, color: T.sub, fontFamily: MONO }}>v{c.version}</span>
                        {c.is_default && <span style={{ fontSize: 9.5, color: T.green, background: T.green + '15', borderRadius: 5, padding: '1px 6px' }}>par défaut</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {c.stages.map((st, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <span style={{ color: T.sub }}>→</span>}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${T.line}`, borderRadius: 8, padding: '3px 8px' }}>
                              <RoleChip role={st.required_role} /><SigIcon level={st.signature_level} />
                              <span style={{ fontSize: 10, color: T.sub }}>SLA {st.sla_hours}h</span>
                              {st.escalate_to_role && <span style={{ fontSize: 9.5, color: T.red }}>↑{st.escalate_to_role}</span>}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Motifs de rejet + délai */}
        <Section title="Analyse des rejets & délais" icon={BarChart3}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: T.sub, marginBottom: 8 }}>Motifs de rejet</div>
              {Object.keys(s.motives).length === 0 ? <div style={{ fontSize: 12, color: T.sub }}>Aucun rejet.</div> :
                Object.entries(s.motives).sort((a, b) => b[1] - a[1]).map(([m, n]) => (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, flex: 1 }}>{MOTIVE_LABELS[m] || m}</span>
                    <div style={{ width: 120, height: 7, background: T.softLine, borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${Math.min(100, n / Math.max(1, s.rejected) * 100)}%`, height: '100%', background: T.red }} /></div>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: T.ink, width: 22, textAlign: 'right' }}>{n}</span>
                  </div>
                ))}
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: T.sub, marginBottom: 8 }}>Délai moyen de résolution</div>
              <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 800, color: T.petrol }}>{s.avgResolutionDays != null ? `${s.avgResolutionDays.toFixed(1)} j` : '—'}</div>
              <div style={{ fontSize: 11.5, color: T.sub, marginTop: 8 }}>Objets validatables : {data.registry.length} · sensibles : {data.registry.filter(r => r.sensitivity === 'critical' || r.sensitivity === 'high').length}</div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Stat({ label, value, color, icon: Icon }: any) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: color + '15', color, display: 'grid', placeItems: 'center' }}><Icon size={17} /></div>
      <div><div style={{ fontSize: 20, fontWeight: 800, fontFamily: MONO, color: T.ink, lineHeight: 1 }}>{value}</div><div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{label}</div></div>
    </div>
  );
}
function Section({ title, icon: Icon, children }: any) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Icon size={17} color={T.petrol} /><h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{title}</h2></div>
      {children}
    </div>
  );
}
const th: React.CSSProperties = { textAlign: 'left', padding: '7px 10px', color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.line}`, fontSize: 11 };
const td: React.CSSProperties = { padding: '7px 10px', borderBottom: `1px solid ${T.softLine}` };
const simLbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: T.sub, display: 'block', marginBottom: 4 };
const simField: React.CSSProperties = { border: `1px solid ${T.line}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, outline: 'none', color: T.ink, background: T.surface };
