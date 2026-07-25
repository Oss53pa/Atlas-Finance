/**
 * PremiumOverview — Vue EXÉCUTIVE d'Atlas FnA (/executive).
 *
 * Un dirigeant pilote l'ARGENT, pas des comptages. Cette page montre donc des
 * agrégats financiers RÉELS tirés du grand livre (source unique
 * `computeDashboardMetrics` → glHelpers) : chiffre d'affaires, résultat net,
 * trésorerie, marge, tendance CA/charges sur 12 mois, top clients et un score
 * de santé financière. Plus aucun « nombre d'écritures » ni « SHA-256 » en
 * KPI — ces éléments techniques ne sont pas du pilotage.
 *
 * i18n : les libellés financiers nouveaux sont en français inline (objet `M`)
 * pour ne pas entrer en collision avec la vague de traduction en cours sur les
 * fichiers de locale ; le chrome structurel réutilise les clés existantes.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Download, Search as SearchIcon, Settings, Bell,
  ShieldCheck, Wallet, TrendingUp, TrendingDown,
  Users, AlertTriangle, ArrowUpRight, BarChart3,
  Banknote, Receipt, Coins, Landmark, Package, CheckCircle2,
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
import type { KpiTrend } from '../../components/premium/KpiCardPremium';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { computeDashboardMetrics, type DashboardPeriod } from '../../utils/dashboardMetrics';

// Libellés exécutifs (FR inline — cf. entête).
const M = {
  ca: 'CHIFFRE D\'AFFAIRES',
  resultatNet: 'RÉSULTAT NET',
  treasury: 'TRÉSORERIE',
  marge: 'MARGE NETTE',
  vsLastMonth: 'vs mois précédent',
  exercice: 'exercice',
  chartTitle: 'Chiffre d\'affaires vs charges — 12 mois',
  chartSub: 'Produits (cl.7) et charges (cl.6) comptabilisés, par mois',
  serieCA: 'Chiffre d\'affaires',
  serieCharges: 'Charges',
  health: 'Santé financière',
  topClients: 'Top clients — chiffre d\'affaires',
  seeReporting: 'Voir les états financiers',
  noData: 'Aucune écriture comptabilisée : les indicateurs financiers s\'afficheront dès les premières saisies validées.',
};

const MONTH_LABELS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

/** FCFA compact : 1 234 567 → « 1,23 M », 9 050 000 000 → « 9,05 Md ». */
function fcfa(n: number): string {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(a / 1e9 >= 100 ? 0 : 2).replace('.', ',')} Md`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(a / 1e6 >= 100 ? 0 : 1).replace('.', ',')} M`;
  if (a >= 1e3) return `${s}${Math.round(a / 1e3)} K`;
  return `${s}${Math.round(a).toLocaleString('fr-FR')}`;
}

interface MonthAgg { ca: number; charges: number; treasuryFlow: number }

