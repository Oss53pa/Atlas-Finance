import { describe, it, expect, vi } from 'vitest';
import { getAgedReceivables } from '../features/balance/services/balanceService';

/**
 * Balance âgée des créances clients.
 *
 * Le découpage par tranche décide de ce qu'on relance, de ce qu'on provisionne
 * et du risque affiché en face du client. Une facture rangée une tranche trop
 * tôt fait passer un retard de trimestre pour un retard de mois : ces tests
 * verrouillent les bornes exactes, la sortie des lignes lettrées et le
 * classement du risque.
 */

type Line = {
  accountCode: string;
  debit?: number;
  credit?: number;
  dateEcheance?: string;
  lettrageCode?: string;
  thirdPartyCode?: string;
  thirdPartyName?: string;
};
type Entry = { id: string; date: string; status: string; lines: Line[] };

const ASOF = new Date('2026-06-30T12:00:00Z');

/** Facture client échue il y a `daysAgo` jours (négatif = échéance à venir). */
const facture = (id: string, amount: number, daysAgo: number, extra: Partial<Line> = {}): Entry => {
  const due = new Date(ASOF.getTime() - daysAgo * 86_400_000).toISOString().slice(0, 10);
  return {
    id, date: due, status: 'validated',
    lines: [{
      accountCode: '411000', debit: amount, credit: 0, dateEcheance: due,
      thirdPartyCode: 'C1', thirdPartyName: 'Alpha SARL', ...extra,
    }],
  };
};

const fakeAdapter = (entries: Entry[]) => ({
  getAll: vi.fn(async (table: string) => (table === 'journalEntries' ? entries : [])),
}) as never;

const one = async (entries: Entry[]) => (await getAgedReceivables(fakeAdapter(entries), ASOF))[0];

describe('getAgedReceivables — ventilation par tranche', () => {
  it('range chaque facture dans sa tranche, y compris la nouvelle tranche > 90 jours', async () => {
    const r = await one([
      facture('f0', 100, -10),   // échéance dans 10 jours
      facture('f1', 200, 15),
      facture('f2', 300, 45),
      facture('f3', 400, 75),
      facture('f4', 500, 120),
    ]);
    expect(r.nonEchu).toBe(100);
    expect(r.days0_30).toBe(200);
    expect(r.days31_60).toBe(300);
    expect(r.days61_90).toBe(400);
    expect(r.days90plus).toBe(500);
    expect(r.total).toBe(1500);
  });

  it('place les bornes à 30, 60 et 90 jours inclus', async () => {
    // Les bornes sont le seul endroit où une erreur d'un jour change la colonne.
    const bornes = await Promise.all([30, 31, 60, 61, 90, 91].map((n) => one([facture(`b${n}`, 1000, n)])));
    const [j30, j31, j60, j61, j90, j91] = bornes;
    expect(j30.days0_30).toBe(1000);
    expect(j31.days31_60).toBe(1000);
    expect(j60.days31_60).toBe(1000);
    expect(j61.days61_90).toBe(1000);
    expect(j90.days61_90).toBe(1000);
    expect(j91.days90plus).toBe(1000);
  });

  it('impute les règlements en FIFO sur les factures les plus anciennes', async () => {
    // Un acompte solde d'abord le plus vieux : il doit vider le > 90 j avant
    // d'entamer les tranches récentes, sinon on provisionne du déjà encaissé.
    const r = await one([
      facture('f1', 500, 120),
      facture('f2', 500, 15),
      { id: 'reg', date: '2026-06-20', status: 'validated', lines: [{ accountCode: '411000', debit: 0, credit: 600, thirdPartyCode: 'C1', thirdPartyName: 'Alpha SARL' }] },
    ]);
    expect(r.days90plus).toBe(0);
    expect(r.days0_30).toBe(400);
    expect(r.total).toBe(400);
  });

  it('exclut les lignes lettrées et fait disparaître un client soldé', async () => {
    const rows = await getAgedReceivables(fakeAdapter([
      facture('f1', 500, 120, { lettrageCode: 'A001' }),
    ]), ASOF);
    expect(rows).toHaveLength(0);
  });

  it('ignore les brouillons : une facture non comptabilisée n’est pas une créance', async () => {
    const rows = await getAgedReceivables(fakeAdapter([
      { ...facture('f1', 500, 120), status: 'draft' },
    ]), ASOF);
    expect(rows).toHaveLength(0);
  });
});

describe('getAgedReceivables — classement du risque', () => {
  it('reste « faible » quand tout est à venir ou récent', async () => {
    expect((await one([facture('f0', 1000, -5)])).risque).toBe('faible');
    expect((await one([facture('f1', 1000, 10)])).risque).toBe('faible');
  });

  it('passe « moyen » dès qu’une créance dépasse 30 jours', async () => {
    expect((await one([facture('f1', 1000, 45)])).risque).toBe('moyen');
  });

  it('passe « élevé » quand l’échu de plus de 60 jours atteint le quart de l’encours', async () => {
    // Seuil historique conservé : les clients déjà signalés ne se déclassent pas
    // du fait de la coupure à 90 jours.
    const r = await one([facture('f1', 300, 75), facture('f2', 700, 10)]);
    expect(r.days61_90).toBe(300);
    expect(r.risque).toBe('eleve');
  });

  it('passe « élevé » sur un > 90 jours pesant 10 % de l’encours, en deçà du seuil des 25 %', async () => {
    // 12 % de l'encours à plus d'un trimestre : sous l'ancienne règle unique
    // (25 % du > 60 j) ce client restait « moyen » alors qu'il est à provisionner.
    const r = await one([facture('f1', 120, 200), facture('f2', 880, 10)]);
    expect(r.days90plus).toBe(120);
    expect(r.risque).toBe('eleve');
  });

  it('ne surclasse pas un > 90 jours négligeable', async () => {
    const r = await one([facture('f1', 50, 200), facture('f2', 9_950, 10)]);
    expect(r.days90plus).toBe(50);
    expect(r.risque).toBe('moyen');
  });
});
