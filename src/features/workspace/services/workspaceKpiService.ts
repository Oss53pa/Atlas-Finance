/**
 * Indicateurs des espaces de travail.
 *
 * Les cartes affichaient de la volumétrie : nombre d'écritures, nombre validées,
 * pourcentage validé — trois façons de dire la même chose, et aucune ne répondait
 * à la question du poste. Un comptable a besoin de CONTRÔLES (mes livres sont-ils
 * justes et clôturables ?), un DAF de RÉFÉRENCES (ce chiffre est-il bon ?).
 *
 * Tout est calculé sur les données réelles du grand livre et des services
 * existants — balance âgée, prévision de trésorerie, exécution budgétaire.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBJournalEntry } from '../../../lib/db';
import { money } from '../../../utils/money';
import { getAgedReceivables } from '../../balance/services/balanceService';
import { forecastCashFlow } from '../../treasury/services/cashFlowForecastService';
import { getBudgetVsActual } from '../../budget/services/budgetService';

const DAY = 86_400_000;

/* ══════════════════════ Espace Comptable — contrôles ══════════════════════ */

export interface ComptableControls {
  /** Écart débit − crédit sur les écritures non brouillon. Doit valoir 0. */
  ecartDebitCredit: number;
  /** Brouillons en attente de validation. */
  drafts: { count: number; oldestDays: number | null };
  /** Comptes d'attente 47x non soldés — bloquent la clôture. */
  suspense: { amount: number; accounts: number };
  /** Encours de tiers (401/411) non lettré. */
  unmatched: { amount: number; lines: number };
}

export async function getComptableControls(adapter: DataAdapter): Promise<ComptableControls> {
  const entries = await adapter.getAll<DBJournalEntry>('journalEntries');

  let debit = 0, credit = 0;
  let draftCount = 0, oldestDraft: number | null = null;
  // Solde par compte d'attente : un 471 débiteur et un 472 créditeur ne se
  // compensent pas, chacun doit être justifié avant clôture.
  const suspenseByAccount = new Map<string, number>();
  let unmatchedAmount = 0, unmatchedLines = 0;
  const today = Date.now();

  for (const entry of entries) {
    const isDraft = entry.status === 'draft';
    if (isDraft) {
      draftCount += 1;
      const d = new Date(entry.date || entry.createdAt || '').getTime();
      if (!Number.isNaN(d)) {
        const age = Math.floor((today - d) / DAY);
        oldestDraft = oldestDraft === null ? age : Math.max(oldestDraft, age);
      }
      // Un brouillon n'est pas comptabilisé : ni dans l'équilibre, ni dans les
      // soldes. Il ne compte que comme travail restant.
      continue;
    }

    for (const line of entry.lines || []) {
      const code = String(line.accountCode || '');
      if (!code) continue;
      const d = line.debit || 0, c = line.credit || 0;
      debit = money(debit).add(d).toNumber();
      credit = money(credit).add(c).toNumber();

      if (code.startsWith('47')) {
        suspenseByAccount.set(code, money(suspenseByAccount.get(code) || 0).add(d - c).toNumber());
      }
      if ((code.startsWith('401') || code.startsWith('411')) && !line.lettrageCode) {
        unmatchedAmount = money(unmatchedAmount).add(Math.abs(d - c)).toNumber();
        unmatchedLines += 1;
      }
    }
  }

  let suspenseAmount = 0, suspenseAccounts = 0;
  for (const solde of suspenseByAccount.values()) {
    if (Math.abs(solde) < 0.005) continue;   // soldé au centime près
    suspenseAmount = money(suspenseAmount).add(Math.abs(solde)).toNumber();
    suspenseAccounts += 1;
  }

  return {
    ecartDebitCredit: money(debit).subtract(credit).toNumber(),
    drafts: { count: draftCount, oldestDays: oldestDraft },
    suspense: { amount: suspenseAmount, accounts: suspenseAccounts },
    unmatched: { amount: unmatchedAmount, lines: unmatchedLines },
  };
}

/* ═════════════════════════ Recouvrement — commun ══════════════════════════ */

export interface RecouvrementIndicator {
  /** Encours client échu, toutes tranches confondues. */
  overdue: number;
  /** Dont échu depuis plus de 60 jours (tranches 61-90 et > 90). */
  overdue60: number;
  /** Dont échu depuis plus de 90 jours — candidat à la provision. */
  overdue90: number;
  /** Nombre de clients présentant au moins une créance échue. */
  clients: number;
  /** Encours client total (échu + non échu). */
  total: number;
  /** Part échue de l'encours, en % — 0 si aucun encours. */
  overduePct: number;
  /** Client le plus exposé, pour savoir par où commencer les relances. */
  topClient: { name: string; amount: number } | null;
}

/**
 * Recouvrement : ce qui reste à encaisser et à relancer.
 *
 * L'encours échu seul ne dit pas s'il est anormal — 50 M échus sur 60 M
 * d'encours et sur 800 M ne se pilotent pas pareil. La part échue et le client
 * le plus exposé donnent la mesure et le point de départ des relances.
 */
