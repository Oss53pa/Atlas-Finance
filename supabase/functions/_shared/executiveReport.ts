/**
 * executiveReport — moteur partagé de la « Vue Dirigeant ».
 *
 * Calcule les agrégats financiers canoniques d'un exercice et construit l'email
 * HTML (responsive, styles inline compatibles clients mail) de la synthèse
 * exécutive envoyée aux dirigeants.
 *
 * Les règles de calcul REPRODUISENT fidèlement `src/utils/dashboardMetrics.ts`
 * (source unique côté front) pour garantir que l'email et l'écran affichent les
 * mêmes chiffres :
 *   - brouillons (status === 'draft') exclus ; 'validated' ET 'posted' comptés ;
 *   - produits  = solde net créditeur cl.7 ;
 *   - charges   = solde net débiteur   cl.6 ;
 *   - impôt     = solde net cl.89 ;
 *   - résultat  = produits − charges − impôt ;
 *   - trésorerie = solde net cl.5 HORS 58 (virements internes en transit).
 *
 * Module pur (aucune API Deno/DOM) : testable et réutilisable.
 */

export type Frequency = 'weekly' | 'monthly';

export interface ReportLine {
  account_code: string;
  debit: number;
  credit: number;
  third_party_code?: string | null;
  third_party_name?: string | null;
}

export interface ReportEntry {
  date: string;   // 'YYYY-MM-DD'
  status: string; // 'draft' | 'validated' | 'posted'
  lines: ReportLine[];
}

export interface ReportContext {
  companyName: string;
  fyYear: number;         // année de l'exercice actif
  exerciceLabel: string;  // ex. « 2024 » ou « 2024–2025 »
  frequency: Frequency;
  periodLabel: string;    // ex. « Mai 2024 »
  appUrl: string;         // lien « Ouvrir le tableau de bord »
}

export interface MonthAgg { ca: number; charges: number }

export interface ChargeSlice { label: string; value: number; color: string }

export interface ReportData {
  ctx: ReportContext;
  ca: number;
  charges: number;
  achats: number;          // consommations cl.60 (pour la marge brute)
  margeBrute: number;      // ca − achats
  tauxMargeBrute: number;  // %
  resultatNet: number;
  margeNette: number;      // %
  treasury: number;
  count: number;
  hasData: boolean;
  caDelta?: { value: string; up: boolean | null };     // mois courant vs précédent
  resultDelta?: { value: string; up: boolean | null };
  monthly: MonthAgg[];     // 12 mois de l'exercice
  chargeBreakdown: ChargeSlice[]; // répartition des charges par nature
  chargeTotal: number;
  topClients: { name: string; ca: number }[];
  healthScore: number;
  healthAxes: { label: string; score: number }[];
}

// Répartition des charges (classe 6) par nature SYSCOHADA — miroir de la vue écran.
const CHARGE_GROUPS: { label: string; prefixes: string[]; color: string }[] = [
  { label: 'Achats / Marchandises', prefixes: ['60'], color: '#2E7D8A' },
  { label: 'Charges de personnel', prefixes: ['66'], color: '#C79A3F' },
  { label: 'Services extérieurs', prefixes: ['61', '62', '63'], color: '#1E3A4C' },
  { label: 'Impôts & taxes', prefixes: ['64'], color: '#6BA9B2' },
  { label: 'Charges financières', prefixes: ['67'], color: '#405A66' },
  { label: 'Autres charges', prefixes: ['65', '68', '69'], color: '#AEC3C9' },
];

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

/** FCFA compact : 1 234 567 → « 1,23 M », 9 050 000 000 → « 9,05 Md ». */
export function fcfa(n: number): string {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(a / 1e9 >= 100 ? 0 : 2).replace('.', ',')} Md`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(a / 1e6 >= 100 ? 0 : 1).replace('.', ',')} M`;
  if (a >= 1e3) return `${s}${Math.round(a / 1e3)} K`;
  return `${s}${Math.round(a).toLocaleString('fr-FR')}`;
}

function isPosted(e: ReportEntry): boolean {
  return !!e && e.status !== 'draft';
}

/** Solde net (débit − crédit) des lignes dont le compte commence par `prefix`. */
function net(entries: ReportEntry[], prefix: string): number {
  let acc = 0;
  for (const e of entries) {
    if (!isPosted(e)) continue;
    for (const l of e.lines || []) {
      if (String(l.account_code || '').startsWith(prefix)) {
        acc += (Number(l.debit) || 0) - (Number(l.credit) || 0);
      }
    }
  }
  return acc;
}

