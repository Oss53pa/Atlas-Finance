/**
 * CreancesDettesRatiosBlock — bloc partagé « Créances, dettes & ratios ».
 *
 * Source unique pour les Dashboards Manager et Comptable. Dérive tous les
 * indicateurs du grand livre (glHelpers via computeDashboardMetrics), zéro mock :
 *  - postes de bilan (encours cumulés) : créances 41x, dettes 40x, stocks cl.3, BFR ;
 *  - ratios : DSO, DPO, marge brute, créances/dettes, BFR en jours de CA ;
 *  - évolution créances vs dettes sur 6 mois (encours de fin de mois) ;
 *  - alertes à seuils configurables (DSO, DPO, trésorerie, BFR), persistés en
 *    localStorage (clés partagées entre dashboards → réglage unique).
 *
 * Props :
 *  - entries : écritures brutes (le composant filtre les brouillons lui-même) ;
 *  - period  : plage optionnelle {from,to}. Absente ⇒ tout l'historique (365 j).
 *  - showAlerts : afficher la liste d'alertes en tête (défaut true).
 */
import React, { useMemo, useState } from 'react';
import { Wallet, Receipt, Scale, Percent, Landmark, Clock } from 'lucide-react';
import { useMoneyFormat } from '../../hooks/useMoneyFormat';
import { computeDashboardMetrics, type DashboardPeriod } from '../../utils/dashboardMetrics';

const MONTH_LABELS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

// Seuils d'alerte — clés localStorage partagées entre les dashboards.
const DSO_THRESHOLD_DEFAULT = 60; const DSO_THRESHOLD_KEY = 'manager-dso-threshold';
const DPO_THRESHOLD_DEFAULT = 60; const DPO_THRESHOLD_KEY = 'manager-dpo-threshold';
const TRESO_THRESHOLD_DEFAULT = 0; const TRESO_THRESHOLD_KEY = 'manager-treso-threshold';
const BFR_DAYS_THRESHOLD_DEFAULT = 90; const BFR_DAYS_THRESHOLD_KEY = 'manager-bfr-days-threshold';
const MARGE_BRUTE_THRESHOLD_DEFAULT = 20; const MARGE_BRUTE_THRESHOLD_KEY = 'manager-marge-brute-threshold'; // % — alerte si en dessous

const readNum = (key: string, def: number, positiveOnly = true): number => {
  try {
    const s = localStorage.getItem(key);
    if (s === null || s === '') return def;
    const v = Number(s);
    if (Number.isNaN(v)) return def;
    return positiveOnly ? (v > 0 ? v : def) : v;
  } catch { return def; }
};

interface Props {
  entries: any[];
  period?: DashboardPeriod;
  showAlerts?: boolean;
}

