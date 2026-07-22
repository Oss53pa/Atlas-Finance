/**
 * Ossature d'intégration Suite Atlas — tests du moteur de posting (L2).
 *
 * Réf. docs/integration-suite-atlas/DESIGN.md § 3 « Tests exigés »
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../lib/db';
import { verifyChain } from '../utils/integrity';
import { createTestAdapter } from '../test/createTestAdapter';
import { postEvent } from '../services/integration/postingEngine';
import {
  canonicalize,
  computePayloadHash,
  ingestEvent,
  processPendingEvents,
  getFlowHealth,
} from '../services/integration/integrationBus';
import { invalidatePostingRulesCache, resolveRule } from '../services/integration/postingRulesService';
import type { IntegrationEvent, PostingRule } from '../services/integration/types';

// Le socle d'intégration est SaaS-only : on simule les tables sur l'adapter de
// test (mêmes noms logiques que TABLE_MAP).
const memory: Record<string, any[]> = {
  postingRules: [],
  integrationEvents: [],
  integrationDeadLetters: [],
};

function makeAdapter() {
  const base = createTestAdapter() as any;
  const wrap = (table: string) => memory[table] !== undefined;

  return {
    ...base,
    getMode: () => 'local',
    getAll: async (table: string, filters?: any) => {
      if (!wrap(table)) return base.getAll(table, filters);
      let rows = [...memory[table]];
      if (filters?.where) {
        for (const [k, v] of Object.entries(filters.where)) {
          rows = rows.filter((r: any) => r[k] === v);
        }
      }
      if (filters?.orderBy) {
        const { field, direction } = filters.orderBy;
        rows.sort((a: any, b: any) => {
          const cmp = String(a[field] ?? '').localeCompare(String(b[field] ?? ''));
          return direction === 'desc' ? -cmp : cmp;
        });
      }
      if (filters?.limit) rows = rows.slice(0, filters.limit);
      return rows;
    },
    create: async (table: string, data: any) => {
      if (!wrap(table)) return base.create(table, data);
      const row = { id: crypto.randomUUID(), receivedAt: new Date().toISOString(), ...data };
      memory[table].push(row);
      return row;
    },
    update: async (table: string, id: string, data: any) => {
      if (!wrap(table)) return base.update(table, id, data);
      const row = memory[table].find((r: any) => r.id === id);
      Object.assign(row, data);
      return row;
    },
    delete: async (table: string, id: string) => {
      if (!wrap(table)) return base.delete(table, id);
      memory[table] = memory[table].filter((r: any) => r.id !== id);
    },
  };
}

/** Règles de détermination minimales pour la facture de vente. */
function seedSaleRules() {
  const rules: Partial<PostingRule>[] = [
    { eventType: 'sale.invoice.issued', lineRole: 'receivable', matchKey: '', debitAccount: '411000', creditAccount: null, thirdParty: true, analytic: false, priority: 100, active: true },
    { eventType: 'sale.invoice.issued', lineRole: 'revenue', matchKey: '', debitAccount: null, creditAccount: '701000', thirdParty: false, analytic: true, priority: 100, active: true },
    { eventType: 'sale.invoice.issued', lineRole: 'revenue', matchKey: 'SERVICES', debitAccount: null, creditAccount: '706000', thirdParty: false, analytic: true, priority: 50, active: true },
    { eventType: 'sale.invoice.issued', lineRole: 'vat_collected', matchKey: '', debitAccount: null, creditAccount: '443000', thirdParty: false, analytic: false, priority: 100, active: true },
  ];
  memory.postingRules = rules.map(r => ({ id: crypto.randomUUID(), ...r })) as any[];
  invalidatePostingRulesCache();
}

