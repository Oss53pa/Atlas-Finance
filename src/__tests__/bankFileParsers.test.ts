/**
 * Vague C (C1) — parseurs de relevés bancaires standards.
 *
 * Convention de signe vérifiée partout : montant positif = crédit banque
 * (entrée), négatif = débit banque (sortie).
 */

import { describe, it, expect } from 'vitest';
import {
  detectBankFormat,
  parseBankFile,
  parseMT940,
  parseCAMT053,
  parseOFX,
} from '../services/treasury/bankFileParsers';

// ============================================================================
// Échantillons réalistes
// ============================================================================

const MT940 = [
  ':20:RELEVE001',
  ':25:CI0080001234567890',
  ':28C:00001/001',
  ':60F:C260701XOF1000000,00',
  ':61:2607020702C500000,00NTRFREF12345//BNK001',
  ':86:VIREMENT RECU CLIENT ALPHA',
  ':61:2607030703D150000,00NCHKREF67890//BNK002',
  ':86:PAIEMENT FOURNISSEUR BETA',
  ':62F:C260731XOF1350000,00',
  '',
].join('\r\n');

const CAMT053 = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">
  <BkToCstmrStmt>
    <Stmt>
      <Acct><Id><IBAN>CI0080001234567890</IBAN></Id><Ccy>XOF</Ccy></Acct>
      <Bal><Tp><CdOrPrtry><Cd>OPBD</Cd></CdOrPrtry></Tp><Amt Ccy="XOF">1000000.00</Amt><CdtDbtInd>CRDT</CdtDbtInd></Bal>
      <Bal><Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp><Amt Ccy="XOF">1350000.00</Amt><CdtDbtInd>CRDT</CdtDbtInd></Bal>
      <Ntry>
        <Amt Ccy="XOF">500000.00</Amt><CdtDbtInd>CRDT</CdtDbtInd>
        <BookgDt><Dt>2026-07-02</Dt></BookgDt><ValDt><Dt>2026-07-02</Dt></ValDt>
        <AcctSvcrRef>BNK001</AcctSvcrRef>
        <NtryDtls><TxDtls><RmtInf><Ustrd>VIREMENT RECU CLIENT ALPHA</Ustrd></RmtInf></TxDtls></NtryDtls>
      </Ntry>
      <Ntry>
        <Amt Ccy="XOF">150000.00</Amt><CdtDbtInd>DBIT</CdtDbtInd>
        <BookgDt><Dt>2026-07-03</Dt></BookgDt><ValDt><Dt>2026-07-03</Dt></ValDt>
        <AcctSvcrRef>BNK002</AcctSvcrRef>
        <NtryDtls><TxDtls><RmtInf><Ustrd>PAIEMENT FOURNISSEUR BETA</Ustrd></RmtInf></TxDtls></NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

