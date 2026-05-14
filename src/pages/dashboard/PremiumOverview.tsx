// @ts-nocheck
/**
 * PremiumOverview — Vitrine ultra-premium Obsidian & Champagne.
 * Composition Cockpit-grade : Hero wordmark, KPIs avec sparklines, AI insight,
 * audit score circulaire, mini-metrics empilées, chart premium.
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Download, Search as SearchIcon, Settings, Bell,
  Calendar, ShieldCheck, Wallet, TrendingUp, Banknote,
  FileBarChart, Briefcase, Users, AlertTriangle, Brain,
  ArrowUpRight, BarChart3, FileText, Lock,
} from 'lucide-react';
import {
  HeroBrandHeader,
  KpiCardPremium,
  AiInsightCard,
  AuditScoreRing,
  MiniMetricStack,
  PremiumChart,
  PremiumBreadcrumb,
} from '../../components/premium';

const MONTHS = ['mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.', 'janv.', 'févr.', 'mars', 'avr.', 'mai'];

const fmtFcfa = (n: number) => {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace('.', ',')} Md`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace('.', ',')} k`;
  return n.toString();
};

const PremiumOverview: React.FC = () => {
  const navigate = useNavigate();

  // === DATA (showcase demo data — production wires real data here) ===
  const kpi = useMemo(() => ({
    revenue: { value: 187_432_891, series: [142, 148, 155, 162, 168, 172, 175, 178, 180, 183, 185, 187], delta: '+12,4 %', trend: 'up' as const },
    overdue: { value: 671_500_000, series: [820, 790, 760, 745, 720, 695, 685, 678, 675, 672, 671, 671], delta: '−8,1 %', trend: 'down' as const },
    dso:     { value: 71, series: [82, 80, 78, 77, 76, 75, 74, 73, 72, 71, 71, 71], delta: '−4,8 %', trend: 'down' as const },
    cash:    { value: 1_842_000_000, series: [1.42, 1.48, 1.55, 1.60, 1.65, 1.70, 1.74, 1.78, 1.80, 1.82, 1.83, 1.84], delta: '+11,2 %', trend: 'up' as const },
  }), []);

  const chartLabels = MONTHS;
  const chartSeries = useMemo(() => ([
    { key: 'revenue', label: 'CA réalisé', tone: 'gold' as const, data: [142, 148, 155, 162, 168, 172, 175, 178, 180, 183, 185, 187, 188] },
    { key: 'target',  label: 'Cible 60 j',  tone: 'success' as const, variant: 'dashed' as const, data: [150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150] },
  ]), []);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* ───── Top bar (breadcrumb + actions) ───── */}
      <div
        className="px-8 py-4 sticky top-0 z-30 backdrop-blur-sm"
        style={{
          background: 'rgba(247, 244, 237, 0.85)',
          borderBottom: '1px solid var(--color-border-light)',
        }}
      >
        <div className="flex items-center justify-between gap-6">
          <PremiumBreadcrumb
            items={[
              { label: 'Atlas Studio', onClick: () => navigate('/home') },
              { label: 'Atlas F&A', onClick: () => navigate('/dashboard') },
              { label: 'Vue exécutive' },
            ]}
            rootIcon={null}
          />
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            >
              <SearchIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline" style={{ color: 'var(--color-text-tertiary)' }}>Rechercher</span>
              <kbd className="hidden md:inline-flex items-center justify-center text-[10px] num-tabular font-semibold"
                   style={{ background: 'var(--color-surface-hover)', padding: '0.125rem 0.375rem', borderRadius: 4, color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border-light)' }}>
                ⌘K
              </kbd>
            </button>
            <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-secondary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <Bell className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-secondary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-[1480px] mx-auto space-y-8">
        {/* ═════ Hero ═════ */}
        <HeroBrandHeader
          eyebrow="BIENVENUE · MAI 2026"
          titleObsidian="Atlas"
          titleChampagne="F&A"
          subtitle={<>Pilotage intégral du cycle <strong style={{ color: 'var(--color-text-primary)' }}>Order-to-Cash</strong>, conformité <strong style={{ color: 'var(--color-text-primary)' }}>OHADA · SYSCOHADA</strong>. Données 100 % en temps réel.</>}
          chips={[
            { label: 'Live · Mai 2026', tone: 'live' },
            { label: 'EMERGENCE Plaza SA · Cosmos Yopougon', tone: 'neutral' },
            { label: 'FCFA · XOF', tone: 'neutral' },
            { label: 'Proph3t · AI v3.4', tone: 'gold' },
          ]}
          actions={
            <>
              <button className="btn btn-outline" style={{ gap: '0.5rem', display: 'inline-flex', alignItems: 'center' }}>
                <Download className="w-3.5 h-3.5" />
                <span>Board pack</span>
              </button>
              <button className="btn" style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)', gap: '0.5rem', display: 'inline-flex', alignItems: 'center' }}>
                <Plus className="w-3.5 h-3.5" />
                <span>Nouvelle action</span>
              </button>
            </>
          }
        />

        {/* ═════ KPIs principaux ═════ */}
        <section
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
        >
          <KpiCardPremium
            eyebrow="Encours total"
            value={fmtFcfa(kpi.revenue.value)}
            unit="FCFA"
            delta={{ value: kpi.revenue.delta, trend: kpi.revenue.trend }}
            meta="875 factures · 142 clients actifs"
            series={kpi.revenue.series}
            tone="gold"
            icon={<Wallet className="w-3.5 h-3.5" />}
            onClick={() => navigate('/tiers/recouvrement')}
          />
          <KpiCardPremium
            eyebrow="En retard"
            value={fmtFcfa(kpi.overdue.value)}
            unit="FCFA"
            delta={{ value: kpi.overdue.delta, trend: 'down' }}
            meta="11,1 % de l'encours · 12 critiques"
            series={kpi.overdue.series}
            tone="danger"
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
          />
          <KpiCardPremium
            eyebrow="DSO moyen"
            value={`${kpi.dso.value} j`}
            delta={{ value: kpi.dso.delta, trend: 'down' }}
            meta="Cible 60 j · 11 j au-dessus"
            series={kpi.dso.series}
            tone="warning"
            icon={<TrendingUp className="w-3.5 h-3.5" />}
          />
          <KpiCardPremium
            eyebrow="Cash collecté · avril"
            value={fmtFcfa(kpi.cash.value)}
            unit="FCFA"
            delta={{ value: kpi.cash.delta, trend: 'up' }}
            meta="78,4 % du recouvrable"
            series={kpi.cash.series}
            tone="success"
            icon={<Banknote className="w-3.5 h-3.5" />}
          />
        </section>

        {/* ═════ Chart + insight lateral ═════ */}
        <section className="grid gap-5" style={{ gridTemplateColumns: 'minmax(0, 1.65fr) minmax(0, 1fr)' }}>
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: '1.25rem 1.375rem',
            }}
          >
            <header className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <BarChart3 className="w-4 h-4" style={{ color: 'var(--color-accent)' }} strokeWidth={2.2} />
                  <h3 className="font-semibold" style={{ fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>
                    DSO &amp; Encaissements — 12 mois glissants
                  </h3>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  Tendance opérationnelle · comparaison cible vs réalisé
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="chip chip-success" style={{ padding: '0.25rem 0.5rem' }}>● Réalisé</span>
                <span className="chip" style={{ padding: '0.25rem 0.5rem' }}>Cible 60 j</span>
              </div>
            </header>

            <PremiumChart
              xLabels={chartLabels}
              series={chartSeries}
              height={260}
              yFormatter={(v) => `${v}`}
              showLegend={false}
            />

            <footer className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-light)' }}>
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                <span className="flex items-center gap-1.5"><span className="w-2 h-0.5" style={{ background: '#C9A961' }} /> DSO réalisé</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-0.5" style={{ background: '#0F8F5F', borderTop: '1px dashed' }} /> Cible 60 j</span>
              </div>
              <span className="eyebrow num-tabular" style={{ color: 'var(--color-text-secondary)' }}>
                Variation 12M : −32 %
              </span>
            </footer>
          </div>

          {/* AI Insight + Audit Score stacked */}
          <div className="space-y-5">
            <AiInsightCard
              confidence={86}
              insight={
                <>
                  <strong>73 % de probabilité de défaut à 90 j</strong> sur Établissements Adjovi &amp; Frères.
                  Combinaison de 4 signaux faibles.
                </>
              }
              detail="DSO en hausse +38 %, dégradation Coface, contestation récurrente, demande de plan #2."
              primaryAction={{ label: 'Bascule contentieux', onClick: () => {} }}
              secondaryAction={{ label: 'Voir détails', onClick: () => {} }}
            />

            <AuditScoreRing
              title="Score d'audit — Mai 2026"
              subtitle="Standard Atlas Studio"
              score={94}
              outOf={100}
              axes={[
                { label: 'Architecture',          score: 97 },
                { label: 'Sécurité',              score: 96 },
                { label: 'Conformité juridique',  score: 92 },
                { label: 'Conformité comptable',  score: 91 },
              ]}
            />
          </div>
        </section>

        {/* ═════ Mini metrics stack (cycle, plans, contentieux) ═════ */}
        <section>
          <header className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="eyebrow-gold">Cycle Order-to-Cash · vue rapide</span>
            </div>
            <button
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: 'var(--color-text-tertiary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent-deep)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
            >
              Voir le détail complet <ArrowUpRight className="w-3 h-3" />
            </button>
          </header>
          <MiniMetricStack
            columns={3}
            items={[
              { eyebrow: 'DSO', value: '71', unit: 'j', hint: '−4,8 % vs M-1', icon: <Calendar className="w-3.5 h-3.5" />, tone: 'gold' },
              { eyebrow: "Score d'audit", value: 'A−', hint: '94 / 100', icon: <ShieldCheck className="w-3.5 h-3.5" />, tone: 'success' },
              { eyebrow: 'Litiges', value: '12', hint: '3 hors SLA', icon: <FileText className="w-3.5 h-3.5" />, tone: 'danger' },
              { eyebrow: 'Plans actifs', value: '47', hint: '81 % respect', icon: <Briefcase className="w-3.5 h-3.5" />, tone: 'obsidian' },
              { eyebrow: 'Contentieux', value: '23', hint: 'Cycle 14 phases', icon: <Lock className="w-3.5 h-3.5" />, tone: 'gold' },
              { eyebrow: 'Provisions M', value: '187,4 M', unit: 'FCFA', hint: '+12,5 %', icon: <FileBarChart className="w-3.5 h-3.5" />, tone: 'neutral' },
            ]}
          />
        </section>

        {/* ═════ Footer signature ═════ */}
        <footer className="flex items-center justify-between pt-6" style={{ borderTop: '1px solid var(--color-border-light)' }}>
          <div className="flex items-center gap-2">
            <span className="gold-dot" />
            <span className="eyebrow-gold">Atlas F&amp;A v3.0 · Proph3t · AUC 0,87 · Garde-fous éthiques actifs</span>
          </div>
          <span className="eyebrow" style={{ color: 'var(--color-text-quaternary)' }}>
            Avancement exercice · 42 % YTD
          </span>
        </footer>
      </div>
    </div>
  );
};

export default PremiumOverview;
