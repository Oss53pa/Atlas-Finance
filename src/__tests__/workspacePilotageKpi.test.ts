import { describe, it, expect, vi } from 'vitest';

/**
 * Indicateurs de pilotage des espaces de travail : brouillard, échéances,
 * clôture, budget.
 *
 * Ces quatre-là déclenchent des actions concrètes — reprendre un journal,
 * payer un fournisseur, arrêter les comptes, couper une dépense. Un chiffre
 * faux ici ne trompe pas seulement l'œil, il envoie quelqu'un travailler au
 * mauvais endroit. D'où ces tests.
 */

// getBudgetIndicator interroge la vue SaaS en complément du local : on la neutralise
// pour que les cas locaux soient déterministes.
const budgetVsActualMock = vi.fn();
vi.mock('../features/budget/services/budgetService', () => ({
  getBudgetVsActual: (...a: unknown[]) => budgetVsActualMock(...a),
}));

import {
  getBrouillardIndicator, getEcheancesIndicator, getClotureIndicator, getBudgetIndicator,
} from '../features/workspace/services/workspaceKpiService';

type Line = {
  accountCode: string; debit?: number; credit?: number;
  lettrageCode?: string; dateEcheance?: string; thirdPartyName?: string;
};
type Entry = { id: string; journal?: string; date: string; status: string; lines: Line[] };

const ASOF = new Date('2026-06-30T12:00:00Z');
const day = (offset: number) => new Date(ASOF.getTime() + offset * 86_400_000).toISOString().slice(0, 10);

const d = (accountCode: string, debit: number, extra: Partial<Line> = {}): Line => ({ accountCode, debit, credit: 0, ...extra });
const c = (accountCode: string, credit: number, extra: Partial<Line> = {}): Line => ({ accountCode, debit: 0, credit, ...extra });

/** Adaptateur multi-tables : les indicateurs lisent journalEntries, budgetLines, fiscalPeriods. */
const adapterOf = (tables: Record<string, unknown[]>) => ({
  getAll: vi.fn(async (table: string) => tables[table] ?? []),
}) as never;

const entriesAdapter = (entries: Entry[]) => adapterOf({ journalEntries: entries });

/* ═══════════════════════════════ Brouillard ═══════════════════════════════ */

describe('getBrouillardIndicator', () => {
  it('mesure le brouillard : volume, masse, ancienneté et journal le plus chargé', async () => {
    const r = await getBrouillardIndicator(entriesAdapter([
      { id: 'b1', journal: 'AC', date: day(-45), status: 'draft', lines: [d('601000', 100_000), c('401000', 100_000)] },
      { id: 'b2', journal: 'AC', date: day(-3), status: 'draft', lines: [d('601000', 50_000), c('401000', 50_000)] },
      { id: 'b3', journal: 'VT', date: day(-1), status: 'draft', lines: [d('411000', 20_000), c('701000', 20_000)] },
      { id: 'ok', journal: 'AC', date: day(-2), status: 'validated', lines: [d('601000', 999_000), c('401000', 999_000)] },
    ]), ASOF);

    expect(r.count).toBe(3);                    // la validée ne compte pas
    expect(r.amount).toBe(170_000);             // 100 000 + 50 000 + 20 000, hors validée
    expect(r.oldestDays).toBe(45);
    expect(r.journals).toBe(2);
    expect(r.topJournal).toEqual({ code: 'AC', count: 2 });
    expect(r.stale).toBe(1);                    // seul b1 dépasse 30 jours
  });

  it('signale les brouillons déséquilibrés — ils ne sont pas « à valider », ils sont à corriger', async () => {
    const r = await getBrouillardIndicator(entriesAdapter([
      { id: 'b1', journal: 'OD', date: day(-1), status: 'draft', lines: [d('601000', 100_000), c('401000', 90_000)] },
      { id: 'b2', journal: 'OD', date: day(-1), status: 'draft', lines: [d('601000', 10_000), c('401000', 10_000)] },
    ]), ASOF);
    expect(r.unbalanced).toBe(1);
    expect(r.count).toBe(2);
  });

  it('rend un brouillard vide plutôt qu’une erreur quand rien n’est en attente', async () => {
    const r = await getBrouillardIndicator(entriesAdapter([
      { id: 'ok', journal: 'AC', date: day(-2), status: 'posted', lines: [d('601000', 5), c('401000', 5)] },
    ]), ASOF);
    expect(r).toEqual({ count: 0, amount: 0, oldestDays: null, journals: 0, topJournal: null, unbalanced: 0, stale: 0 });
  });
});

