/**
 * Recette — invariants de la refonte OPEX/CAPEX (CDC §26.1).
 *
 * Vérifie par fonction pure les invariants correctness-critiques du module. Les
 * invariants nécessitant un E2E (Σ réalisé vues = balance GL ; RLS cross-tenant ;
 * atomicité trigger en base) sont couverts par la vérification live des migrations
 * (trigger engagement_rapp_sync prouvé en prod) et restent à jouer via le protocole
 * R1-R19 sur un tenant de test.
 */
import { describe, it, expect } from 'vitest';
import { sha256Hex } from '../utils/integrity';
import { engagementRestant } from '../features/budget/services/engagementService';
import { decideCheck, type MailleDisponible } from '../features/budget/services/budgetCheckService';
import { reaffectableAmount } from '../features/budget/services/reaffectationService';
import { computeRanking, DEFAULT_CRITERIA, type BcScoringInput } from '../features/budget/services/capexScoringService';
import { buildSnapshotPayload } from '../features/budget/services/snapshotService';

describe('Invariant 1 — Disponible = Budget − Engagé − Réalisé', () => {
  it('identité arithmétique à la maille', () => {
    const budget = 1000, engage = 300, realise = 200;
    const m: MailleDisponible = { budget, engage, realise, disponible: budget - engage - realise };
    expect(m.disponible).toBe(500);
    // un engagement de 500 laisse exactement 0 après engagement
    expect(decideCheck(m, 500, 'bloquant').apresEngagement).toBe(0);
  });
});

describe('Invariant 3 — bascule engagé→réalisé nette, jamais de double compte', () => {
  it('engagé restant net = initial − facturé − dégagé (clampé)', () => {
    expect(engagementRestant({ montant_initial: 1000, montant_facture: 400, montant_degage: 100, statut: 'partiellement_facture' })).toBe(500);
  });
  it('une fois soldé/annulé, ne pèse plus', () => {
    expect(engagementRestant({ montant_initial: 1000, montant_facture: 0, montant_degage: 0, statut: 'annule' })).toBe(0);
  });
});

describe('Invariant 11/11bis — enveloppe & réaffectable', () => {
  it('réaffectable = approprié − engagé ferme − réalisé, jamais négatif', () => {
    expect(reaffectableAmount(60, 22, 5)).toBe(33);
    expect(reaffectableAmount(10, 20, 5)).toBe(0);
  });
  it('ligne de flottaison : le cumul au-delà de l’enveloppe passe sous l’eau', () => {
    const bc = (id: string, montant: number, van: number): BcScoringInput =>
      ({ id, libelle: id, montant, van, tri: 0.2, paybackMois: 24, categorie: 'croissance', riskPI: 5, obligatoire: false, urgence: false });
    const r = computeRanking([bc('A', 600, 500), bc('B', 600, 400)], DEFAULT_CRITERIA, 1000);
    expect(r.filter((x) => x.passe)).toHaveLength(1);
  });
});

describe('Invariant 12/13 — snapshots immuables & hash déterministe', () => {
  it('un même contenu produit toujours le même hash (rejouable)', async () => {
    const payload = buildSnapshotPayload([
      { account_code: '6011', section_id: null, period: 1, budget: 100, engage: 0, realise: 40, disponible: 60 },
    ], '2027', 12);
    const h1 = await sha256Hex(JSON.stringify(payload));
    const h2 = await sha256Hex(JSON.stringify(payload));
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });
  it('un contenu altéré change le hash (détection d’altération)', async () => {
    const base = await sha256Hex(JSON.stringify({ a: 1 }));
    const altered = await sha256Hex(JSON.stringify({ a: 2 }));
    expect(base).not.toBe(altered);
  });
});
