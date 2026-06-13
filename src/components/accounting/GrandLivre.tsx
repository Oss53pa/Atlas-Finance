import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '@/utils/formatters';
import { buildPieceNumbers, pieceNumberOf } from '../../utils/pieceNumber';
import PeriodSelectorModal from '../shared/PeriodSelectorModal';
import {
  ChevronDown, ChevronRight, FileText, Calendar, Filter,
  Printer, Download, Search, Calculator, BookOpen,
  TrendingUp, TrendingDown, Eye, EyeOff, List, Layers, RefreshCw
} from 'lucide-react';

interface AccountEntry {
  date: string;
  piece: string;
  journal: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
}

interface Account {
  code: string;
  libelle: string;
  entries: AccountEntry[];
  totalDebit: number;
  totalCredit: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
  isExpanded: boolean;
}

const GrandLivre: React.FC = () => {
  const { t } = useLanguage();
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: `${new Date().getFullYear()}-01-01`, end: `${new Date().getFullYear()}-12-31` });
  const [searchAccount, setSearchAccount] = useState('');
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [sortBy, setSortBy] = useState<'date' | 'compte' | 'montant'>('date');

  // Écritures réelles chargées via l'adapter (plus de données mockées).
  const { adapter } = useData();
  const [rawEntries, setRawEntries] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const entries = await adapter.getAll<any>('journalEntries');
        // En SaaS l'adapter injecte déjà entry.lines ; sinon on recolle depuis journalLines.
        let withLines = entries;
        if (entries.some((e: any) => !Array.isArray(e.lines) || e.lines.length === 0)) {
          try {
            const lines = await adapter.getAll<any>('journalLines');
            const byEntry = new Map<string, any[]>();
            for (const l of lines) {
              const k = l.entryId || l.entry_id;
              if (!k) continue;
              if (!byEntry.has(k)) byEntry.set(k, []);
              byEntry.get(k)!.push(l);
            }
            withLines = entries.map((e: any) => ({
              ...e,
              lines: byEntry.get(e.id) ?? (Array.isArray(e.lines) ? e.lines : []),
            }));
          } catch { /* garder entry.lines */ }
        }
        if (alive) setRawEntries(withLines);
      } catch {
        if (alive) setRawEntries([]);
      }
    })();
    return () => { alive = false; };
  }, [adapter]);

  // Comptes du Grand Livre construits à partir des écritures réelles.
  const accounts: Account[] = useMemo(() => {
    const pieceNumbers = buildPieceNumbers(rawEntries);
    const map = new Map<string, Account>();
    for (const e of rawEntries) {
      const d: string = e.date || '';
      if (dateRange.start && d < dateRange.start) continue;
      if (dateRange.end && d > dateRange.end) continue;
      const lines = Array.isArray(e.lines) ? e.lines : [];
      for (const l of lines) {
        const code = l.accountCode || l.account_code;
        if (!code) continue;
        let a = map.get(code);
        if (!a) {
          a = { code, libelle: l.accountName || l.account_name || code, entries: [], totalDebit: 0, totalCredit: 0, soldeDebiteur: 0, soldeCrediteur: 0, isExpanded: false };
          map.set(code, a);
        }
        const debit = Number(l.debit ?? 0);
        const credit = Number(l.credit ?? 0);
        a.totalDebit += debit;
        a.totalCredit += credit;
        let dateAff = d;
        try { dateAff = d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR') : ''; } catch { dateAff = d; }
        a.entries.push({
          date: dateAff,
          piece: pieceNumberOf(e, pieceNumbers),
          journal: (e.journal || '').toString().toUpperCase(),
          libelle: l.label || e.label || '',
          debit,
          credit,
          solde: a.totalDebit - a.totalCredit,
        });
      }
    }
    const list = Array.from(map.values());
    for (const a of list) {
      const solde = a.totalDebit - a.totalCredit;
      a.soldeDebiteur = solde > 0 ? solde : 0;
      a.soldeCrediteur = solde < 0 ? -solde : 0;
      a.isExpanded = expanded.has(a.code);
    }
    return list.sort((x, y) => x.code.localeCompare(y.code));
  }, [rawEntries, dateRange, expanded]);

  const toggleAccount = (code: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const toggleAllAccounts = (expand: boolean) => {
    setExpanded(expand ? new Set(accounts.map(a => a.code)) : new Set<string>());
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.code.includes(searchAccount) ||
                         account.libelle.toLowerCase().includes(searchAccount.toLowerCase());
    const hasBalance = showZeroBalance || account.soldeDebiteur > 0 || account.soldeCrediteur > 0;
    return matchesSearch && hasBalance;
  });

  const formatAmount = (amount: number) => {
    return formatCurrency(amount);
  };

  // Calcul des totaux généraux
  const totals = filteredAccounts.reduce((acc, account) => ({
    totalDebit: acc.totalDebit + account.totalDebit,
    totalCredit: acc.totalCredit + account.totalCredit,
    soldeDebiteur: acc.soldeDebiteur + account.soldeDebiteur,
    soldeCrediteur: acc.soldeCrediteur + account.soldeCrediteur
  }), { totalDebit: 0, totalCredit: 0, soldeDebiteur: 0, soldeCrediteur: 0 });

  return (
    <div className="p-6 space-y-6 bg-[var(--color-surface-hover)] min-h-screen">
      {/* En-tête */}
      <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-6 h-6 text-[var(--color-primary)]" />
            <div>
              <h2 className="text-lg font-bold text-[var(--color-primary)]">{t('accounting.generalLedger')}</h2>
              <p className="text-sm text-[var(--color-primary)]/70">Vue détaillée des mouvements par compte</p>
            </div>
          </div>

          {/* BOUTONS DE MODE D'AFFICHAGE */}
          <div className="flex items-center space-x-4">
            <div className="flex bg-[var(--color-border)] rounded-lg p-1">
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'grouped'
                    ? 'bg-[var(--color-text-secondary)] text-white'
                    : 'text-[var(--color-primary)]/70 hover:bg-[var(--color-border)]'
                }`}
              >
                Groupé
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--color-text-secondary)] text-white'
                    : 'text-[var(--color-primary)]/70 hover:bg-[var(--color-border)]'
                }`}
              >
                Liste
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors flex items-center space-x-2" aria-label="Imprimer">
                <Printer className="w-4 h-4" />
                <span>{t('common.print')}</span>
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2" aria-label="Télécharger">
                <Download className="w-4 h-4" />
                <span>{t('common.export')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)]">
        {/* Filtres de période et recherche */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">Période</label>
            <button
              onClick={() => setShowPeriodModal(true)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] text-left flex items-center justify-between hover:bg-gray-50"
            >
              <span className="text-sm">
                {dateRange.start && dateRange.end
                  ? `Du ${new Date(dateRange.start).toLocaleDateString('fr-FR')} au ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                  : 'Sélectionner une période'
                }
              </span>
              <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">Rechercher compte</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-primary)]/50" />
              <input
                type="text"
                value={searchAccount}
                onChange={(e) => setSearchAccount(e.target.value)}
                placeholder="Code ou libellé..."
                className="w-full pl-10 pr-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
          <div className="flex items-end space-x-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showZeroBalance}
                onChange={(e) => setShowZeroBalance(e.target.checked)}
                className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <span className="text-sm text-[var(--color-primary)]/70">Afficher soldes nuls</span>
            </label>
          </div>
        </div>

        {/* Statistiques */}
        <div className="flex items-center justify-end mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="text-sm text-[var(--color-primary)]/70">
            {filteredAccounts.length} compte(s) - {
              filteredAccounts.reduce((total, acc) => total + acc.entries.length, 0)
            } écriture(s)
          </div>
        </div>
      </div>

      {/* Affichage selon le mode sélectionné */}
      {viewMode === 'grouped' ? (
        // Mode groupé par compte
        <div className="space-y-4">
          {/* Comptes groupés */}
          {filteredAccounts.map((account) => (
          <div key={account.code} className="bg-[var(--color-surface-hover)] rounded-lg border border-[var(--color-border)] overflow-hidden">
            {/* En-tête du compte */}
            <div
              className="px-4 py-3 bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-primary)]/15 cursor-pointer hover:bg-[var(--color-primary)]/20 transition-colors"
              onClick={() => toggleAccount(account.code)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]" aria-label="Ouvrir le menu">
                    {account.isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[var(--color-text-secondary)]">{account.code}</span>
                      <span className="font-semibold text-[var(--color-primary)]">{account.libelle}</span>
                    </div>
                    <div className="text-xs text-[var(--color-primary)]/70 mt-1">
                      {account.entries.length} mouvement(s)
                    </div>
                  </div>
                </div>

                {/* Totaux du compte */}
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-right">
                    <p className="text-xs text-[var(--color-primary)]/70">Total Débit</p>
                    <p className="font-semibold text-red-600">{formatAmount(account.totalDebit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--color-text-tertiary)]">Total Crédit</p>
                    <p className="font-semibold text-green-600">{formatAmount(account.totalCredit)}</p>
                  </div>
                  <div className="text-right min-w-[120px]">
                    <p className="text-xs text-[var(--color-text-tertiary)]">{t('accounting.balance')}</p>
                    {account.soldeDebiteur > 0 ? (
                      <p className="font-bold text-red-600">D: {formatAmount(account.soldeDebiteur)}</p>
                    ) : (
                      <p className="font-bold text-green-600">C: {formatAmount(account.soldeCrediteur)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Détail des écritures */}
            {account.isExpanded && (
              <div className="border-t border-[var(--color-border)] max-h-[400px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-xs text-[var(--color-text-tertiary)]">
                      <th className="px-4 py-2 text-left font-medium">{t('common.date')}</th>
                      <th className="px-4 py-2 text-left font-medium">{t('accounting.piece')}</th>
                      <th className="px-4 py-2 text-left font-medium">{t('accounting.journal')}</th>
                      <th className="px-4 py-2 text-left font-medium">{t('accounting.label')}</th>
                      <th className="px-4 py-2 text-right font-medium">{t('accounting.debit')}</th>
                      <th className="px-4 py-2 text-right font-medium">{t('accounting.credit')}</th>
                      <th className="px-4 py-2 text-right font-medium">{t('accounting.balance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {account.entries.map((entry, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs">{entry.date}</td>
                        <td className="px-4 py-2 text-xs font-mono">{entry.piece}</td>
                        <td className="px-4 py-2 text-xs font-bold text-[var(--color-text-secondary)]">{entry.journal}</td>
                        <td className="px-4 py-2 text-xs">{entry.libelle}</td>
                        <td className="px-4 py-2 text-xs text-right text-red-600">
                          {entry.debit > 0 ? formatAmount(entry.debit) : '-'}
                        </td>
                        <td className="px-4 py-2 text-xs text-right text-green-600">
                          {entry.credit > 0 ? formatAmount(entry.credit) : '-'}
                        </td>
                        <td className="px-4 py-2 text-xs text-right font-medium">
                          {entry.solde > 0 ? (
                            <span className="text-red-600">{formatAmount(Math.abs(entry.solde))}</span>
                          ) : entry.solde < 0 ? (
                            <span className="text-green-600">{formatAmount(Math.abs(entry.solde))}</span>
                          ) : (
                            <span className="text-gray-700">0,00</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {/* Ligne de total du compte */}
                    <tr className="bg-[var(--color-primary)]/10 font-semibold">
                      <td colSpan={4} className="px-4 py-2 text-sm text-[var(--color-primary)]">
                        Total compte {account.code}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-red-600">
                        {formatAmount(account.totalDebit)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-green-600">
                        {formatAmount(account.totalCredit)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        {account.soldeDebiteur > 0 ? (
                          <span className="text-red-600">D: {formatAmount(account.soldeDebiteur)}</span>
                        ) : (
                          <span className="text-green-600">C: {formatAmount(account.soldeCrediteur)}</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
          ))}
        </div>
      ) : (
        // Mode liste chronologique
        <div className="bg-[var(--color-surface-hover)] rounded-lg border-2 border-[var(--color-text-secondary)] overflow-hidden shadow-lg h-[600px] flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-primary)] sticky top-0 z-10">
              <tr className="text-xs text-[var(--color-surface-hover)]">
                <th className="px-4 py-3 text-left font-medium">{t('common.date')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('accounting.piece')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('accounting.journal')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('accounting.account')}</th>
                <th className="px-4 py-3 text-left font-medium">Libellé compte</th>
                <th className="px-4 py-3 text-left font-medium">{t('accounting.label')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('accounting.debit')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('accounting.credit')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('accounting.balance')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredAccounts.flatMap(account =>
                account.entries.map((entry, index) => (
                  <tr key={`${account.code}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs">{entry.date}</td>
                    <td className="px-4 py-2 text-xs font-mono">{entry.piece}</td>
                    <td className="px-4 py-2 text-xs font-bold text-[var(--color-text-secondary)]">{entry.journal}</td>
                    <td className="px-4 py-2 text-xs font-mono text-[var(--color-primary)] font-semibold">{account.code}</td>
                    <td className="px-4 py-2 text-xs">{account.libelle}</td>
                    <td className="px-4 py-2 text-xs">{entry.libelle}</td>
                    <td className="px-4 py-2 text-xs text-right text-red-600">
                      {entry.debit > 0 ? formatAmount(entry.debit) : '-'}
                    </td>
                    <td className="px-4 py-2 text-xs text-right text-green-600">
                      {entry.credit > 0 ? formatAmount(entry.credit) : '-'}
                    </td>
                    <td className="px-4 py-2 text-xs text-right font-medium">
                      {entry.solde > 0 ? (
                        <span className="text-red-600">{formatAmount(Math.abs(entry.solde))}</span>
                      ) : entry.solde < 0 ? (
                        <span className="text-green-600">{formatAmount(Math.abs(entry.solde))}</span>
                      ) : (
                        <span className="text-gray-700">0,00</span>
                      )}
                    </td>
                  </tr>
                ))
              ).sort((a, b) => {
                if (sortBy === 'date') return 0; // Déjà trié par date dans les données
                if (sortBy === 'compte') return 0; // À implémenter
                if (sortBy === 'montant') return 0; // À implémenter
                return 0;
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Totaux généraux */}
      <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border-2 border-[var(--color-text-secondary)]">
        <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-3 flex items-center">
          <Calculator className="w-5 h-5 mr-2 text-[var(--color-text-secondary)]" />
          Totaux généraux
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-[var(--color-primary)]/70">Total Débits</p>
            <p className="text-lg font-bold text-red-600">{formatAmount(totals.totalDebit)}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-[var(--color-primary)]/70">Total Crédits</p>
            <p className="text-lg font-bold text-green-600">{formatAmount(totals.totalCredit)}</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-[var(--color-primary)]/70">Solde Débiteur</p>
            <p className="text-lg font-bold text-orange-600">{formatAmount(totals.soldeDebiteur)}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-[var(--color-primary)]/70">Solde Créditeur</p>
            <p className="text-lg font-bold text-blue-600">{formatAmount(totals.soldeCrediteur)}</p>
          </div>
        </div>
      </div>

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(range) => setDateRange(range)}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default GrandLivre;