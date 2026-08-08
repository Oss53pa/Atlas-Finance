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
import type { DataAdapter, TableName } from '@atlas/data';
import type { DBJournalEntry, DBBudgetLine, DBFiscalPeriod } from '../../../lib/db';
import { money } from '../../../utils/money';
import { getAgedReceivables } from '../../balance/services/balanceService';
import { forecastCashFlow } from '../../treasury/services/cashFlowForecastService';
import { getBudgetVsActual } from '../../budget/services/budgetService';

const DAY = 86_400_000;

/** Lecture tolérante : une table absente ne doit pas priver le tableau du reste. */
async function safeGetAll<T>(adapter: DataAdapter, table: TableName): Promise<T[]> {
  try { return await adapter.getAll<T>(table); } catch { return []; }
}

/** Ancienneté en jours d'une date ISO — null si la date est absente ou illisible. */
function ageInDays(iso: string | undefined, now: number): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.floor((now - t) / DAY);
}

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

/* ═══════════════════ Brouillard comptable — travail en cours ═══════════════ */

export interface BrouillardIndicator {
  /** Écritures au brouillon, tous journaux confondus. */
  count: number;
  /** Masse portée par le brouillard (total des débits) — ce qui basculera au GL. */
  amount: number;
  /** Ancienneté du plus vieux brouillon, en jours. */
  oldestDays: number | null;
  /** Nombre de journaux concernés — dit si le retard est ciblé ou général. */
  journals: number;
  /** Journal le plus chargé, pour savoir par où reprendre. */
  topJournal: { code: string; count: number } | null;
  /** Brouillons déséquilibrés : ils échoueront à la validation. */
  unbalanced: number;
  /** Brouillons antérieurs de plus de 30 jours — le retard qui compte. */
  stale: number;
}

/**
 * Le brouillard, c'est le travail commencé et non comptabilisé.
 *
 * Le compter ne suffit pas : dix brouillons du jour ne se traitent pas comme
 * dix brouillons de deux mois, et un brouillon déséquilibré n'est pas « à
 * valider » — il est à corriger, sinon la validation le refusera. D'où
 * l'ancienneté, le déséquilibre et le journal le plus chargé.
 */
export async function getBrouillardIndicator(
  adapter: DataAdapter,
  asOf: Date = new Date(),
): Promise<BrouillardIndicator> {
  const entries = await safeGetAll<DBJournalEntry>(adapter, 'journalEntries');
  const now = asOf.getTime();

  let count = 0, amount = 0, unbalanced = 0, stale = 0;
  let oldestDays: number | null = null;
  const byJournal = new Map<string, number>();

  for (const entry of entries) {
    if (entry.status !== 'draft') continue;
    count += 1;

    // Le total porté par l'écriture : on préfère recalculer depuis les lignes,
    // les totaux stockés pouvant dater d'avant la dernière retouche.
    let debit = 0, credit = 0;
    for (const line of entry.lines || []) {
      debit = money(debit).add(line.debit || 0).toNumber();
      credit = money(credit).add(line.credit || 0).toNumber();
    }
    amount = money(amount).add(debit).toNumber();
    if (Math.abs(debit - credit) >= 0.005) unbalanced += 1;

    const age = ageInDays(entry.date || entry.createdAt, now);
    if (age !== null) {
      oldestDays = oldestDays === null ? age : Math.max(oldestDays, age);
      if (age > 30) stale += 1;
    }

    const journal = String(entry.journal || '—');
    byJournal.set(journal, (byJournal.get(journal) || 0) + 1);
  }

  let topJournal: BrouillardIndicator['topJournal'] = null;
  for (const [code, n] of byJournal) {
    if (!topJournal || n > topJournal.count) topJournal = { code, count: n };
  }

  return { count, amount, oldestDays, journals: byJournal.size, topJournal, unbalanced, stale };
}

/* ═══════════════════════ Échéances tiers — ce qui tombe ════════════════════ */

export interface EcheanceBucket {
  /** Déjà échu au jour dit. */
  overdue: number;
  /** Tombe dans les 7 jours. */
  next7: number;
  /** Tombe dans les 30 jours (inclut les 7 jours). */
  next30: number;
  /** Prochaine échéance à venir, pour savoir ce qui arrive en premier. */
  next: { date: string; amount: number; tiers: string } | null;
}

export interface EcheancesIndicator {
  /** À décaisser : fournisseurs (401) non lettrés. */
  payables: EcheanceBucket;
  /** À encaisser : clients (411) non lettrés. */
  receivables: EcheanceBucket;
  /** Encaissements − décaissements attendus à 30 jours. Négatif = besoin de cash. */
  netNext30: number;
}

const emptyBucket = (): EcheanceBucket => ({ overdue: 0, next7: 0, next30: 0, next: null });