function saleEvent(overrides: Partial<IntegrationEvent> = {}): IntegrationEvent {
  return {
    id: crypto.randomUUID(),
    sourceSystem: 'atlas_trade',
    eventType: 'sale.invoice.issued',
    eventVersion: 1,
    sourceDocId: 'TRD-2026-0412',
    idempotencyKey: 'trade:TRD-2026-0412:issued',
    occurredAt: '2026-07-15T10:00:00.000Z',
    payloadHash: 'hash-test',
    status: 'pending',
    attempts: 0,
    payload: {
      docNumber: 'TRD-2026-0412',
      docDate: '2026-07-15',
      currency: 'XOF',
      thirdParty: { code: 'C0042', name: 'Client Test' },
      lines: [
        { role: 'receivable', amount: 1_180_000, label: 'Facture TRD-2026-0412' },
        { role: 'revenue', amount: 1_000_000, label: 'Prestation' },
        { role: 'vat_collected', amount: 180_000, label: 'TVA 18%', tax: { code: 'TVA18', rate: 18, base: 1_000_000, amount: 180_000, regime: 'normal' } },
      ],
      totalExclTax: 1_000_000,
      totalTax: 180_000,
      totalInclTax: 1_180_000,
    },
    ...overrides,
  } as IntegrationEvent;
}

let adapter: any;

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.accounts.clear();
  // ⚠️ Indispensable : sans ce clear, la période CLOSE seedée par le bloc
  // « Verrou de période » fuite dans les blocs suivants et fait rejeter tous
  // les postings en PERIOD_CLOSED.
  await db.fiscalPeriods.clear();
  memory.postingRules = [];
  memory.integrationEvents = [];
  memory.integrationDeadLetters = [];
  invalidatePostingRulesCache();
  adapter = makeAdapter();
  seedSaleRules();
});

// ============================================================================
// Détermination comptable
// ============================================================================

describe('Détermination comptable', () => {
  it('poste une facture de vente sur les comptes SYSCOHADA de la règle', async () => {
    const outcome = await postEvent(adapter, saleEvent());
    expect(outcome.status).toBe('posted');

    const entries = await db.journalEntries.toArray();
    expect(entries).toHaveLength(1);
    const e = entries[0];
    expect(e.journal).toBe('VE');
    expect(e.totalDebit).toBe(1_180_000);
    expect(e.totalCredit).toBe(1_180_000);

    const codes = e.lines.map(l => l.accountCode).sort();
    expect(codes).toEqual(['411000', '443000', '701000']);

    const client = e.lines.find(l => l.accountCode === '411000')!;
    expect(client.debit).toBe(1_180_000);
    expect(client.thirdPartyCode).toBe('C0042');
  });

  it('préfère la règle spécifique (matchKey) à la règle par défaut', async () => {
    const ev = saleEvent();
    ev.payload.lines[1].matchKey = 'SERVICES';
    await postEvent(adapter, ev);

    const e = (await db.journalEntries.toArray())[0];
    expect(e.lines.some(l => l.accountCode === '706000')).toBe(true);
    expect(e.lines.some(l => l.accountCode === '701000')).toBe(false);
  });

  it('REJETTE sans règle plutôt que de deviner un compte', async () => {
    memory.postingRules = memory.postingRules.filter((r: any) => r.lineRole !== 'vat_collected');
    invalidatePostingRulesCache();

    const outcome = await postEvent(adapter, saleEvent());
    expect(outcome.status).toBe('rejected');
    expect(outcome.errorCode).toBe('NO_POSTING_RULE');
    expect(await db.journalEntries.count()).toBe(0);
  });

  it('rejette un événement émis par le mauvais satellite', async () => {
    const outcome = await postEvent(adapter, saleEvent({ sourceSystem: 'atlas_procure' } as any));
    expect(outcome.status).toBe('rejected');
    expect(outcome.errorCode).toBe('OWNER_MISMATCH');
  });

  it('rejette un fait de gestion déséquilibré', async () => {
    const ev = saleEvent();
    ev.payload.lines[0].amount = 1_000_000; // créance ≠ HT + TVA
    const outcome = await postEvent(adapter, ev);
    expect(outcome.status).toBe('rejected');
    expect(outcome.errorCode).toBe('UNBALANCED');
    expect(await db.journalEntries.count()).toBe(0);
  });

  it('ignore un événement d’engagement (commande approuvée)', async () => {
    const outcome = await postEvent(adapter, saleEvent({
      sourceSystem: 'atlas_procure',
      eventType: 'purchase.order.approved',
      sourceDocId: 'PO-1',
    } as any));
    expect(outcome.status).toBe('ignored');
    expect(await db.journalEntries.count()).toBe(0);
  });
});