/* ═══════════════════════════════ Échéances ════════════════════════════════ */

describe('getEcheancesIndicator', () => {
  it('ventile ce qui tombe : échu, 7 jours, 30 jours, des deux côtés', async () => {
    const r = await getEcheancesIndicator(entriesAdapter([
      // Dettes fournisseurs (au crédit du 401)
      { id: 'a1', date: day(-60), status: 'validated', lines: [d('601000', 300_000), c('401000', 300_000, { dateEcheance: day(-10) })] },
      { id: 'a2', date: day(-10), status: 'validated', lines: [d('601000', 100_000), c('401000', 100_000, { dateEcheance: day(5) })] },
      { id: 'a3', date: day(-10), status: 'validated', lines: [d('601000', 200_000), c('401000', 200_000, { dateEcheance: day(20) })] },
      // Créances clients (au débit du 411)
      { id: 'v1', date: day(-10), status: 'validated', lines: [d('411000', 400_000, { dateEcheance: day(3) }), c('701000', 400_000)] },
      { id: 'v2', date: day(-10), status: 'validated', lines: [d('411000', 600_000, { dateEcheance: day(25) }), c('701000', 600_000)] },
    ]), ASOF);

    expect(r.payables.overdue).toBe(300_000);
    expect(r.payables.next7).toBe(100_000);
    expect(r.payables.next30).toBe(300_000);      // 7 j inclus dans 30 j
    expect(r.receivables.next7).toBe(400_000);
    expect(r.receivables.next30).toBe(1_000_000);
    // 1 000 000 à encaisser contre 300 000 à payer sur le mois.
    expect(r.netNext30).toBe(700_000);
  });

  it('désigne la prochaine échéance à venir, pas la plus grosse', async () => {
    const r = await getEcheancesIndicator(entriesAdapter([
      { id: 'a1', date: day(-5), status: 'validated', lines: [d('601000', 900_000), c('401000', 900_000, { dateEcheance: day(20), thirdPartyName: 'Gros' })] },
      { id: 'a2', date: day(-5), status: 'validated', lines: [d('601000', 10_000), c('401000', 10_000, { dateEcheance: day(2), thirdPartyName: 'Urgent' })] },
    ]), ASOF);
    expect(r.payables.next?.tiers).toBe('Urgent');
  });

  it('exclut les lignes lettrées et les brouillons : ni l’une ni l’autre n’est une échéance opposable', async () => {
    const r = await getEcheancesIndicator(entriesAdapter([
      { id: 'lettre', date: day(-5), status: 'validated', lines: [d('601000', 500_000), c('401000', 500_000, { dateEcheance: day(3), lettrageCode: 'A01' })] },
      { id: 'brouillon', date: day(-5), status: 'draft', lines: [d('601000', 700_000), c('401000', 700_000, { dateEcheance: day(3) })] },
    ]), ASOF);
    expect(r.payables.next7).toBe(0);
    expect(r.payables.next).toBeNull();
  });

  it('ne compte pas une dette déjà réglée en sens inverse sur le même compte', async () => {
    // Un 401 débité (règlement) ne crée pas une échéance à payer.
    const r = await getEcheancesIndicator(entriesAdapter([
      { id: 'reg', date: day(-5), status: 'validated', lines: [d('401000', 200_000, { dateEcheance: day(3) }), c('521000', 200_000)] },
    ]), ASOF);
    expect(r.payables.next7).toBe(0);
  });
});

