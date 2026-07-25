/**
 * ExecutiveDigest — « Vue Dirigeant » (/executive/digest).
 *
 * Tableau de bord exécutif condensé pour un dirigeant, ENTIÈREMENT branché sur
 * les données réelles du grand livre (source unique `computeDashboardMetrics` +
 * agrégation SYSCOHADA des classes 6/7/5) — aucune donnée factice :
 *   - 4 indicateurs clés (CA, marge brute, résultat net, trésorerie) ;
 *   - courbe d'évolution du chiffre d'affaires (12 mois de l'exercice) ;
 *   - donut de répartition des charges par nature (classe 6) ;
 *   - 10 indicateurs détaillés avec sparklines (séries mensuelles réelles).
 *
 * Un panneau « Programmer l'envoi » permet de recevoir cette synthèse par email
 * (HTML) en cadence hebdomadaire ou mensuelle (Edge Function send-executive-report).
 *
 * i18n : libellés FR inline — cohérent avec PremiumOverview.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Mail, Calendar, Clock, Send, Save, CheckCircle2, Plus, X, Users,
  TrendingUp, TrendingDown, Wallet, Percent, Landmark, PieChart as PieIcon,
  BarChart3, ShoppingCart, UserPlus, Timer, Receipt, Activity, RefreshCw,
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { useData } from '../../contexts/DataContext';
import { useMoneyFormat } from '../../hooks/useMoneyFormat';
import { computeDashboardMetrics, type DashboardPeriod } from '../../utils/dashboardMetrics';
import {
  loadSchedule, saveSchedule, sendTestReport, isValidEmail,
  DEFAULT_SCHEDULE, type ExecutiveReportSchedule, type ReportFrequency,
} from '../../services/executiveReportService';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// Palette (cohérente avec la maquette dirigeant : marine + or + accents teal).
const C = {
  navy: '#1E3A4C', gold: '#C79A3F', teal: '#2E7D8A', tealSoft: '#6BA9B2',
  slate: '#405A66', mist: '#AEC3C9',
};
const CHARGE_COLORS = [C.teal, C.gold, C.navy, C.tealSoft, C.slate, C.mist];

// ─── Répartition des charges (classe 6) par nature SYSCOHADA ───
const CHARGE_GROUPS: { label: string; prefixes: string[] }[] = [
  { label: 'Achats / Marchandises', prefixes: ['60'] },
  { label: 'Charges de personnel', prefixes: ['66'] },
  { label: 'Services extérieurs', prefixes: ['61', '62', '63'] },
  { label: 'Impôts & taxes', prefixes: ['64'] },
  { label: 'Charges financières', prefixes: ['67'] },
  { label: 'Autres charges', prefixes: ['65', '68', '69'] },
];

function pctDelta(cur: number, prev: number): { value: string; up: boolean | null } {
  if (!prev) return { value: '—', up: null };
  const d = ((cur - prev) / Math.abs(prev)) * 100;
  return { value: `${d >= 0 ? '+' : ''}${d.toFixed(1)} %`, up: d > 0.5 ? true : d < -0.5 ? false : null };
}

/** Dernier mois mouvementé vs précédent, sur une série mensuelle. */
function deltaOf(series: number[]): { value: string; up: boolean | null } {
  let last = -1;
  for (let i = series.length - 1; i >= 0; i--) { if (series[i] !== 0) { last = i; break; } }
  if (last <= 0) return { value: '—', up: null };
  return pctDelta(series[last], series[last - 1]);
}

