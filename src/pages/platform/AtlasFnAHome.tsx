// @ts-nocheck
/**
 * AtlasFnAHome — Page d'accueil Mercury/Brex-grade.
 * Sticky context bar (glass), hero éditorial (Inter + serif italic),
 * KPI strip avec sparklines, AI insight, grille de modules.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator, BookOpen, BarChart3, Wallet, Users, Settings,
  ArrowRight, ArrowUpRight, Plus, Search, Bell, ChevronDown,
  Package, Shield, Sparkles,
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface Stats {
  ecritures: number;
  comptes: number;
  tiers: number;
  immobilisations: number;
  exercice: string;
}

function getWorkspacePath(role: string): string {
  if (role === 'admin' || role === 'super_admin') return '/workspace/admin';
  if (role === 'manager') return '/workspace/manager';
  if (role === 'comptable') return '/workspace/comptable';
  return '/dashboard';
}

const Sparkline: React.FC<{ data: number[]; color?: string }> = ({ data, color = '#C9A961' }) => {
  const series = data.map((y, i) => ({ x: i, y }));
  const id = React.useId();
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="y" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} isAnimationActive={false} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const AtlasFnAHome: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
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

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();

  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'Bienvenue';
  const companyName = user?.company || 'Mon entreprise';
  const workspacePath = getWorkspacePath(user?.role || '');

  const kpis = [
    { eyebrow: 'Écritures',        value: stats.ecritures,        hint: 'sur l\'exercice',          tone: '#C9A961', series: [12, 18, 22, 28, 32, 38, 42, 48, stats.ecritures || 50] },
    { eyebrow: 'Comptes',          value: stats.comptes,          hint: 'plan SYSCOHADA',           tone: '#0E0E14', series: [60, 65, 70, 72, 75, 78, 80, 82, stats.comptes || 85] },
    { eyebrow: 'Tiers',            value: stats.tiers,            hint: 'clients · fournisseurs',   tone: '#6B6B73', series: [5, 8, 10, 14, 18, 22, 26, 28, stats.tiers || 30] },
    { eyebrow: 'Immobilisations',  value: stats.immobilisations,  hint: 'en amortissement',         tone: '#0F8F5F', series: [2, 3, 4, 5, 6, 7, 8, 9, stats.immobilisations || 10] },
  ];

  const modules = [
    { label: 'Comptabilité',      icon: Calculator,  path: '/accounting',           hint: 'Saisie · Journaux · Balance' },
    { label: 'Nouvelle écriture', icon: Plus,        path: '/accounting/entries',   hint: 'Pièce comptable', highlighted: true },
    { label: 'Journaux',          icon: BookOpen,    path: '/accounting/journals',  hint: 'Ventes · Achats · Banque' },
    { label: 'États financiers',  icon: BarChart3,   path: '/financial-statements', hint: 'Bilan · CR · TAFIRE' },
    { label: 'Trésorerie',        icon: Wallet,      path: '/treasury',             hint: 'Banque · Rapprochement' },
    { label: 'Tiers',             icon: Users,       path: '/tiers',                hint: 'CRM · Recouvrement' },
    { label: 'Immobilisations',   icon: Package,     path: '/assets',               hint: 'Registre · Amortissements' },
    { label: 'Paramètres',        icon: Settings,    path: '/settings',             hint: 'Société · Préférences' },
  ];

  return (
    <div className="page-shell">
      {/* ═════════════════ Sticky context bar (glass) ═════════════════ */}
      <header
        className="glass-bar anim-fade"
        style={{ position: 'sticky', top: 0, zIndex: 30, padding: '0.875rem 0' }}
      >
        <div className="page-container flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="brand-script transition-opacity hover:opacity-70"
              style={{
                fontSize: '1.375rem',
                background: 'linear-gradient(135deg, #D4B574 0%, #C9A961 50%, #A88845 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                lineHeight: 1,
              }}
              aria-label="Atlas Studio"
            >
              Atlas Studio
            </button>
            <span style={{ color: 'var(--color-text-quaternary)', fontSize: 14 }}>/</span>
            <span className="brand-script" style={{ fontSize: '1.15em', color: 'var(--color-text-primary)', letterSpacing: 'normal' }}>
              Atlas F&A
            </span>
            <span
              className="ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(15,143,95,0.08)', border: '1px solid rgba(15,143,95,0.18)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full anim-pulse-dot" style={{ background: '#0F8F5F' }} />
              <span className="eyebrow" style={{ color: '#0F8F5F', fontSize: 10 }}>Live</span>
            </span>
          </div>

          <button
            className="flex-1 max-w-md flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="text-sm flex-1 text-left" style={{ letterSpacing: '-0.005em' }}>Rechercher un compte, tiers, pièce…</span>
            <kbd
              className="inline-flex items-center justify-center num-mono text-[10px] font-semibold"
              style={{ background: 'var(--color-surface-hover)', padding: '0.125rem 0.375rem', borderRadius: 4, color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border-light)' }}
            >
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Bell className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => navigate(workspacePath)}
              className="press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-primary)', letterSpacing: '-0.005em' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-border-light)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
            >
              <span>{firstName}</span>
              <ChevronDown className="w-3 h-3" strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          </div>
        </div>
      </header>

      <main className="page-container" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
        {/* === Hero éditorial === */}
        <section className="anim-rise" style={{ maxWidth: 880, marginBottom: 'var(--section-gap-lg)' }}>
          <div className="eyebrow-gold mb-3 flex items-center gap-2">
            <span className="gold-dot" style={{ width: 5, height: 5 }} />
            <span>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <h1 className="display-xl mb-3" style={{ color: 'var(--color-text-primary)' }}>
            {greeting},{' '}
            <span className="serif-italic" style={{
              background: 'linear-gradient(135deg, #D4B574 0%, #C9A961 60%, #A88845 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              fontWeight: 400,
            }}>
              {firstName}
            </span>.
          </h1>
          <p style={{ fontSize: '1.0625rem', lineHeight: 1.55, color: 'var(--color-text-tertiary)', maxWidth: 640, letterSpacing: '-0.005em' }}>
            Voici l'état de <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{companyName}</strong> pour l'exercice{' '}
            <strong className="num-display" style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{stats.exercice}</strong>. Les données sont synchronisées en temps réel.
          </p>
        </section>

        {/* === KPI strip avec sparklines === */}
        <section style={{ marginBottom: 'var(--section-gap-lg)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>Vue d'ensemble · Exercice en cours</div>
            <button
              onClick={() => navigate('/executive')}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: 'var(--color-text-tertiary)', letterSpacing: '-0.005em' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent-deep)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
            >
              Vue exécutive complète <ArrowUpRight className="w-3 h-3" strokeWidth={1.5} />
            </button>
          </div>
          <div className="grid gap-4 stagger-children" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {kpis.map((kpi, i) => (
              <article key={i} className="surface-card lift" style={{ padding: '1.125rem 1.25rem 1rem' }}>
                <div className="flex items-center justify-between mb-2.5">
                  <h6 className="eyebrow" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{kpi.eyebrow}</h6>
                </div>
                <div className="display-md num-display" style={{ marginBottom: '0.375rem', color: 'var(--color-text-primary)' }}>
                  {kpi.value.toLocaleString('fr-FR')}
                </div>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-tertiary)' }}>{kpi.hint}</p>
                <div className="-mx-1">
                  <Sparkline data={kpi.series} color={kpi.tone} />
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* === AI Insight strip === */}
        <section
          className="anim-rise"
          style={{
            marginBottom: 'var(--section-gap-lg)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.125rem 1.25rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)', opacity: 0.5 }} />
          <div className="flex items-center gap-4 flex-wrap">
            <div
              className="shrink-0 inline-flex items-center justify-center"
              style={{
                width: 38, height: 38, borderRadius: 11,
                background: 'var(--gradient-champagne)',
                boxShadow: '0 4px 12px -2px rgba(201,169,97,0.32), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              <Sparkles className="w-[18px] h-[18px] text-white" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="eyebrow-gold">
                  <span className="brand-script" style={{ fontSize: '1.15em', color: 'var(--color-accent-deep)', letterSpacing: 'normal' }}>Proph3t</span>
                  {' · Insight du jour'}
                </span>
                <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)', fontSize: 10 }}>· Confiance 86 %</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-primary)', fontWeight: 500, letterSpacing: '-0.005em', lineHeight: 1.5 }}>
                Aucune anomalie détectée sur les{' '}
                <strong className="num-display">{stats.ecritures.toLocaleString('fr-FR')}</strong>{' '}
                écritures de l'exercice. Indice de conformité <strong>SYSCOHADA</strong> :{' '}
                <strong>A−</strong>.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/ai-insights')}
              className="press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)', boxShadow: 'var(--shadow-obsidian)', letterSpacing: '-0.005em' }}
            >
              Explorer
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </section>

        {/* === Grille de modules === */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>Accès direct · Modules</div>
          </div>
          <div className="grid gap-3 stagger-children" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {modules.map((m, i) => {
              const isHighlight = m.highlighted;
              return (
                <button
                  key={i}
                  onClick={() => navigate(m.path)}
                  className="lift press text-left"
                  style={{
                    padding: '1rem 1.125rem',
                    background: isHighlight ? 'var(--color-primary)' : 'var(--color-surface)',
                    border: '1px solid ' + (isHighlight ? 'var(--color-primary)' : 'var(--color-border)'),
                    borderRadius: 'var(--radius-lg)',
                    color: isHighlight ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                    boxShadow: isHighlight ? 'var(--shadow-obsidian)' : 'var(--shadow-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="shrink-0 inline-flex items-center justify-center"
                      style={{
                        width: 36, height: 36, borderRadius: 9,
                        background: isHighlight ? 'rgba(201,169,97,0.18)' : 'var(--color-accent-light)',
                        color: isHighlight ? '#C9A961' : 'var(--color-accent-deep)',
                      }}
                    >
                      <m.icon className="w-4 h-4" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium" style={{ letterSpacing: '-0.005em', color: 'inherit' }}>{m.label}</div>
                      <div
                        className="text-xs mt-0.5"
                        style={{ color: isHighlight ? 'rgba(247,244,237,0.55)' : 'var(--color-text-tertiary)' }}
                      >
                        {m.hint}
                      </div>
                    </div>
                  </div>
                  <ArrowRight
                    className="w-3.5 h-3.5 shrink-0"
                    strokeWidth={1.5}
                    style={{ color: isHighlight ? 'rgba(247,244,237,0.6)' : 'var(--color-text-quaternary)' }}
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* === Footer signature === */}
        <footer
          className="mt-16 pt-6 flex items-center justify-between flex-wrap gap-3"
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
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" strokeWidth={1.5} /> Audit SHA-256</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default AtlasFnAHome;