const OFX = `OFXHEADER:100
DATA:OFXSGML
<OFX>
 <BANKMSGSRSV1><STMTTRNRS><STMTRS>
  <CURDEF>XOF</CURDEF>
  <BANKACCTFROM><ACCTID>1234567890</ACCTID></BANKACCTFROM>
  <BANKTRANLIST>
   <STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260702<TRNAMT>500000.00<FITID>BNK001<NAME>CLIENT ALPHA<MEMO>VIREMENT RECU</STMTTRN>
   <STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260703<TRNAMT>-150000.00<FITID>BNK002<NAME>FOURNISSEUR BETA</STMTTRN>
  </BANKTRANLIST>
  <LEDGERBAL><BALAMT>1350000.00<DTASOF>20260731</LEDGERBAL>
 </STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

// ============================================================================
// Auto-détection
// ============================================================================

describe('détection de format', () => {
  it('reconnaît MT940, CAMT.053 et OFX par leur contenu', () => {
    expect(detectBankFormat(MT940)).toBe('mt940');
    expect(detectBankFormat(CAMT053)).toBe('camt053');
    expect(detectBankFormat(OFX)).toBe('ofx');
  });

  it('reconnaît le CSV par son contenu à séparateurs', () => {
    expect(detectBankFormat('date;libelle;montant\n2026-07-01;X;100')).toBe('csv');
  });

  it('se rabat sur l’extension quand le contenu est ambigu', () => {
    expect(detectBankFormat('donnees brutes', 'releve.ofx')).toBe('ofx');
    expect(detectBankFormat('donnees brutes', 'releve.xml')).toBe('camt053');
  });
});

// ============================================================================
// MT940
// ============================================================================

describe('MT940', () => {
  const r = parseMT940(MT940);

  it('extrait compte, devise et soldes', () => {
    expect(r.account).toBe('CI0080001234567890');
    expect(r.currency).toBe('XOF');
    expect(r.openingBalance).toBe(1_000_000);
    expect(r.closingBalance).toBe(1_350_000);
  });

  it('parse les lignes avec le bon signe (C = crédit banque positif)', () => {
    expect(r.transactions).toHaveLength(2);
    expect(r.transactions[0].amount).toBe(500_000);   // crédit
    expect(r.transactions[1].amount).toBe(-150_000);  // débit
  });

  it('rattache le narratif :86: à sa ligne', () => {
    expect(r.transactions[0].label).toContain('CLIENT ALPHA');
    expect(r.transactions[1].label).toContain('FOURNISSEUR BETA');
  });

  it('convertit la virgule décimale et les dates YYMMDD', () => {
    expect(r.transactions[0].date).toBe('2026-07-02');
    expect(r.transactions[0].valueDate).toBe('2026-07-02');
  });

  it('boucle bilancielle : ouverture + Σ mouvements = clôture', () => {
    const sum = r.transactions.reduce((s, t) => s + t.amount, 0);
    expect(r.openingBalance! + sum).toBe(r.closingBalance);
  });
});

// ============================================================================
// CAMT.053
// ============================================================================

describe('CAMT.053', () => {
  const r = parseCAMT053(CAMT053);

  it('extrait compte, devise et soldes OPBD/CLBD', () => {
    expect(r.account).toBe('CI0080001234567890');
    expect(r.currency).toBe('XOF');
    expect(r.openingBalance).toBe(1_000_000);
    expect(r.closingBalance).toBe(1_350_000);
  });

  it('signe selon CdtDbtInd (CRDT positif, DBIT négatif)', () => {
    expect(r.transactions).toHaveLength(2);
    expect(r.transactions[0].amount).toBe(500_000);
    expect(r.transactions[1].amount).toBe(-150_000);
  });

  it('lit le libellé RmtInf/Ustrd et la référence AcctSvcrRef', () => {
    expect(r.transactions[0].label).toBe('VIREMENT RECU CLIENT ALPHA');
    expect(r.transactions[0].reference).toBe('BNK001');
  });

  it('boucle bilancielle cohérente', () => {
    const sum = r.transactions.reduce((s, t) => s + t.amount, 0);
    expect(r.openingBalance! + sum).toBe(r.closingBalance);
  });

  it('rend un warning sur XML mal formé, sans planter', () => {
    const bad = parseCAMT053('<Document><BkToCstmrStmt><Stmt>oops');
    expect(bad.transactions).toHaveLength(0);
    expect(bad.warnings.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// OFX
// ============================================================================

describe('OFX', () => {
  const r = parseOFX(OFX);

  it('parse les transactions SGML sans balises fermées', () => {
    expect(r.transactions).toHaveLength(2);
    expect(r.currency).toBe('XOF');
    expect(r.account).toBe('1234567890');
  });

  it('conserve le signe fourni par TRNAMT', () => {
    expect(r.transactions[0].amount).toBe(500_000);
    expect(r.transactions[1].amount).toBe(-150_000);
  });

  it('compose le libellé depuis NAME et MEMO', () => {
    expect(r.transactions[0].label).toContain('CLIENT ALPHA');
    expect(r.transactions[0].label).toContain('VIREMENT RECU');
    expect(r.transactions[0].reference).toBe('BNK001');
  });

  it('lit le solde de clôture LEDGERBAL', () => {
    expect(r.closingBalance).toBe(1_350_000);
  });
});

// ============================================================================
// Point d'entrée unique
// ============================================================================

describe('parseBankFile', () => {
  it('dispatche vers le bon parseur et remonte le format', () => {
    expect(parseBankFile(MT940).format).toBe('mt940');
    expect(parseBankFile(CAMT053).format).toBe('camt053');
    expect(parseBankFile(OFX).format).toBe('ofx');
  });

  it('produit un BankTransaction[] uniforme quel que soit le format', () => {
    const a = parseBankFile(MT940).transactions;
    const b = parseBankFile(CAMT053).transactions;
    // Mêmes montants signés depuis deux formats décrivant le même relevé.
    expect(a.map(t => t.amount)).toEqual(b.map(t => t.amount));
  });

  it('signale un format inconnu sans lever', () => {
    const r = parseBankFile('\x00\x01 binaire', 'x.bin');
    expect(r.format).toBe('unknown');
    expect(r.transactions).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
