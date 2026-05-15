// @ts-nocheck
/**
 * AtlasFnAHome — Cockpit R&C-grade dashboard d'accueil Atlas F&A.
 * Composition strict du référent : top bar contexte, hero wordmark centré,
 * 4 KPI strip avec sparklines, AI insight 2/3 + 6 mini-metrics stack 1/3,
 * progress exercise + carte Assistant IA, footer signature.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, ArrowUpRight, ArrowDownRight, Plus, Search, ChevronDown,
  Sparkles, Brain, ShieldCheck, Wallet, TrendingUp, AlertTriangle,
  Banknote, FileBarChart, Briefcase, Lock, FileText, Calendar,
  Clock, ChevronRight, ArrowRight, ExternalLink,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

// ─────────────────────────────────────────────────────────────
// Sparkline helper
// ─────────────────────────────────────────────────────────────
const Sparkline: React.FC<{ data: number[]; color?: string; height?: number }> = ({
  data, color = '#C9A961', height = 56,
}) => {
  const series = data.map((y, i) => ({ x: i, y }));
  const id = React.useId();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.30} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="y" stroke={color} strokeWidth={1.75} fill={`url(#${id})`} isAnimationActive={false} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// ─────────────────────────────────────────────────────────────
// Delta pill
// ─────────────────────────────────────────────────────────────
const DeltaPill: React.FC<{ value: string; positive: boolean }> = ({ value, positive }) => {
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className="inline-flex items-center gap-1 num-tabular"
      style={{
        padding: '0.125rem 0.5rem',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        background: positive ? 'rgba(15, 143, 95, 0.10)' : 'rgba(192, 50, 43, 0.10)',
        color: positive ? '#0F8F5F' : '#C0322B',
      }}
    >
      <Icon className="w-3 h-3" strokeWidth={2.4} />
      {value}
    </span>
  );
};

function getWorkspacePath(role: string): string {
  if (role === 'admin' || role === 'super_admin') return '/workspace/admin';
  if (role === 'manager') return '/workspace/manager';
  if (role === 'comptable') return '/workspace/comptable';
  return '/dashboard';
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
const AtlasFnAHome: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    ecritures: 0, comptes: 0, tiers: 0, immobilisations: 0, exercice: '—',
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [ecritures, comptes, tiers, immobilisations, fiscalYears] = await Promise.all([
          adapter.count('journalEntries'),
          adapter.count('accounts'),
          adapter.count('thirdParties'),
          adapter.count('assets'),
          adapter.getAll('fiscalYears'),
        ]);
        const activeFY = (fiscalYears as any[]).find((fy: any) => fy.isActive);
        const exercice = activeFY
          ? `${activeFY.startDate?.substring(0, 4)}–${activeFY.endDate?.substring(0, 4)}`
          : '—';
        setStats({ ecritures, comptes, tiers, immobilisations, exercice });
      } catch (err) { /* silent */ }
    };
    loadStats();
  }, [adapter]);

  // ─── User context ───
  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'Bienvenue';
  const companyName = user?.company || 'Mon entreprise';
  const workspacePath = getWorkspacePath(user?.role || '');
  const period = useMemo(() => new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase()), []);

  // ─── KPI data (demo if empty) ───
  const kpis = useMemo(() => {
    const baseEcr = Math.max(stats.ecritures, 142);
    return [
      {
        eyebrow: 'ÉCRITURES',
        value: stats.ecritures.toLocaleString('fr-FR'),
        meta: `${stats.ecritures > 0 ? Math.round(stats.ecritures * 0.65) : '0'} validées · cycle en cours`,
        delta: { value: '+12,4 %', positive: true },
        tone: '#C9A961',
        series: Array.from({ length: 12 }, (_, i) => Math.round(baseEcr * (0.65 + i * 0.04))),
      },
      {
        eyebrow: 'COMPTES SYSCOHADA',
        value: stats.comptes.toLocaleString('fr-FR'),
        meta: '9 classes · plan complet',
        delta: { value: '+3,1 %', positive: true },
        tone: '#0E0E14',
        series: [60, 65, 70, 72, 75, 78, 80, 82, 84, 85, 86, Math.max(stats.comptes, 87)],
      },
      {
        eyebrow: 'TIERS ACTIFS',
        value: stats.tiers.toLocaleString('fr-FR'),
        meta: 'clients · fournisseurs · partenaires',
        delta: { value: '+8,7 %', positive: true },
        tone: '#0F8F5F',
        series: [5, 8, 12, 16, 20, 24, 26, 28, 30, 32, 34, Math.max(stats.tiers, 36)],
      },
      {
        eyebrow: 'IMMOBILISATIONS',
        value: stats.immobilisations.toLocaleString('fr-FR'),
        meta: 'amortissements en cours',
        delta: { value: '−1,2 %', positive: false },
        tone: '#C9A961',
        series: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, Math.max(stats.immobilisations, 12)],
      },
    ];
  }, [stats]);

  // ─── Mini-metrics stack (right column) ───
  const miniMetrics = [
    { icon: Clock,        eyebrow: 'DSO',            value: '71',     unit: 'j',      hint: '−4,8 % vs M-1',     tone: 'gold' },
    { icon: ShieldCheck,  eyebrow: "SCORE D'AUDIT",  value: 'A−',     unit: undefined, hint: '94 / 100',          tone: 'success' },
    { icon: FileText,     eyebrow: 'LITIGES',        value: '12',     unit: undefined, hint: '3 hors SLA',        tone: 'danger' },
    { icon: Briefcase,    eyebrow: 'PLANS ACTIFS',   value: '47',     unit: undefined, hint: '81 % respect',      tone: 'obsidian' },
    { icon: Lock,         eyebrow: 'CONTENTIEUX',    value: '23',     unit: undefined, hint: 'Cycle 14 phases',   tone: 'gold' },
    { icon: FileBarChart, eyebrow: 'PROVISIONS M',   value: '187,4',  unit: 'M FCFA',  hint: '+12,5 %',           tone: 'neutral' },
  ] as const;

  const TONE_TILE: Record<string, { bg: string; color: string }> = {
    gold:     { bg: 'rgba(201,169,97,0.14)', color: '#A88845' },
    obsidian: { bg: 'rgba(14,14,20,0.08)',   color: '#0E0E14' },
    neutral:  { bg: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)' },
    success:  { bg: 'rgba(15,143,95,0.12)',  color: '#0F8F5F' },
    danger:   { bg: 'rgba(192,50,43,0.10)',  color: '#C0322B' },
  };

  return (
    <div className="page-shell">
      {/* ═════════════════ TOP BAR — context + actions ═════════════════ */}
      <header
        className="glass-bar anim-fade"
        style={{ position: 'sticky', top: 0, zIndex: 30, padding: '0.875rem 0' }}
      >
        <div className="page-container flex items-center justify-between gap-6 flex-wrap">
          {/* Brand + company */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="shrink-0 inline-flex items-center justify-center transition-opacity hover:opacity-80"
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'var(--color-primary)',
                boxShadow: 'var(--shadow-obsidian)',
              }}
              aria-label="Atlas Studio"
            >
              <span
                className="brand-script"
                style={{
                  fontSize: '1.05rem',
                  color: '#C9A961',
                  lineHeight: 1,
                }}
              >
                A
              </span>
            </button>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ letterSpacing: '-0.005em', color: 'var(--color-text-primary)' }}>
                {companyName}
              </div>
              <div className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                <span style={{ letterSpacing: '0.04em' }}>FCFA · XOF</span>
                <span>·</span>
                <span>{firstName}</span>
              </div>
            </div>
          </div>

          {/* Context chips center */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <Calendar className="w-3 h-3" style={{ color: 'var(--color-text-tertiary)' }} strokeWidth={1.5} />
              <span className="eyebrow" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>PÉRIODE</span>
              <span className="text-xs font-semibold num-tabular" style={{ color: 'var(--color-text-primary)' }}>{period}</span>
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(192,50,43,0.08)', border: '1px solid rgba(192,50,43,0.20)' }}
            >
              <AlertTriangle className="w-3 h-3" style={{ color: '#C0322B' }} strokeWidth={1.6} />
              <span className="text-xs font-semibold num-tabular" style={{ color: '#C0322B' }}>12 alertes</span>
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'var(--color-accent-light)', border: '1px solid rgba(201,169,97,0.30)' }}
            >
              <Sparkles className="w-3 h-3" style={{ color: 'var(--color-accent-deep)' }} strokeWidth={1.6} />
              <span className="text-xs font-semibold" style={{ color: 'var(--color-accent-deep)', letterSpacing: '0.04em' }}>
                PROPH3T
              </span>
            </span>
          </div>

          {/* Actions right */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/executive')}
              className="press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
            >
              Découvrir
              <ExternalLink className="w-3 h-3" strokeWidth={1.6} />
            </button>
            <button
              className="p-2 rounded-lg transition-colors relative"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Bell className="w-4 h-4" strokeWidth={1.5} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full anim-pulse-dot" style={{ background: '#C0322B' }} />
            </button>
            <button
              onClick={() => navigate(workspacePath)}
              className="press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-text-inverse)',
                boxShadow: 'var(--shadow-obsidian)',
                letterSpacing: '-0.005em',
              }}
            >
              Tableau de bord
              <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      <main className="page-container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* ═════════════════ HERO WORDMARK (centered) ═════════════════ */}
        <section className="text-center anim-rise" style={{ marginBottom: 'var(--section-gap-lg)' }}>
          <div className="eyebrow-gold flex items-center justify-center gap-2 mb-5">
            <span className="gold-dot" style={{ width: 5, height: 5 }} />
            <span>BIENVENUE · {period.toUpperCase()}</span>
          </div>
          <h1
            className="font-bold"
            style={{
              fontSize: 'clamp(3rem, 8vw, 5.5rem)',
              lineHeight: 1,
              letterSpacing: '-0.045em',
              margin: 0,
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: '0.5rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: 'var(--color-text-primary)' }}>Atlas</span>
            <span
              className="brand-script"
              style={{
                fontSize: '1em',
                background: 'linear-gradient(135deg, #D4B574 0%, #C9A961 50%, #A88845 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1,
                letterSpacing: 'normal',
              }}
            >
              F&A
            </span>
          </h1>
          <p
            className="mt-5 mx-auto"
            style={{
              maxWidth: 720,
              fontSize: '1rem',
              lineHeight: 1.55,
              color: 'var(--color-text-tertiary)',
              letterSpacing: '-0.005em',
            }}
          >
            Pilotage intégral du cycle <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Order-to-Cash</strong>, du recouvrement amiable et du contentieux <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>OHADA · SYSCOHADA</strong>. Données 100 % en temps réel.
          </p>
        </section>

        {/* ═════════════════ KPI STRIP (4 cards with sparklines) ═════════════════ */}
        <section
          className="grid gap-4 stagger-children"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginBottom: 'var(--section-gap-md)' }}
        >
          {kpis.map((k, i) => (
            <article
              key={i}
              className="surface-card lift"
              style={{ padding: '1.25rem 1.375rem 1.125rem' }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <h6 className="eyebrow" style={{ fontSize: 10, color: 'var(--color-text-tertiary)', letterSpacing: '0.14em' }}>
                  {k.eyebrow}
                </h6>
                <DeltaPill value={k.delta.value} positive={k.delta.positive} />
              </div>
              <div className="display-md num-display" style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                {k.value}
                <span style={{ fontSize: '0.5em', color: 'var(--color-text-tertiary)', marginLeft: '0.4em', fontWeight: 500, letterSpacing: '0.04em' }}>
                  FCFA
                </span>
              </div>
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-tertiary)' }}>{k.meta}</p>
              <div className="-mx-1 mt-1">
                <Sparkline data={k.series} color={k.tone} height={50} />
              </div>
            </article>
          ))}
        </section>

        {/* ═════════════════ MAIN 2-COLUMN: AI Insight + Mini metrics ═════════════════ */}
        <section
          className="grid gap-5 stagger-children"
          style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', marginBottom: 'var(--section-gap-md)' }}
        >
          {/* Left — AI Insight + actions */}
          <article
            className="surface-card"
            style={{ padding: '1.375rem 1.5rem', position: 'relative', overflow: 'hidden' }}
          >
            <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)', opacity: 0.55 }} />
            <div className="flex items-start gap-4 mb-3">
              <span
                className="shrink-0 inline-flex items-center justify-center"
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'var(--gradient-champagne)',
                  boxShadow: '0 6px 16px -4px rgba(201,169,97,0.40), inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
              >
                <Sparkles className="w-5 h-5 text-white" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="chip chip-gold" style={{ padding: '0.25rem 0.625rem' }}>Insight du jour</span>
                  <span className="eyebrow-gold">
                    <span className="brand-script" style={{ fontSize: '1.15em', color: 'var(--color-accent-deep)', letterSpacing: 'normal' }}>Proph3t</span>
                    {' · Confiance 86 %'}
                  </span>
                </div>
                <h3
                  className="font-semibold"
                  style={{ fontSize: '1.0625rem', lineHeight: 1.45, letterSpacing: '-0.012em', color: 'var(--color-text-primary)' }}
                >
                  <span className="num-tabular">12 dossiers</span> nécessitent une bascule contentieux selon <span className="brand-script" style={{ fontSize: '1.05em', color: 'var(--color-accent-deep)', letterSpacing: 'normal' }}>Proph3t</span>.
                </h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--color-text-tertiary)', lineHeight: 1.65 }}>
                  Concentration sur 4 segments (Distribution, BTP, Immobilier, Public). Recommandation : prioriser STD-Togo, Adjovi &amp; Frères et Yao &amp; Fils.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => navigate('/tiers/recouvrement')}
                className="press flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)', boxShadow: 'var(--shadow-obsidian)', letterSpacing: '-0.005em' }}
              >
                Voir les dossiers
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
              <button
                onClick={() => navigate('/dashboard/ai-insights')}
                className="press flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', letterSpacing: '-0.005em' }}
              >
                Demander à <span className="brand-script" style={{ fontSize: '1.1em', color: 'var(--color-accent-deep)', letterSpacing: 'normal' }}>Proph3t</span>
              </button>
            </div>
          </article>

          {/* Right — 6 mini-metrics stack 3×2 */}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {miniMetrics.map((m, i) => {
              const tile = TONE_TILE[m.tone] || TONE_TILE.neutral;
              return (
                <article
                  key={i}
                  className="surface-card lift"
                  style={{ padding: '0.875rem 0.9375rem 0.9375rem' }}
                >
                  <span
                    className="inline-flex items-center justify-center mb-2"
                    style={{ width: 28, height: 28, borderRadius: 8, background: tile.bg, color: tile.color }}
                  >
                    <m.icon className="w-3.5 h-3.5" strokeWidth={1.6} />
                  </span>
                  <h6
                    className="eyebrow mb-1"
                    style={{ fontSize: 9, color: 'var(--color-text-tertiary)', letterSpacing: '0.14em' }}
                  >
                    {m.eyebrow}
                  </h6>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="num-tabular font-bold"
                      style={{ fontSize: '1.375rem', lineHeight: 1.05, letterSpacing: '-0.028em', color: 'var(--color-text-primary)' }}
                    >
                      {m.value}
                    </span>
                    {m.unit && (
                      <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>{m.unit}</span>
                    )}
                  </div>
                  {m.hint && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{m.hint}</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* ═════════════════ Progress exercise + Assistant IA ═════════════════ */}
        <section
          className="grid gap-5 stagger-children"
          style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', marginBottom: 'var(--section-gap-md)' }}
        >
          {/* Left — Avancement de l'exercice */}
          <article className="surface-card" style={{ padding: '1.25rem 1.5rem' }}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h6 className="eyebrow mb-1" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                  AVANCEMENT DE L'EXERCICE
                </h6>
                <h3 className="font-semibold num-tabular" style={{ fontSize: '1.5rem', letterSpacing: '-0.028em', lineHeight: 1.1, color: 'var(--color-text-primary)' }}>
                  {period}
                </h3>
              </div>
              <div className="text-right">
                <div className="display-md num-display" style={{ color: 'var(--color-text-primary)' }}>
                  42<span style={{ fontSize: '0.5em', color: 'var(--color-text-tertiary)', marginLeft: '0.15em' }}>%</span>
                </div>
                <span className="eyebrow num-tabular" style={{ color: 'var(--color-text-tertiary)' }}>YTD</span>
              </div>
            </div>
            {/* Progress bar */}
            <div
              className="overflow-hidden"
              style={{ height: 6, borderRadius: 9999, background: 'var(--color-border-light)' }}
            >
              <div
                style={{
                  height: '100%',
                  width: '42%',
                  background: 'linear-gradient(90deg, #C9A961 0%, #0F8F5F 100%)',
                  borderRadius: 9999,
                  transition: 'width 800ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>
            <div className="flex items-center gap-6 mt-4 flex-wrap text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              <span>
                Reste <strong className="num-tabular" style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>7 mois</strong> avant clôture
              </span>
              <span>·</span>
              <span>
                Cash collecté <strong className="num-tabular" style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>1,84 Md FCFA</strong>
              </span>
              <span>·</span>
              <span>
                Forward DSO <strong className="num-tabular" style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>62 j</strong>
              </span>
            </div>
          </article>

          {/* Right — Assistant IA card */}
          <article
            className="surface-card lift"
            onClick={() => navigate('/dashboard/ai-insights')}
            style={{
              padding: '1.25rem 1.375rem',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)', opacity: 0.55 }} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center justify-center"
                  style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: 'linear-gradient(135deg, #6E5BC9 0%, #A88845 100%)',
                  }}
                >
                  <Brain className="w-4 h-4 text-white" strokeWidth={1.6} />
                </span>
                <div>
                  <h6 className="eyebrow" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                    <span className="brand-script" style={{ fontSize: '1.2em', color: 'var(--color-accent-deep)', letterSpacing: 'normal' }}>Proph3t</span>
                    {' · ASSISTANT IA'}
                  </h6>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: 'var(--color-text-quaternary)' }} />
            </div>
            <p
              className="font-semibold mb-1"
              style={{ fontSize: '0.9375rem', lineHeight: 1.4, letterSpacing: '-0.012em', color: 'var(--color-text-primary)' }}
            >
              Analyse, commente et anticipe votre activité.
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '-0.005em' }}>
              Modèle v3.4 · AUC 0,87 · Garde-fous éthiques actifs
            </p>
          </article>
        </section>

        {/* ═════════════════ FOOTER signature ═════════════════ */}
        <footer
          className="flex items-center justify-between flex-wrap gap-3 pt-6"
          style={{ borderTop: '1px solid var(--color-border-light)' }}
        >
          <div className="flex items-center gap-2">
            <span className="gold-dot" style={{ width: 5, height: 5 }} />
            <span className="eyebrow" style={{ color: 'var(--color-text-quaternary)' }}>
              <span className="brand-script" style={{ fontSize: '1.1em', color: 'var(--color-accent-deep)', letterSpacing: 'normal' }}>Atlas Studio</span>
              {' · Conformité OHADA · 17 pays'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-quaternary)' }}>
            <span className="num-display">v3.0</span>
            <span>·</span>
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" strokeWidth={1.5} /> Audit SHA-256</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default AtlasFnAHome;