/** Solde net créditeur (crédit − débit) des lignes dont le compte commence par `prefix`. */
function creditNet(entries: ReportEntry[], prefix: string): number {
  return -net(entries, prefix);
}

/**
 * Construit l'objet de données du rapport à partir des écritures de l'exercice.
 * `entries` doit être PRÉ-FILTRÉ sur l'exercice (année fiscale) côté appelant.
 */
export function computeReportData(entries: ReportEntry[], ctx: ReportContext): ReportData {
  const posted = (entries || []).filter(isPosted);

  const ca = creditNet(posted, '7');
  const charges = net(posted, '6');
  const achats = net(posted, '60');
  const margeBrute = ca - achats;
  const tauxMargeBrute = ca > 0 ? (margeBrute / ca) * 100 : 0;
  const impots = net(posted, '89');
  const resultatNet = ca - charges - impots;
  const margeNette = ca > 0 ? (resultatNet / ca) * 100 : 0;
  const treasury = net(posted, '5') - net(posted, '58');

  // Répartition des charges par nature (classe 6).
  const chargeBreakdown: ChargeSlice[] = CHARGE_GROUPS
    .map((g) => ({ label: g.label, color: g.color, value: g.prefixes.reduce((s, p) => s + net(posted, p), 0) }))
    .filter((x) => x.value > 0);
  const chargeTotal = chargeBreakdown.reduce((s, x) => s + x.value, 0);

  // Séries mensuelles (12 mois de l'exercice) : CA (cl.7) et charges (cl.6).
  const monthly: MonthAgg[] = Array.from({ length: 12 }, () => ({ ca: 0, charges: 0 }));
  for (const e of posted) {
    const d = String(e.date || '').slice(0, 10);
    if (!d || d.slice(0, 4) !== String(ctx.fyYear)) continue;
    const mi = parseInt(d.slice(5, 7), 10) - 1;
    if (mi < 0 || mi > 11) continue;
    for (const l of e.lines || []) {
      const cls = String(l.account_code || '').charAt(0);
      const debit = Number(l.debit) || 0;
      const credit = Number(l.credit) || 0;
      if (cls === '7') monthly[mi].ca += credit - debit;
      else if (cls === '6') monthly[mi].charges += debit - credit;
    }
  }

  const caSeries = monthly.map((b) => Math.round(b.ca));
  const resultSeries = monthly.map((b) => Math.round(b.ca - b.charges));

  // Delta mois courant vs mois précédent (dernier mois mouvementé).
  const lastIdx = (() => {
    for (let i = 11; i >= 0; i--) if (monthly[i].ca !== 0 || monthly[i].charges !== 0) return i;
    return -1;
  })();
  const pct = (cur: number, prev: number): { value: string; up: boolean | null } => {
    if (prev === 0) return { value: '—', up: null };
    const d = ((cur - prev) / Math.abs(prev)) * 100;
    return { value: `${d >= 0 ? '+' : ''}${d.toFixed(0)} %`, up: d > 1 ? true : d < -1 ? false : null };
  };
  const caDelta = lastIdx > 0 ? pct(caSeries[lastIdx], caSeries[lastIdx - 1]) : undefined;
  const resultDelta = lastIdx > 0 ? pct(resultSeries[lastIdx], resultSeries[lastIdx - 1]) : undefined;

  // Top clients par CA (compte 70x + tiers porté par la ligne 41x).
  const clientAcc = new Map<string, { name: string; ca: number }>();
  for (const e of posted) {
    const d = String(e.date || '').slice(0, 10);
    if (!d || d.slice(0, 4) !== String(ctx.fyYear)) continue;
    const lines = e.lines || [];
    const ca70 = lines
      .filter((l) => String(l.account_code || '').startsWith('70'))
      .reduce((sum, l) => sum + ((Number(l.credit) || 0) - (Number(l.debit) || 0)), 0);
    if (ca70 === 0) continue;
    const cl = lines.find((l) => String(l.account_code || '').startsWith('41') && l.third_party_code);
    if (!cl) continue;
    const code = String(cl.third_party_code);
    const cur = clientAcc.get(code) || { name: String(cl.third_party_name || code), ca: 0 };
    cur.ca += ca70;
    clientAcc.set(code, cur);
  }
  const topClients = Array.from(clientAcc.values()).sort((a, b) => b.ca - a.ca).slice(0, 5);

  // Score de santé financière (axes réels — identiques à PremiumOverview).
  const rentabilite = resultatNet > 0 ? 100 : resultatNet === 0 ? 50 : 0;
  const margeScore = Math.max(0, Math.min(100, Math.round(margeNette * 4)));
  const tresoScore = treasury > 0 ? 100 : treasury === 0 ? 50 : 0;
  const croissance = caDelta?.up === true ? 100 : caDelta?.up === false ? 35 : 65;
  const healthAxes = [
    { label: 'Rentabilité', score: rentabilite },
    { label: 'Marge nette', score: margeScore },
    { label: 'Trésorerie', score: tresoScore },
    { label: 'Croissance CA', score: croissance },
  ];
  const healthScore = Math.round(healthAxes.reduce((s, a) => s + a.score, 0) / healthAxes.length);

  return {
    ctx,
    ca,
    charges,
    achats,
    margeBrute,
    tauxMargeBrute,
    resultatNet,
    margeNette,
    treasury,
    count: posted.length,
    hasData: posted.length > 0,
    caDelta,
    resultDelta,
    monthly,
    chargeBreakdown,
    chargeTotal,
    topClients,
    healthScore,
    healthAxes,
  };
}

