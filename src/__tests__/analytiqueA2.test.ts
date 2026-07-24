/**
 * Analytique · Lot A·2 — rentabilité client, concentration, MCV/point mort.
 * Fonctions déterministes (CDC §8.1).
 */
import { describe, it, expect } from 'vitest';
import {
  withCostToServe, clientStatut, buildWhaleCurve,
  type ClientRevenueReport, type ClientRevenue,
} from '../services/tiers/clientProfitability';
import { computeConcentration } from '../services/tiers/tiersConcentrationService';
import { computeSectionMargins, type VentForMargin } from '../features/budget/services/marginService';
import { cumulRange } from '../utils/cumulRange';

const client = (code: string, ca: number, coutDirect = 0): ClientRevenue => ({
  code, name: `Client ${code}`, ca, nbEcritures: 1, coutDirect,
  margeBrute: ca - coutDirect, margeBrutePct: ca ? Math.round(((ca - coutDirect) / ca) * 100) : 0,
});
const report = (clients: ClientRevenue[], totalCharges6: number): ClientRevenueReport => ({
  clients, caTotal: clients.reduce((s, c) => s + c.ca, 0),
  caAffecte: clients.filter(c => c.code).reduce((s, c) => s + c.ca, 0),
  caNonAffecte: 0, pctAffecte: 100, ecrituresSansClient: 0, totalCharges6,
});

describe('withCostToServe & statut (cost-to-serve)', () => {
  it('client 5M de produits / 6M de coût de service → marge nette −1M (CDC AC-6)', () => {
    const r = report([client('411X', 5_000_000)], 6_000_000);
    const exercice = withCostToServe(r, 'exercice');
    const cx = exercice.clients.find(c => c.code === '411X')!;
    expect(cx.quotePartIndirecte).toBe(6_000_000);
    expect(cx.margeNette).toBe(-1_000_000);
    expect(cx.statut).toBe('A_SURVEILLER');           // vue période : simple signal
    const glissant = withCostToServe(r, 'glissant12').clients.find(c => c.code === '411X')!;
    expect(glissant.statut).toBe('DEFICITAIRE');       // vue 12 mois : statut officiel
  });

  it('répartit le pool indirect au prorata du CA (Σ quote-part = pool)', () => {
    const r = report([client('A', 300), client('B', 100)], 200);
    const { clients, indirectPool } = withCostToServe(r, 'exercice');
    expect(indirectPool).toBe(200);
    const a = clients.find(c => c.code === 'A')!, b = clients.find(c => c.code === 'B')!;
    expect(a.quotePartIndirecte + b.quotePartIndirecte).toBe(200);
    expect(a.quotePartIndirecte).toBe(150); // 300/400 * 200
    expect(b.quotePartIndirecte).toBe(50);
  });

  it('le coût direct déjà attribué sort du pool indirect', () => {
    const r = report([client('A', 1000, 400)], 1000); // 400 direct sur A
    const { indirectPool } = withCostToServe(r, 'exercice');
    expect(indirectPool).toBe(600); // 1000 charges − 400 déjà direct
  });

  it('clientStatut : négatif = déficitaire seulement en 12 mois glissants', () => {
    expect(clientStatut(-1, -5, 'glissant12')).toBe('DEFICITAIRE');
    expect(clientStatut(-1, -5, 'exercice')).toBe('A_SURVEILLER');
    expect(clientStatut(10, 3, 'glissant12')).toBe('A_SURVEILLER'); // positif mais < 5 %
    expect(clientStatut(100, 20, 'exercice')).toBe('RENTABLE');
  });
});

describe('buildWhaleCurve', () => {
  it('trie par marge décroissante et cumule (destructeurs en fin)', () => {
    const { clients } = withCostToServe(report([client('A', 1000), client('B', 1000)], 1200), 'exercice');
    // A et B : 1000 CA chacun, pool 1200 réparti 600/600 → marge 400 chacun
    const whale = buildWhaleCurve(clients);
    expect(whale).toHaveLength(2);
    expect(whale[0].cumulMarge).toBe(400);
    expect(whale[1].cumulMarge).toBe(800);
  });
});

