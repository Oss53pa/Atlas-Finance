/**
 * ÉTATS DE GOUVERNANCE (Doc Maître §C10) — console lecture seule. Registre des
 * circuits actifs, matrice « qui valide quoi » générée des données (document du
 * CAC), statistiques de validation. Source : tables wf_* (RLS SELECT tenant).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, GitBranch, Table2, BarChart3, PenLine, KeyRound, Clock } from 'lucide-react';
import { loadGovernance, OBJECT_TYPE_LABELS, type GovernanceData } from '../../features/validation/mvaGovernanceService';

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
  const tenantId = user?.company_id || (typeof localStorage !== 'undefined' && localStorage.getItem('atlas-tenant-id')) || 'default';
  const [data, setData] = useState<GovernanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setData(await loadGovernance(adapter, tenantId)); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [adapter, tenantId]);
  useEffect(() => { load(); }, [load]);

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

        {/* Matrice qui valide quoi */}
        <Section title="Matrice « qui valide quoi »" icon={Table2}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead><tr style={{ background: T.cream }}>
                <th style={th}>Objet</th><th style={th}>Condition</th><th style={th}>Circuit</th><th style={th}>Chaîne de validation</th>
              </tr></thead>
              <tbody>
                {data.matrix.map((r, i) => (
                  <tr key={i}>
                    <td style={td}>{OBJECT_TYPE_LABELS[r.object_type] || r.object_type}</td>
                    <td style={{ ...td, color: r.is_default ? T.sub : T.ink, fontStyle: r.is_default ? 'italic' : 'normal' }}>{r.condition}</td>
                    <td style={td}>{r.definition_name}</td>
                    <td style={td}><span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>{r.chain.map((role, j) => <React.Fragment key={j}>{j > 0 && <span style={{ color: T.sub }}>→</span>}<RoleChip role={role} /></React.Fragment>)}</span></td>
                  </tr>
                ))}
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
