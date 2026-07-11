import { describe, it, expect } from 'vitest';
import { buildSnapshotPayload } from '../features/budget/services/snapshotService';

const row = (account_code: string, period: number, budget: number, realise: number) =>
  ({ account_code, section_id: null, period, budget, engage: 0, realise, disponible: budget - realise });

describe('buildSnapshotPayload — snapshot figé (Lot 7)', () => {
  it('agrège YTD (period ≤ p) par maille', () => {
    const p = buildSnapshotPayload([row('6011', 1, 100, 40), row('6011', 2, 100, 50), row('6011', 3, 100, 60)], '2027', 2);
    expect(p.mailles).toHaveLength(1);
    expect(p.mailles[0].budget).toBe(200);   // mois 1+2 (mois 3 exclu)
    expect(p.mailles[0].realise).toBe(90);
  });

  it('trie de façon déterministe (hash reproductible)', () => {
    const a = buildSnapshotPayload([row('6224', 1, 10, 0), row('6011', 1, 20, 0)], '2027', 12);
    const b = buildSnapshotPayload([row('6011', 1, 20, 0), row('6224', 1, 10, 0)], '2027', 12);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.mailles[0].account_code).toBe('6011');
  });

  it('sépare les mailles par compte × section', () => {
    const p = buildSnapshotPayload([
      { account_code: '6011', section_id: 'S1', period: 1, budget: 10, engage: 0, realise: 0, disponible: 10 },
      { account_code: '6011', section_id: 'S2', period: 1, budget: 20, engage: 0, realise: 0, disponible: 20 },
    ], '2027', 12);
    expect(p.mailles).toHaveLength(2);
  });
});
