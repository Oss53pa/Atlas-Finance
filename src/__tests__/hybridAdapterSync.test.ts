/**
 * Tests du moteur de synchronisation Dexie ↔ Supabase (HybridAdapter).
 *
 * Couvre les garanties critiques :
 *  - Durabilité : la file de sync est persistée et survit à un "reload"
 *    (nouvelle instance sur le même IndexedDB) → aucune saisie hors-ligne perdue.
 *  - Mécanique de file : create/update/delete enfilent la bonne action ; un push
 *    réussi vide la file ; hors-ligne, la file est conservée.
 *  - Politique de conflit : une écriture locale EN ATTENTE n'est jamais écrasée
 *    par la version distante lors d'un pull.
 *
 * Le remote Supabase est neutralisé (stubs) — zéro appel réseau.
 */
import { describe, it, expect, vi } from 'vitest';
import { HybridAdapter } from '@atlas/data';

const URL = 'https://fake.supabase.co';
const KEY = 'anon-test-key';

/** Crée un HybridAdapter avec un remote entièrement stubbé (aucun réseau). */
function mk(dbName: string): HybridAdapter {
  const h = new HybridAdapter(dbName, URL, KEY, 'tenant-1');
  const remote = (h as any).remote;
  remote.isOnline = vi.fn().mockResolvedValue(true);
  remote.getAll = vi.fn().mockResolvedValue([]);
  remote.create = vi.fn().mockResolvedValue({});
  remote.update = vi.fn().mockResolvedValue({});
  remote.delete = vi.fn().mockResolvedValue(undefined);
  return h;
}

describe('HybridAdapter — sync Dexie ↔ Supabase', () => {
  it('persiste la file et la recharge après un reload (zéro perte)', async () => {
    const db = 'hybrid-db-durability';
    const h1 = mk(db);
    await h1.whenReady();

    await h1.create('accounts', { id: 'A1', code: '601', name: 'Achats' });
    expect(h1.getPendingCount()).toBe(1);

    // Simuler un rechargement de l'app : nouvelle instance, même IndexedDB
    const h2 = mk(db);
    await h2.whenReady();
    expect(h2.getPendingCount()).toBe(1);
  });

  it('enfile la bonne action pour create / update / delete', async () => {
    const h = mk('hybrid-db-actions');
    await h.whenReady();

    await h.create('accounts', { id: 'B1', code: '602', name: 'Transport' });
    await h.update('accounts', 'B1', { name: 'Transport & frais' });
    await h.delete('accounts', 'B1');

    const queue = (h as any).syncQueue as Array<{ action: string }>;
    expect(queue.map(q => q.action)).toEqual(['CREATE', 'UPDATE', 'DELETE']);
  });

  it('vide la file après un push réussi', async () => {
    const h = mk('hybrid-db-push');
    await h.whenReady();
    await h.create('accounts', { id: 'P1', code: '603', name: 'x' });
    expect(h.getPendingCount()).toBe(1);

    await h.pushChanges({ changes: [], since: new Date(0).toISOString() });
    expect(h.getPendingCount()).toBe(0);
    expect((h as any).remote.create).toHaveBeenCalledTimes(1);
  });

  it('conserve la file et signale "Offline" quand le remote est hors-ligne', async () => {
    const h = mk('hybrid-db-offline');
    await h.whenReady();
    (h as any).remote.isOnline = vi.fn().mockResolvedValue(false);

    await h.create('accounts', { id: 'O1', code: '604', name: 'y' });
    const res = await h.pushChanges({ changes: [], since: new Date(0).toISOString() });

    expect(res.errors).toContain('Offline');
    expect(h.getPendingCount()).toBe(1); // rien n'est perdu
  });

  it('ne JAMAIS écraser une écriture locale en attente lors du pull', async () => {
    const h = mk('hybrid-db-conflict');
    await h.whenReady();

    // Saisie locale (en attente de push), version "récente côté utilisateur"
    await h.create('accounts', {
      id: 'C1', code: '601', name: 'Local Achats',
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    // Le distant renvoie une version PLUS RÉCENTE du même enregistrement
    (h as any).remote.getAll = vi.fn(async (table: string) =>
      table === 'accounts'
        ? [{ id: 'C1', code: '601', name: 'REMOTE Achats', updated_at: '2026-09-09T00:00:00.000Z' }]
        : [],
    );

    await h.pullChanges('2026-01-01T00:00:00.000Z');

    const local = await h.getById<any>('accounts', 'C1');
    // L'écriture locale en attente est préservée, pas écrasée par le remote.
    expect(local?.name).toBe('Local Achats');
  });
});