describe('computeConcentration (Pareto / HHI)', () => {
  it('parts, cumul et HHI', () => {
    const res = computeConcentration([
      { code: 'A', name: 'A', value: 80 },
      { code: 'B', name: 'B', value: 20 },
    ]);
    expect(res.total).toBe(100);
    expect(res.top1Pct).toBe(80);
    expect(res.items[0].sharePct).toBe(80);
    expect(res.items[1].cumulPct).toBe(100);
    expect(res.hhiIndex).toBe(6800); // 0.8²+0.2² = 0.68
  });
  it('ignore les valeurs nulles/négatives et trie décroissant', () => {
    const res = computeConcentration([
      { code: 'A', name: 'A', value: 10 },
      { code: 'B', name: 'B', value: 90 },
      { code: 'C', name: 'C', value: 0 },
    ]);
    expect(res.nb).toBe(2);
    expect(res.items[0].code).toBe('B');
  });
});

describe('computeSectionMargins (MCV / point mort)', () => {
  const meta = new Map([['S1', { code: 'S1', libelle: 'Site 1' }]]);
  const base: VentForMargin[] = [
    { section_id: 'S1', accountClass: '7', montant: -1000, comportement: null, pct_variable: null }, // CA 1000
    { section_id: 'S1', accountClass: '6', montant: 300, comportement: 'variable', pct_variable: null },
    { section_id: 'S1', accountClass: '6', montant: 200, comportement: 'fixe', pct_variable: null },
    { section_id: 'S1', accountClass: '6', montant: 100, comportement: 'mixte', pct_variable: 50 }, // 50 var / 50 fixe
  ];

  it('cascade CA → variables → MCV → fixes → marge nette + point mort', () => {
    const [s] = computeSectionMargins(base, [], meta);
    expect(s.ca).toBe(1000);
    expect(s.coutsVariables).toBe(350);   // 300 + 50
    expect(s.mcv).toBe(650);
    expect(s.mcvTauxPct).toBe(65);
    expect(s.coutsFixes).toBe(250);        // 200 + 50
    expect(s.margeNette).toBe(400);
    expect(s.pointMort).toBe(385);         // 250 / 0.65
  });

  it('les transferts secondaires alourdissent les coûts fixes (coût complet)', () => {
    const [s] = computeSectionMargins(base, [{ from_section_id: 'AUX', to_section_id: 'S1', montant: 100 }], meta);
    expect(s.coutsFixes).toBe(350);        // 250 + 100 déversés
    expect(s.margeNette).toBe(300);
  });

  it('point mort n/a si taux de MCV ≤ 0', () => {
    const [s] = computeSectionMargins([
      { section_id: 'S1', accountClass: '7', montant: -100, comportement: null, pct_variable: null },
      { section_id: 'S1', accountClass: '6', montant: 200, comportement: 'variable', pct_variable: null },
    ], [], meta);
    expect(s.mcv).toBeLessThan(0);
    expect(s.pointMort).toBeNull();
  });
});

describe('cumulRange (vision cumulée)', () => {
  const now = new Date('2026-06-15');
  it('exercice = année pleine', () => {
    expect(cumulRange('exercice', '2024', now)).toEqual({ from: '2024-01-01', to: '2024-12-31' });
  });
  it('exercice passé : YTD et 12 mois ancrés à la fin de l’exercice', () => {
    expect(cumulRange('ytd', 2024, now).to).toBe('2024-12-31');
    expect(cumulRange('glissant12', 2024, now)).toEqual({ from: '2024-01-01', to: '2024-12-31' });
  });
  it('exercice courant : YTD s’arrête à aujourd’hui', () => {
    expect(cumulRange('ytd', 2026, now)).toEqual({ from: '2026-01-01', to: '2026-06-15' });
  });
});
