import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle, TrendingUp, TrendingDown, AlertCircle, Loader2 } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import type { DBFiscalYear, DBJournalEntry } from '../../../lib/db';
import { formatCurrency } from '../../../utils/formatters';

interface CycleGestionSectionProps {
  periodId?: string;
  onComplete?: () => void;
}

interface GestionData {
  totalCharges: number;
  totalProduits: number;
  resultat: number;
  chargesDetail: { prefix: string; label: string; total: number }[];
  produitsDetail: { prefix: string; label: string; total: number }[];
}

const CHARGES_CLASSES = [
  { prefix: '60', label: 'Achats' },
  { prefix: '61', label: 'Transports' },
  { prefix: '62', label: 'Services extérieurs' },
  { prefix: '63', label: 'Autres services extérieurs' },
  { prefix: '64', label: 'Impôts et taxes' },
  { prefix: '65', label: 'Autres charges' },
  { prefix: '66', label: 'Charges de personnel' },
  { prefix: '67', label: 'Charges financières' },
  { prefix: '68', label: 'Dotations aux amort./provisions' },
  { prefix: '69', label: 'Dotations HAO / Impôt' },
];

const PRODUITS_CLASSES = [
  { prefix: '70', label: 'Ventes' },
  { prefix: '71', label: 'Production stockée' },
  { prefix: '72', label: 'Production immobilisée' },
  { prefix: '73', label: 'Variations de stocks' },
  { prefix: '75', label: 'Autres produits' },
  { prefix: '77', label: 'Produits financiers' },
  { prefix: '78', label: 'Reprises amort./provisions' },
  { prefix: '79', label: 'Reprises HAO' },
];

const CycleGestionSection: React.FC<CycleGestionSectionProps> = ({ periodId, onComplete }) => {
  const { adapter } = useData();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GestionData | null>(null);
  const [fiscalYear, setFiscalYear] = useState<DBFiscalYear | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const fys = await adapter.getAll<DBFiscalYear>('fiscalYears');
        const fy = (periodId ? fys.find(f => f.id === periodId) : fys.find(f => f.isActive)) || fys[0];
        if (!fy) { setLoading(false); return; }
        setFiscalYear(fy);

        const allEntries = await adapter.getAll<DBJournalEntry>('journalEntries');
        const entries = allEntries.filter(e => e.date >= fy.startDate && e.date <= fy.endDate);

        const computeTotal = (prefix: string): number => {
          let total = 0;
          for (const entry of entries) {
            if (entry.status === 'draft') continue;
            for (const line of entry.lines) {
              if (line.accountCode.startsWith(prefix)) {
                // Charges: solde débiteur; Produits: solde créditeur
                total += (line.debit || 0) - (line.credit || 0);
              }
            }
          }
          return total;
        };

        const chargesDetail = CHARGES_CLASSES.map(c => ({
          ...c,
          total: computeTotal(c.prefix),
        })).filter(c => c.total !== 0);

        const produitsDetail = PRODUITS_CLASSES.map(p => ({
          ...p,
          total: -computeTotal(p.prefix), // Produits have credit-side balances
        })).filter(p => p.total !== 0);

        const totalCharges = chargesDetail.reduce((s, c) => s + c.total, 0);
        const totalProduits = produitsDetail.reduce((s, p) => s + p.total, 0);

        setData({
          totalCharges,
          totalProduits,
          resultat: totalProduits - totalCharges,
          chargesDetail,
          produitsDetail,
        });
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [periodId, adapter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
        <span className="ml-2 text-[var(--color-text-secondary)]">Chargement du cycle de gestion...</span>
      </div>
    );
  }

  const pct = data && data.totalProduits > 0
    ? Math.round(((data.totalProduits - data.totalCharges) / data.totalProduits) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
          Cycle de Gestion {fiscalYear ? `— ${fiscalYear.name || fiscalYear.code}` : ''}
        </h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          data && data.resultat >= 0
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {data && data.resultat >= 0 ? (
            <><TrendingUp className="w-4 h-4 inline mr-1" />Bénéfice</>
          ) : (
            <><TrendingDown className="w-4 h-4 inline mr-1" />Perte</>
          )}
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Total Produits (Cl. 7)</p>
          <p className="text-lg font-bold text-[var(--color-success)]">
            {formatCurrency(data?.totalProduits || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Total Charges (Cl. 6)</p>
          <p className="text-lg font-bold text-[var(--color-error)]">
            {formatCurrency(data?.totalCharges || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Résultat Net</p>
          <p className={`text-lg font-bold ${data && data.resultat >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
            {formatCurrency(data?.resultat || 0)}
          </p>
        </div>
      </div>

      {/* Charges breakdown */}
      {data && data.chargesDetail.length > 0 && (
        <div className="bg-white rounded-lg p-4 border">
          <h3 className="font-medium mb-3">Détail des Charges</h3>
          <div className="space-y-2">
            {data.chargesDetail.map(c => (
              <div key={c.prefix} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                <span className="text-sm">
                  <span className="font-mono text-[var(--color-text-secondary)] mr-2">{c.prefix}</span>
                  {c.label}
                </span>
                <span className="font-mono text-sm font-medium">{formatCurrency(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Produits breakdown */}
      {data && data.produitsDetail.length > 0 && (
        <div className="bg-white rounded-lg p-4 border">
          <h3 className="font-medium mb-3">Détail des Produits</h3>
          <div className="space-y-2">
            {data.produitsDetail.map(p => (
              <div key={p.prefix} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                <span className="text-sm">
                  <span className="font-mono text-[var(--color-text-secondary)] mr-2">{p.prefix}</span>
                  {p.label}
                </span>
                <span className="font-mono text-sm font-medium">{formatCurrency(p.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No data state */}
      {data && data.chargesDetail.length === 0 && data.produitsDetail.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <AlertCircle className="w-8 h-8 text-[var(--color-text-secondary)] mx-auto mb-2" />
          <p className="text-[var(--color-text-secondary)]">Aucune écriture de gestion sur cet exercice</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-3">Marge nette</h4>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${pct >= 0 ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'}`}
            style={{ width: `${Math.min(Math.abs(pct), 100)}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">{pct}%</p>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={onComplete}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
        >
          <CheckCircle className="w-4 h-4 inline mr-1" />
          Valider
        </button>
      </div>
    </div>
  );
};

export default CycleGestionSection;
