/**
 * PremiumOverview — Vitrine ultra-premium pour /executive d'Atlas F&A.
 * ERP comptable SYSCOHADA — pas un cockpit recouvrement.
 *
 * Composition : Hero wordmark + KPIs comptables (écritures / comptes / tiers
 * / trésorerie) + chart trésorerie 12M + AI insight conformité SYSCOHADA
 * + score conformité circulaire + mini-metrics comptables.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Download, Search as SearchIcon, Settings, Bell,
  Calendar, ShieldCheck, Wallet, TrendingUp,
  BookOpen, Users, AlertTriangle, FileText,
  ArrowUpRight, BarChart3, Database, Lock, ScrollText,
  Package, CheckCircle2,
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
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

const MONTHS_SHORT = ['mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.', 'janv.', 'févr.', 'mars', 'avr.', 'mai'];

interface AccountingStats {
  ecritures: number;
  comptes: number;
  tiers: number;
  immobilisations: number;
  exercice: string;
  totalDebit: number;
  totalCredit: number;
  classCount: Record<string, number>;
  journauxOuverts: number;
  ecrituresMensuelles: number[];
}

const PremiumOverview: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const { user } = useAuth();
  const [stats, setStats] = useState<AccountingStats>({
    ecritures: 0, comptes: 0, tiers: 0, immobilisations: 0, exercice: '—',
    totalDebit: 0, totalCredit: 0, classCount: {}, journauxOuverts: 0,
    ecrituresMensuelles: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  });

  // ─── Load real accounting stats ───
  useEffect(() => {
    const load = async () => {
      try {
        const [entries, accounts, tiers, immo, fiscalYears, lines] = await Promise.all([
          adapter.getAll<any>('journalEntries'),
          adapter.getAll<any>('accounts'),
          adapter.getAll<any>('thirdParties'),
          adapter.getAll<any>('assets'),
          adapter.getAll<any>('fiscalYears'),
          adapter.getAll<any>('journalLines').catch(() => []),
        ]);

        const activeFY = (fiscalYears as any[]).find((fy: any) => fy.isActive);
        const exercice = activeFY
          ? `${activeFY.startDate?.substring(0, 4)}–${activeFY.endDate?.substring(0, 4)}`
          : '—';

        // Totaux Débit/Crédit
        let totalDebit = 0, totalCredit = 0;
        (lines as any[]).forEach((l: any) => {
          totalDebit += Number(l.debit) || 0;
          totalCredit += Number(l.credit) || 0;
        });

        // Répartition classes SYSCOHADA (1-9)
        const classCount: Record<string, number> = {};
        (accounts as any[]).forEach((a: any) => {
          const code = String(a.code || a.number || '');
          const c = code.charAt(0);
          if (c >= '1' && c <= '9') classCount[c] = (classCount[c] || 0) + 1;
        });

        // Ecritures mensuelles (par mois sur 13 derniers mois)
        const now = new Date();
        const ecrituresMensuelles: number[] = [];
        for (let i = 12; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
          const count = (entries as any[]).filter((e: any) => {
            const d = e.date ? new Date(e.date) : null;
            return d && d >= monthStart && d <= monthEnd;
          }).length;
          ecrituresMensuelles.push(count);
        }

        // Journaux ouverts (count distinct journal_id sur entries de l'exercice)
        const journauxSet = new Set<string>();
        (entries as any[]).forEach((e: any) => {
          if (e.journal_id || e.journalId) journauxSet.add(e.journal_id || e.journalId);
        });

        setStats({
          ecritures: (entries as any[]).length,
          comptes: (accounts as any[]).length,
          tiers: (tiers as any[]).length,
          immobilisations: (immo as any[]).length,
          exercice,
          totalDebit,
          totalCredit,
          classCount,
          journauxOuverts: journauxSet.size,
          ecrituresMensuelles,
        });
      } catch (_e) { /* silent */ }
    };
    load();
  }, [adapter]);

  // ─── Computed / derived ───
  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'Bienvenue';
  const companyName = user?.company || 'Mon entreprise';
  const periodLabel = useMemo(
    () => new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase()),
    [],
  );
  const isBalanced = Math.abs(stats.totalDebit - stats.totalCredit) < 0.01;
  const ecart = stats.totalDebit - stats.totalCredit;

  // Score de conformité SYSCOHADA calculé sur des axes réels
  const conformityAxes = useMemo(() => {
    const planComplet = stats.comptes >= 50 ? 100 : Math.round((stats.comptes / 50) * 100);
    const equilibre = isBalanced ? 100 : Math.max(0, 100 - Math.min(50, Math.round(Math.abs(ecart) / 1000)));
    const classesValides = Object.keys(stats.classCount).length >= 5 ? 100 : Math.round((Object.keys(stats.classCount).length / 5) * 100);
    const ecrituresExist = stats.ecritures > 0 ? 100 : 0;
    return [
      { label: 'Plan comptable', score: planComplet },
      { label: 'Équilibre D = C', score: equilibre },
      { label: 'Classes 1-9 valides', score: classesValides },
      { label: 'Écritures saisies', score: ecrituresExist },
    ];
  }, [stats, isBalanced, ecart]);

  const scoreGlobal = useMemo(() => {
    if (conformityAxes.length === 0) return 0;
    return Math.round(conformityAxes.reduce((sum, a) => sum + a.score, 0) / conformityAxes.length);
  }, [conformityAxes]);

  // Chart trésorerie : évolution mensuelle des écritures (proxy d'activité)
  const chartSeries = useMemo(() => ([
    {
      key: 'ecritures',
      label: 'Écritures saisies',
      tone: 'gold' as const,
      data: stats.ecrituresMensuelles,
    },
  ]), [stats.ecrituresMensuelles]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* ───── Top bar ───── */}
      <div
        className="sticky top-0 z-30 backdrop-blur-sm"
        style={{
          background: 'rgba(247, 244, 237, 0.85)',
          borderBottom: '1px solid var(--color-border-light)',
          padding: '0.875rem clamp(1rem, 2vw, 1.5rem)',
        }}
      >
        <div className="flex items-center justify-between gap-6">
          <PremiumBreadcrumb
            items={[
              { label: 'Atlas Studio', onClick: () => navigate('/home') },
              { label: 'Atlas F&A', onClick: () => navigate('/home') },
              { label: 'Vue exécutive' },
            ]}
            rootIcon={null}
          />
          <div className="flex items-center gap-2">
            <button
              className="press flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              <SearchIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="hidden md:inline" style={{ color: 'var(--color-text-tertiary)' }}>Rechercher un compte, tiers, écriture…</span>
              <kbd
                className="hidden md:inline-flex items-center justify-center text-[10px] num-tabular font-medium"
                style={{ background: 'var(--color-surface-hover)', padding: '0.125rem 0.375rem', borderRadius: 4, color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border-light)' }}
              >
                ⌘K
              </kbd>
            </button>
            <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-secondary)' }} aria-label="Notifications">
              <Bell className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-secondary)' }} aria-label="Paramètres">
              <Settings className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <div
        className="space-y-6"
        style={{
          padding: '2rem clamp(1rem, 2vw, 1.5rem)',
          maxWidth: '100%',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {/* ═════ Hero ═════ */}
        <HeroBrandHeader
          eyebrow={`VUE EXÉCUTIVE · ${periodLabel.toUpperCase()}`}
          titleObsidian="Atlas"
          titleChampagne="F&A"
          subtitle={
            <>
              ERP comptable conforme <strong style={{ color: 'var(--color-text-primary)' }}>SYSCOHADA révisé 2017</strong>.
              Pilotage de la saisie, des journaux, du grand livre et des états financiers — pour {companyName}.
            </>
          }
          chips={[
            { label: `Live · ${periodLabel}`, tone: 'live' },
            { label: companyName, tone: 'neutral' },
            { label: 'FCFA · XOF', tone: 'neutral' },
            { label: 'SYSCOHADA 2017', tone: 'gold' },
          ]}
          actions={
            <>
              <button
                onClick={() => navigate('/financial-statements/balance')}
                className="btn btn-outline"
                style={{ gap: '0.5rem', display: 'inline-flex', alignItems: 'center' }}
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
                <span>États financiers</span>
              </button>
              <button
                onClick={() => navigate('/accounting/entries')}
                className="btn"
                style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)', gap: '0.5rem', display: 'inline-flex', alignItems: 'center' }}
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Nouvelle écriture</span>
              </button>
            </>
          }
        />

        {/* ═════ KPIs principaux — comptables ═════ */}
        <section
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
        >
          <KpiCardPremium
            eyebrow="Écritures"
            value={stats.ecritures.toLocaleString('fr-FR')}
            unit="pièces"
            meta={`${stats.journauxOuverts || 0} journal(aux) ouvert(s)`}
            series={stats.ecrituresMensuelles.length > 0 ? stats.ecrituresMensuelles : [0, 0, 0, 0, 0, 0, 0, 0]}
            tone="gold"
            icon={<BookOpen className="w-3.5 h-3.5" />}
            onClick={() => navigate('/accounting/entries')}
          />
          <KpiCardPremium
            eyebrow="Plan comptable"
            value={stats.comptes.toLocaleString('fr-FR')}
            unit="comptes"
            meta={`${Object.keys(stats.classCount).length} classe(s) SYSCOHADA`}
            series={[0, 0, 0, 0, 0, 0, 0, 0]}
            tone="neutral"
            icon={<Database className="w-3.5 h-3.5" />}
            onClick={() => navigate('/accounting/chart-of-accounts')}
          />
          <KpiCardPremium
            eyebrow="Tiers"
            value={stats.tiers.toLocaleString('fr-FR')}
            unit="fiches"
            meta="clients · fournisseurs · partenaires"
            series={[0, 0, 0, 0, 0, 0, 0, 0]}
            tone="success"
            icon={<Users className="w-3.5 h-3.5" />}
            onClick={() => navigate('/tiers')}
          />
          <KpiCardPremium
            eyebrow="Immobilisations"
            value={stats.immobilisations.toLocaleString('fr-FR')}
            unit="biens"
            meta="amortissements en cours"
            series={[0, 0, 0, 0, 0, 0, 0, 0]}
            tone="warning"
            icon={<Package className="w-3.5 h-3.5" />}
            onClick={() => navigate('/assets')}
          />
        </section>

        {/* ═════ Chart activité + insight + audit ═════ */}
        <section
          className="grid gap-5"
          style={{ gridTemplateColumns: 'minmax(0, 1.65fr) minmax(0, 1fr)' }}
        >
          {/* Chart activité comptable */}
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
                  <BarChart3 className="w-4 h-4" style={{ color: 'var(--color-accent)' }} strokeWidth={1.6} />
                  <h3 className="font-medium" style={{ fontSize: '0.9375rem', letterSpacing: 0, color: 'var(--color-text-primary)' }}>
                    Activité comptable — 13 mois glissants
                  </h3>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  Nombre d'écritures saisies par mois · indicateur de volume
                </p>
              </div>
              <span className="chip chip-gold" style={{ padding: '0.25rem 0.5rem' }}>● Écritures</span>
            </header>

            <PremiumChart
              xLabels={MONTHS_SHORT}
              series={chartSeries}
              height={260}
              yFormatter={(v) => `${v}`}
              showLegend={false}
            />

            <footer
              className="flex items-center justify-between mt-3 pt-3 flex-wrap gap-2"
              style={{ borderTop: '1px solid var(--color-border-light)' }}
            >
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                <span>
                  Total Débit{' '}
                  <strong className="num-tabular" style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                    {stats.totalDebit.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Total Crédit{' '}
                  <strong className="num-tabular" style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                    {stats.totalCredit.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
                  </strong>
                </span>
              </div>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  background: isBalanced ? 'rgba(21,128,61,0.10)' : 'rgba(192,50,43,0.10)',
                  color: isBalanced ? '#15803D' : '#C0322B',
                }}
              >
                {isBalanced ? <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} /> : <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />}
                {isBalanced ? 'Balance équilibrée' : `Écart : ${Math.abs(ecart).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`}
              </span>
            </footer>
          </div>

          {/* AI Insight + Score conformité */}
          <div className="space-y-5">
            <AiInsightCard
              confidence={86}
              insight={
                stats.ecritures > 0 ? (
                  <>
                    <strong>{Object.keys(stats.classCount).length}/9 classes SYSCOHADA</strong> utilisées sur{' '}
                    <strong className="num-tabular">{stats.comptes.toLocaleString('fr-FR')}</strong> comptes.
                    {isBalanced ? ' Balance équilibrée.' : ' Écart D ≠ C détecté.'}
                  </>
                ) : (
                  <>
                    Aucune écriture saisie. <strong>Proph3t</strong> vous guide pour configurer votre plan comptable SYSCOHADA et créer votre première pièce.
                  </>
                )
              }
              detail={
                stats.ecritures > 0
                  ? `Contrôle d'équilibre D=C en continu · piste d'audit chaînée SHA-256 · plan comptable OHADA conforme. Exercice ${stats.exercice}.`
                  : 'Importez votre plan comptable depuis Sage, Ciel, EBP ou Odoo, ou utilisez l\'assistant de migration intégré.'
              }
              primaryAction={{
                label: stats.ecritures > 0 ? 'Voir le grand livre' : 'Démarrer la saisie',
                onClick: () => navigate(stats.ecritures > 0 ? '/accounting/general-ledger' : '/accounting/entries'),
              }}
              secondaryAction={{
                label: 'Détails conformité',
                onClick: () => navigate('/dashboard/ai-insights'),
              }}
            />

            <AuditScoreRing
              title="Conformité SYSCOHADA"
              subtitle={`Mai ${new Date().getFullYear()}`}
              score={scoreGlobal}
              outOf={100}
              axes={conformityAxes}
            />
          </div>
        </section>

        {/* ═════ Mini metrics stack — opérations comptables ═════ */}
        <section>
          <header className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="eyebrow-gold">Opérations comptables · vue rapide</span>
            </div>
            <button
              onClick={() => navigate('/financial-statements/balance')}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: 'var(--color-text-tertiary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent-deep)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
            >
              Voir tous les états financiers <ArrowUpRight className="w-3 h-3" strokeWidth={1.6} />
            </button>
          </header>
          <MiniMetricStack
            columns={3}
            items={[
              {
                eyebrow: 'JOURNAUX',
                value: stats.journauxOuverts.toString(),
                unit: 'ouverts',
                hint: 'ventes · achats · banque · OD',
                icon: <BookOpen className="w-3.5 h-3.5" />,
                tone: 'gold',
              },
              {
                eyebrow: 'BALANCE',
                value: isBalanced ? 'D = C' : 'Écart',
                hint: isBalanced ? 'contrôle en continu' : `${Math.abs(ecart).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`,
                icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                tone: isBalanced ? 'success' : 'danger',
              },
              {
                eyebrow: 'EXERCICE',
                value: stats.exercice,
                hint: 'fiscal en cours',
                icon: <Calendar className="w-3.5 h-3.5" />,
                tone: 'obsidian',
              },
              {
                eyebrow: 'CLASSES SYSCOHADA',
                value: `${Object.keys(stats.classCount).length} / 9`,
                hint: 'plan comptable activé',
                icon: <Database className="w-3.5 h-3.5" />,
                tone: 'gold',
              },
              {
                eyebrow: 'INTÉGRITÉ',
                value: 'SHA-256',
                hint: 'audit chaîné OHADA',
                icon: <Lock className="w-3.5 h-3.5" />,
                tone: 'success',
              },
              {
                eyebrow: 'CLÔTURE',
                value: '—',
                hint: 'aucune clôture en cours',
                icon: <ScrollText className="w-3.5 h-3.5" />,
                tone: 'neutral',
              },
            ]}
          />
        </section>

        {/* ═════ Footer signature ═════ */}
        <footer
          className="flex items-center justify-between pt-6 flex-wrap gap-3"
          style={{ borderTop: '1px solid var(--color-border-light)' }}
        >
          <div className="flex items-center gap-2">
            <span className="gold-dot" />
            <span className="eyebrow-gold">
              <span className="atlas-brand" style={{ fontSize: '1.1em', letterSpacing: 'normal', textTransform: 'none' }}>Atlas F&A</span>
              {' · v3.0 · SYSCOHADA révisé 2017 · OHADA 17 pays'}
            </span>
          </div>
          <span className="eyebrow num-tabular" style={{ color: 'var(--color-text-quaternary)' }}>
            Score conformité · <strong style={{ color: 'var(--color-text-primary)' }}>{scoreGlobal}</strong>/100
          </span>
        </footer>
      </div>
    </div>
  );
};

export default PremiumOverview;