const PremiumOverview: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [entries, setEntries] = useState<any[]>([]);
  const [aux, setAux] = useState<{ tiers: number; immo: number; exercice: string; fyYear: number; period: DashboardPeriod }>(
    { tiers: 0, immo: 0, exercice: '—', fyYear: new Date().getFullYear(), period: {} },
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [ents, tiers, immo, fiscalYears] = await Promise.all([
          adapter.getAll<any>('journalEntries'),
          adapter.getAll<any>('thirdParties'),
          adapter.getAll<any>('assets'),
          adapter.getAll<any>('fiscalYears'),
        ]);
        const activeFY = (fiscalYears as any[]).find((fy: any) => fy.isActive || fy.is_active);
        const start = activeFY?.startDate || activeFY?.start_date;
        const end = activeFY?.endDate || activeFY?.end_date;
        const fyYear = start ? parseInt(String(start).slice(0, 4), 10) : new Date().getFullYear();
        const exercice = start ? `${String(start).slice(0, 4)}–${String(end).slice(0, 4)}` : String(fyYear);
        const period: DashboardPeriod = start && end
          ? { from: String(start).slice(0, 10), to: String(end).slice(0, 10) }
          : { from: `${fyYear}-01-01`, to: `${fyYear}-12-31` };
        setEntries(ents as any[]);
        setAux({ tiers: (tiers as any[]).length, immo: (immo as any[]).length, exercice, fyYear, period });
      } catch { /* silent — état vide honnête */ }
    };
    load();
  }, [adapter]);

  // ─── Agrégats financiers canoniques sur l'exercice ───
  const m = useMemo(() => computeDashboardMetrics(entries, aux.period), [entries, aux.period]);

  // ─── Séries mensuelles (12 mois de l'exercice) : CA, charges, flux de trésorerie ───
  const monthly = useMemo(() => {
    const buckets: MonthAgg[] = Array.from({ length: 12 }, () => ({ ca: 0, charges: 0, treasuryFlow: 0 }));
    for (const e of entries) {
      if (!e || e.status === 'draft') continue;
      const d = String(e.date || '').slice(0, 10);
      if (!d || d.slice(0, 4) !== String(aux.fyYear)) continue;
      const mi = parseInt(d.slice(5, 7), 10) - 1;
      if (mi < 0 || mi > 11) continue;
      for (const l of (e.lines || [])) {
        const cls = String(l.accountCode || '').charAt(0);
        const debit = Number(l.debit) || 0, credit = Number(l.credit) || 0;
        if (cls === '7') buckets[mi].ca += credit - debit;
        else if (cls === '6') buckets[mi].charges += debit - credit;
        else if (cls === '5') buckets[mi].treasuryFlow += debit - credit;
      }
    }
    return buckets;
  }, [entries, aux.fyYear]);

  const caSeries = monthly.map(b => Math.round(b.ca));
  const chargesSeries = monthly.map(b => Math.round(b.charges));
  const resultSeries = monthly.map(b => Math.round(b.ca - b.charges));
  const marginSeries = monthly.map(b => (b.ca > 0 ? Math.round(((b.ca - b.charges) / b.ca) * 100) : 0));

  // ─── Delta mois courant vs mois précédent (dernier mois mouvementé) ───
  const delta = useMemo(() => {
    const lastIdx = (() => { for (let i = 11; i >= 0; i--) if (monthly[i].ca !== 0 || monthly[i].charges !== 0) return i; return -1; })();
    const pct = (cur: number, prev: number): { value: string; trend: KpiTrend } => {
      if (prev === 0) return { value: '—', trend: 'flat' };
      const d = ((cur - prev) / Math.abs(prev)) * 100;
      return { value: `${d >= 0 ? '+' : ''}${d.toFixed(0)} %`, trend: d > 1 ? 'up' : d < -1 ? 'down' : 'flat' };
    };
    if (lastIdx <= 0) return { ca: undefined, result: undefined };
    return {
      ca: pct(caSeries[lastIdx], caSeries[lastIdx - 1]),
      result: pct(resultSeries[lastIdx], resultSeries[lastIdx - 1]),
    };
  }, [monthly, caSeries, resultSeries]);

  // ─── Postes de bilan (créances / dettes / VNC) ───
  const receivables = m.h.net('41');          // clients — débiteur
  const payables = m.h.creditNet('40');       // fournisseurs — créditeur
  const immoVNC = m.classNet['2'] || 0;       // actif immobilisé net (brut − amort 28)

  // ─── Top clients par CA (client porté par la ligne 411 de l'écriture) ───
  const topClients = useMemo(() => {
    const acc = new Map<string, { name: string; ca: number }>();
    for (const e of entries) {
      if (!e || e.status === 'draft') continue;
      const d = String(e.date || '').slice(0, 10);
      if (!d || d.slice(0, 4) !== String(aux.fyYear)) continue;
      const lines = e.lines || [];
      const ca70 = lines.filter((l: any) => String(l.accountCode || '').startsWith('70'))
        .reduce((s: number, l: any) => s + ((Number(l.credit) || 0) - (Number(l.debit) || 0)), 0);
      if (ca70 === 0) continue;
      const cl = lines.find((l: any) => String(l.accountCode || '').startsWith('41') && l.thirdPartyCode);
      if (!cl) continue;
      const code = String(cl.thirdPartyCode);
      const cur = acc.get(code) || { name: String(cl.thirdPartyName || code), ca: 0 };
      cur.ca += ca70;
      acc.set(code, cur);
    }
    return Array.from(acc.values()).sort((a, b) => b.ca - a.ca).slice(0, 5);
  }, [entries, aux.fyYear]);

  // ─── Score de santé financière (axes réels) ───
  const healthAxes = useMemo(() => {
    const rentabilite = m.resultatNet > 0 ? 100 : m.resultatNet === 0 ? 50 : 0;
    const marge = Math.max(0, Math.min(100, Math.round(m.margeNette * 4)));    // marge 25 % → 100
    const treso = m.treasury > 0 ? 100 : m.treasury === 0 ? 50 : 0;
    const croissance = delta.ca?.trend === 'up' ? 100 : delta.ca?.trend === 'down' ? 35 : 65;
    return [
      { label: 'Rentabilité', score: rentabilite },
      { label: 'Marge nette', score: marge },
      { label: 'Trésorerie', score: treso },
      { label: 'Croissance CA', score: croissance },
    ];
  }, [m, delta]);
  const healthScore = Math.round(healthAxes.reduce((s, a) => s + a.score, 0) / healthAxes.length);

  const hasData = m.count > 0;
  const firstName = user?.first_name || user?.name?.split(' ')[0] || t('premiumOverview.welcome');
  const companyName = user?.company || t('premiumOverview.myCompany');
  const periodLabel = useMemo(
    () => new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase()),
    [],
  );
  const resultPositive = m.resultatNet >= 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* ───── Top bar ───── */}
      <div
        className="sticky top-0 z-30 backdrop-blur-sm"
        style={{ background: 'rgba(247, 244, 237, 0.85)', borderBottom: '1px solid var(--color-border-light)', padding: '0.875rem clamp(1rem, 2vw, 1.5rem)' }}
      >
        <div className="flex items-center justify-between gap-6">
          <PremiumBreadcrumb
            items={[
              { label: 'Atlas Studio', onClick: () => navigate('/home') },
              { label: 'Atlas FnA', onClick: () => navigate('/home') },
              { label: t('premiumOverview.breadcrumbExecutive') },
            ]}
            rootIcon={null}
          />
          <div className="flex items-center gap-2">
            <button className="press flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
              <SearchIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="hidden md:inline" style={{ color: 'var(--color-text-tertiary)' }}>{t('premiumOverview.searchPlaceholder')}</span>
              <kbd className="hidden md:inline-flex items-center justify-center text-[10px] num-tabular font-medium" style={{ background: 'var(--color-surface-hover)', padding: '0.125rem 0.375rem', borderRadius: 4, color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border-light)' }}>⌘K</kbd>
            </button>
            <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-secondary)' }} aria-label={t('premiumOverview.notifications')}><Bell className="w-4 h-4" strokeWidth={1.5} /></button>
            <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-secondary)' }} aria-label={t('premiumOverview.settings')}><Settings className="w-4 h-4" strokeWidth={1.5} /></button>
          </div>
        </div>
      </div>

      <div className="space-y-6" style={{ padding: '2rem clamp(1rem, 2vw, 1.5rem)', maxWidth: '100%', marginLeft: 'auto', marginRight: 'auto' }}>
        {/* ═════ Hero ═════ */}
        <HeroBrandHeader
          eyebrow={`${t('premiumOverview.eyebrowExecutive')} · ${periodLabel.toUpperCase()}`}
          titleObsidian="Atlas"
          titleChampagne="FnA"
          subtitle={
            <>
              {t('premiumOverview.subtitlePre')} <strong style={{ color: 'var(--color-text-primary)' }}>{t('premiumOverview.syscohadaRevised')}</strong>
              {t('premiumOverview.subtitlePost', { company: companyName })}
            </>
          }
          chips={[
            { label: t('premiumOverview.chipLive', { period: periodLabel }), tone: 'live' },
            { label: companyName, tone: 'neutral' },
            { label: 'FCFA · XOF', tone: 'neutral' },
            { label: 'SYSCOHADA 2017', tone: 'gold' },
          ]}
          actions={
            <>
              <button onClick={() => navigate('/financial-statements/balance')} className="btn btn-outline" style={{ gap: '0.5rem', display: 'inline-flex', alignItems: 'center' }}>
                <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
                <span>{t('premiumOverview.btnFinancialStatements')}</span>
              </button>
              <button onClick={() => navigate('/accounting/entries')} className="btn" style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)', gap: '0.5rem', display: 'inline-flex', alignItems: 'center' }}>
                <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>{t('premiumOverview.btnNewEntry')}</span>
              </button>
            </>
          }
        />

        {!hasData && (
          <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
            {M.noData}
          </div>
        )}

        {/* ═════ KPIs FINANCIERS ═════ */}
        <section className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <KpiCardPremium
            eyebrow={M.ca}
            value={fcfa(m.ca)}
            unit="FCFA"
            delta={delta.ca}
            meta={M.vsLastMonth}
            series={caSeries}
            tone="gold"
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            onClick={() => navigate('/financial-statements/compte-resultat')}
          />
          <KpiCardPremium
            eyebrow={M.resultatNet}
            value={fcfa(m.resultatNet)}
            unit="FCFA"
            delta={delta.result}
            meta={`${M.exercice} ${aux.exercice}`}
            series={resultSeries}
            tone={resultPositive ? 'success' : 'danger'}
            icon={resultPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            onClick={() => navigate('/financial-statements/compte-resultat')}
          />
          <KpiCardPremium
            eyebrow={M.treasury}
            value={fcfa(m.treasury)}
            unit="FCFA"
            meta={M.exercice + ' ' + aux.exercice}
            series={monthly.map(b => Math.round(b.treasuryFlow))}
            tone={m.treasury >= 0 ? 'neutral' : 'danger'}
            icon={<Wallet className="w-3.5 h-3.5" />}
            onClick={() => navigate('/treasury')}
          />
          <KpiCardPremium
            eyebrow={M.marge}
            value={`${m.margeNette.toFixed(1).replace('.', ',')} %`}
            meta={`résultat / CA`}
            series={marginSeries}
            tone={m.margeNette >= 0 ? 'success' : 'danger'}
            icon={<BarChart3 className="w-3.5 h-3.5" />}
            onClick={() => navigate('/reporting')}
          />
        </section>

        {/* ═════ Tendance CA/charges + insight + santé ═════ */}
        <section className="grid gap-5" style={{ gridTemplateColumns: 'minmax(0, 1.65fr) minmax(0, 1fr)' }}>
          {/* Graphe CA vs charges (argent réel) */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1.25rem 1.375rem' }}>
            <header className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <BarChart3 className="w-4 h-4" style={{ color: 'var(--color-accent)' }} strokeWidth={1.6} />
                  <h3 className="font-medium" style={{ fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>{M.chartTitle}</h3>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{M.chartSub}</p>
              </div>
            </header>

            <PremiumChart
              xLabels={MONTH_LABELS}
              series={[
                { key: 'ca', label: M.serieCA, tone: 'gold', data: caSeries, variant: 'area' },
                { key: 'charges', label: M.serieCharges, tone: 'danger', data: chargesSeries, variant: 'line' },
              ]}
              height={260}
              yFormatter={(v) => fcfa(v)}
              showLegend
            />

            <footer className="flex items-center justify-between mt-3 pt-3 flex-wrap gap-2" style={{ borderTop: '1px solid var(--color-border-light)' }}>
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                <span>CA <strong className="num-tabular" style={{ color: '#235A6E', fontWeight: 600 }}>{fcfa(m.ca)}</strong></span>
                <span>·</span>
                <span>Charges <strong className="num-tabular" style={{ color: '#C0322B', fontWeight: 600 }}>{fcfa(m.charges)}</strong></span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: resultPositive ? 'rgba(21,128,61,0.10)' : 'rgba(192,50,43,0.10)', color: resultPositive ? '#15803D' : '#C0322B' }}>
                {resultPositive ? <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} /> : <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />}
                Résultat net {fcfa(m.resultatNet)} FCFA
              </span>
            </footer>
          </div>

          {/* Insight financier + santé */}
          <div className="space-y-5">
            <AiInsightCard
              insight={
                hasData ? (
                  <>
                    Résultat net de <strong className="num-tabular">{fcfa(m.resultatNet)} FCFA</strong> sur l'exercice, pour une marge de <strong className="num-tabular">{m.margeNette.toFixed(1).replace('.', ',')} %</strong>.
                  </>
                ) : (
                  <>{M.noData}</>
                )
              }
              detail={
                hasData
                  ? `CA ${fcfa(m.ca)} · charges ${fcfa(m.charges)} · trésorerie ${fcfa(m.treasury)} FCFA · exercice ${aux.exercice}.`
                  : `Exercice ${aux.exercice}.`
              }
              primaryAction={{ label: M.seeReporting, onClick: () => navigate('/financial-statements/compte-resultat') }}
              secondaryAction={{ label: 'Rentabilité clients', onClick: () => navigate('/tiers/rentabilite') }}
            />

            <AuditScoreRing
              title={M.health}
              subtitle={`${M.exercice} ${aux.exercice}`}
              score={healthScore}
              outOf={100}
              axes={healthAxes}
            />
          </div>
        </section>

        {/* ═════ Postes clés de bilan ═════ */}
        <section>
          <header className="flex items-center justify-between mb-3">
            <span className="eyebrow-gold">Postes clés</span>
            <button onClick={() => navigate('/financial-statements/bilan')} className="text-xs flex items-center gap-1 transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>
              {M.seeReporting} <ArrowUpRight className="w-3 h-3" strokeWidth={1.6} />
            </button>
          </header>
          <MiniMetricStack
            columns={3}
            items={[
              { eyebrow: 'CRÉANCES CLIENTS', value: fcfa(receivables), unit: 'FCFA', hint: 'comptes 41x — encours débiteur', icon: <Banknote className="w-3.5 h-3.5" />, tone: 'gold' },
              { eyebrow: 'DETTES FOURNISSEURS', value: fcfa(payables), unit: 'FCFA', hint: 'comptes 40x — encours créditeur', icon: <Receipt className="w-3.5 h-3.5" />, tone: 'obsidian' },
              { eyebrow: 'RÉSULTAT AVANT IMPÔT', value: fcfa(m.resultatAvantImpot), unit: 'FCFA', hint: 'cl.7 − cl.6', icon: <Coins className="w-3.5 h-3.5" />, tone: m.resultatAvantImpot >= 0 ? 'success' : 'danger' },
              { eyebrow: 'CHARGES', value: fcfa(m.charges), unit: 'FCFA', hint: 'charges d\'exploitation (cl.6)', icon: <TrendingDown className="w-3.5 h-3.5" />, tone: 'neutral' },
              { eyebrow: 'ACTIF IMMOBILISÉ', value: fcfa(immoVNC), unit: 'FCFA', hint: `${aux.immo} biens · VNC (brut − amort.)`, icon: <Package className="w-3.5 h-3.5" />, tone: 'gold' },
              { eyebrow: 'IMPÔT SUR RÉSULTAT', value: fcfa(m.impots), unit: 'FCFA', hint: 'cl.89 · IS / IMF', icon: <Landmark className="w-3.5 h-3.5" />, tone: 'neutral' },
            ]}
          />
        </section>

        {/* ═════ Top clients ═════ */}
        {topClients.length > 0 && (
          <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1.25rem 1.375rem' }}>
            <header className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: 'var(--color-accent)' }} strokeWidth={1.6} />
                <h3 className="font-medium" style={{ fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>{M.topClients}</h3>
              </div>
              <button onClick={() => navigate('/tiers/rentabilite')} className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-tertiary)' }}>
                Rentabilité <ArrowUpRight className="w-3 h-3" strokeWidth={1.6} />
              </button>
            </header>
            {(() => {
              const maxCa = Math.max(...topClients.map(c => c.ca), 1);
              return (
                <div className="space-y-2.5">
                  {topClients.map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs num-tabular w-4 shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>{i + 1}</span>
                      <span className="text-sm truncate" style={{ minWidth: 0, flex: '0 0 30%', color: 'var(--color-text-primary)' }} title={c.name}>{c.name}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-hover)' }}>
                        <div style={{ width: `${Math.max(3, (c.ca / maxCa) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #235A6E, #E89A2E)', borderRadius: 9999 }} />
                      </div>
                      <span className="text-sm num-tabular font-semibold shrink-0" style={{ color: 'var(--color-text-primary)' }}>{fcfa(c.ca)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </section>
        )}

        {/* ═════ Footer ═════ */}
        <footer className="flex items-center justify-between pt-6 flex-wrap gap-3" style={{ borderTop: '1px solid var(--color-border-light)' }}>
          <div className="flex items-center gap-2">
            <span className="gold-dot" />
            <span className="eyebrow-gold">
              <span className="atlas-brand" style={{ fontSize: '1.1em', letterSpacing: 'normal', textTransform: 'none' }}>Atlas FnA</span>
              {t('premiumOverview.footerVersion')}
            </span>
          </div>
          <span className="eyebrow num-tabular flex items-center gap-1.5" style={{ color: 'var(--color-text-quaternary)' }}>
            <ShieldCheck className="w-3 h-3" strokeWidth={1.5} /> {M.health} <strong style={{ color: 'var(--color-text-primary)' }}>{healthScore}</strong>/100
          </span>
        </footer>
      </div>
    </div>
  );
};

export default PremiumOverview;
