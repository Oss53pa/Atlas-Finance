/**
 * Service de calcul des positions bancaires — dynamique depuis les écritures comptables.
 * Conforme SYSCOHADA : solde = Σ mouvements validés sur comptes 52x/53x/54x.
 */
import type { DataAdapter } from '@atlas/data';
import { money } from '../../utils/money';

export interface BankPosition {
  accountCode: string;
  accountName: string;
  soldeComptable: number;
}

/**
 * Calcule les soldes bancaires dynamiquement depuis les écritures comptables validées.
 * SYSCOHADA art. 17 : solde = somme des mouvements validés.
 */
export async function getSoldesBancaires(adapter: DataAdapter): Promise<BankPosition[]> {
  const entries = await adapter.getAll('journalEntries');
  const accounts = await adapter.getAll('accounts');
  const accountNames = new Map(accounts.map((a: any) => [a.code, a.name]));
  const soldes = new Map<string, number>();

  for (const entry of entries) {
    if (entry.status !== 'validated' && entry.status !== 'posted') continue;
    for (const line of (entry as any).lines) {
      // Comptes de trésorerie SYSCOHADA : 52x (banques), 53x (caisse), 54x (régies)
      if (!line.accountCode.startsWith('52') && !line.accountCode.startsWith('53') && !line.accountCode.startsWith('54')) continue;
      const current = soldes.get(line.accountCode) || 0;
      soldes.set(line.accountCode, current + line.debit - line.credit);
    }
  }

  return Array.from(soldes.entries()).map(([code, solde]) => ({
    accountCode: code,
    accountName: accountNames.get(code) || code,
    soldeComptable: solde,
  }));
}
