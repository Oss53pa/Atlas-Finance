/**
 * BudgetCockpitPage — /budget/cockpit (CDC V3 §6).
 *
 * Première surface qui s'affiche : résultat budgété vs réalisé, taux de
 * réalisation, solde trésorerie, top écarts. Tout vient des VUES LIVE
 * (v_actual_exploitation / v_actual_treasury / v_budget_vs_actual) — zéro mock.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { KPICard, ColorfulBarChart } from '../../components/ui/DesignSystem';
import {
  getDefaultAnnee, getActiveBudgetVersion, getExploitationSummary, getTreasuryActual, getAtterrissage,
  type ExploitationSummary, type TreasuryActualRow, type BudgetVersion,
} from '../../features/budget/services/budgetService';
import {
  TrendingUp, TrendingDown, Wallet, Target, PiggyBank, AlertTriangle, Gauge, Upload,
} from 'lucide-react';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const BudgetCockpitPage: React.FC = () => {
  const { adapter } = useData();
  const navigate = useNavigate();
  const [annee, setAnnee] = useState<string>('');
  const [version, setVersion] = useState<BudgetVersion | null>(null);
  const [summary, setSummary] = useState<ExploitationSummary | null>(null);
  const [treasury, setTreasury] = useState<TreasuryActualRow[]>([]);
  const [atterr, setAtterr] = useState<{ resultatAtterrissage: number; resultatBudget: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const a = await getDefaultAnnee(adapter);
        if (cancelled) return;
        const moisCourant = new Date().getMonth() + 1;
        const [v, s, t, at] = await Promise.all([
          getActiveBudgetVersion(adapter),
          getExploitationSummary(adapter, a),
          getTreasuryActual(adapter, a),
          getAtterrissage(adapter, a, moisCourant),
        ]);
        if (cancelled) return;
        setAnnee(a); setVersion(v); setSummary(s); setTreasury(t);
        setAtterr({ resultatAtterrissage: at.resultatAtterrissage, resultatBudget: at.resultatBudget });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

  const tresorerieNette = useMemo(() => treasury.reduce((s, t) => s + t.flux_net, 0), [treasury]);

  const topEcarts = useMemo(() => {
    if (!summary) return [];
    return summary.parNature
      .filter(n => n.budget !== 0)
      .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart))
      .slice(0, 8);
  }, [summary]);

  const resultatChart = useMemo(() => {
    if (!summary) return [];
    return summary.mensuel.map((m, i) => ({
      label: MOIS[i], value: Math.round(m.resultat / 1000), color: '',
    }));
  }, [summary]);

  if (loading) {
    return <div className="p-8 text-center text-[var(--color-text-tertiary)]">Chargement du cockpit budgétaire…</div>;
  }
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-[var(--color-error-light,#FEECEC)] text-[var(--color-error)] rounded-lg p-4 text-sm">
          Impossible de charger les données budgétaires : {error}
          <div className="text-xs mt-1 text-[var(--color-text-tertiary)]">Vérifiez que les vues budgétaires sont déployées.</div>
        </div>
      </div>
    );
  }

  const s = summary!;
  const hasBudget = version != null && (s.caBudget !== 0 || s.chargesBudget !== 0);

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Gauge className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--color-primary)]">Cockpit Budgétaire</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            Exercice {annee} · {version ? `version « ${version.libelle} » (${version.statut})` : 'aucun budget actif — réalisé seul'}
          </p>
        </div>
      </div>

      {/* KPIs réalisé */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Chiffre d'affaires (réalisé)" value={formatCurrency(s.caRealise)} icon={TrendingUp} color="primary" valueFontSize="1.125rem" />
        <KPICard title="Charges (réalisé)" value={formatCurrency(s.chargesRealise)} icon={TrendingDown} color="warning" valueFontSize="1.125rem" />
        <KPICard
          title="Résultat (réalisé)" value={formatCurrency(s.resultatRealise)} icon={Target}
          color={s.resultatRealise >= 0 ? 'success' : 'error'} valueFontSize="1.125rem"
          subtitle={hasBudget ? `Budget : ${formatCurrency(s.resultatBudget)}` : undefined}
        />
        <KPICard
          title="Trésorerie nette (flux réalisé)" value={formatCurrency(tresorerieNette)} icon={PiggyBank}
          color={tresorerieNette >= 0 ? 'success' : 'error'} valueFontSize="1.125rem"
        />
      </div>

      {/* Bandeau budget si version active */}
      {hasBudget && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title="Résultat budgété" value={formatCurrency(s.resultatBudget)} icon={Wallet} color="neutral" valueFontSize="1.125rem" />
          <KPICard
            title="Taux de réalisation (résultat)"
            value={s.tauxRealisationResultat != null ? `${s.tauxRealisationResultat}%` : '—'}
            icon={Gauge} color="primary"
          />
          <KPICard
            title="Écart résultat (réalisé − budget)"
            value={formatCurrency(s.resultatRealise - s.resultatBudget)}
            icon={AlertTriangle}
            color={s.resultatRealise - s.resultatBudget >= 0 ? 'success' : 'error'} valueFontSize="1.125rem"
          />
        </div>
      )}

      {/* Atterrissage (LFT budgétaire) : réalisé YTD + budget des mois restants */}
      {hasBudget && atterr && (
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h2 className="font-semibold text-[var(--color-primary)] flex items-center gap-2"><Gauge className="w-4 h-4" />Atterrissage prévisionnel (LFT)</h2>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Résultat estimé fin d'exercice = réalisé cumulé + budget des mois restants.</p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xs text-[var(--color-text-tertiary)]">Résultat budgété</p>
              <p className="text-lg font-bold text-gray-700">{formatCurrency(atterr.resultatBudget)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--color-text-tertiary)]">Atterrissage</p>
              <p className={`text-lg font-bold ${atterr.resultatAtterrissage >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(atterr.resultatAtterrissage)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--color-text-tertiary)]">Δ vs budget</p>
              <p className={`text-lg font-bold ${atterr.resultatAtterrissage - atterr.resultatBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {atterr.resultatAtterrissage - atterr.resultatBudget >= 0 ? '+' : ''}{formatCurrency(atterr.resultatAtterrissage - atterr.resultatBudget)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Résultat mensuel */}
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
          <h2 className="font-semibold text-[var(--color-primary)] mb-1">Résultat mensuel réalisé</h2>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-4">Produits − charges par mois (en milliers FCFA)</p>
          {resultatChart.some(d => d.value !== 0)
            ? <ColorfulBarChart data={resultatChart} height={220} />
            : <div className="text-sm text-[var(--color-text-tertiary)] py-10 text-center">Aucun mouvement de gestion sur l'exercice.</div>}
        </div>

        {/* Top écarts */}
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
          <h2 className="font-semibold text-[var(--color-primary)] mb-1">Top écarts budgétaires</h2>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-4">Postes les plus écartés du budget (cumul annuel)</p>
          {topEcarts.length === 0 ? (
            <div className="text-sm text-[var(--color-text-tertiary)] py-10 text-center">
              {hasBudget ? 'Aucun écart significatif.' : 'Aucun budget saisi — saisissez un budget pour suivre les écarts.'}
            </div>
          ) : (
            <div className="space-y-2">
              {topEcarts.map(n => (
                <div key={n.code} className="flex items-center justify-between text-sm border-b border-[var(--color-border)] pb-2 last:border-0">
                  <span className="text-[var(--color-text-secondary)]"><span className="font-mono">{n.code}</span> · {n.label}</span>
                  <span className={`font-semibold ${n.ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {n.ecart >= 0 ? '+' : ''}{formatCurrency(n.ecart)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/budget/exploitation')}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          Détail Budget vs Réalisé (exploitation) →
        </button>
        <button
          onClick={() => navigate('/budget/saisie')}
          className="px-4 py-2 border border-[var(--color-border)] bg-white rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
        >
          <Target className="w-4 h-4" /> Saisir le budget
        </button>
        <button
          onClick={() => navigate('/budget/import')}
          className="px-4 py-2 border border-[var(--color-border)] bg-white rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
        >
          <Upload className="w-4 h-4" /> Importer un budget
        </button>
      </div>
    </div>
  );
};

export default BudgetCockpitPage;
