/**
 * Tests de l'auto-génération du Plan Comptable à partir du Grand Livre.
 */
import { describe, it, expect } from 'vitest';
import { generatePlanComptableFromGL, toXlsxRows } from '../services/import/planComptableFromGL';

describe('generatePlanComptableFromGL', () => {
  const sampleGL = [
    { Date: '2026-01-01', Compte: '101000', 'Libellé compte': 'Capital social', Débit: 0, Crédit: 10000000 },
    { Date: '2026-01-01', Compte: '411000', 'Libellé compte': 'Clients', Tiers: 'CLI001', Débit: 2500000, Crédit: 0 },
    { Date: '2026-01-01', Compte: '521000', 'Libellé compte': 'Banque', Débit: 5000000, Crédit: 0 },
    { Date: '2026-01-15', Compte: '411000', Tiers: 'CLI001', Débit: 1180000, Crédit: 0 },
    { Date: '2026-01-15', Compte: '701000', 'Libellé compte': 'Ventes', Débit: 0, Crédit: 1000000 },
    { Date: '2026-01-15', Compte: '443100', 'Libellé compte': 'TVA collectée', Débit: 0, Crédit: 180000 },
  ];

  it('extrait les comptes distincts du GL', () => {
    const result = generatePlanComptableFromGL(sampleGL);
    expect(result.extracted).toBe(5);
    expect(result.accounts.map(a => a.numero).sort()).toEqual([
      '101000', '411000', '443100', '521000', '701000',
    ]);
  });

  it('enrichit les comptes avec le référentiel SYSCOHADA', () => {
    const result = generatePlanComptableFromGL(sampleGL);
    const account = result.accounts.find(a => a.numero === '101000');
    expect(account).toBeDefined();
    expect(account!.classe).toBe(1);
    expect(account!.nature).toBe('PASSIF');
  });

  it('détermine le sens normal des comptes', () => {
    const result = generatePlanComptableFromGL(sampleGL);
    // Classe 1 (capitaux) → créditeur
    expect(result.accounts.find(a => a.numero === '101000')!.sens).toBe('C');
    // Classe 5 (trésorerie) → débiteur
    expect(result.accounts.find(a => a.numero === '521000')!.sens).toBe('D');
    // Classe 7 (produits) → créditeur
    expect(result.accounts.find(a => a.numero === '701000')!.sens).toBe('C');
  });

  it('compte les occurrences de chaque compte', () => {
    const result = generatePlanComptableFromGL(sampleGL);
    const compte411 = result.accounts.find(a => a.numero === '411000');
    expect(compte411!.occurrences).toBe(2);
  });

  it('cumule les totaux débit/crédit par compte', () => {
    const result = generatePlanComptableFromGL(sampleGL);
    const compte411 = result.accounts.find(a => a.numero === '411000');
    expect(compte411!.totalDebit).toBe(3680000); // 2_500_000 + 1_180_000
    expect(compte411!.totalCredit).toBe(0);
  });

  it('marque les comptes avec auxiliaire', () => {
    const result = generatePlanComptableFromGL(sampleGL);
    expect(result.accounts.find(a => a.numero === '411000')!.auxiliaire).toBe(true);
    expect(result.accounts.find(a => a.numero === '521000')!.auxiliaire).toBe(false);
  });

  it('gère un GL vide', () => {
    const result = generatePlanComptableFromGL([]);
    expect(result.extracted).toBe(0);
    expect(result.accounts).toEqual([]);
  });

  it('normalise les numéros de compte (trim espaces)', () => {
    const glWithSpaces = [
      { Compte: '  411000  ', Débit: 1000, Crédit: 0 },
      { Compte: '411000', Débit: 2000, Crédit: 0 },
    ];
    const result = generatePlanComptableFromGL(glWithSpaces);
    expect(result.extracted).toBe(1); // Les deux lignes fusionnent
    expect(result.accounts[0].totalDebit).toBe(3000);
  });

  it('trie les comptes par numéro', () => {
    const glUnordered = [
      { Compte: '701000', Débit: 0, Crédit: 100 },
      { Compte: '101000', Débit: 0, Crédit: 200 },
      { Compte: '411000', Débit: 300, Crédit: 0 },
    ];
    const result = generatePlanComptableFromGL(glUnordered);
    expect(result.accounts.map(a => a.numero)).toEqual(['101000', '411000', '701000']);
  });

  it('convertit en lignes XLSX avec tous les champs', () => {
    const result = generatePlanComptableFromGL(sampleGL);
    const rows = toXlsxRows(result);
    expect(rows).toHaveLength(5);
    const first = rows[0] as Record<string, unknown>;
    expect(first).toHaveProperty('Numéro');
    expect(first).toHaveProperty('Libellé');
    expect(first).toHaveProperty('Classe');
    expect(first).toHaveProperty('Type');
    expect(first).toHaveProperty('Source');
  });

  it('détecte les colonnes insensibles à la casse/accents', () => {
    const glVariants = [
      { COMPTE: '411000', DEBIT: 1000, CREDIT: 0 }, // casse MAJ
      { CompteNum: '521000', Debit: 0, Credit: 500 }, // alias
    ];
    const result = generatePlanComptableFromGL(glVariants);
    expect(result.extracted).toBe(2);
  });
});
