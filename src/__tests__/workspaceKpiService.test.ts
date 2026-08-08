import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Indicateurs des espaces de travail.
 *
 * Ces calculs sont comptables : un écart débit/crédit annoncé à tort, un compte
 * d'attente compensé en net ou un BFR faux envoient quelqu'un chercher un
 * problème qui n'existe pas — ou pire, en masquent un vrai. D'où ces tests.
 */

// Les trois services externes sont simulés : on teste l'agrégation des espaces,
// pas la balance âgée ni la prévision de trésorerie, qui ont leur propre logique.
const agedMock = vi.fn();
const forecastMock = vi.fn();
const budgetMock = vi.fn();

vi.mock('../features/balance/services/balanceService', () => ({ getAgedReceivables: (...a: unknown[]) => agedMock(...a) }));
vi.mock('../features/treasury/services/cashFlowForecastService', () => ({ forecastCashFlow: (...a: unknown[]) => forecastMock(...a) }));
vi.mock('../features/budget/services/budgetService', () => ({ getBudgetVsActual: (...a: unknown[]) => budgetMock(...a) }));

import {
  getComptableControls, getDafIndicators, getRecouvrementIndicator,
} from '../features/workspace/services/workspaceKpiService';

type Line = { accountCode: string; debit?: number; credit?: number; lettrageCode?: string };
type Entry = { id: string; date: string; status: 'draft' | 'validated' | 'posted'; lines: Line[] };

const entry = (id: string, status: Entry['status'], date: string, lines: Line[]): Entry => ({ id, status, date, lines });
const d = (code: string, debit: number, extra: Partial<Line> = {}): Line => ({ accountCode: code, debit, credit: 0, ...extra });
const c = (code: string, credit: number, extra: Partial<Line> = {}): Line => ({ accountCode: code, debit: 0, credit, ...extra });

/** Adaptateur minimal : seul `getAll('journalEntries')` est sollicité ici. */
const fakeAdapter = (entries: Entry[]) => ({
  getAll: vi.fn(async (table: string) => (table === 'journalEntries' ? entries : [])),
}) as never;

const aged = (rows: Array<{ clientCode: string; clientName: string; total: number; nonEchu: number; days0_30: number; days31_60: number; days60plus: number }>) => rows;

beforeEach(() => {
  agedMock.mockReset().mockResolvedValue([]);
  forecastMock.mockReset().mockResolvedValue(null);
  budgetMock.mockReset().mockResolvedValue([]);
});

/* ══════════════════════════ Contrôles comptables ══════════════════════════ */

