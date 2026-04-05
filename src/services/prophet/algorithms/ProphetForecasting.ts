// @ts-nocheck
/**
 * ProphetForecasting — Prévision trésorerie Prophet-like (TypeScript pur)
 * Modèle : y(t) = trend(t) + seasonality(t) + holidays(t) + ε
 */

export interface TimePoint { date: string; value: number; }

export interface ForecastResult {
  predictions: TimePoint[];
  intervalle_confiance_80: { lower: number[]; upper: number[] };
  intervalle_confiance_95: { lower: number[]; upper: number[] };
  composantes: { trend: number[]; seasonal: number[]; holiday: number[] };
  mape: number;
}

// Jours fériés OHADA principaux (communs aux 17 pays)
const JOURS_FERIES_OHADA: { mois: number; jour: number; nom: string }[] = [
  { mois: 1, jour: 1, nom: 'Jour de l\'an' },
  { mois: 5, jour: 1, nom: 'Fête du travail' },
  { mois: 12, jour: 25, nom: 'Noël' },
  { mois: 8, jour: 7, nom: 'Fête nationale CI' },
  { mois: 4, jour: 4, nom: 'Fête nationale SN' },
  { mois: 5, jour: 20, nom: 'Fête nationale CM' },
  { mois: 8, jour: 17, nom: 'Fête nationale GA' },
];

function isHoliday(date: Date): number {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return JOURS_FERIES_OHADA.some(h => h.mois === m && h.jour === d) ? 1 : 0;
}

export class ProphetLikeForecaster {
  private trendSlope: number = 0;
  private trendIntercept: number = 0;
  private weeklyCoeffs: number[] = new Array(7).fill(0);
  private monthlyCoeffs: number[] = new Array(12).fill(0);
  private holidayEffect: number = 0;
  private residualStd: number = 0;
  private fitted: boolean = false;

  fit(data: TimePoint[]): void {
    if (data.length < 7) {
      this.trendIntercept = data.length > 0 ? data[data.length - 1].value : 0;
      this.fitted = true;
      return;
    }

    const n = data.length;
    const values = data.map(d => d.value);
    const dates = data.map(d => new Date(d.date));

    // 1. Trend — linear regression
    const xs = data.map((_, i) => i);
    const meanX = xs.reduce((a, x) => a + x, 0) / n;
    const meanY = values.reduce((a, y) => a + y, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - meanX) * (values[i] - meanY);
      den += (xs[i] - meanX) ** 2;
    }
    this.trendSlope = den !== 0 ? num / den : 0;
    this.trendIntercept = meanY - this.trendSlope * meanX;

    // Detrend
    const detrended = values.map((v, i) => v - (this.trendIntercept + this.trendSlope * i));

    // 2. Weekly seasonality
    const weekBuckets: number[][] = Array.from({ length: 7 }, () => []);
    dates.forEach((d, i) => weekBuckets[d.getDay()].push(detrended[i]));
    this.weeklyCoeffs = weekBuckets.map(b => b.length > 0 ? b.reduce((a, v) => a + v, 0) / b.length : 0);

    // 3. Monthly seasonality
    const monthBuckets: number[][] = Array.from({ length: 12 }, () => []);
    dates.forEach((d, i) => monthBuckets[d.getMonth()].push(detrended[i]));
    this.monthlyCoeffs = monthBuckets.map(b => b.length > 0 ? b.reduce((a, v) => a + v, 0) / b.length : 0);

    // 4. Holiday effect
    const holidayValues: number[] = [];
    const nonHolidayValues: number[] = [];
    dates.forEach((d, i) => {
      if (isHoliday(d)) holidayValues.push(detrended[i]);
      else nonHolidayValues.push(detrended[i]);
    });
    const avgNonHoliday = nonHolidayValues.length > 0 ? nonHolidayValues.reduce((a, v) => a + v, 0) / nonHolidayValues.length : 0;
    this.holidayEffect = holidayValues.length > 0 ? (holidayValues.reduce((a, v) => a + v, 0) / holidayValues.length) - avgNonHoliday : 0;

    // 5. Residual std for confidence intervals
    const residuals = values.map((v, i) => {
      const t = this.trendIntercept + this.trendSlope * i;
      const s = this.weeklyCoeffs[dates[i].getDay()] + this.monthlyCoeffs[dates[i].getMonth()];
      const h = isHoliday(dates[i]) ? this.holidayEffect : 0;
      return v - (t + s + h);
    });
    const meanRes = residuals.reduce((a, r) => a + r, 0) / n;
    this.residualStd = Math.sqrt(residuals.reduce((a, r) => a + (r - meanRes) ** 2, 0) / n);

    this.fitted = true;
  }

  forecast(horizon: 30 | 60 | 90, startDate?: string): ForecastResult {
    const predictions: TimePoint[] = [];
    const trendComp: number[] = [];
    const seasonalComp: number[] = [];
    const holidayComp: number[] = [];
    const lower80: number[] = [];
    const upper80: number[] = [];
    const lower95: number[] = [];
    const upper95: number[] = [];

    const start = startDate ? new Date(startDate) : new Date();
    const baseIndex = 0; // Forecast starts from current position

    for (let i = 1; i <= horizon; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);

      const t = this.trendIntercept + this.trendSlope * (i + 365); // extend from training
      const s = this.weeklyCoeffs[date.getDay()] + this.monthlyCoeffs[date.getMonth()];
      const h = isHoliday(date) ? this.holidayEffect : 0;
      const predicted = t + s + h;

      // Uncertainty grows with horizon
      const uncertainty = this.residualStd * Math.sqrt(i / 7);
      const z80 = 1.28;
      const z95 = 1.96;

      predictions.push({ date: date.toISOString().split('T')[0], value: Math.round(predicted) });
      trendComp.push(Math.round(t));
      seasonalComp.push(Math.round(s));
      holidayComp.push(Math.round(h));
      lower80.push(Math.round(predicted - z80 * uncertainty));
      upper80.push(Math.round(predicted + z80 * uncertainty));
      lower95.push(Math.round(predicted - z95 * uncertainty));
      upper95.push(Math.round(predicted + z95 * uncertainty));
    }

    // MAPE (on training data — simplified)
    const mape = this.residualStd > 0 && this.trendIntercept !== 0
      ? Math.round((this.residualStd / Math.abs(this.trendIntercept)) * 10000) / 100
      : 0;

    return {
      predictions,
      intervalle_confiance_80: { lower: lower80, upper: upper80 },
      intervalle_confiance_95: { lower: lower95, upper: upper95 },
      composantes: { trend: trendComp, seasonal: seasonalComp, holiday: holidayComp },
      mape: Math.min(mape, 100),
    };
  }
}