// ─── Sparkline SVG (aucune dépendance) ───
const Sparkline: React.FC<{ data: number[]; up: boolean | null }> = ({ data, up }) => {
  const w = 120, h = 34, pad = 2;
  const pts = data.length ? data : [0, 0];
  const min = Math.min(...pts), max = Math.max(...pts);
  const span = max - min || 1;
  const stroke = up === true ? 'var(--color-success)' : up === false ? 'var(--color-error)' : C.gold;
  const coords = pts.map((v, i) => {
    const x = pad + (i / (pts.length - 1 || 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${h} L${coords[0][0].toFixed(1)},${h} Z`;
  const gid = useMemo(() => `sg${Math.round(coords[0]?.[1] ?? 0)}-${pts.length}-${up}`, [coords, pts.length, up]);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 34 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

interface Monthly {
  ca: number; charges: number; achats: number; result: number;
  tresoFlow: number; invoices: number; newClients: number;
}

const ExecutiveDigest: React.FC = () => {
  const { adapter } = useData();
  const fmt = useMoneyFormat();

  const [entries, setEntries] = useState<any[]>([]);
  const [exercice, setExercice] = useState<{ fyYear: number; period: DashboardPeriod; label: string }>(
    { fyYear: new Date().getFullYear(), period: {}, label: '—' },
  );
  const [loading, setLoading] = useState(true);
  const [selMonth, setSelMonth] = useState<number | 'all'>('all'); // 'all' = exercice complet

  // Programmation
  const [schedule, setSchedule] = useState<ExecutiveReportSchedule>({ ...DEFAULT_SCHEDULE });
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // ─── Chargement des données réelles ───
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [ents, fiscalYears] = await Promise.all([
        adapter.getAll<any>('journalEntries'),
        adapter.getAll<any>('fiscalYears').catch(() => []),
      ]);
      const activeFY = (fiscalYears as any[]).find((fy: any) => fy.isActive || fy.is_active);
      const start = activeFY?.startDate || activeFY?.start_date;
      const end = activeFY?.endDate || activeFY?.end_date;
      const fyYear = start ? parseInt(String(start).slice(0, 4), 10) : new Date().getFullYear();
      const period: DashboardPeriod = start && end
        ? { from: String(start).slice(0, 10), to: String(end).slice(0, 10) }
        : { from: `${fyYear}-01-01`, to: `${fyYear}-12-31` };
      const label = start && end && String(start).slice(0, 4) !== String(end).slice(0, 4)
        ? `${String(start).slice(0, 4)}–${String(end).slice(0, 4)}` : String(fyYear);
      setEntries(ents as any[]);
      setExercice({ fyYear, period, label });
    } catch { /* état vide honnête */ }
    finally { setLoading(false); }
  }, [adapter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => { try { setSchedule(await loadSchedule()); } catch { /* mode local */ } })();
  }, []);

  // ─── Séries mensuelles réelles (12 mois de l'exercice) ───
  const monthly = useMemo<Monthly[]>(() => {
    const b: Monthly[] = Array.from({ length: 12 }, () => ({ ca: 0, charges: 0, achats: 0, result: 0, tresoFlow: 0, invoices: 0, newClients: 0 }));
    const seenClients = new Set<string>();
    for (const e of entries) {
      if (!e || e.status === 'draft') continue;
      const d = String(e.date || '').slice(0, 10);
      if (!d || d.slice(0, 4) !== String(exercice.fyYear)) continue;
      const mi = parseInt(d.slice(5, 7), 10) - 1;
      if (mi < 0 || mi > 11) continue;
      let hasSale = false;
      for (const l of (e.lines || [])) {
        const code = String(l.accountCode || '');
        const cls = code.charAt(0);
        const debit = Number(l.debit) || 0, credit = Number(l.credit) || 0;
        if (cls === '7') { b[mi].ca += credit - debit; if (code.startsWith('70')) hasSale = true; }
        else if (cls === '6') { b[mi].charges += debit - credit; if (code.startsWith('60')) b[mi].achats += debit - credit; }
        else if (cls === '5' && !code.startsWith('58')) b[mi].tresoFlow += debit - credit;
        if (code.startsWith('41') && l.thirdPartyCode) {
          const key = String(l.thirdPartyCode);
          if (!seenClients.has(key)) { seenClients.add(key); b[mi].newClients += 1; }
        }
      }
      if (hasSale) b[mi].invoices += 1;
      b[mi].result = b[mi].ca - b[mi].charges;
    }
    return b;
  }, [entries, exercice.fyYear]);

  // ─── Métriques sur la période sélectionnée (réelles) ───
  const activePeriod = useMemo<DashboardPeriod>(() => {
    if (selMonth === 'all') return exercice.period;
    const mm = String(selMonth + 1).padStart(2, '0');
    const last = new Date(exercice.fyYear, selMonth + 1, 0).getDate();
    return { from: `${exercice.fyYear}-${mm}-01`, to: `${exercice.fyYear}-${mm}-${last}` };
  }, [selMonth, exercice]);

  const m = useMemo(() => computeDashboardMetrics(entries, activePeriod), [entries, activePeriod]);

  const achatsPeriod = m.h.net('60');
  const margeBrute = m.ca - achatsPeriod;
  const tauxMargeBrute = m.ca > 0 ? (margeBrute / m.ca) * 100 : 0;
  const creances = m.h.net('41');
  const periodDays = 30; // approximation DSO sur base mensualisée
  const dso = m.ca > 0 ? Math.max(0, Math.round((creances / m.ca) * 365)) : 0;
  const nbFactures = monthly.reduce((s, x) => s + x.invoices, 0);
  const panierMoyen = nbFactures > 0 ? m.ca / (selMonth === 'all' ? nbFactures : Math.max(1, monthly[selMonth as number]?.invoices || 0)) : 0;

  // Séries pour sparklines / graphes
  const caSeries = monthly.map((x) => Math.round(x.ca));
  const chargesSeries = monthly.map((x) => Math.round(x.charges));
  const resultSeries = monthly.map((x) => Math.round(x.result));
  const margeBruteSeries = monthly.map((x) => Math.round(x.ca - x.achats));
  const marginPctSeries = monthly.map((x) => (x.ca > 0 ? Math.round((x.result / x.ca) * 100) : 0));
  const tresoCumSeries = monthly.reduce<number[]>((acc, x, i) => { acc.push((i ? acc[i - 1] : 0) + x.tresoFlow); return acc; }, []);
  const invoiceSeries = monthly.map((x) => x.invoices);
  const newClientSeries = monthly.map((x) => x.newClients);
  const panierSeries = monthly.map((x) => (x.invoices > 0 ? Math.round(x.ca / x.invoices) : 0));
  const growthSeries = caSeries.map((v, i) => (i > 0 && caSeries[i - 1] ? Math.round(((v - caSeries[i - 1]) / Math.abs(caSeries[i - 1])) * 100) : 0));

  // ─── Répartition des charges (classe 6) sur la période ───
  const chargeBreakdown = useMemo(() => {
    const items = CHARGE_GROUPS.map((g, i) => ({
      label: g.label,
      value: g.prefixes.reduce((s, p) => s + m.h.net(p), 0),
      color: CHARGE_COLORS[i % CHARGE_COLORS.length],
    })).filter((x) => x.value > 0);
    const total = items.reduce((s, x) => s + x.value, 0);
    return { items, total };
  }, [m]);

  const hasData = m.count > 0;
  const resultPositive = m.resultatNet >= 0;
  const periodLabel = selMonth === 'all'
    ? `Exercice ${exercice.label}`
    : `${MONTH_LABELS[selMonth as number]} ${exercice.fyYear}`;

  // ─── Indicateurs détaillés (10) — tous réels/dérivés du grand livre ───
  const kpis = [
    { label: 'Chiffre d\'affaires', value: fmt(m.ca), unit: 'FCFA', icon: Landmark, series: caSeries, delta: deltaOf(caSeries) },
    { label: 'Marge brute', value: fmt(margeBrute), unit: 'FCFA', icon: Percent, series: margeBruteSeries, delta: deltaOf(margeBruteSeries) },
    { label: 'Résultat net', value: fmt(m.resultatNet), unit: 'FCFA', icon: TrendingUp, series: resultSeries, delta: deltaOf(resultSeries) },
    { label: 'Trésorerie', value: fmt(m.treasury), unit: 'FCFA', icon: Wallet, series: tresoCumSeries, delta: deltaOf(tresoCumSeries) },
    { label: 'Charges totales', value: fmt(m.charges), unit: 'FCFA', icon: Receipt, series: chargesSeries, delta: deltaOf(chargesSeries) },
    { label: 'Marge nette', value: `${m.margeNette.toFixed(1).replace('.', ',')} %`, unit: '', icon: Activity, series: marginPctSeries, delta: deltaOf(marginPctSeries) },
    { label: 'Nouveaux clients', value: String(newClientSeries.reduce((s, x) => s + x, 0)), unit: '', icon: UserPlus, series: newClientSeries, delta: deltaOf(newClientSeries) },
    { label: 'Panier moyen', value: fmt(panierMoyen), unit: 'FCFA', icon: ShoppingCart, series: panierSeries, delta: deltaOf(panierSeries) },
    { label: 'Délai paiement (DSO)', value: `${dso}`, unit: 'jours', icon: Timer, series: invoiceSeries, delta: deltaOf(invoiceSeries) },
    { label: 'Croissance CA', value: (deltaOf(caSeries).value), unit: '', icon: BarChart3, series: growthSeries, delta: deltaOf(caSeries) },
  ];

  // ─── Graphe : évolution du CA ───
  const caChartData = {
    labels: MONTH_LABELS,
    datasets: [{
      label: 'Chiffre d\'affaires',
      data: caSeries,
      borderColor: C.navy,
      backgroundColor: (ctx: any) => {
        const { ctx: c, chartArea } = ctx.chart;
        if (!chartArea) return 'rgba(30,58,76,0.12)';
        const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, 'rgba(30,58,76,0.28)'); g.addColorStop(1, 'rgba(30,58,76,0)');
        return g;
      },
      fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5,
    }],
  };
  const caChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => fmt(c.parsed.y) + ' FCFA' } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: 'var(--color-text-secondary)', font: { size: 11 } } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: 'var(--color-text-secondary)', font: { size: 11 }, callback: (v: any) => fmt(Number(v)) } },
    },
  };

  const donutData = {
    labels: chargeBreakdown.items.map((x) => x.label),
    datasets: [{ data: chargeBreakdown.items.map((x) => Math.round(x.value)), backgroundColor: chargeBreakdown.items.map((x) => x.color), borderWidth: 0, cutout: '68%' }],
  };
  const donutOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => `${c.label}: ${fmt(c.parsed)} FCFA` } } },
  };

  // ─── Programmation : handlers ───
  const validRecipients = (schedule.recipients || []).filter(isValidEmail);
  const patch = (p: Partial<ExecutiveReportSchedule>) => setSchedule((s) => ({ ...s, ...p }));
  const addEmail = () => {
    const e = emailInput.trim();
    if (!e) return;
    if (!isValidEmail(e)) { toast.error('Email invalide.'); return; }
    if (!schedule.recipients.includes(e)) patch({ recipients: [...schedule.recipients, e] });
    setEmailInput('');
  };
  const removeEmail = (e: string) => patch({ recipients: schedule.recipients.filter((r) => r !== e) });
  const onSave = async () => {
    if (schedule.enabled && validRecipients.length === 0) { toast.error('Ajoutez au moins un destinataire.'); return; }
    setSaving(true);
    try { setSchedule(await saveSchedule(schedule)); toast.success('Planification enregistrée.'); }
    catch (err: any) { toast.error(err?.message || 'Échec de l\'enregistrement.'); }
    finally { setSaving(false); }
  };
  const onSendNow = async () => {
    if (validRecipients.length === 0) { toast.error('Ajoutez au moins un destinataire.'); return; }
    setSending(true);
    try { await sendTestReport(validRecipients, schedule.frequency); toast.success(`Rapport envoyé à ${validRecipients.length} destinataire(s).`); }
    catch (err: any) { toast.error(err?.message || 'Échec de l\'envoi.'); }
    finally { setSending(false); }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Chargement du tableau de bord…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto" style={{ color: 'var(--color-text-primary)' }}>
      {/* ═══ En-tête ═══ */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}>
            <Mail className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: C.navy }}>TABLEAU DE BORD</h1>
            <p className="text-xs font-bold uppercase tracking-widest mt-0.5" style={{ color: C.gold }}>Vue Dirigeant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Sélecteur de période */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ background: 'var(--color-surface, #fff)', borderColor: 'var(--color-border)' }}>
            <Calendar className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Période</span>
            <select
              value={String(selMonth)}
              onChange={(e) => setSelMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="text-sm font-semibold bg-transparent outline-none" style={{ color: 'var(--color-text-primary)' }}
            >
              <option value="all">Exercice {exercice.label}</option>
              {MONTH_LABELS.map((mo, i) => <option key={i} value={i}>{mo} {exercice.fyYear}</option>)}
            </select>
          </div>
          <button onClick={load} className="p-2 rounded-lg border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface, #fff)' }} aria-label="Actualiser">
            <RefreshCw className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
          </button>
          <button onClick={() => setScheduleOpen(true)} className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2" style={{ background: C.navy, color: '#fff' }}>
            <Send className="w-4 h-4" /> Programmer l'envoi
          </button>
        </div>
      </div>

      {!hasData && (
        <div className="p-4 rounded-lg border mb-6 text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface, #fff)', color: 'var(--color-text-secondary)' }}>
          Aucune écriture comptabilisée sur cette période : les indicateurs s'afficheront dès les premières saisies validées.
        </div>
      )}

      {/* ═══ 4 indicateurs clés ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <HeroKpi label="CHIFFRE D'AFFAIRES" value={fmt(m.ca)} unit="FCFA" delta={deltaOf(caSeries)} icon={<Landmark className="w-5 h-5" />} tint={C.navy} />
        <HeroKpi label="MARGE BRUTE" value={fmt(margeBrute)} unit="FCFA" sub={`${tauxMargeBrute.toFixed(1).replace('.', ',')} % du CA`} delta={deltaOf(margeBruteSeries)} icon={<Percent className="w-5 h-5" />} tint={C.gold} />
        <HeroKpi label="RÉSULTAT NET" value={fmt(m.resultatNet)} unit="FCFA" delta={deltaOf(resultSeries)} icon={resultPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />} tint={resultPositive ? 'var(--color-success)' : 'var(--color-error)'} valueColor={resultPositive ? 'var(--color-success)' : 'var(--color-error)'} />
        <HeroKpi label="TRÉSORERIE" value={fmt(m.treasury)} unit="FCFA" delta={deltaOf(tresoCumSeries)} icon={<Wallet className="w-5 h-5" />} tint={C.teal} />
      </div>

      {/* ═══ Graphes ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-5 border" style={{ background: 'var(--color-surface, #fff)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            <BarChart3 className="w-4 h-4" /> Évolution du chiffre d'affaires
          </h3>
          <div style={{ position: 'relative', height: 240 }}><Line data={caChartData as any} options={caChartOptions as any} /></div>
        </div>

        <div className="rounded-xl p-5 border" style={{ background: 'var(--color-surface, #fff)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            <PieIcon className="w-4 h-4" /> Répartition des charges
          </h3>
          {chargeBreakdown.items.length > 0 ? (
            <div className="flex items-center gap-5 flex-wrap">
              <div style={{ position: 'relative', width: 160, height: 160 }}>
                <Doughnut data={donutData as any} options={donutOptions as any} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Total</span>
                  <span className="text-base font-extrabold" style={{ color: C.navy }}>{fmt(chargeBreakdown.total)}</span>
                </div>
              </div>
              <div className="flex-1 min-w-[160px] space-y-2">
                {chargeBreakdown.items.map((x) => (
                  <div key={x.label} className="flex items-center gap-2 text-sm">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: x.color }} />
                    <span className="flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{x.label}</span>
                    <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{chargeBreakdown.total > 0 ? Math.round((x.value / chargeBreakdown.total) * 100) : 0} %</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>Aucune charge sur la période.</div>
          )}
        </div>
      </div>

      {/* ═══ 10 indicateurs détaillés ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl p-4 border relative overflow-hidden" style={{ background: 'var(--color-surface, #fff)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: 'color-mix(in srgb, ' + C.gold + ' 18%, transparent)', color: C.gold }}>{i + 1}</span>
                <Icon className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wide truncate" style={{ color: 'var(--color-text-secondary)' }} title={k.label}>{k.label}</div>
              <div className="text-lg font-extrabold mt-0.5" style={{ color: C.navy }}>
                {k.value} {k.unit && <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{k.unit}</span>}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold" style={{ color: k.delta.up === true ? 'var(--color-success)' : k.delta.up === false ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
                {k.delta.up === true ? <TrendingUp className="w-3 h-3" /> : k.delta.up === false ? <TrendingDown className="w-3 h-3" /> : null}
                {k.delta.value}
                <span className="font-normal" style={{ color: 'var(--color-text-secondary)' }}>vs mois préc.</span>
              </div>
              <div className="mt-2"><Sparkline data={k.series} up={k.delta.up} /></div>
            </div>
          );
        })}
      </div>

      {/* ═══ Panneau de programmation (modal) ═══ */}
      {scheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setScheduleOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border overflow-hidden" style={{ background: 'var(--color-surface, #fff)', borderColor: 'var(--color-border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}><Calendar className="w-4 h-4" style={{ color: 'var(--color-primary)' }} /> Programmer l'envoi</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Recevez cette synthèse par email (HTML).</p>
              </div>
              <button onClick={() => setScheduleOpen(false)} className="p-1.5 rounded-lg hover:opacity-70" aria-label="Fermer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Fréquence */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Fréquence</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(['weekly', 'monthly'] as ReportFrequency[]).map((f) => (
                    <button key={f} type="button" onClick={() => patch({ frequency: f })}
                      className="px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors"
                      style={schedule.frequency === f
                        ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                        : { background: 'var(--color-background)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
                      {f === 'weekly' ? 'Hebdomadaire' : 'Mensuelle'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Jour + heure */}
              <div className="grid grid-cols-2 gap-3">
                {schedule.frequency === 'weekly' ? (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Jour d'envoi</label>
                    <select value={schedule.weekday} onChange={(e) => patch({ weekday: Number(e.target.value) })} className="mt-2 w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                      {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Jour du mois</label>
                    <select value={schedule.month_day} onChange={(e) => patch({ month_day: Number(e.target.value) })} className="mt-2 w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}><Clock className="w-3 h-3" /> Heure (UTC)</label>
                  <select value={schedule.send_hour} onChange={(e) => patch({ send_hour: Number(e.target.value) })} className="mt-2 w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                    {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}h00</option>)}
                  </select>
                </div>
              </div>
              {/* Destinataires */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}><Users className="w-3 h-3" /> Destinataires</label>
                <div className="flex gap-2 mt-2">
                  <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }} placeholder="Ajouter un email…" className="flex-1 px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
                  <button type="button" onClick={addEmail} className="px-3 rounded-lg" style={{ background: 'var(--color-primary)', color: '#fff' }} aria-label="Ajouter"><Plus className="w-4 h-4" /></button>
                </div>
                {schedule.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {schedule.recipients.map((e) => (
                      <span key={e} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium border" style={{ background: 'var(--color-background)', borderColor: isValidEmail(e) ? 'var(--color-border)' : 'var(--color-error)', color: 'var(--color-text-primary)' }}>
                        {e}<button type="button" onClick={() => removeEmail(e)} className="p-0.5 rounded-full hover:opacity-70" aria-label={`Retirer ${e}`}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* Activer */}
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Activer l'envoi programmé</span>
                <button type="button" role="switch" aria-checked={schedule.enabled} onClick={() => patch({ enabled: !schedule.enabled })} className="relative w-11 h-6 rounded-full transition-colors shrink-0" style={{ background: schedule.enabled ? 'var(--color-success)' : 'var(--color-border)' }}>
                  <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: schedule.enabled ? 'translateX(20px)' : 'translateX(0)' }} />
                </button>
              </label>
              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button type="button" onClick={onSave} disabled={saving} className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'var(--color-primary)', color: '#fff' }}><Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
                <button type="button" onClick={onSendNow} disabled={sending || validRecipients.length === 0} className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border disabled:opacity-60" style={{ background: 'transparent', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}><Send className="w-4 h-4" /> {sending ? 'Envoi…' : 'Envoyer maintenant'}</button>
              </div>
              <p className="text-[11px] leading-relaxed flex items-start gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--color-success)' }} />
                L'email est généré côté serveur à partir de vos écritures comptabilisées (mode SaaS).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Carte indicateur clé ───
interface HeroKpiProps { label: string; value: string; unit?: string; sub?: string; delta: { value: string; up: boolean | null }; icon: React.ReactNode; tint: string; valueColor?: string }
const HeroKpi: React.FC<HeroKpiProps> = ({ label, value, unit, sub, delta, icon, tint, valueColor }) => (
  <div className="rounded-xl p-5 border" style={{ background: 'var(--color-surface, #fff)', borderColor: 'var(--color-border)' }}>
    <div className="flex items-center justify-between mb-3">
      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `color-mix(in srgb, ${tint} 15%, transparent)`, color: tint }}>{icon}</div>
      <span className="text-xs font-semibold flex items-center gap-1" style={{ color: delta.up === true ? 'var(--color-success)' : delta.up === false ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
        {delta.up === true ? <TrendingUp className="w-3.5 h-3.5" /> : delta.up === false ? <TrendingDown className="w-3.5 h-3.5" /> : null}{delta.value}
      </span>
    </div>
    <div className="text-2xl font-extrabold" style={{ color: valueColor || C.navy }}>
      {value} {unit && <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{unit}</span>}
    </div>
    <div className="text-[11px] font-bold uppercase tracking-wide mt-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</div>
    {sub && <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)', opacity: 0.8 }}>{sub}</div>}
  </div>
);

export default ExecutiveDigest;
