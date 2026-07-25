/**
 * Tests — moteur partagé « Vue Dirigeant » (supabase/functions/_shared/executiveReport).
 *
 * Verrouille le calcul des agrégats (miroir de dashboardMetrics), la logique de
 * planification (computeNextRun) et la génération de l'email HTML.
 */
import { describe, it, expect } from 'vitest';
import {
  computeReportData,
  computeNextRun,
  buildReportHtml,
  fcfa,
  type ReportContext,
  type ReportEntry,
} from '../../supabase/functions/_shared/executiveReport';

const ctx: ReportContext = {
  companyName: 'ACME SARL',
  fyYear: 2024,
  exerciceLabel: '2024',
  frequency: 'monthly',
  periodLabel: 'Mai 2024',
  appUrl: 'https://example.test/executive',
};

// Écritures : CA 100 000 (cl.7), charges 60 000 (cl.6), trésorerie 40 000 (cl.5),
// virement interne 58 (doit être EXCLU de la trésorerie).
const entries: ReportEntry[] = [
  {
    date: '2024-05-10', status: 'posted', lines: [
      { account_code: '701', debit: 0, credit: 100000, third_party_code: null, third_party_name: null },
      { account_code: '411', debit: 100000, credit: 0, third_party_code: 'C1', third_party_name: 'Client Un' },
    ],
  },
  {
    date: '2024-05-12', status: 'validated', lines: [
      { account_code: '601', debit: 60000, credit: 0, third_party_code: null, third_party_name: null },
      { account_code: '512', debit: 0, credit: 60000, third_party_code: null, third_party_name: null },
    ],
  },
  {
    date: '2024-05-15', status: 'posted', lines: [
      { account_code: '512', debit: 40000, credit: 0, third_party_code: null, third_party_name: null },
      { account_code: '585', debit: 0, credit: 40000, third_party_code: null, third_party_name: null },
    ],
  },
  // Brouillon : doit être ignoré.
  {
    date: '2024-05-20', status: 'draft', lines: [
      { account_code: '701', debit: 0, credit: 999999, third_party_code: null, third_party_name: null },
    ],
  },
];

describe('computeReportData', () => {
  const data = computeReportData(entries, ctx);

  it('agrège le CA (cl.7, net créditeur) hors brouillons', () => {
    expect(data.ca).toBe(100000);
  });

  it('agrège les charges (cl.6, net débiteur)', () => {
    expect(data.charges).toBe(60000);
  });

  it('calcule le résultat net = CA − charges − impôt', () => {
    expect(data.resultatNet).toBe(40000);
  });

  it('exclut la classe 58 (virements internes) de la trésorerie', () => {
    // 512 : +40000 (débit) −60000 (crédit) = −20000 ; 585 exclu ⇒ trésorerie = −20000.
    expect(data.treasury).toBe(-20000);
  });

  it('calcule la marge nette en %', () => {
    expect(data.margeNette).toBeCloseTo(40, 5);
  });

  it('remonte le top client par CA', () => {
    expect(data.topClients[0]).toMatchObject({ name: 'Client Un', ca: 100000 });
  });

  it('signale la présence de données', () => {
    expect(data.hasData).toBe(true);
    expect(data.count).toBe(3); // le brouillon est exclu
  });
});

describe('computeNextRun', () => {
  it('weekly : prochain lundi à 7h UTC', () => {
    // 2024-05-15 est un mercredi 12:00 UTC → prochain lundi (weekday=1) = 2024-05-20 07:00.
    const from = new Date('2024-05-15T12:00:00Z');
    const iso = computeNextRun('weekly', { sendHour: 7, weekday: 1, monthDay: 1 }, from);
    expect(iso).toBe('2024-05-20T07:00:00.000Z');
  });

  it('monthly : bascule au mois suivant si le jour est passé', () => {
    // 2024-05-15 → jour 1 déjà passé ce mois ⇒ 2024-06-01 07:00.
    const from = new Date('2024-05-15T12:00:00Z');
    const iso = computeNextRun('monthly', { sendHour: 7, weekday: 1, monthDay: 1 }, from);
    expect(iso).toBe('2024-06-01T07:00:00.000Z');
  });

  it('monthly : reste dans le mois si le jour est à venir', () => {
    const from = new Date('2024-05-15T12:00:00Z');
    const iso = computeNextRun('monthly', { sendHour: 7, weekday: 1, monthDay: 25 }, from);
    expect(iso).toBe('2024-05-25T07:00:00.000Z');
  });
});

describe('fcfa', () => {
  it('formate en compact', () => {
    expect(fcfa(1_234_567)).toBe('1,2 M');
    expect(fcfa(9_050_000_000)).toBe('9,05 Md');
    expect(fcfa(-5000)).toBe('-5 K');
  });
});

describe('buildReportHtml', () => {
  const html = buildReportHtml(computeReportData(entries, ctx));

  it('produit un document HTML complet et branché', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('ACME SARL');
    expect(html).toContain('Vue Dirigeant');
    expect(html).toContain('Client Un');
    expect(html).toContain('example.test/executive');
  });

  it('échappe le HTML des données pour éviter l\'injection', () => {
    const evil = computeReportData(
      [{ date: '2024-05-10', status: 'posted', lines: [
        { account_code: '701', debit: 0, credit: 1000, third_party_code: 'X', third_party_name: '<script>alert(1)</script>' },
        { account_code: '411', debit: 1000, credit: 0, third_party_code: 'X', third_party_name: '<script>alert(1)</script>' },
      ] }],
      ctx,
    );
    const out = buildReportHtml(evil);
    expect(out).not.toContain('<script>alert(1)</script>');
    expect(out).toContain('&lt;script&gt;');
  });
});