/* ════════════════════════════════ Clôture ═════════════════════════════════ */

const period = (code: string, status: string, start: string, end: string, progression = 0) => ({
  id: code, fiscalYearId: 'fy', code, label: code, type: 'mensuelle',
  startDate: start, endDate: end, status, progression,
});

describe('getClotureIndicator', () => {
  it('mesure l’avancement et identifie la période courante', async () => {
    const r = await getClotureIndicator(adapterOf({
      fiscalPeriods: [
        period('01/2026', 'cloturee', '2026-01-01', '2026-01-31'),
        period('02/2026', 'cloturee', '2026-02-01', '2026-02-28'),
        period('06/2026', 'en_cloture', '2026-06-01', '2026-06-30', 40),
        period('07/2026', 'ouverte', '2026-07-01', '2026-07-31'),
      ],
      journalEntries: [],
    }), ASOF);

    expect(r.totalPeriods).toBe(4);
    expect(r.closedPeriods).toBe(2);
    expect(r.openPeriods).toBe(2);
    expect(r.progressPct).toBe(50);
    expect(r.currentPeriod).toEqual({ label: '06/2026', status: 'en_cloture', progression: 40 });
  });

  it('accepte les statuts anglais aussi bien que français', async () => {
    // La base locale écrit « cloturee », les vues SaaS « closed »/« locked ».
    const r = await getClotureIndicator(adapterOf({
      fiscalPeriods: [
        period('01/2026', 'closed', '2026-01-01', '2026-01-31'),
        period('02/2026', 'locked', '2026-02-01', '2026-02-28'),
        period('03/2026', 'open', '2026-03-01', '2026-03-31'),
      ],
      journalEntries: [],
    }), ASOF);
    expect(r.closedPeriods).toBe(2);
    expect(r.progressPct).toBe(67);
  });

  it('énumère les bloquants de clôture : brouillard, comptes 47x, déséquilibre', async () => {
    const r = await getClotureIndicator(adapterOf({
      fiscalPeriods: [],
      journalEntries: [
        { id: 'b1', date: day(-2), status: 'draft', lines: [d('601000', 10), c('401000', 10)] },
        { id: 'att', date: day(-2), status: 'validated', lines: [d('471000', 5_000), c('521000', 5_000)] },
        { id: 'desq', date: day(-2), status: 'validated', lines: [d('601000', 1_000)] },
      ],
    }), ASOF);

    expect(r.blockers.drafts).toBe(1);
    expect(r.blockers.suspenseAccounts).toBe(1);
    expect(r.blockers.unbalanced).toBe(true);
    expect(r.ready).toBe(false);
  });

  it('déclare la clôture prête quand aucun bloquant ne subsiste', async () => {
    const r = await getClotureIndicator(adapterOf({
      fiscalPeriods: [period('01/2026', 'cloturee', '2026-01-01', '2026-01-31')],
      journalEntries: [
        { id: 'ok', date: day(-2), status: 'validated', lines: [d('601000', 1_000), c('401000', 1_000, { lettrageCode: 'A1' })] },
      ],
    }), ASOF);
    expect(r.ready).toBe(true);
    expect(r.blockers).toEqual({ drafts: 0, suspenseAccounts: 0, unbalanced: false });
  });
});

/* ═════════════════════════════════ Budget ═════════════════════════════════ */

const budgetLine = (accountCode: string, budgeted: number, fiscalYear = '2026') => ({
  id: `${accountCode}-${fiscalYear}`, accountCode, fiscalYear, period: '00', budgeted, actual: 0,
});

