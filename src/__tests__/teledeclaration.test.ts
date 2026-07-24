/**
 * B5 — préparation & suivi de télédéclaration (SANS soumission automatique).
 *
 * Vérifie : packaging du bordereau · export CSV · registre portails · cycle de
 * vie persisté (à préparer → prêt → télédéclaré → payé) sans jamais soumettre.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import {
  buildTeledeclarationPackage,
  packageToCSV,
  getPortal,
  markPrepared,
  recordSubmitted,
  recordPaid,
  getTeledeclarationRecord,
} from '../services/fiscal/teledeclarationService';

let adapter: ReturnType<typeof createTestAdapter>;
const NOW = '2026-07-24T10:00:00.000Z';

beforeEach(async () => {
  await db.settings.clear();
  adapter = createTestAdapter();
});

describe('registre des portails', () => {
  it('donne un portail nommé pour chaque pays connu, un repli sinon', () => {
    expect(getPortal('CI').name).toContain('e-impôts');
    expect(getPortal('CM').name).toContain('Cameroun');
    expect(getPortal('ZZ').name).toContain('Portail DGI');
  });
});

describe('packaging du bordereau', () => {
  it('construit un bordereau avec devise du pays et empreinte', async () => {
    const pkg = await buildTeledeclarationPackage({
      countryCode: 'CI', type: 'TVA', period: '2026-06',
      lines: [
        { label: 'TVA collectée', amount: 1_800_000 },
        { label: 'TVA déductible', amount: -1_100_000 },
      ],
      totalAPayer: 700_000,
    });
    expect(pkg.currency).toBe('XOF');
    expect(pkg.countryName).toContain('Ivoire');
    expect(pkg.reference).toBe('TVA-CI-2026-06');
    expect(pkg.totalAPayer).toBe(700_000);
    expect(pkg.integrityHash).toMatch(/^[0-9a-f]{64}$/);
    expect(pkg.portal.name).toContain('e-impôts');
  });

  it('calcule le total depuis les lignes si non fourni', async () => {
    const pkg = await buildTeledeclarationPackage({
      countryCode: 'GA', type: 'IS', period: '2026',
      lines: [{ label: 'IS dû', amount: 5_000_000 }, { label: 'Acomptes', amount: -2_000_000 }],
    });
    expect(pkg.totalAPayer).toBe(3_000_000);
    expect(pkg.currency).toBe('XAF'); // Gabon = CEMAC
  });

  it('exporte un CSV avec méta, lignes et net à payer', async () => {
    const pkg = await buildTeledeclarationPackage({
      countryCode: 'CI', type: 'TVA', period: '2026-06',
      lines: [{ label: 'TVA nette', amount: 700_000 }], totalAPayer: 700_000,
    });
    const csv = packageToCSV(pkg);
    expect(csv).toContain('# Déclaration de TVA');
    expect(csv).toContain('e-impôts');
    expect(csv).toContain('NET À PAYER;700000');
  });
});

describe('cycle de vie (aucune soumission automatique)', () => {
  async function pkg() {
    return buildTeledeclarationPackage({
      countryCode: 'CI', type: 'IS', period: '2026',
      lines: [{ label: 'IS solde', amount: 4_000_000 }], totalAPayer: 4_000_000,
    });
  }

  it('préparer → prêt', async () => {
    const rec = await markPrepared(adapter, await pkg(), NOW);
    expect(rec.status).toBe('pret');
    expect(rec.preparedAt).toBe(NOW);
    const stored = await getTeledeclarationRecord(adapter, 'IS-CI-2026');
    expect(stored?.status).toBe('pret');
  });

  it('télédéclaré consigne la référence FOURNIE PAR LE PORTAIL (saisie utilisateur)', async () => {
    await markPrepared(adapter, await pkg(), NOW);
    const rec = await recordSubmitted(adapter, 'IS-CI-2026', 'DGI-REF-99887', '2026-07-25T09:00:00Z');
    expect(rec.status).toBe('teledeclare');
    expect(rec.portalReference).toBe('DGI-REF-99887');
    expect(rec.submittedAt).toBe('2026-07-25T09:00:00Z');
  });

  it('payé est terminal et conserve la référence portail', async () => {
    await markPrepared(adapter, await pkg(), NOW);
    await recordSubmitted(adapter, 'IS-CI-2026', 'DGI-REF-99887', '2026-07-25T09:00:00Z');
    const rec = await recordPaid(adapter, 'IS-CI-2026', '2026-07-26T09:00:00Z');
    expect(rec.status).toBe('paye');
    expect(rec.paidAt).toBe('2026-07-26T09:00:00Z');
    expect(rec.portalReference).toBe('DGI-REF-99887');
  });

  it('re-préparer après télédéclaration ne régresse pas le statut', async () => {
    await markPrepared(adapter, await pkg(), NOW);
    await recordSubmitted(adapter, 'IS-CI-2026', 'REF', '2026-07-25T09:00:00Z');
    const rec = await markPrepared(adapter, await pkg(), '2026-07-27T10:00:00Z');
    expect(rec.status).toBe('teledeclare'); // pas de retour à 'pret'
  });
});