describe('getComptableControls — contrôles de tenue', () => {
  it('annonce « équilibré » quand débit = crédit', async () => {
    const r = await getComptableControls(fakeAdapter([
      entry('e1', 'posted', '2026-03-01', [d('601000', 100000), c('401000', 100000)]),
    ]));
    expect(r.ecartDebitCredit).toBe(0);
  });

  it('chiffre l’écart quand la partie double est rompue', async () => {
    const r = await getComptableControls(fakeAdapter([
      entry('e1', 'posted', '2026-03-01', [d('601000', 100000), c('401000', 90000)]),
    ]));
    expect(r.ecartDebitCredit).toBe(10000);
  });

  it('EXCLUT les brouillons de l’équilibre — un brouillon déséquilibré est normal', async () => {
    // Sinon toute saisie en cours ferait clignoter l'alerte d'équilibre en rouge.
    const r = await getComptableControls(fakeAdapter([
      entry('ok', 'posted', '2026-03-01', [d('601000', 50000), c('401000', 50000)]),
      entry('wip', 'draft', '2026-03-02', [d('601000', 999999)]),
    ]));
    expect(r.ecartDebitCredit).toBe(0);
    expect(r.drafts.count).toBe(1);
  });

  it('retient l’ancienneté du PLUS ANCIEN brouillon', async () => {
    const today = new Date();
    const daysAgo = (n: number) => new Date(today.getTime() - n * 86_400_000).toISOString().slice(0, 10);
    const r = await getComptableControls(fakeAdapter([
      entry('b1', 'draft', daysAgo(3), [d('601000', 1)]),
      entry('b2', 'draft', daysAgo(40), [d('601000', 1)]),
      entry('b3', 'draft', daysAgo(12), [d('601000', 1)]),
    ]));
    expect(r.drafts.count).toBe(3);
    expect(r.drafts.oldestDays).toBe(40);
  });

  it('rend une ancienneté nulle en l’absence de brouillon', async () => {
    const r = await getComptableControls(fakeAdapter([
      entry('e1', 'posted', '2026-03-01', [d('601000', 100), c('401000', 100)]),
    ]));
    expect(r.drafts).toEqual({ count: 0, oldestDays: null });
  });

  it('NE COMPENSE PAS les comptes d’attente entre eux', async () => {
    // Un 471 débiteur et un 472 créditeur ne s'annulent pas : chacun doit être
    // justifié avant clôture. Un solde net à zéro masquerait deux anomalies.
    const r = await getComptableControls(fakeAdapter([
      entry('e1', 'posted', '2026-03-01', [d('471000', 300000), c('512000', 300000)]),
      entry('e2', 'posted', '2026-03-02', [d('512000', 300000), c('472000', 300000)]),
    ]));
    expect(r.suspense.accounts).toBe(2);
    expect(r.suspense.amount).toBe(600000);
  });

  it('ne compte pas un compte d’attente soldé', async () => {
    const r = await getComptableControls(fakeAdapter([
      entry('e1', 'posted', '2026-03-01', [d('471000', 200000), c('512000', 200000)]),
      entry('e2', 'posted', '2026-03-05', [c('471000', 200000), d('512000', 200000)]),
    ]));
    expect(r.suspense).toEqual({ amount: 0, accounts: 0 });
  });

  it('ne retient comme non lettré que les comptes de tiers sans code de lettrage', async () => {
    const r = await getComptableControls(fakeAdapter([
      entry('e1', 'posted', '2026-03-01', [
        d('411000', 500000),                            // client, non lettré
        c('701000', 500000),                            // produit : hors périmètre
      ]),
      entry('e2', 'posted', '2026-03-02', [
        c('401000', 300000, { lettrageCode: 'A1' }),    // fournisseur lettré : exclu
        d('601000', 300000),
      ]),
      entry('e3', 'posted', '2026-03-03', [
        c('401000', 120000),                            // fournisseur, non lettré
        d('601000', 120000),
      ]),
    ]));
    expect(r.unmatched.lines).toBe(2);
    expect(r.unmatched.amount).toBe(620000);
  });

  it('ignore les lignes sans code de compte', async () => {
    const r = await getComptableControls(fakeAdapter([
      entry('e1', 'posted', '2026-03-01', [{ accountCode: '', debit: 999 } as Line, d('601000', 100), c('401000', 100)]),
    ]));
    expect(r.ecartDebitCredit).toBe(0);
  });
});

/* ═══════════════════════════════ Recouvrement ═════════════════════════════ */

describe('getRecouvrementIndicator', () => {
  it('additionne les tranches échues et compte les clients concernés', async () => {
    agedMock.mockResolvedValue(aged([
      { clientCode: 'C1', clientName: 'Alpha', total: 1_000_000, nonEchu: 400_000, days0_30: 300_000, days31_60: 200_000, days60plus: 100_000 },
      { clientCode: 'C2', clientName: 'Beta', total: 500_000, nonEchu: 500_000, days0_30: 0, days31_60: 0, days60plus: 0 },
    ]));
    const r = await getRecouvrementIndicator(fakeAdapter([]));
    expect(r.overdue).toBe(600_000);
    expect(r.overdue60).toBe(100_000);
    expect(r.clients).toBe(1);                 // Beta n'a rien d'échu
    expect(r.total).toBe(1_500_000);
    expect(r.overduePct).toBe(40);             // 600 000 / 1 500 000
  });

  it('désigne le client le plus exposé, pas le plus gros encours', async () => {
    // Le point de départ des relances est celui qui doit le plus DE RETARD,
    // pas celui qui doit le plus en valeur absolue.
    agedMock.mockResolvedValue(aged([
      { clientCode: 'C1', clientName: 'Gros encours', total: 9_000_000, nonEchu: 8_900_000, days0_30: 100_000, days31_60: 0, days60plus: 0 },
      { clientCode: 'C2', clientName: 'Gros retard', total: 900_000, nonEchu: 0, days0_30: 400_000, days31_60: 300_000, days60plus: 200_000 },
    ]));
    const r = await getRecouvrementIndicator(fakeAdapter([]));
    expect(r.topClient).toEqual({ name: 'Gros retard', amount: 900_000 });
  });

  it('rend des valeurs neutres, pas une erreur, si la balance âgée est indisponible', async () => {
    agedMock.mockRejectedValue(new Error('vue absente'));
    const r = await getRecouvrementIndicator(fakeAdapter([]));
    expect(r).toEqual({ overdue: 0, overdue60: 0, clients: 0, total: 0, overduePct: 0, topClient: null });
  });
});

