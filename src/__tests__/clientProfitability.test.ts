/**
 * Rentabilité par client — CA lu par écriture (client sur la 411 → 70x de la
 * même pièce), cascade de marge brute directe, seau « non affecté ».
 */
import { describe, it, expect } from 'vitest';
import { getClientRevenue } from '../services/tiers/clientProfitability';

// Adaptateur minimal : mode local, getAll renvoie les écritures fournies.
const makeAdapter = (entries: any[]) => ({
  getMode: () => 'local',
  getAll: async () => entries,
}) as any;

const sale = (id: string, client: string | null, ca: number, cout6 = 0) => ({
  id, status: 'validated',
  lines: [
    { accountCode: '411', debit: ca, credit: 0, thirdPartyCode: client, thirdPartyName: client ? `Client ${client}` : null },
    { accountCode: '701', debit: 0, credit: ca },
    ...(cout6 ? [{ accountCode: '601', debit: cout6, credit: 0, analyticalCode: 'CHANTIER-A' }] : []),
  ],
});

describe('getClientRevenue', () => {
  it('attribue le CA au client porté par la ligne 411 de l\'écriture', async () => {
    const rep = await getClientRevenue(makeAdapter([
      sale('E1', '411001', 100_000),
      sale('E2', '411001', 50_000),
      sale('E3', '411002', 30_000),
    ]));
    const c1 = rep.clients.find(c => c.code === '411001')!;
    expect(c1.ca).toBe(150_000);
    expect(c1.nbEcritures).toBe(2);
    expect(rep.caTotal).toBe(180_000);
    expect(rep.pctAffecte).toBe(100);
  });

  it('range les produits sans client (provisions) dans « non affecté »', async () => {
    const rep = await getClientRevenue(makeAdapter([
      sale('E1', '411001', 100_000),
      sale('PROV', null, 40_000), // OD de provision, pas de 411 avec tiers
    ]));
    expect(rep.caAffecte).toBe(100_000);
    expect(rep.caNonAffecte).toBe(40_000);
    expect(rep.pctAffecte).toBe(71); // 100/140
    expect(rep.ecrituresSansClient).toBe(1);
    const none = rep.clients.find(c => c.code === '');
    expect(none?.ca).toBe(40_000);
    expect(rep.clients[rep.clients.length - 1].code).toBe(''); // toujours en dernier
  });

  it('marge brute = CA tant qu\'aucun coût analytique n\'est rattaché', async () => {
    const rep = await getClientRevenue(makeAdapter([sale('E1', '411001', 100_000)]));
    const c1 = rep.clients.find(c => c.code === '411001')!;
    expect(c1.coutDirect).toBe(0);
    expect(c1.margeBrute).toBe(100_000);
  });

  it('déduit le coût direct porté par un code analytique', async () => {
    const rep = await getClientRevenue(makeAdapter([sale('E1', '411001', 100_000, 60_000)]));
    const c1 = rep.clients.find(c => c.code === '411001')!;
    expect(c1.coutDirect).toBe(60_000);
    expect(c1.margeBrute).toBe(40_000);
    expect(c1.margeBrutePct).toBe(40);
  });

  it('ignore les écritures sans produit (pas de 70x)', async () => {
    const rep = await getClientRevenue(makeAdapter([
      { id: 'X', status: 'validated', lines: [
        { accountCode: '411', debit: 10_000, credit: 0, thirdPartyCode: '411001' },
        { accountCode: '512', debit: 0, credit: 10_000 }, // encaissement, pas une vente
      ] },
    ]));
    expect(rep.caTotal).toBe(0);
    expect(rep.clients).toHaveLength(0);
  });

  it('exclut les brouillons', async () => {
    const rep = await getClientRevenue(makeAdapter([
      { ...sale('D', '411001', 999), status: 'draft' },
      sale('E1', '411002', 20_000),
    ]));
    expect(rep.caTotal).toBe(20_000);
    expect(rep.clients.find(c => c.code === '411001')).toBeUndefined();
  });
});
