/**
 * Tests du service Contacts (thirdPartyService) adossé à la table `thirdParties`.
 * Vérifie : CRUD via DataAdapter, pagination, filtres recherche/type, compteurs.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Le service importe (pour ses méthodes REST legacy) la chaîne
// backend-services → api → @/lib/supabase, qui crée un client Supabase au
// chargement du module. En environnement de test (jsdom), l'init auth de
// gotrue déclenche une rejection non gérée (`storage.getItem is not a
// function`). Nos méthodes Contacts n'utilisent QUE le DataAdapter : on neutralise
// donc la création du client Supabase pour garder le run propre (exit 0).
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: () => ({}),
  },
  isSupabaseConfigured: false,
  getSession: async () => null,
  getCurrentUser: async () => null,
  getUserProfile: async () => null,
  getUserPermissions: async () => [],
}));

import { thirdPartyService } from '../services/third-party.service';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

describe('thirdPartyService — contacts (Dexie/DataAdapter)', () => {
  beforeEach(async () => {
    await db.thirdParties.clear();
    await db.thirdParties.bulkAdd([
      { id: 'TP1', code: 'C001', name: 'Alpha SARL', type: 'customer', email: 'alpha@ex.cm', phone: '0100', balance: 0, isActive: true },
      { id: 'TP2', code: 'F001', name: 'Beta Fournitures', type: 'supplier', email: 'beta@ex.cm', phone: '0200', balance: 0, isActive: true },
      { id: 'TP3', code: 'C002', name: 'Gamma Corp', type: 'customer', email: 'gamma@ex.cm', phone: '0300', balance: 0, isActive: true },
    ]);
  });

  it('getContacts renvoie une liste paginée avec compteurs par type', async () => {
    const res = await thirdPartyService.getContacts(adapter, { page: 1, limit: 20 });
    expect(res.count).toBe(3);
    expect(res.results).toHaveLength(3);
    expect(res.clients_count).toBe(2);
    expect(res.suppliers_count).toBe(1);
    expect(res.prospects_count).toBe(0);
    const alpha = res.results.find((r) => r.id === 'TP1');
    expect(alpha?.nom).toBe('Alpha SARL');
    expect(alpha?.type_tiers).toBe('client');
  });

  it('getContacts filtre par recherche (nom/email/code)', async () => {
    const res = await thirdPartyService.getContacts(adapter, { search: 'gamma' });
    expect(res.count).toBe(1);
    expect(res.results[0].id).toBe('TP3');
  });

  it('getContacts filtre par type_tiers', async () => {
    const res = await thirdPartyService.getContacts(adapter, { type_tiers: 'fournisseur' });
    expect(res.count).toBe(1);
    expect(res.results[0].type_tiers).toBe('fournisseur');
  });

  it('getContacts pagine selon page/limit', async () => {
    const page1 = await thirdPartyService.getContacts(adapter, { page: 1, limit: 2 });
    const page2 = await thirdPartyService.getContacts(adapter, { page: 2, limit: 2 });
    expect(page1.count).toBe(3);
    expect(page1.results).toHaveLength(2);
    expect(page2.results).toHaveLength(1);
  });

  it('getCompanies renvoie {id, denomination, code}', async () => {
    const res = await thirdPartyService.getCompanies(adapter, { page: 1, limit: 1000 });
    expect(res.count).toBe(3);
    const alpha = res.results.find((c) => c.id === 'TP1');
    expect(alpha?.denomination).toBe('Alpha SARL');
    expect(alpha?.code).toBe('C001');
  });

  it('createContact persiste un nouveau tiers', async () => {
    const created = await thirdPartyService.createContact(adapter, {
      prenom: 'Jean',
      nom: 'Dupont',
      type_tiers: 'client',
      email: 'jean@ex.cm',
      telephone_fixe: '0400',
      ville: 'Douala',
      pays: 'Cameroun',
    });
    expect(created.id).toBeTruthy();
    expect(created.nom).toBe('Jean Dupont');
    expect(created.email).toBe('jean@ex.cm');

    const stored = await db.thirdParties.get(created.id);
    expect(stored?.name).toBe('Jean Dupont');
    expect(stored?.type).toBe('customer');
    expect(stored?.phone).toBe('0400');
    expect(stored?.address).toContain('Douala');

    const res = await thirdPartyService.getContacts(adapter, {});
    expect(res.count).toBe(4);
  });

  it('updateContact met à jour les champs mappés', async () => {
    const updated = await thirdPartyService.updateContact(adapter, 'TP1', {
      nom: 'Alpha Holding',
      type_tiers: 'partenaire',
      email: 'contact@alpha.cm',
    });
    expect(updated.nom).toBe('Alpha Holding');
    expect(updated.type_tiers).toBe('partenaire');

    const stored = await db.thirdParties.get('TP1');
    expect(stored?.name).toBe('Alpha Holding');
    expect(stored?.type).toBe('both');
    expect(stored?.email).toBe('contact@alpha.cm');
  });

  it('deleteContact supprime le tiers', async () => {
    await thirdPartyService.deleteContact(adapter, 'TP2');
    expect(await db.thirdParties.get('TP2')).toBeUndefined();
    const res = await thirdPartyService.getContacts(adapter, {});
    expect(res.count).toBe(2);
  });
});