// ============================================================================
// Traçabilité et preuve
// ============================================================================

describe('Traçabilité et preuve', () => {
  it('marque l’écriture de son système source et de son document', async () => {
    await postEvent(adapter, saleEvent());
    const e: any = (await db.journalEntries.toArray())[0];
    expect(e.sourceSystem).toBe('atlas_trade');
    expect(e.sourceDocType).toBe('sale.invoice.issued');
    expect(e.sourceDocId).toBe('TRD-2026-0412');
    expect(e.idempotencyKey).toBe('trade:TRD-2026-0412:issued');
    expect(e.sourcePayloadHash).toBe('hash-test');
  });

  it('fait entrer l’empreinte du document source dans la chaîne de hash', async () => {
    await postEvent(adapter, saleEvent());
    const withHash: any = (await db.journalEntries.toArray())[0];

    await db.journalEntries.clear();
    const ev = saleEvent();
    ev.payloadHash = 'une-autre-empreinte';
    await postEvent(adapter, ev);
    const other: any = (await db.journalEntries.toArray())[0];

    // Même contenu comptable, document source différent ⇒ hash différent.
    expect(other.hash).not.toBe(withHash.hash);
  });

  it('reste vérifiable par verifyChain malgré le sel de preuve', async () => {
    // Régression : si verifyChain ignorait sourcePayloadHash, TOUTE écriture
    // issue d'un satellite serait déclarée corrompue au premier contrôle.
    await postEvent(adapter, saleEvent());
    const entries = await db.journalEntries.toArray();
    const result = await verifyChain(entries as any);
    expect(result.valid).toBe(true);
    expect(result.checkedCount).toBe(1);
  });

  it('détecte la falsification du document source', async () => {
    await postEvent(adapter, saleEvent());
    const entries: any[] = await db.journalEntries.toArray();
    // On réécrit l'empreinte du document source sans toucher à l'écriture :
    // la chaîne doit rompre.
    entries[0].sourcePayloadHash = 'payload-falsifie';
    const result = await verifyChain(entries as any);
    expect(result.valid).toBe(false);
  });

  it('produit la MÊME empreinte que l’Edge Function (parité client ↔ serveur)', async () => {
    // Empreinte relevée en PRODUCTION le 2026-07-22 : réponse de
    // `integration-ingest` (payload_hash calculé serveur) pour ce payload exact.
    //
    // ⚠️ Ce test verrouille la parité entre `canonicalize()` (client, ce dépôt)
    // et sa jumelle dans supabase/functions/integration-ingest/index.ts. Si les
    // deux divergent, les empreintes ne correspondent plus et la chaîne de
    // preuve L7 devient INVÉRIFIABLE — sans qu'aucun autre test ne le voie.
    const payload = {
      docNumber: 'E2E-TRD-0001',
      docDate: '2026-07-22',
      currency: 'XOF',
      thirdParty: { code: 'C0042', name: 'Client E2E' },
      lines: [
        { role: 'receivable', amount: 1180000, label: 'Facture E2E-TRD-0001' },
        { role: 'revenue', amount: 1000000, label: 'Prestation' },
        {
          role: 'vat_collected', amount: 180000, label: 'TVA 18%',
          tax: { code: 'TVA18', rate: 18, base: 1000000, amount: 180000, regime: 'normal' },
        },
      ],
      totalExclTax: 1000000, totalTax: 180000, totalInclTax: 1180000,
    };
    const hash = await computePayloadHash(payload);
    expect(hash).toBe('afe436d45f6aa194bec3acfb91632791c8f817041a8cfe4d45a5da1d27379a25');
  });

  it('produit une empreinte canonique indépendante de l’ordre des clés', async () => {
    const a = await computePayloadHash({ b: 2, a: 1, nested: { y: 1, x: 2 } });
    const b = await computePayloadHash({ a: 1, nested: { x: 2, y: 1 }, b: 2 });
    expect(a).toBe(b);
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
});

// ============================================================================
// Verrou de période
// ============================================================================

describe('Verrou de période — la période fait loi pour les satellites', () => {
  beforeEach(async () => {
    await db.fiscalPeriods.clear();
    await db.fiscalPeriods.add({
      id: 'p-2026-07',
      fiscalYearId: 'fy-2026',
      code: '2026-07',
      name: 'Juillet 2026',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      status: 'cloturee',
    } as any);
  });

  it('refuse par défaut de poster dans une période close', async () => {
    const outcome = await postEvent(adapter, saleEvent());
    expect(outcome.status).toBe('rejected');
    expect(outcome.errorCode).toBe('PERIOD_CLOSED');
    expect(await db.journalEntries.count()).toBe(0);
  });

  it('reporte sur la période ouverte suivante si la politique le prévoit', async () => {
    await db.fiscalPeriods.add({
      id: 'p-2026-08',
      fiscalYearId: 'fy-2026',
      code: '2026-08',
      name: 'Août 2026',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      status: 'ouverte',
    } as any);

    const outcome = await postEvent(adapter, saleEvent(), {
      closedPeriodPolicy: 'defer_to_next_open',
    });
    expect(outcome.status).toBe('posted');
    expect(outcome.postedDate).toBe('2026-08-01');
  });
});

// ============================================================================
// Bus : idempotence, rejeu, supervision
// ============================================================================

describe('Bus d’intégration', () => {
  const input = {
    sourceSystem: 'atlas_trade' as const,
    eventType: 'sale.invoice.issued' as const,
    sourceDocId: 'TRD-2026-0412',
    idempotencyKey: 'trade:TRD-2026-0412:issued',
    occurredAt: '2026-07-15T10:00:00.000Z',
    payload: saleEvent().payload,
  };

  it('le rejeu de la même clé d’idempotence ne crée qu’un seul événement', async () => {
    const first = await ingestEvent(adapter, input);
    const second = await ingestEvent(adapter, input);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.eventId).toBe(first.eventId);
    expect(memory.integrationEvents).toHaveLength(1);
  });

  it('le rejeu ne produit qu’une seule écriture comptable', async () => {
    await ingestEvent(adapter, input);
    await processPendingEvents(adapter);
    await ingestEvent(adapter, input);
    await processPendingEvents(adapter);

    expect(await db.journalEntries.count()).toBe(1);
  });

  it('met en dead-letter une erreur définitive', async () => {
    await ingestEvent(adapter, { ...input, sourceSystem: 'atlas_people' as any });
    const res = await processPendingEvents(adapter);

    expect(res.rejected).toBe(1);
    expect(memory.integrationDeadLetters).toHaveLength(1);
    expect(memory.integrationDeadLetters[0].reason).toContain('OWNER_MISMATCH');
  });

  it('remonte l’âge du plus ancien événement non traité', async () => {
    await ingestEvent(adapter, input);
    memory.integrationEvents[0].receivedAt = '2026-07-15T00:00:00.000Z';

    const health = await getFlowHealth(adapter, new Date('2026-07-17T00:00:00.000Z'));
    expect(health).toHaveLength(1);
    expect(health[0].pending).toBe(1);
    expect(health[0].oldestPendingAgeHours).toBe(48);
  });
});

// ============================================================================
// Résolution de règle (unitaire)
// ============================================================================

describe('resolveRule', () => {
  const rules = [
    { id: '1', eventType: 'e', lineRole: 'revenue', matchKey: '', creditAccount: '701000', priority: 100, active: true },
    { id: '2', eventType: 'e', lineRole: 'revenue', matchKey: 'SERVICES', creditAccount: '706000', priority: 50, active: true },
    { id: '3', eventType: 'e', lineRole: 'revenue', matchKey: 'EXPORT', creditAccount: '702000', priority: 50, active: false },
  ] as PostingRule[];

  it('retombe sur la règle par défaut si la clé ne correspond à rien', () => {
    expect(resolveRule(rules, 'e', 'revenue', 'INCONNU')?.creditAccount).toBe('701000');
  });

  it('ignore une règle désactivée', () => {
    expect(resolveRule(rules, 'e', 'revenue', 'EXPORT')?.creditAccount).toBe('701000');
  });

  it('retourne null quand aucune règle n’existe', () => {
    expect(resolveRule(rules, 'e', 'vat_collected')).toBeNull();
  });
});