describe('getBudgetIndicator', () => {
  it('détecte les comptes dépassés et désigne le pire, là où le total global reste tenu', async () => {
    // Budget total 1 000 000, réalisé 950 000 : globalement tenu. Mais 605 est
    // explosé de 200 000, compensé par un 601 sous-consommé. Le total seul
    // laisserait croire que tout va bien.
    budgetVsActualMock.mockResolvedValue([]);
    const r = await getBudgetIndicator(adapterOf({
      budgetLines: [budgetLine('601000', 700_000), budgetLine('605000', 300_000)],
      journalEntries: [
        { id: 'a', date: day(-10), status: 'validated', lines: [d('601000', 450_000), c('401000', 450_000)] },
        { id: 'b', date: day(-10), status: 'validated', lines: [d('605000', 500_000), c('401000', 500_000)] },
      ],
    }), ASOF);

    expect(r.budget).toBe(1_000_000);
    expect(r.realise).toBe(950_000);
    expect(r.consumptionPct).toBe(95);
    expect(r.overruns).toEqual({ count: 1, amount: 200_000 });
    expect(r.topOverrun).toEqual({ accountCode: '605000', budget: 300_000, realise: 500_000, overrun: 200_000 });
  });

  it('recalcule le réalisé depuis le grand livre, jamais depuis l’« actual » stocké', async () => {
    // La ligne budgétaire annonce 0 de réalisé ; le grand livre en porte 400 000.
    budgetVsActualMock.mockResolvedValue([]);
    const r = await getBudgetIndicator(adapterOf({
      budgetLines: [{ ...budgetLine('601000', 300_000), actual: 0 }],
      journalEntries: [
        { id: 'a', date: day(-10), status: 'validated', lines: [d('601000', 400_000), c('401000', 400_000)] },
      ],
    }), ASOF);
    expect(r.realise).toBe(400_000);
    expect(r.overruns.count).toBe(1);
  });

  it('ignore les brouillons : une charge non comptabilisée ne consomme pas le budget', async () => {
    budgetVsActualMock.mockResolvedValue([]);
    const r = await getBudgetIndicator(adapterOf({
      budgetLines: [budgetLine('601000', 300_000)],
      journalEntries: [
        { id: 'b', date: day(-10), status: 'draft', lines: [d('601000', 400_000), c('401000', 400_000)] },
      ],
    }), ASOF);
    expect(r.realise).toBe(0);
    expect(r.overruns.count).toBe(0);
  });

  it('annonce l’absence de budget plutôt qu’un écart inventé', async () => {
    budgetVsActualMock.mockResolvedValue([]);
    const r = await getBudgetIndicator(adapterOf({
      budgetLines: [],
      journalEntries: [{ id: 'a', date: day(-10), status: 'validated', lines: [d('601000', 400_000), c('401000', 400_000)] }],
    }), ASOF);
    expect(r.noBudget).toBe(true);
    expect(r.consumptionPct).toBeNull();
    expect(r.overruns).toEqual({ count: 0, amount: 0 });
  });

  it('prend le relais sur la vue SaaS quand aucun budget local n’est saisi', async () => {
    budgetVsActualMock.mockResolvedValue([
      { account_code: '601000', budget: 200_000, realise: 0 },
      { account_code: '701000', budget: 9_000_000, realise: 0 },   // produit : hors budget de charges
    ]);
    const r = await getBudgetIndicator(adapterOf({
      budgetLines: [],
      journalEntries: [{ id: 'a', date: day(-10), status: 'validated', lines: [d('601000', 250_000), c('401000', 250_000)] }],
    }), ASOF);
    expect(r.noBudget).toBe(false);
    expect(r.budget).toBe(200_000);
    expect(r.overruns).toEqual({ count: 1, amount: 50_000 });
  });

  it('reste calculable si la vue SaaS échoue', async () => {
    budgetVsActualMock.mockRejectedValue(new Error('vue absente'));
    const r = await getBudgetIndicator(adapterOf({
      budgetLines: [budgetLine('601000', 100_000)],
      journalEntries: [{ id: 'a', date: day(-10), status: 'validated', lines: [d('601000', 80_000), c('401000', 80_000)] }],
    }), ASOF);
    expect(r.budget).toBe(100_000);
    expect(r.consumptionPct).toBe(80);
  });
});