// ─── Palette de marque (Atlas) ───
const OBSIDIAN = '#171717';
const GOLD = '#C6A15B';
const SUCCESS = '#16A34A';
const ERROR = '#DC2626';
const MUTED = '#737373';
const BORDER = '#E5E5E5';
const BG = '#F7F4ED';

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

function deltaBadge(d?: { value: string; up: boolean | null }): string {
  if (!d) return '';
  const color = d.up === true ? SUCCESS : d.up === false ? ERROR : MUTED;
  const arrow = d.up === true ? '▲' : d.up === false ? '▼' : '→';
  return `<span style="color:${color};font-size:12px;font-weight:600;">${arrow} ${esc(d.value)}</span>`;
}

function kpiCell(eyebrow: string, value: string, unit: string, delta?: { value: string; up: boolean | null }, accent = OBSIDIAN): string {
  return `
    <td width="50%" style="padding:8px;" valign="top">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${BORDER};border-radius:12px;">
        <tr><td style="padding:16px 18px;">
          <div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};font-weight:700;margin-bottom:6px;">${esc(eyebrow)}</div>
          <div style="font-size:24px;font-weight:800;color:${accent};line-height:1.1;">${esc(value)} <span style="font-size:12px;font-weight:600;color:${MUTED};">${esc(unit)}</span></div>
          <div style="margin-top:6px;">${deltaBadge(delta)}</div>
        </td></tr>
      </table>
    </td>`;
}