/* ═════════════════════════ Indicateurs DAF ════════════════════════════════ */

describe('getDafIndicators', () => {
  const base = [
    entry('v', 'posted', '2026-01-31', [d('411000', 800_000), c('701000', 800_000)]),   // CA 800 000
    entry('t', 'posted', '2026-02-05', [d('521000', 500_000), c('411000', 500_000)]),   // encaissement
    entry('s', 'posted', '2026-02-10', [d('311000', 200_000), c('401000', 200_000)]),   // stock / dette
  ];

  it('calcule la trésorerie sur la classe 5 HORS 58', async () => {
    // Les 58x sont des virements internes en transit : les compter reviendrait
    // à voir deux fois le même mouvement entre deux comptes de l'entreprise.
    const r = await getDafIndicators(fakeAdapter([
      ...base,
      entry('x', 'posted', '2026-02-20', [d('581000', 1_000_000), c('521000', 1_000_000)]),
    ]));
    expect(r.treasury).toBe(500_000 - 1_000_000);
  });

  it('exclut les brouillons de tous les agrégats', async () => {
    const r = await getDafIndicators(fakeAdapter([
      ...base,
      entry('wip', 'draft', '2026-03-01', [d('521000', 9_999_999), c('701000', 9_999_999)]),
    ]));
    expect(r.treasury).toBe(500_000);
    expect(r.revenue.actual).toBe(800_000);
  });

  it('exprime le BFR en jours de chiffre d’affaires', async () => {
    // Créances 300 000 (800 000 − 500 000 encaissés) + stocks 200 000 − dettes 200 000
    // = 300 000, soit 300 000 / 800 000 × 365 ≈ 137 jours.
    const r = await getDafIndicators(fakeAdapter(base));
    expect(r.workingCapital.amount).toBe(300_000);
    expect(r.workingCapital.days).toBe(137);
  });

  it('n’affiche PAS d’écart budgétaire quand aucun budget n’est saisi', async () => {
    // Un « +100 % » sur un budget vide se lirait comme une performance.
    budgetMock.mockResolvedValue([]);
    const r = await getDafIndicators(fakeAdapter(base));
    expect(r.revenue.variancePct).toBeNull();
    expect(r.revenue.actual).toBe(800_000);    // repli sur le CA du grand livre
  });

  it('calcule l’écart budgétaire sur les seuls comptes de produits', async () => {
    budgetMock.mockResolvedValue([
      { account_code: '701000', budget: 1_000_000, realise: 900_000 },
      { account_code: '601000', budget: 400_000, realise: 500_000 },   // charge : hors CA
    ]);
    const r = await getDafIndicators(fakeAdapter(base));
    expect(r.revenue.budget).toBe(1_000_000);
    expect(r.revenue.actual).toBe(900_000);
    expect(r.revenue.variancePct).toBe(-10);
  });

  it('ajoute le flux du premier mois à la trésorerie pour l’atterrissage', async () => {
    forecastMock.mockResolvedValue({ central: { projections: [{ netCashFlow: -120_000 }, { netCashFlow: 50_000 }] } });
    const r = await getDafIndicators(fakeAdapter(base));
    expect(r.treasury30).toBe(500_000 - 120_000);
  });

  it('rend un atterrissage nul plutôt qu’un chiffre inventé si la prévision échoue', async () => {
    forecastMock.mockRejectedValue(new Error('indisponible'));
    const r = await getDafIndicators(fakeAdapter(base));
    expect(r.treasury30).toBeNull();
    expect(r.treasury).toBe(500_000);          // le reste du tableau tient
  });
});