/**
 * Échéancier des tiers : ce qui tombe, et quand.
 *
 * La balance âgée regarde en arrière (ce qui aurait dû rentrer). L'échéancier
 * regarde devant : ce qu'il faudra payer et encaisser dans les jours qui
 * viennent. Les deux ensemble donnent la position ; l'une seule ne la donne pas.
 * Le net à 30 jours est le chiffre qui décide d'une relance ou d'un report.
 */
export async function getEcheancesIndicator(
  adapter: DataAdapter,
  asOf: Date = new Date(),
): Promise<EcheancesIndicator> {
  const entries = await safeGetAll<DBJournalEntry>(adapter, 'journalEntries');
  const now = asOf.getTime();

  const payables = emptyBucket();
  const receivables = emptyBucket();

  for (const entry of entries) {
    // Un brouillon n'engage rien : il n'a pas d'échéance opposable.
    if (entry.status === 'draft') continue;
    for (const line of entry.lines || []) {
      const code = String(line.accountCode || '');
      const isPayable = code.startsWith('401');
      const isReceivable = code.startsWith('411');
      if (!isPayable && !isReceivable) continue;
      if (line.lettrageCode) continue;          // soldé : plus d'échéance

      // Une dette fournisseur est au crédit, une créance client au débit :
      // le sens porte le montant restant dû de chaque côté.
      const amount = isPayable
        ? money(line.credit || 0).subtract(line.debit || 0).toNumber()
        : money(line.debit || 0).subtract(line.credit || 0).toNumber();
      if (amount <= 0) continue;

      const due = line.dateEcheance || entry.date;
      const dueTs = new Date(due).getTime();
      if (Number.isNaN(dueTs)) continue;

      const bucket = isPayable ? payables : receivables;
      const days = Math.floor((dueTs - now) / DAY);
      if (days < 0) {
        bucket.overdue = money(bucket.overdue).add(amount).toNumber();
        continue;
      }
      if (days <= 7) bucket.next7 = money(bucket.next7).add(amount).toNumber();
      if (days <= 30) bucket.next30 = money(bucket.next30).add(amount).toNumber();
      if (!bucket.next || due < bucket.next.date) {
        bucket.next = { date: due, amount, tiers: line.thirdPartyName || line.thirdPartyCode || code };
      }
    }
  }

  return {
    payables,
    receivables,
    netNext30: money(receivables.next30).subtract(payables.next30).toNumber(),
  };
}

/* ═════════════════════════ Clôture — état d'avancement ═════════════════════ */

export interface ClotureIndicator {
  /** Période contenant la date du jour, si elle existe. */
  currentPeriod: { label: string; status: string; progression: number } | null;
  /** Périodes encore ouvertes ou en cours de clôture. */
  openPeriods: number;
  closedPeriods: number;
  totalPeriods: number;
  /** Part clôturée de l'exercice, en %. */
  progressPct: number;
  /** Ce qui empêche de clôturer : brouillons + comptes d'attente non soldés. */
  blockers: { drafts: number; suspenseAccounts: number; unbalanced: boolean };
  /** Prête à clôturer : aucune écriture en attente, aucun 47x ouvert, livres équilibrés. */
  ready: boolean;
}

const CLOSED_STATUSES = new Set(['cloturee', 'closed', 'locked', 'verrouillee']);
const IN_PROGRESS_STATUSES = new Set(['en_cloture', 'in_progress']);

/**
 * Clôture : où en est-on, et qu'est-ce qui bloque.
 *
 * Un pourcentage d'avancement seul ne sert à rien si on ne sait pas ce qui
 * retient. Les trois bloquants d'une clôture SYSCOHADA sont toujours les mêmes :
 * des écritures encore au brouillard, des comptes d'attente 47x non soldés, et
 * un grand livre déséquilibré. On les affiche avec l'avancement.
 */
export async function getClotureIndicator(
  adapter: DataAdapter,
  asOf: Date = new Date(),
): Promise<ClotureIndicator> {
  const [periods, controls] = await Promise.all([
    safeGetAll<DBFiscalPeriod>(adapter, 'fiscalPeriods'),
    getComptableControls(adapter).catch(() => null),
  ]);

  const now = asOf.getTime();
  let closedPeriods = 0, openPeriods = 0;
  let currentPeriod: ClotureIndicator['currentPeriod'] = null;

  for (const p of periods) {
    const status = String(p.status || '').toLowerCase();
    if (CLOSED_STATUSES.has(status)) closedPeriods += 1;
    else openPeriods += 1;

    // Une date de fin ISO se lit à minuit : sans la journée entière, le
    // 30 juin à midi tomberait HORS de la période de juin — la carte se
    // viderait le dernier jour de chaque mois, précisément quand on clôture.
    const start = new Date(p.startDate).getTime();
    const end = new Date(p.endDate).getTime() + DAY - 1;
    if (!Number.isNaN(start) && !Number.isNaN(end) && now >= start && now <= end) {
      currentPeriod = {
        label: p.label || p.code || '',
        status,
        progression: Number(p.progression) || 0,
      };
    }
  }

  const total = periods.length;
  const blockers = {
    drafts: controls?.drafts.count ?? 0,
    suspenseAccounts: controls?.suspense.accounts ?? 0,
    unbalanced: controls ? Math.abs(controls.ecartDebitCredit) >= 0.005 : false,
  };

  return {
    currentPeriod,
    openPeriods,
    closedPeriods,
    totalPeriods: total,
    progressPct: total > 0 ? Math.round((closedPeriods / total) * 100) : 0,
    blockers,
    ready: blockers.drafts === 0 && blockers.suspenseAccounts === 0 && !blockers.unbalanced,
  };
}

