/**
 * Vague C (C2) — parseurs mobile money.
 *
 * Convention de signe : positif = entrée dans le portefeuille, négatif = sortie.
 * Les frais opérateur sont extraits comme transactions séparées (débit).
 */

import { describe, it, expect } from 'vitest';
import {
  parseMobileMoney,
  detectMobileMoneyProvider,
  isFeeTransaction,
} from '../services/treasury/mobileMoneyParsers';

// Relevé Wave : colonnes anglaises, montant non signé + colonne Type.
const WAVE = [
  'Date,Type,Amount,Fee,Balance,Counterparty,Transaction ID',
  '2026-07-01,Cash In,100000,0,100000,+2250700000001,TXW001',
  '2026-07-02,Payment,25000,500,74500,Marchand ALPHA,TXW002',
  '2026-07-03,Cash Out,30000,300,44200,+2250700000002,TXW003',
].join('\n');

// Relevé Orange Money : colonnes françaises, séparateur point-virgule.
const ORANGE = [
  'Date;Type de transaction;Montant;Frais;Solde;Numero;Reference',
  '01/07/2026;Depot;50 000;0;50 000;0700000001;OM001',
  '02/07/2026;Retrait;20 000;250;29 750;0700000002;OM002',
].join('\n');

describe('détection de l’opérateur', () => {
  it('reconnaît Wave, Orange, MTN, Moov', () => {
    expect(detectMobileMoneyProvider('un relevé Wave ...')).toBe('wave');
    expect(detectMobileMoneyProvider('Orange Money statement')).toBe('orange_money');
    expect(detectMobileMoneyProvider('MTN MoMo export')).toBe('mtn_momo');
    expect(detectMobileMoneyProvider('Moov Money')).toBe('moov_money');
  });
});

describe('Wave', () => {
  const r = parseMobileMoney(WAVE, 'wave_releve.csv');

  it('identifie l’opérateur et parse les lignes', () => {
    expect(r.provider).toBe('wave');
    // 3 opérations + 2 lignes de frais (Payment 500, Cash Out 300)
    expect(r.transactions.filter(t => !isFeeTransaction(t))).toHaveLength(3);
  });

  it('signe correctement selon le type (Cash In +, Payment/Cash Out −)', () => {
    const main = r.transactions.filter(t => !isFeeTransaction(t));
    expect(main[0].amount).toBe(100_000);  // Cash In
    expect(main[1].amount).toBe(-25_000);  // Payment
    expect(main[2].amount).toBe(-30_000);  // Cash Out
  });

  it('extrait les frais comme transactions séparées (débit)', () => {
    const fees = r.transactions.filter(isFeeTransaction);
    expect(fees).toHaveLength(2);
    expect(fees.map(f => f.amount)).toEqual([-500, -300]);
    expect(r.totalFees).toBe(800);
  });

  it('compose un libellé avec l’opérateur, le type et le tiers', () => {
    const main = r.transactions.filter(t => !isFeeTransaction(t));
    expect(main[1].label).toContain('Wave');
    expect(main[1].label).toContain('Payment');
    expect(main[1].label).toContain('Marchand ALPHA');
  });
});

describe('Orange Money', () => {
  const r = parseMobileMoney(ORANGE, 'orange.csv');

  it('gère le séparateur ; et les dates JJ/MM/AAAA', () => {
    expect(r.provider).toBe('orange_money');
    const main = r.transactions.filter(t => !isFeeTransaction(t));
    expect(main).toHaveLength(2);
    expect(main[0].date).toBe('2026-07-01');
  });

  it('gère les milliers à espace (« 50 000 » → 50000)', () => {
    const main = r.transactions.filter(t => !isFeeTransaction(t));
    expect(main[0].amount).toBe(50_000);   // Depot
    expect(main[1].amount).toBe(-20_000);  // Retrait
  });

  it('extrait les frais du retrait', () => {
    const fees = r.transactions.filter(isFeeTransaction);
    expect(fees).toHaveLength(1);
    expect(fees[0].amount).toBe(-250);
    expect(r.totalFees).toBe(250);
  });
});

describe('robustesse', () => {
  it('remonte un warning si les colonnes clés manquent', () => {
    const r = parseMobileMoney('Colonne1,Colonne2\nx,y', 'x.csv');
    expect(r.transactions).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('ne plante pas sur un relevé vide', () => {
    const r = parseMobileMoney('', 'vide.csv');
    expect(r.transactions).toHaveLength(0);
  });

  it('cohérence : le portefeuille descend du montant des frais', () => {
    // Cash In +100000, Payment -25000 -500, Cash Out -30000 -300 = 44200
    const r = parseMobileMoney(WAVE);
    const net = r.transactions.reduce((s, t) => s + t.amount, 0);
    expect(net).toBe(44_200);
  });
});