export async function getRecouvrementIndicator(adapter: DataAdapter): Promise<RecouvrementIndicator> {
  const aged = await getAgedReceivables(adapter).catch(() => []);

  let overdue = 0, overdue60 = 0, overdue90 = 0, total = 0, clients = 0;
  let topClient: RecouvrementIndicator['topClient'] = null;

  for (const r of aged) {
    const echu = money(r.days0_30 || 0).add(r.days31_60 || 0).add(r.days61_90 || 0).add(r.days90plus || 0).toNumber();
    total = money(total).add(r.total || 0).toNumber();
    if (echu <= 0) continue;
    clients += 1;
    overdue = money(overdue).add(echu).toNumber();
    overdue60 = money(overdue60).add(r.days61_90 || 0).add(r.days90plus || 0).toNumber();
    overdue90 = money(overdue90).add(r.days90plus || 0).toNumber();
    if (!topClient || echu > topClient.amount) topClient = { name: r.clientName || r.clientCode, amount: echu };
  }

  return {
    overdue, overdue60, overdue90, clients, total,
    overduePct: total > 0 ? Math.round((overdue / total) * 1000) / 10 : 0,
    topClient,
  };
}

/* ═══════════════════ Espace Manager / DAF — références ════════════════════ */

export interface DafIndicators {
  /** Trésorerie nette : comptes 5 hors 58 (virements internes en transit). */
  treasury: number;
  /** Atterrissage à 30 jours — null si la prévision n'est pas calculable. */
  treasury30: number | null;
  /** Chiffre d'affaires réalisé et budgété, et l'écart en %. */
  revenue: { actual: number; budget: number; variancePct: number | null };
  /** Besoin en fonds de roulement, en valeur et en jours de chiffre d'affaires. */
  workingCapital: { amount: number; days: number | null };
  /** Créances échues de plus de 90 jours — dernière tranche de la balance âgée
   *  (getAgedReceivables : non échu · 0-30 · 31-60 · 61-90 · 90+). Au-delà d'un
   *  trimestre, la relance a échoué : c'est la ligne que le DAF doit provisionner. */
  overdue90: number;
}

export async function getDafIndicators(adapter: DataAdapter): Promise<DafIndicators> {
  const entries = await adapter.getAll<DBJournalEntry>('journalEntries');

  let ca = 0, treasury = 0, stocks = 0, creances = 0, dettes = 0;
  for (const entry of entries) {
    if (entry.status === 'draft') continue;
    for (const line of entry.lines || []) {
      const code = String(line.accountCode || '');
      if (!code) continue;
      const d = line.debit || 0, c = line.credit || 0;
      if (code.startsWith('7')) ca = money(ca).add(c - d).toNumber();
      if (code.startsWith('5') && !code.startsWith('58')) treasury = money(treasury).add(d - c).toNumber();
      if (code.startsWith('3')) stocks = money(stocks).add(d - c).toNumber();
      if (code.startsWith('4')) {
        const net = d - c;
        if (net > 0) creances = money(creances).add(net).toNumber();
        else dettes = money(dettes).add(-net).toNumber();
      }
    }
  }

  // BFR = (stocks + créances) − dettes d'exploitation, exprimé en jours de CA :
  // un montant seul ne dit pas s'il est soutenable, un nombre de jours si.
  const bfr = money(stocks).add(creances).subtract(dettes).toNumber();
  const bfrDays = ca > 0 ? Math.round((bfr / ca) * 365) : null;

  // Les trois blocs suivants s'appuient sur des services existants ; chacun peut
  // échouer indépendamment (données absentes, vue SQL non déployée) sans priver
  // le tableau des autres indicateurs.
  const [forecast, aged, budgetRows] = await Promise.all([
    forecastCashFlow(adapter, 3).catch(() => null),
    getAgedReceivables(adapter).catch(() => []),
    getBudgetVsActual(adapter).catch(() => []),
  ]);

  const firstMonth = forecast?.central?.projections?.[0];
  const treasury30 = firstMonth ? money(treasury).add(firstMonth.netCashFlow).toNumber() : null;

  const overdue90 = aged.reduce((s, r) => money(s).add(r.days90plus || 0).toNumber(), 0);

  let budgetCa = 0, actualCa = 0;
  for (const r of budgetRows) {
    if (!String(r.account_code || '').startsWith('7')) continue;
    budgetCa = money(budgetCa).add(r.budget || 0).toNumber();
    actualCa = money(actualCa).add(r.realise || 0).toNumber();
  }
  // Sans budget saisi, l'écart n'a pas de sens : on affiche le réel sans référence
  // plutôt qu'un « +100 % » trompeur.
  const variancePct = budgetCa > 0
    ? Math.round(((actualCa - budgetCa) / budgetCa) * 1000) / 10
    : null;

  return {
    treasury,
    treasury30,
    revenue: { actual: actualCa || ca, budget: budgetCa, variancePct },
    workingCapital: { amount: bfr, days: bfrDays },
    overdue90,
  };
}