/* ══════════════════ Budget — consommation et dépassements ══════════════════ */

export interface BudgetIndicator {
  /** Budget de charges (classe 6) de l'exercice. */
  budget: number;
  /** Charges réellement comptabilisées. */
  realise: number;
  /** Reste à consommer — négatif en cas de dépassement global. */
  disponible: number;
  /** Taux de consommation en %, null sans budget saisi. */
  consumptionPct: number | null;
  /** Comptes dépassés : nombre et montant du dépassement cumulé. */
  overruns: { count: number; amount: number };
  /** Compte le plus dépassé, pour ouvrir l'analyse au bon endroit. */
  topOverrun: { accountCode: string; budget: number; realise: number; overrun: number } | null;
  /** true si aucun budget n'est saisi : on n'affiche pas un écart inventé. */
  noBudget: boolean;
}

/**
 * Exécution budgétaire des charges.
 *
 * Le total consommé ne dit rien : un budget global tenu peut cacher trois
 * comptes explosés compensés par des lignes non consommées. Le nombre de
 * comptes dépassés et le pire d'entre eux sont ce qui déclenche une action.
 *
 * Deux sources selon le mode : `budgetLines` en local, la vue
 * `v_budget_vs_actual` en SaaS. Le réalisé est toujours recalculé depuis le
 * grand livre — un `actual` stocké peut dater d'avant les dernières écritures.
 */
export async function getBudgetIndicator(
  adapter: DataAdapter,
  asOf: Date = new Date(),
): Promise<BudgetIndicator> {
  const year = String(asOf.getFullYear());
  const [entries, localLines, saasRows] = await Promise.all([
    safeGetAll<DBJournalEntry>(adapter, 'journalEntries'),
    safeGetAll<DBBudgetLine>(adapter, 'budgetLines'),
    getBudgetVsActual(adapter).catch(() => []),
  ]);

  // Budget par compte de charge. Le local prime : s'il est saisi, c'est la
  // référence de l'utilisateur ; la vue SaaS prend le relais sinon.
  const budgetByAccount = new Map<string, number>();
  const yearLines = localLines.filter((l) => String(l.fiscalYear || '').includes(year));
  const source = yearLines.length > 0 ? yearLines : localLines;
  for (const l of source) {
    const code = String(l.accountCode || '');
    if (!code.startsWith('6')) continue;
    budgetByAccount.set(code, money(budgetByAccount.get(code) || 0).add(l.budgeted || 0).toNumber());
  }
  if (budgetByAccount.size === 0) {
    for (const r of saasRows) {
      const code = String(r.account_code || '');
      if (!code.startsWith('6')) continue;
      budgetByAccount.set(code, money(budgetByAccount.get(code) || 0).add(r.budget || 0).toNumber());
    }
  }

  // Réalisé recalculé depuis le grand livre, hors brouillons.
  const realiseByAccount = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status === 'draft') continue;
    for (const line of entry.lines || []) {
      const code = String(line.accountCode || '');
      if (!code.startsWith('6')) continue;
      const net = money(line.debit || 0).subtract(line.credit || 0).toNumber();
      realiseByAccount.set(code, money(realiseByAccount.get(code) || 0).add(net).toNumber());
    }
  }

  let budget = 0, realise = 0, overrunCount = 0, overrunAmount = 0;
  let topOverrun: BudgetIndicator['topOverrun'] = null;

  for (const [code, b] of budgetByAccount) {
    budget = money(budget).add(b).toNumber();
    const r = realiseByAccount.get(code) || 0;
    // Un compte sans budget saisi n'est pas « dépassé » : il est hors budget,
    // ce qui est un autre sujet. On ne compte que ce qui a une référence.
    if (b <= 0) continue;
    const overrun = money(r).subtract(b).toNumber();
    if (overrun <= 0.005) continue;
    overrunCount += 1;
    overrunAmount = money(overrunAmount).add(overrun).toNumber();
    if (!topOverrun || overrun > topOverrun.overrun) {
      topOverrun = { accountCode: code, budget: b, realise: r, overrun };
    }
  }
  for (const r of realiseByAccount.values()) realise = money(realise).add(r).toNumber();

  const noBudget = budget <= 0;
  return {
    budget,
    realise,
    disponible: money(budget).subtract(realise).toNumber(),
    consumptionPct: noBudget ? null : Math.round((realise / budget) * 1000) / 10,
    overruns: { count: overrunCount, amount: overrunAmount },
    topOverrun,
    noBudget,
  };
}