const CreancesDettesRatiosBlock: React.FC<Props> = ({ entries, period, showAlerts = true }) => {
  const fmt = useMoneyFormat();
  const from = period?.from;
  const to = period?.to;

  const data = useMemo(() => {
    const m = computeDashboardMetrics(entries, { from, to });
    const receivables = m.h.net('41');
    const payables = m.h.creditNet('40');
    const stocks = m.classNet['3'] || 0;
    const bfr = receivables + stocks - payables;
    const achats = m.h.net('60');
    const days = (from && to)
      ? Math.max(1, (new Date(to).getTime() - new Date(from).getTime()) / 86400000 + 1)
      : 365;
    const dso = m.ca > 0 ? Math.round((receivables / m.ca) * days) : 0;
    const dpo = achats > 0 ? Math.round((payables / achats) * days) : 0;
    const bfrDays = m.ca > 0 ? Math.round((bfr / m.ca) * days) : 0;
    const margeBrute = m.ca > 0 ? ((m.ca - achats) / m.ca) * 100 : 0;
    const ratioCD = payables !== 0 ? receivables / payables : null;
    return { revenue: m.ca, treasury: m.treasury, receivables, payables, stocks, bfr, bfrDays, dso, dpo, margeBrute, ratioCD };
  }, [entries, from, to]);

  const balHistory = useMemo(() => {
    const anchor = to ? new Date(to) : new Date();
    const hist: Array<{ label: string; creances: number; dettes: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i + 1, 0));
      const iso = monthEnd.toISOString().slice(0, 10);
      const mm = computeDashboardMetrics(entries, { to: iso });
      hist.push({ label: MONTH_LABELS_SHORT[monthEnd.getUTCMonth()], creances: mm.h.net('41'), dettes: mm.h.creditNet('40') });
    }
    return hist;
  }, [entries, to]);

  const [dsoThreshold, setDsoThreshold] = useState<number>(() => readNum(DSO_THRESHOLD_KEY, DSO_THRESHOLD_DEFAULT));
  const [dpoThreshold, setDpoThreshold] = useState<number>(() => readNum(DPO_THRESHOLD_KEY, DPO_THRESHOLD_DEFAULT));
  const [tresoThreshold, setTresoThreshold] = useState<number>(() => readNum(TRESO_THRESHOLD_KEY, TRESO_THRESHOLD_DEFAULT, false));
  const [bfrDaysThreshold, setBfrDaysThreshold] = useState<number>(() => readNum(BFR_DAYS_THRESHOLD_KEY, BFR_DAYS_THRESHOLD_DEFAULT));
  const [margeThreshold, setMargeThreshold] = useState<number>(() => readNum(MARGE_BRUTE_THRESHOLD_KEY, MARGE_BRUTE_THRESHOLD_DEFAULT));

  const persist = (key: string, setter: (n: number) => void, v: number, min: number, max: number) => {
    const val = Math.max(min, Math.min(max, Math.round(v || 0)));
    setter(val);
    try { localStorage.setItem(key, String(val)); } catch { /* ignore */ }
  };

  const alerts: string[] = [];
  if (data.dso > dsoThreshold) alerts.push(`DSO élevé : ${data.dso} j (seuil ${dsoThreshold} j)`);
  if (data.dpo > dpoThreshold) alerts.push(`DPO élevé : ${data.dpo} j (seuil ${dpoThreshold} j)`);
  if (data.revenue > 0 && data.bfrDays > bfrDaysThreshold) alerts.push(`BFR en forte hausse : ${data.bfrDays} j de CA (${fmt(data.bfr)}), seuil ${bfrDaysThreshold} j`);
  if (data.treasury < tresoThreshold) alerts.push(`Trésorerie sous le seuil : ${fmt(data.treasury)} (seuil ${fmt(tresoThreshold)})`);
  if (data.revenue > 0 && data.margeBrute < margeThreshold) alerts.push(`Marge brute faible : ${data.margeBrute.toFixed(1)} % (seuil ${margeThreshold} %)`);

  const cards = [
    { label: 'Créances clients', value: fmt(data.receivables), sub: 'Solde 41x (débiteur)', icon: Wallet, tone: 'text-[var(--color-primary)]' },
    { label: 'Dettes fournisseurs', value: fmt(data.payables), sub: 'Solde 40x (créditeur)', icon: Receipt, tone: 'text-[var(--color-warning-dark)]' },
    { label: 'BFR', value: fmt(data.bfr), sub: `${data.bfrDays} j de CA · seuil ${bfrDaysThreshold} j`, icon: Scale, tone: (data.revenue > 0 && data.bfrDays > bfrDaysThreshold) ? 'text-[var(--color-error)]' : (data.bfr >= 0 ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-success)]') },
    { label: 'DSO', value: `${data.dso} j`, sub: `Recouvrement · seuil ${dsoThreshold} j`, icon: Clock, tone: data.dso > dsoThreshold ? 'text-[var(--color-error)]' : 'text-[var(--color-text-primary)]' },
    { label: 'DPO', value: `${data.dpo} j`, sub: `Paiement fourn. · seuil ${dpoThreshold} j`, icon: Clock, tone: data.dpo > dpoThreshold ? 'text-[var(--color-error)]' : 'text-[var(--color-text-primary)]' },
    { label: 'Marge brute', value: `${data.margeBrute.toFixed(1)} %`, sub: `(CA − achats) / CA · seuil ${margeThreshold} %`, icon: Percent, tone: (data.revenue > 0 && data.margeBrute < margeThreshold) ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]' },
    { label: 'Créances / Dettes', value: data.ratioCD != null ? data.ratioCD.toFixed(2) : '—', sub: 'Couverture des dettes', icon: Landmark, tone: data.ratioCD != null && data.ratioCD >= 1 ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]' },
  ];

  const inputCls = 'px-2 py-1 rounded border border-[var(--color-border-dark)] text-[var(--color-text-primary)] text-xs num-tabular focus:ring-2 focus:ring-blue-500';

  return (
    <section className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)] mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Créances, dettes & ratios</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            <Clock className="w-3.5 h-3.5" /> Seuil DSO
            <input type="number" min={1} max={365} value={dsoThreshold} onChange={(e) => persist(DSO_THRESHOLD_KEY, setDsoThreshold, Number(e.target.value), 1, 365)} className={`w-14 ${inputCls}`} aria-label="Seuil DSO en jours" /> j
          </label>
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            Seuil DPO
            <input type="number" min={1} max={365} value={dpoThreshold} onChange={(e) => persist(DPO_THRESHOLD_KEY, setDpoThreshold, Number(e.target.value), 1, 365)} className={`w-14 ${inputCls}`} aria-label="Seuil DPO en jours" /> j
          </label>
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            Seuil trésorerie
            <input type="number" step={1000} value={tresoThreshold} onChange={(e) => persist(TRESO_THRESHOLD_KEY, setTresoThreshold, Number(e.target.value), -1e15, 1e15)} className={`w-28 ${inputCls}`} aria-label="Seuil trésorerie en FCFA" /> FCFA
          </label>
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            Seuil BFR
            <input type="number" min={1} max={1000} value={bfrDaysThreshold} onChange={(e) => persist(BFR_DAYS_THRESHOLD_KEY, setBfrDaysThreshold, Number(e.target.value), 1, 1000)} className={`w-16 ${inputCls}`} aria-label="Seuil BFR en jours de CA" /> j de CA
          </label>
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            Seuil marge brute
            <input type="number" min={0} max={100} value={margeThreshold} onChange={(e) => persist(MARGE_BRUTE_THRESHOLD_KEY, setMargeThreshold, Number(e.target.value), 0, 100)} className={`w-14 ${inputCls}`} aria-label="Seuil marge brute en pourcent" /> %
          </label>
        </div>
      </div>

      {showAlerts && alerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-[var(--color-warning-lightest)] border-l-4 border-yellow-400 text-[var(--color-text-primary)]">
              <span className="font-medium">⚠ {a}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {cards.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.label} className="p-4 rounded-lg bg-[var(--color-background-secondary)] border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-2 text-[var(--color-text-secondary)]">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{r.label}</span>
              </div>
              <p className={`text-base font-bold ${r.tone}`}>{r.value}</p>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">{r.sub}</p>
            </div>
          );
        })}
      </div>

      {balHistory.length > 0 && (() => {
        const maxVal = Math.max(1, ...balHistory.flatMap(h => [h.creances, h.dettes]));
        return (
          <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Évolution créances vs dettes (6 mois)</h3>
              <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[var(--color-primary)]" /> Créances</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[var(--color-warning)]" /> Dettes</span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-3" style={{ height: 160 }}>
              {balHistory.map((h) => (
                <div key={h.label} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="flex items-end justify-center gap-1 w-full" style={{ height: 130 }}>
                    <div className="rounded-t bg-[var(--color-primary)] transition-all" style={{ width: '38%', height: `${Math.max(2, (h.creances / maxVal) * 130)}px` }} title={`Créances ${h.label} : ${fmt(h.creances)}`} />
                    <div className="rounded-t bg-[var(--color-warning)] transition-all" style={{ width: '38%', height: `${Math.max(2, (h.dettes / maxVal) * 130)}px` }} title={`Dettes ${h.label} : ${fmt(h.dettes)}`} />
                  </div>
                  <span className="text-[11px] text-[var(--color-text-secondary)] mt-2">{h.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </section>
  );
};

export default CreancesDettesRatiosBlock;
