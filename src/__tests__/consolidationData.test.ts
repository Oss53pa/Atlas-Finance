/**
 * Consolidation — alimentation en données réelles (bout-en-bout avec le moteur).
 *
 * Vérifie que les balances renvoyées par l'Edge Function (mockée) alimentent
 * correctement le moteur consoliderGroupe.
 */

import { describe, it, expect, vi } from 'vitest';
import { getConsolidationBalances, partitionEntities } from '../services/cdg/consolidationDataService';
import { consoliderGroupe, type ParticipationConso } from '../services/cdg/consolidationEngine';

describe('getConsolidationBalances', () => {
  it('invoque l’Edge Function et normalise les entités', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { entities: [
        { societeId: 'M', soldes: { '21': 5000, '10': -5000 }, resultat: 0 },
        { societeId: 'F', soldes: { '21': 2000, '10': -2000 }, resultat: 500 },
      ] },
      error: null,
    });
    const adapter: any = { client: { functions: { invoke } } };
    const r = await getConsolidationBalances(adapter, ['M', 'F']);
    expect(invoke).toHaveBeenCalledWith('consolidation-balances', { body: { companyIds: ['M', 'F'] } });
    expect(r.entities).toHaveLength(2);
    expect(r.entities[0].soldes['21']).toBe(5000);
  });

  it('périmètre vide → aucun appel', async () => {
    const adapter: any = { client: { functions: { invoke: vi.fn() } } };
    const r = await getConsolidationBalances(adapter, []);
    expect(r.entities).toHaveLength(0);
    expect(adapter.client.functions.invoke).not.toHaveBeenCalled();
  });

  it('propage l’erreur (403 hors périmètre)', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: { message: 'FORBIDDEN' } });
    const adapter: any = { client: { functions: { invoke } } };
    await expect(getConsolidationBalances(adapter, ['X'])).rejects.toThrow(/FORBIDDEN/);
  });
});

describe('bout-en-bout : balances réelles → moteur', () => {
  it('consolide mère + filiale 80 % à partir des balances fournies', () => {
    const entities = [
      { societeId: 'M', soldes: { '21': 5_000_000, '52': 2_000_000, '10': -7_000_000 }, resultat: 2_000_000 },
      { societeId: 'F', soldes: { '21': 2_000_000, '52': 500_000, '10': -2_500_000 }, resultat: 1_000_000 },
    ];
    const { mere, filiales } = partitionEntities(entities, 'M');
    expect(mere?.societeId).toBe('M');
    const participations: ParticipationConso[] = [
      { filialId: 'F', pourcentageDetention: 80, methode: 'integration_globale' },
    ];
    const r = consoliderGroupe({ mere: mere!, filiales, participations });
    // 21 consolidé = 5M + 2M = 7M ; minoritaires = 20 % × 1M = 200k.
    expect(r.lignes.find(l => l.compte === '21')!.montantConsolide).toBe(7_000_000);
    expect(r.interetsMinoritaires).toBe(200_000);
    expect(r.resultatPartGroupe).toBe(2_800_000);
  });
});