/** Barres CA/charges des 6 derniers mois mouvementés (SVG inline, robuste en mail). */
function monthlyBars(monthly: MonthAgg[]): string {
  const rows = monthly
    .map((m, i) => ({ ...m, i }))
    .filter((m) => m.ca !== 0 || m.charges !== 0)
    .slice(-6);
  if (rows.length === 0) return '';
  const max = Math.max(1, ...rows.map((r) => Math.max(r.ca, r.charges)));
  const bar = (v: number, color: string) => {
    const w = Math.max(2, Math.round((Math.abs(v) / max) * 160));
    return `<td style="padding:0 6px;"><div style="height:10px;width:${w}px;background:${color};border-radius:3px;"></div></td>`;
  };
  const body = rows
    .map(
      (r) => `
      <tr>
        <td style="font-size:11px;color:${MUTED};font-weight:600;width:36px;">${MONTH_LABELS[r.i]}</td>
        ${bar(r.ca, GOLD)}
        <td style="font-size:11px;color:${OBSIDIAN};font-weight:600;text-align:right;white-space:nowrap;">${esc(fcfa(r.ca))}</td>
      </tr>
      <tr>
        <td></td>
        ${bar(r.charges, '#B0B0B0')}
        <td style="font-size:11px;color:${MUTED};text-align:right;white-space:nowrap;">${esc(fcfa(r.charges))}</td>
      </tr>
      <tr><td colspan="3" style="height:8px;"></td></tr>`,
    )
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${BORDER};border-radius:12px;">
      <tr><td style="padding:18px;">
        <div style="font-size:13px;font-weight:700;color:${OBSIDIAN};margin-bottom:4px;">Évolution du chiffre d'affaires</div>
        <div style="font-size:11px;color:${MUTED};margin-bottom:14px;">
          <span style="display:inline-block;width:8px;height:8px;background:${GOLD};border-radius:2px;"></span> Chiffre d'affaires
          &nbsp;&nbsp;<span style="display:inline-block;width:8px;height:8px;background:#B0B0B0;border-radius:2px;"></span> Charges
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table>
      </td></tr>
    </table>`;
}

function topClientsBlock(clients: { name: string; ca: number }[]): string {
  if (clients.length === 0) return '';
  const rows = clients
    .map(
      (c, i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid ${BORDER};font-size:13px;color:${OBSIDIAN};">
          <span style="color:${GOLD};font-weight:700;">${i + 1}.</span> ${esc(c.name)}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid ${BORDER};font-size:13px;color:${OBSIDIAN};font-weight:700;text-align:right;white-space:nowrap;">${esc(fcfa(c.ca))} FCFA</td>
      </tr>`,
    )
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${BORDER};border-radius:12px;">
      <tr><td style="padding:18px;">
        <div style="font-size:13px;font-weight:700;color:${OBSIDIAN};margin-bottom:10px;">Top clients — chiffre d'affaires</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      </td></tr>
    </table>`;
}

/** Répartition des charges par nature — barres CSS (compatibles email, sans SVG). */
function chargesBreakdownBlock(items: ChargeSlice[], total: number): string {
  if (items.length === 0 || total <= 0) return '';
  const rows = items
    .map((x) => {
      const pct = Math.round((x.value / total) * 100);
      return `
      <tr>
        <td style="font-size:12px;color:${OBSIDIAN};padding:5px 0;width:150px;">
          <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${x.color};margin-right:6px;"></span>${esc(x.label)}
        </td>
        <td style="padding:5px 8px;"><div style="background:${BORDER};border-radius:4px;height:9px;width:100%;"><div style="background:${x.color};height:9px;border-radius:4px;width:${Math.max(3, pct)}%;"></div></div></td>
        <td style="font-size:12px;color:${OBSIDIAN};font-weight:700;text-align:right;width:70px;padding:5px 0;white-space:nowrap;">${pct} %</td>
      </tr>`;
    })
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${BORDER};border-radius:12px;">
      <tr><td style="padding:18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:13px;font-weight:700;color:${OBSIDIAN};">Répartition des charges</td>
          <td style="text-align:right;font-size:13px;font-weight:700;color:${OBSIDIAN};">Total ${esc(fcfa(total))} FCFA</td>
        </tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">${rows}</table>
      </td></tr>
    </table>`;
}

