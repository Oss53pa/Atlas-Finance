/**
 * capexMetrics — évaluation financière déterministe d'un investissement (CAR).
 *
 * VAN / NPV, TRI / IRR, payback simple + actualisé, indice de profitabilité (PI),
 * ROI. Calcul pur, reproductible, sans LLM (CDC §8 ②). Les flux sont annuels :
 * `investment` à t0 (sortie), `flows[i]` = flux net de l'année i+1, `residual`
 * ajouté à la dernière année. `rate` = taux d'actualisation (WACC), ex. 0.1.
 */
export interface CashflowInput {
  investment: number;   // montant investi à t0 (> 0)
  flows: number[];      // flux nets annuels (années 1..n)
  rate: number;         // taux d'actualisation annuel (ex. 0.1 = 10 %)
  residual?: number;    // valeur résiduelle (ajoutée à la dernière année)
}

export interface CapexMetrics {
  npv: number;                    // VAN
  irr: number | null;            // TRI annuel (fraction, ex. 0.2186), null si non trouvé
  paybackSimpleMonths: number | null;
  paybackActualiseMonths: number | null;
  pi: number | null;             // indice de profitabilité (PV entrées / investissement)
  roi: number | null;            // (Σ entrées − investissement) / investissement
}

function effectiveFlows(input: CashflowInput): number[] {
  const flows = input.flows.slice();
  if (input.residual && flows.length > 0) flows[flows.length - 1] += input.residual;
  else if (input.residual) flows.push(input.residual);
  return flows;
}

export function npv(rate: number, investment: number, flows: number[]): number {
  let acc = -Math.abs(investment);
  for (let t = 0; t < flows.length; t++) acc += flows[t] / Math.pow(1 + rate, t + 1);
  return acc;
}

/** TRI par bissection sur [-0.9, 10]. null si pas de changement de signe exploitable. */
export function irr(investment: number, flows: number[]): number | null {
  const f = (r: number) => npv(r, investment, flows);
  let lo = -0.9, hi = 10;
  let flo = f(lo), fhi = f(hi);
  if (Number.isNaN(flo) || Number.isNaN(fhi)) return null;
  if (flo * fhi > 0) return null; // pas de racine encadrée
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1e-7) return +mid.toFixed(6);
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return +((lo + hi) / 2).toFixed(6);
}

/** Mois jusqu'au recouvrement (interpolation linéaire intra-année). null si jamais. */
function paybackMonths(investment: number, periodFlows: number[]): number | null {
  const inv = Math.abs(investment);
  let cum = 0;
  for (let t = 0; t < periodFlows.length; t++) {
    const before = cum;
    cum += periodFlows[t];
    if (cum >= inv) {
      const need = inv - before;
      const frac = periodFlows[t] > 0 ? need / periodFlows[t] : 0;
      return Math.round((t + frac) * 12);
    }
  }
  return null;
}

export function computeCapexMetrics(input: CashflowInput): CapexMetrics {
  const inv = Math.abs(input.investment);
  const flows = effectiveFlows(input);
  const rate = input.rate;

  const van = npv(rate, inv, flows);
  const tri = irr(inv, flows);
  const pvInflows = flows.reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t + 1), 0);
  const discounted = flows.map((cf, t) => cf / Math.pow(1 + rate, t + 1));
  const totalInflows = flows.reduce((s, cf) => s + cf, 0);

  return {
    npv: Math.round(van),
    irr: tri,
    paybackSimpleMonths: paybackMonths(inv, flows),
    paybackActualiseMonths: paybackMonths(inv, discounted),
    pi: inv > 0 ? +(pvInflows / inv).toFixed(4) : null,
    roi: inv > 0 ? +((totalInflows - inv) / inv).toFixed(4) : null,
  };
}
