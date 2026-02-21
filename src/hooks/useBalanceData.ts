import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/db';

export interface BalanceData {
  compte: string;
  libelle: string;
  debitPrecedent: number;
  creditPrecedent: number;
  debitMouvement: number;
  creditMouvement: number;
  debitSolde: number;
  creditSolde: number;
  type: 'actif' | 'passif' | 'charges' | 'produits';
  centreCout?: string;
  dernierMouvement?: Date;
  devise: string;
  tiers?: string;
}

export interface BalanceFilters {
  dateDebut: string;
  dateFin: string;
  compteMin: string;
  compteMax: string;
  tiers: string;
  centreCout: string;
  devise: string;
  montantMin: string;
  montantMax: string;
  onlyMovement: boolean;
  onlyUnbalanced: boolean;
  typeBalance: 'generale' | 'auxiliaires' | 'analytique';
}

export interface BalanceIndicators {
  totalDebit: number;
  totalCredit: number;
  equilibre: number;
  tauxEquilibre: number;
  actif: number;
  passif: number;
  charges: number;
  produits: number;
  comptesActifs: number;
  comptesNonLettres: number;
  tauxRapprochement: number;
}

function getAccountType(code: string): 'actif' | 'passif' | 'charges' | 'produits' {
  const cls = code.charAt(0);
  if (cls === '6' || cls === '8') return 'charges';
  if (cls === '7') return 'produits';
  if (cls === '2' || cls === '3' || cls === '5') return 'actif';
  if (cls === '1') return 'passif';
  // Classe 4: depends on normal balance
  if (code.startsWith('40') || code.startsWith('42') || code.startsWith('43') || code.startsWith('44')) return 'passif';
  if (code.startsWith('41') || code.startsWith('45') || code.startsWith('46') || code.startsWith('47')) return 'actif';
  return 'actif';
}

export const useBalanceData = (filters: BalanceFilters) => {
  const [data, setData] = useState<BalanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const entries = await db.journalEntries.toArray();
        const accounts = await db.accounts.toArray();

        // Build account name map
        const accountNames = new Map<string, string>();
        for (const a of accounts) {
          accountNames.set(a.code, a.name);
        }

        // Accumulate movements by account
        const movements = new Map<string, {
          debit: number; credit: number; name: string;
          analyticalCode?: string; tiers?: string;
        }>();

        for (const entry of entries) {
          if (entry.date < filters.dateDebut || entry.date > filters.dateFin) continue;

          for (const line of entry.lines) {
            const existing = movements.get(line.accountCode) || {
              debit: 0, credit: 0,
              name: line.accountName || accountNames.get(line.accountCode) || line.accountCode,
              analyticalCode: line.analyticalCode,
              tiers: line.thirdPartyName,
            };
            existing.debit += line.debit;
            existing.credit += line.credit;
            if (line.thirdPartyName) existing.tiers = line.thirdPartyName;
            if (line.analyticalCode) existing.analyticalCode = line.analyticalCode;
            movements.set(line.accountCode, existing);
          }
        }

        // Convert to BalanceData array
        const result: BalanceData[] = [];
        for (const [code, mov] of movements) {
          const type = getAccountType(code);
          const soldeNet = mov.debit - mov.credit;
          result.push({
            compte: code,
            libelle: mov.name,
            debitPrecedent: 0,
            creditPrecedent: 0,
            debitMouvement: mov.debit,
            creditMouvement: mov.credit,
            debitSolde: soldeNet > 0 ? soldeNet : 0,
            creditSolde: soldeNet < 0 ? Math.abs(soldeNet) : 0,
            type,
            centreCout: mov.analyticalCode,
            devise: 'XAF',
            tiers: mov.tiers,
          });
        }

        result.sort((a, b) => a.compte.localeCompare(b.compte));

        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [filters.dateDebut, filters.dateFin]);

  // Filtrage
  const filteredData = useMemo(() => {
    let filtered = [...data];

    if (filters.compteMin) {
      filtered = filtered.filter(item => item.compte >= filters.compteMin);
    }
    if (filters.compteMax) {
      filtered = filtered.filter(item => item.compte <= filters.compteMax);
    }
    if (filters.centreCout) {
      filtered = filtered.filter(item => item.centreCout === filters.centreCout);
    }
    if (filters.devise && filters.devise !== 'ALL') {
      filtered = filtered.filter(item => item.devise === filters.devise);
    }
    if (filters.onlyMovement) {
      filtered = filtered.filter(item => item.debitMouvement > 0 || item.creditMouvement > 0);
    }
    if (filters.onlyUnbalanced) {
      filtered = filtered.filter(item => Math.abs(item.debitSolde - item.creditSolde) > 0);
    }

    return filtered;
  }, [data, filters]);

  // Indicateurs
  const indicators: BalanceIndicators = useMemo(() => {
    const totalDebit = filteredData.reduce((sum, item) => sum + item.debitSolde, 0);
    const totalCredit = filteredData.reduce((sum, item) => sum + item.creditSolde, 0);
    const equilibre = Math.abs(totalDebit - totalCredit);
    const tauxEquilibre = totalCredit > 0 ? ((totalCredit - equilibre) / totalCredit) * 100 : 0;

    const actif = filteredData.filter(item => item.type === 'actif').reduce((sum, item) => sum + item.debitSolde - item.creditSolde, 0);
    const passif = filteredData.filter(item => item.type === 'passif').reduce((sum, item) => sum + item.creditSolde - item.debitSolde, 0);
    const charges = filteredData.filter(item => item.type === 'charges').reduce((sum, item) => sum + item.debitSolde, 0);
    const produits = filteredData.filter(item => item.type === 'produits').reduce((sum, item) => sum + item.creditSolde, 0);

    const comptesActifs = filteredData.filter(item => item.debitSolde > 0 || item.creditSolde > 0).length;
    const comptesNonLettres = filteredData.filter(item => item.tiers && Math.abs(item.debitSolde - item.creditSolde) > 0).length;
    const tauxRapprochement = comptesActifs > 0 ? Math.round(((comptesActifs - comptesNonLettres) / comptesActifs) * 100) : 100;

    return {
      totalDebit, totalCredit, equilibre, tauxEquilibre,
      actif, passif, charges, produits,
      comptesActifs, comptesNonLettres, tauxRapprochement
    };
  }, [filteredData]);

  const dataByType = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = { totalDebit: 0, totalCredit: 0, soldeNet: 0 };
      }
      acc[item.type].totalDebit += item.debitSolde;
      acc[item.type].totalCredit += item.creditSolde;
      acc[item.type].soldeNet += (item.debitSolde - item.creditSolde);
      return acc;
    }, {} as Record<string, { totalDebit: number; totalCredit: number; soldeNet: number }>);

    return Object.entries(grouped).map(([type, values]) => ({
      type,
      ...values
    }));
  }, [filteredData]);

  const exportToCSV = () => {
    const header = 'Compte,Libellé,Débit Solde,Crédit Solde\n';
    const csvContent = header + filteredData.map(item =>
      `${item.compte},"${item.libelle}",${item.debitSolde},${item.creditSolde}`
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return {
    data: filteredData,
    loading,
    error,
    indicators,
    dataByType,
    exportToExcel: () => {},
    exportToPDF: () => {},
    exportToCSV
  };
};