function healthBlock(score: number, axes: { label: string; score: number }[]): string {
  const color = score >= 70 ? SUCCESS : score >= 45 ? GOLD : ERROR;
  const bars = axes
    .map(
      (a) => `
      <tr>
        <td style="font-size:12px;color:${MUTED};width:100px;padding:4px 0;">${esc(a.label)}</td>
        <td style="padding:4px 0;"><div style="background:${BORDER};border-radius:4px;height:8px;width:100%;"><div style="background:${a.score >= 70 ? SUCCESS : a.score >= 45 ? GOLD : ERROR};height:8px;border-radius:4px;width:${Math.max(3, a.score)}%;"></div></div></td>
        <td style="font-size:12px;color:${OBSIDIAN};font-weight:700;text-align:right;width:36px;padding:4px 0;">${a.score}</td>
      </tr>`,
    )
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${BORDER};border-radius:12px;">
      <tr><td style="padding:18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:13px;font-weight:700;color:${OBSIDIAN};">Santé financière</td>
          <td style="text-align:right;font-size:28px;font-weight:800;color:${color};">${score}<span style="font-size:13px;color:${MUTED};font-weight:600;">/100</span></td>
        </tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">${bars}</table>
      </td></tr>
    </table>`;
}

/** Construit l'email HTML complet de la synthèse exécutive. */
export function buildReportHtml(data: ReportData): string {
  const { ctx } = data;
  const freqLabel = ctx.frequency === 'weekly' ? 'Synthèse hebdomadaire' : 'Synthèse mensuelle';
  const resultAccent = data.resultatNet >= 0 ? SUCCESS : ERROR;

  const kpis = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${kpiCell('Chiffre d\'affaires', fcfa(data.ca), 'FCFA', data.caDelta, OBSIDIAN)}
        ${kpiCell('Marge brute', fcfa(data.margeBrute), 'FCFA', undefined, GOLD)}
      </tr>
      <tr>
        ${kpiCell('Résultat net', fcfa(data.resultatNet), 'FCFA', data.resultDelta, resultAccent)}
        ${kpiCell('Trésorerie', fcfa(data.treasury), 'FCFA', undefined, OBSIDIAN)}
      </tr>
    </table>`;

  const emptyNotice = data.hasData
    ? ''
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;margin-bottom:16px;">
        <tr><td style="padding:16px 18px;font-size:13px;color:#9A3412;">Aucune écriture comptabilisée sur l'exercice : les indicateurs s'afficheront dès les premières saisies validées.</td></tr>
      </table>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${esc(freqLabel)} — ${esc(ctx.companyName)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- En-tête -->
        <tr><td style="background:${OBSIDIAN};border-radius:16px 16px 0 0;padding:28px 24px;">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-weight:700;">Vue Dirigeant · ${esc(ctx.periodLabel)}</div>
          <div style="font-size:24px;font-weight:800;color:#ffffff;margin-top:6px;">${esc(ctx.companyName)}</div>
          <div style="font-size:13px;color:#B8B8B8;margin-top:4px;">${esc(freqLabel)} — Exercice ${esc(ctx.exerciceLabel)}</div>
        </td></tr>

        <!-- Corps -->
        <tr><td style="background:${BG};padding:20px 12px;">
          ${emptyNotice}
          ${kpis}
          <div style="height:16px;"></div>
          ${monthlyBars(data.monthly)}
          <div style="height:16px;"></div>
          ${chargesBreakdownBlock(data.chargeBreakdown, data.chargeTotal)}
          <div style="height:16px;"></div>
          ${healthBlock(data.healthScore, data.healthAxes)}
          <div style="height:16px;"></div>
          ${topClientsBlock(data.topClients)}
          <div style="height:20px;"></div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${esc(ctx.appUrl)}" style="display:inline-block;background:${OBSIDIAN};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;">Ouvrir le tableau de bord</a>
          </td></tr></table>
        </td></tr>

        <!-- Pied -->
        <tr><td style="background:${BG};border-radius:0 0 16px 16px;padding:20px 24px;text-align:center;">
          <div style="font-size:11px;color:${MUTED};line-height:1.6;">
            Rapport généré automatiquement par Atlas FnA · SYSCOHADA révisé · FCFA (XOF)<br>
            Vous recevez cet email car un envoi ${ctx.frequency === 'weekly' ? 'hebdomadaire' : 'mensuel'} a été programmé pour ${esc(ctx.companyName)}.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Calcule la prochaine échéance d'envoi (UTC) à partir d'une base temporelle.
 * - weekly : prochain `weekday` à `send_hour`h ;
 * - monthly : prochain `month_day` à `send_hour`h.
 * Retourne un ISO string. `from` par défaut = maintenant.
 */
export function computeNextRun(
  frequency: Frequency,
  opts: { sendHour: number; weekday: number; monthDay: number },
  from: Date = new Date(),
): string {
  const base = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), from.getUTCHours(), from.getUTCMinutes(), 0, 0));

  if (frequency === 'weekly') {
    const next = new Date(base);
    next.setUTCHours(opts.sendHour, 0, 0, 0);
    // Décale jusqu'au prochain `weekday` strictement dans le futur.
    let guard = 0;
    while ((next.getUTCDay() !== opts.weekday || next.getTime() <= from.getTime()) && guard < 14) {
      next.setUTCDate(next.getUTCDate() + 1);
      next.setUTCHours(opts.sendHour, 0, 0, 0);
      guard++;
    }
    return next.toISOString();
  }

  // monthly
  const day = Math.min(28, Math.max(1, opts.monthDay));
  let year = base.getUTCFullYear();
  let month = base.getUTCMonth();
  let next = new Date(Date.UTC(year, month, day, opts.sendHour, 0, 0, 0));
  if (next.getTime() <= from.getTime()) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
    next = new Date(Date.UTC(year, month, day, opts.sendHour, 0, 0, 0));
  }
  return next.toISOString();
}
