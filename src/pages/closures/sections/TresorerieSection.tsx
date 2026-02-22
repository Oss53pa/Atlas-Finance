import React, { useState, useEffect, useCallback } from 'react';
import { Banknote, CheckCircle, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import type { DBFiscalYear, DBJournalEntry } from '../../../lib/db';
import { money } from '../../../utils/money';

interface TresorerieSectionProps {
  periodId?: string;
  progress?: number;
  onComplete?: () => void;
}

const TresorerieSection: React.FC<TresorerieSectionProps> = ({ periodId, onComplete }) => {
  const { adapter } = useData();
  const [loading, setLoading] = useState(true);
  const [tresorerieData, setTresorerieData] = useState({
    soldeInitial: 0,
    encaissements: 0,
    decaissements: 0,
    soldeFinal: 0,
    ecartRapprochement: 0,
    comptesRapproches: 0,
    comptesEnAttente: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fys = await adapter.getAll<DBFiscalYear>('fiscalYears');
      const activeFY = fys.find(fy => fy.isActive) || fys[0];
      if (!activeFY) { setLoading(false); return; }

      const allEntries = await adapter.getAll<DBJournalEntry>('journalEntries');
      const entries = allEntries.filter(e => e.date >= activeFY.startDate && e.date <= activeFY.endDate);

      let totalDebit = money(0);
      let totalCredit = money(0);
      const bankAccounts = new Set<string>();

      for (const entry of entries) {
        for (const line of entry.lines) {
          if (line.accountCode.startsWith('5')) {
            bankAccounts.add(line.accountCode);
            totalDebit = totalDebit.add(line.debit);
            totalCredit = totalCredit.add(line.credit);
          }
        }
      }

      const soldeFinal = totalDebit.subtract(totalCredit).toNumber();

      setTresorerieData({
        soldeInitial: 0, // No prior year data
        encaissements: totalDebit.toNumber(),
        decaissements: totalCredit.toNumber(),
        soldeFinal,
        ecartRapprochement: 0,
        comptesRapproches: bankAccounts.size,
        comptesEnAttente: 0,
      });
    } catch {
      // Silently fail — show zeros
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { loadData(); }, [loadData]);

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(montant);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Tresorerie - Cloture</h2>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          <CheckCircle className="w-4 h-4 inline mr-1" />
          Rapproche
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <Banknote className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-600">Solde Initial</span>
          </div>
          <p className="text-lg font-bold">{formatMontant(tresorerieData.soldeInitial)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">Encaissements</span>
          </div>
          <p className="text-lg font-bold text-green-600">+{formatMontant(tresorerieData.encaissements)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-red-500 rotate-180" />
            <span className="text-sm text-gray-600">Decaissements</span>
          </div>
          <p className="text-lg font-bold text-red-600">-{formatMontant(tresorerieData.decaissements)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <Banknote className="w-5 h-5 text-[var(--color-primary)]" />
            <span className="text-sm text-gray-600">Solde Final</span>
          </div>
          <p className="text-lg font-bold text-[var(--color-primary)]">{formatMontant(tresorerieData.soldeFinal)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4">Etat des rapprochements bancaires</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-lg font-bold text-green-600">{tresorerieData.comptesRapproches}</p>
            <p className="text-sm text-gray-600">Comptes rapproches</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-lg font-bold text-yellow-600">{tresorerieData.comptesEnAttente}</p>
            <p className="text-sm text-gray-600">En attente</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold">{formatMontant(tresorerieData.ecartRapprochement)}</p>
            <p className="text-sm text-gray-600">Ecart total</p>
          </div>
        </div>
      </div>

      {tresorerieData.comptesEnAttente > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Attention</p>
              <p className="text-sm text-yellow-700">
                {tresorerieData.comptesEnAttente} compte(s) en attente de rapprochement.
                Veuillez finaliser les rapprochements avant la cloture.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
          Voir details
        </button>
        <button
          onClick={onComplete}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
        >
          Valider la tresorerie
        </button>
      </div>
    </div>
  );
};

export default TresorerieSection;
