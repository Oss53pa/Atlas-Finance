
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useData } from '../../contexts/DataContext';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';
import { formatCurrency } from '../../utils/formatters';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ──────────── Types ────────────

interface TreasuryPlanLine {
  id: string;
  label: string;
  category: 'encaissement' | 'decaissement';
  amount: number;
  date: string;
  recurrent: boolean;
  frequency?: 'mensuel' | 'trimestriel' | 'annuel';
}

interface TreasuryPlan {
  id: string;
  name: string;
  author: string;
  periode: string;
  startDate: string;
  endDate: string;
  soldeDebut: number;
  encaissements: number;
  decaissements: number;
  soldeFin: number;
  confiance: 'Haute' | 'Moyenne' | 'Faible';
  statut: 'Brouillon' | 'Planifie' | 'En cours' | 'Cloture';
  scenario: 'realiste' | 'optimiste' | 'pessimiste';
  lines: TreasuryPlanLine[];
  createdAt: string;
  updatedAt: string;
}

type Scenario = 'realiste' | 'optimiste' | 'pessimiste';

const SCENARIO_MULTIPLIERS: Record<Scenario, number> = {
  optimiste: 1.3,
  realiste: 1.0,
  pessimiste: 0.7,
};

const SCENARIO_LABELS: Record<Scenario, string> = {
  optimiste: 'Optimiste (+30%)',
  realiste: 'Réaliste',
  pessimiste: 'Pessimiste (-30%)',
};

// ──────────── Helpers ────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function computePlanTotals(plan: TreasuryPlan): TreasuryPlan {
  const enc = plan.lines
    .filter(l => l.category === 'encaissement')
    .reduce((s, l) => s + l.amount, 0);
  const dec = plan.lines
    .filter(l => l.category === 'decaissement')
    .reduce((s, l) => s + l.amount, 0);
  return {
    ...plan,
    encaissements: enc,
    decaissements: dec,
    soldeFin: plan.soldeDebut + enc - dec,
  };
}

// ──────────── Component ────────────

const PrevisionsTresoreriePage: React.FC = () => {
  const { adapter } = useData();
  const [activeTab, setActiveTab] = useState('account_management');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TreasuryPlan | null>(null);
  const [detailPlan, setDetailPlan] = useState<TreasuryPlan | null>(null);
  const [scenario, setScenario] = useState<Scenario>('realiste');
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  // Period selector
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Form state for create/edit
  const [formName, setFormName] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formSoldeDebut, setFormSoldeDebut] = useState(0);
  const [formConfiance, setFormConfiance] = useState<TreasuryPlan['confiance']>('Moyenne');
  const [formStatut, setFormStatut] = useState<TreasuryPlan['statut']>('Brouillon');
  const [formScenario, setFormScenario] = useState<Scenario>('realiste');

  // Line form state (inside detail modal)
  const [newLineLabel, setNewLineLabel] = useState('');
  const [newLineCategory, setNewLineCategory] = useState<'encaissement' | 'decaissement'>('encaissement');
  const [newLineAmount, setNewLineAmount] = useState(0);
  const [newLineDate, setNewLineDate] = useState('');
  const [newLineRecurrent, setNewLineRecurrent] = useState(false);
  const [newLineFrequency, setNewLineFrequency] = useState<'mensuel' | 'trimestriel' | 'annuel'>('mensuel');

  // Data state
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [treasurySettingRaw, setTreasurySettingRaw] = useState<any>(undefined);
  const [forecastSettingRaw, setForecastSettingRaw] = useState<any>(undefined);
  const [treasuryPlansSetting, setTreasuryPlansSetting] = useState<any>(undefined);

  // ──────── Data loading ────────

  const loadData = useCallback(async () => {
    try {
      const [accts, entries, tSetting, fSetting, pSetting] = await Promise.all([
        adapter.getAll('accounts'),
        adapter.getAll('journalEntries'),
        adapter.getById('settings', 'treasury_accounts'),
        adapter.getById('settings', 'treasury_forecasts'),
        adapter.getById('settings', 'treasury_plans'),
      ]);
      setDbAccounts(accts as Record<string, unknown>[]);
      setJournalEntries(entries as Record<string, unknown>[]);
      setTreasurySettingRaw(tSetting);
      setForecastSettingRaw(fSetting);
      setTreasuryPlansSetting(pSetting);
    } catch (err) {
    }
  }, [adapter]);

  useEffect(() => { loadData(); }, [loadData]);

  const treasuryPlans: TreasuryPlan[] = useMemo(
    () => (treasuryPlansSetting ? JSON.parse(treasuryPlansSetting.value) : []),
    [treasuryPlansSetting],
  );

  // ──────── Persistence ────────

  const savePlans = useCallback(async (plans: TreasuryPlan[]) => {
    const existing = await adapter.getById('settings', 'treasury_plans');
    const payload = {
      key: 'treasury_plans',
      value: JSON.stringify(plans),
      updatedAt: new Date().toISOString(),
    };
    if (existing) {
      await adapter.update('settings', 'treasury_plans', payload);
    } else {
      await adapter.create('settings', payload);
    }
    await loadData();
  }, [adapter, loadData]);

  // ──────── Treasury accounts ────────

  const allTreasuryAccounts = useMemo(() => {
    if (treasurySettingRaw) {
      return JSON.parse(treasurySettingRaw.value) as Array<{ number: string; description: string; iban: string; swift: string; amount: number; bank: string }>;
    }
    const treasuryAccts = dbAccounts.filter(a => a.code.startsWith('52') || a.code.startsWith('57'));
    return treasuryAccts.map(acct => {
      let balance = 0;
      journalEntries
        .filter(e => e.status === 'validated' || e.status === 'posted')
        .forEach(entry => {
          entry.lines.forEach((line: any) => {
            if (line.accountCode === acct.code) {
              balance += line.debit - line.credit;
            }
          });
        });
      const bankName = acct.code.startsWith('57') ? 'CAISSE' : acct.name.split(' ')[0]?.toUpperCase() || 'BANQUE';
      return { number: acct.code, description: acct.name, iban: '-', swift: '-', amount: balance, bank: bankName };
    });
  }, [treasurySettingRaw, dbAccounts, journalEntries]);

  // ──────── Future transactions ────────

  const futureTransactions = useMemo(() => {
    if (forecastSettingRaw) {
      return JSON.parse(forecastSettingRaw.value) as Array<{ codeJournal: string; numFacture: string; numPiece: string; docDate: string; transDate: string; glAccount: string; glDescription: string; cashTransaction: string; amount: number; collectionDate: string; accountant: string; bank: string }>;
    }
    const treasuryCodes = new Set(allTreasuryAccounts.map(a => a.number));
    const txns: Array<{ codeJournal: string; numFacture: string; numPiece: string; docDate: string; transDate: string; glAccount: string; glDescription: string; cashTransaction: string; amount: number; collectionDate: string; accountant: string; bank: string }> = [];
    journalEntries
      .filter(e => e.status === 'draft')
      .forEach(entry => {
        entry.lines.forEach((line: any) => {
          if (treasuryCodes.has(line.accountCode)) {
            const amount = line.debit > 0 ? line.debit : -line.credit;
            const matchingAcct = allTreasuryAccounts.find(a => a.number === line.accountCode);
            txns.push({
              codeJournal: entry.journal,
              numFacture: entry.reference,
              numPiece: entry.entryNumber,
              docDate: new Date(entry.date).toLocaleDateString('fr-FR'),
              transDate: new Date(entry.date).toLocaleDateString('fr-FR'),
              glAccount: line.accountCode,
              glDescription: line.label || entry.label,
              cashTransaction: amount >= 0 ? 'IN' : 'OUT',
              amount,
              collectionDate: new Date(entry.date).toLocaleDateString('fr-FR'),
              accountant: entry.createdBy || '',
              bank: matchingAcct?.bank || '',
            });
          }
        });
      });
    return txns;
  }, [forecastSettingRaw, journalEntries, allTreasuryAccounts]);

  // ──────── Selection helpers ────────

  const toggleAccountSelection = (accountNumber: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountNumber) ? prev.filter(a => a !== accountNumber) : [...prev, accountNumber],
    );
  };

  const toggleSelectAll = () => {
    setSelectedAccounts(prev =>
      prev.length === allTreasuryAccounts.length ? [] : allTreasuryAccounts.map(a => a.number),
    );
  };

  const isAllSelected = selectedAccounts.length === allTreasuryAccounts.length && allTreasuryAccounts.length > 0;
  const isIndeterminate = selectedAccounts.length > 0 && selectedAccounts.length < allTreasuryAccounts.length;

  const getFilteredTransactions = () => {
    if (selectedAccounts.length === 0) return [];
    return futureTransactions.filter(t =>
      selectedAccounts.includes(t.glAccount) ||
      selectedAccounts.some(num => {
        const acc = allTreasuryAccounts.find(a => a.number === num);
        return acc && acc.bank === t.bank;
      }),
    );
  };

  const getTotalAmount = () => allTreasuryAccounts.reduce((s, a) => s + a.amount, 0);
  const getFilteredTransactionsTotal = () => getFilteredTransactions().reduce((s, t) => s + t.amount, 0);

  const totalIncoming = useMemo(
    () => getFilteredTransactions().filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [futureTransactions, selectedAccounts, allTreasuryAccounts],
  );
  const totalOutgoing = useMemo(
    () => getFilteredTransactions().filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0),
    [futureTransactions, selectedAccounts, allTreasuryAccounts],
  );

  // ──────── Chart data ────────

  const chartData = useMemo(() => {
    const mult = SCENARIO_MULTIPLIERS[scenario];
    return treasuryPlans.map(p => ({
      name: p.periode,
      encaissements: Math.round(p.encaissements * mult),
      decaissements: Math.round(p.decaissements * mult),
      soldeFin: Math.round((p.soldeDebut + p.encaissements * mult - p.decaissements * mult)),
    }));
  }, [treasuryPlans, scenario]);

  // ──────── KPI helpers (prévision tab) ────────

  const kpiSoldeActuel = getTotalAmount();
  const kpiEncaissements = useMemo(
    () => Math.round(treasuryPlans.reduce((s, p) => s + p.encaissements, 0) * SCENARIO_MULTIPLIERS[scenario]),
    [treasuryPlans, scenario],
  );
  const kpiDecaissements = useMemo(
    () => Math.round(treasuryPlans.reduce((s, p) => s + p.decaissements, 0) * SCENARIO_MULTIPLIERS[scenario]),
    [treasuryPlans, scenario],
  );
  const kpiSoldeProjecte = kpiSoldeActuel + kpiEncaissements - kpiDecaissements;

  // ──────── Export data ────────

  const exportColumns = {
    periode: 'Période',
    soldeDebut: 'Solde Début',
    encaissements: 'Encaissements',
    decaissements: 'Décaissements',
    soldeFin: 'Solde Fin',
    confiance: 'Confiance',
    statut: 'Statut',
    scenario: 'Scénario',
  };

  // ──────── Form helpers ────────

  const resetForm = () => {
    setFormName('');
    setFormAuthor('');
    setFormSoldeDebut(0);
    setFormConfiance('Moyenne');
    setFormStatut('Brouillon');
    setFormScenario('realiste');
    setDateRange({ start: '', end: '' });
    setEditingPlan(null);
  };

  const openEditModal = (plan: TreasuryPlan) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormAuthor(plan.author);
    setFormSoldeDebut(plan.soldeDebut);
    setFormConfiance(plan.confiance);
    setFormStatut(plan.statut);
    setFormScenario(plan.scenario);
    setDateRange({ start: plan.startDate, end: plan.endDate });
    setShowCreatePlanModal(true);
  };

  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateRange.start || !dateRange.end) {
      toast.error('Veuillez sélectionner une période');
      return;
    }

    const periode = `${new Date(dateRange.start).toLocaleDateString('fr-FR')} – ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`;
    const now = new Date().toISOString();

    if (editingPlan) {
      // Update
      const updated: TreasuryPlan = computePlanTotals({
        ...editingPlan,
        name: formName,
        author: formAuthor,
        periode,
        startDate: dateRange.start,
        endDate: dateRange.end,
        soldeDebut: formSoldeDebut,
        confiance: formConfiance,
        statut: formStatut,
        scenario: formScenario,
        updatedAt: now,
      });
      const newPlans = treasuryPlans.map(p => (p.id === updated.id ? updated : p));
      await savePlans(newPlans);
      toast.success('Plan mis à jour avec succès');
    } else {
      // Create
      const newPlan: TreasuryPlan = computePlanTotals({
        id: generateId(),
        name: formName,
        author: formAuthor,
        periode,
        startDate: dateRange.start,
        endDate: dateRange.end,
        soldeDebut: formSoldeDebut,
        encaissements: 0,
        decaissements: 0,
        soldeFin: formSoldeDebut,
        confiance: formConfiance,
        statut: formStatut,
        scenario: formScenario,
        lines: [],
        createdAt: now,
        updatedAt: now,
      });
      await savePlans([...treasuryPlans, newPlan]);
      toast.success('Plan de trésorerie créé avec succès');
    }

    setShowCreatePlanModal(false);
    resetForm();
  };

  const handleDeletePlan = async (planId: string) => {
    const newPlans = treasuryPlans.filter(p => p.id !== planId);
    await savePlans(newPlans);
    setDeletingPlanId(null);
    toast.success('Plan supprimé');
  };

  // ──────── Plan line management ────────

  const resetLineForm = () => {
    setNewLineLabel('');
    setNewLineCategory('encaissement');
    setNewLineAmount(0);
    setNewLineDate('');
    setNewLineRecurrent(false);
    setNewLineFrequency('mensuel');
  };

  const handleAddLine = async () => {
    if (!detailPlan || !newLineLabel || newLineAmount <= 0 || !newLineDate) {
      toast.error('Veuillez remplir tous les champs de la ligne');
      return;
    }
    const newLine: TreasuryPlanLine = {
      id: generateId(),
      label: newLineLabel,
      category: newLineCategory,
      amount: newLineAmount,
      date: newLineDate,
      recurrent: newLineRecurrent,
      frequency: newLineRecurrent ? newLineFrequency : undefined,
    };
    const updatedPlan = computePlanTotals({
      ...detailPlan,
      lines: [...detailPlan.lines, newLine],
      updatedAt: new Date().toISOString(),
    });
    const newPlans = treasuryPlans.map(p => (p.id === updatedPlan.id ? updatedPlan : p));
    await savePlans(newPlans);
    setDetailPlan(updatedPlan);
    resetLineForm();
    toast.success('Ligne ajoutée');
  };

  const handleDeleteLine = async (lineId: string) => {
    if (!detailPlan) return;
    const updatedPlan = computePlanTotals({
      ...detailPlan,
      lines: detailPlan.lines.filter(l => l.id !== lineId),
      updatedAt: new Date().toISOString(),
    });
    const newPlans = treasuryPlans.map(p => (p.id === updatedPlan.id ? updatedPlan : p));
    await savePlans(newPlans);
    setDetailPlan(updatedPlan);
    toast.success('Ligne supprimée');
  };

  // ──────── Render helpers ────────

  const getStatusStyle = (statut: string) => {
    switch (statut) {
      case 'En cours': return 'bg-yellow-100 text-yellow-800';
      case 'Planifie': return 'bg-blue-100 text-blue-800';
      case 'Cloture': return 'bg-gray-200 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfianceStyle = (c: string) => {
    switch (c) {
      case 'Haute': return 'text-green-600';
      case 'Moyenne': return 'text-yellow-600';
      case 'Faible': return 'text-red-600';
      default: return '';
    }
  };

  // ──────────── RENDER ────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Prévisions de Trésorerie</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">Gestion des comptes et planification de trésorerie</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'account_management', label: 'Account Management' },
            { key: 'prevision_tresorerie', label: 'Prévision de trésorerie' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ═══════════ TAB: Account Management ═══════════ */}
      {activeTab === 'account_management' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">Solde total</div>
              <div className="text-xl font-bold text-[var(--color-text-primary)] mt-1">{formatCurrency(getTotalAmount())}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">Nb comptes</div>
              <div className="text-xl font-bold text-[var(--color-text-primary)] mt-1">{allTreasuryAccounts.length}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">Total entrant</div>
              <div className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totalIncoming)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">Total sortant</div>
              <div className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totalOutgoing)}</div>
            </div>
          </div>

          {/* Account table */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Account Management</h3>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Account number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Account description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">IBAN number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Code SWIFT / BIC</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allTreasuryAccounts.map((account, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedAccounts.includes(account.number)}
                          onChange={() => toggleAccountSelection(account.number)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{account.number}</td>
                      <td className="px-4 py-3">{account.description}</td>
                      <td className="px-4 py-3 font-mono text-sm">{account.iban}</td>
                      <td className="px-4 py-3 font-mono text-sm">{account.swift}</td>
                      <td className={`px-4 py-3 text-right font-bold ${account.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(account.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td className="px-4 py-3"></td>
                    <td colSpan={4} className="px-4 py-3 font-bold text-[var(--color-text-primary)]">Total général :</td>
                    <td className={`px-4 py-3 text-right font-bold text-lg ${getTotalAmount() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(getTotalAmount())}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Future transactions table */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Future transaction</h3>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="overflow-x-auto mb-4">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Code journal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">N°facture</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">N° de pièce</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Document date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Transaction date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">GL Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">GL description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Cash transaction</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Transaction amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Collection date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Accountant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getFilteredTransactions().length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-gray-700">
                        {selectedAccounts.length === 0
                          ? 'Sélectionnez des comptes ci-dessus pour voir les événements'
                          : 'Aucun événement pour les comptes sélectionnés'}
                      </td>
                    </tr>
                  ) : (
                    getFilteredTransactions().map((transaction, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{transaction.codeJournal}</td>
                        <td className="px-4 py-3">{transaction.numFacture}</td>
                        <td className="px-4 py-3">{transaction.numPiece}</td>
                        <td className="px-4 py-3">{transaction.docDate}</td>
                        <td className="px-4 py-3">{transaction.transDate}</td>
                        <td className="px-4 py-3 font-mono text-sm">{transaction.glAccount}</td>
                        <td className="px-4 py-3">{transaction.glDescription}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.cashTransaction === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.cashTransaction}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{transaction.collectionDate}</td>
                        <td className="px-4 py-3">{transaction.accountant}</td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td colSpan={8} className="px-4 py-3 font-bold text-[var(--color-text-primary)]">Solde :</td>
                    <td className="px-4 py-3 text-right font-bold text-[var(--color-text-primary)]">
                      {formatCurrency(getFilteredTransactionsTotal())}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cash Summary */}
            <div className="p-4 bg-gray-50 rounded-b-lg">
              <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Cash</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Incoming</div>
                  <div className="font-bold text-green-600">{formatCurrency(totalIncoming)}</div>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Outcoming</div>
                  <div className="font-bold text-red-600">{formatCurrency(totalOutgoing)}</div>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="font-bold">{formatCurrency(getTotalAmount())}</div>
                </div>
                <div className="text-center p-3 bg-[var(--color-primary)]/10 rounded border border-[var(--color-primary)]">
                  <div className="text-sm text-[var(--color-text-primary)] font-medium">Solde Final</div>
                  <div className={`font-bold ${(getTotalAmount() + getFilteredTransactionsTotal()) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(getTotalAmount() + getFilteredTransactionsTotal())}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB: Prévision de trésorerie ═══════════ */}
      {activeTab === 'prevision_tresorerie' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">Solde actuel</div>
              <div className="text-xl font-bold text-[var(--color-text-primary)] mt-1">{formatCurrency(kpiSoldeActuel)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">Encaissements prévus</div>
              <div className="text-xl font-bold text-green-600 mt-1">{formatCurrency(kpiEncaissements)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">Décaissements prévus</div>
              <div className="text-xl font-bold text-red-600 mt-1">{formatCurrency(kpiDecaissements)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 border-l-4 border-l-[var(--color-primary)]">
              <div className="text-sm text-gray-500">Solde projeté</div>
              <div className={`text-xl font-bold mt-1 ${kpiSoldeProjecte >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(kpiSoldeProjecte)}
              </div>
            </div>
          </div>

          {/* Scenario selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Scénario :</span>
            {(['optimiste', 'realiste', 'pessimiste'] as Scenario[]).map(s => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  scenario === s
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {SCENARIO_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Évolution de trésorerie</h3>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="encaissements" fill="#22c55e" name="Encaissements" />
                  <Bar dataKey="decaissements" fill="#ef4444" name="Décaissements" />
                  <Line type="monotone" dataKey="soldeFin" stroke="#171717" strokeWidth={2} name="Solde fin" dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Plans table */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Plans de Trésorerie</h3>
              <div className="flex items-center space-x-2">
                <ExportMenu
                  data={treasuryPlans as unknown as Record<string, unknown>[]}
                  filename="plans_tresorerie"
                  columns={exportColumns}
                />
                <button
                  onClick={() => { resetForm(); setShowCreatePlanModal(true); }}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/80 transition-colors flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Nouveau Plan</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Période</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Solde Début</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Encaissements</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Décaissements</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Solde Fin</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Confiance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Statut</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {treasuryPlans.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        Aucun plan de trésorerie. Cliquez sur "Nouveau Plan" pour en créer un.
                      </td>
                    </tr>
                  ) : (
                    treasuryPlans.map((plan: TreasuryPlan) => {
                      const mult = SCENARIO_MULTIPLIERS[scenario];
                      const enc = Math.round(plan.encaissements * mult);
                      const dec = Math.round(plan.decaissements * mult);
                      const fin = Math.round(plan.soldeDebut + enc - dec);
                      return (
                        <tr key={plan.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{plan.name}</td>
                          <td className="px-4 py-3">{plan.periode}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(plan.soldeDebut)}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-semibold">+{formatCurrency(enc)}</td>
                          <td className="px-4 py-3 text-right text-red-600 font-semibold">-{formatCurrency(dec)}</td>
                          <td className={`px-4 py-3 text-right font-bold ${fin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(fin)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${getConfianceStyle(plan.confiance)}`}>{plan.confiance}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(plan.statut)}`}>
                              {plan.statut}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => setDetailPlan(plan)}
                                className="p-1.5 text-gray-600 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded transition-colors"
                                title="Voir les détails"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </button>
                              <button
                                onClick={() => openEditModal(plan)}
                                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Modifier le plan"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button
                                onClick={() => setDeletingPlanId(plan.id)}
                                className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Supprimer le plan"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL: Create / Edit Plan ═══════════ */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {editingPlan ? 'Modifier le Plan' : 'Création de Plan de Trésorerie'}
              </h3>
              <button
                onClick={() => { setShowCreatePlanModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPlan}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du plan</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                      placeholder="Ex: Plan Trésorerie Q4 2025"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Auteur</label>
                    <input
                      type="text"
                      required
                      value={formAuthor}
                      onChange={e => setFormAuthor(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                      placeholder="Nom de l'auteur"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Période du Plan</label>
                    <button
                      type="button"
                      onClick={() => setShowPeriodModal(true)}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <span>
                        {dateRange.start && dateRange.end
                          ? `Du ${new Date(dateRange.start).toLocaleDateString('fr-FR')} au ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                          : 'Sélectionner une période'}
                      </span>
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Solde Initial (CFA)</label>
                    <input
                      type="number"
                      required
                      value={formSoldeDebut}
                      onChange={e => setFormSoldeDebut(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                      placeholder="0"
                      step="1000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confiance</label>
                    <select
                      value={formConfiance}
                      onChange={e => setFormConfiance(e.target.value as TreasuryPlan['confiance'])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="Haute">Haute</option>
                      <option value="Moyenne">Moyenne</option>
                      <option value="Faible">Faible</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                    <select
                      value={formStatut}
                      onChange={e => setFormStatut(e.target.value as TreasuryPlan['statut'])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="Brouillon">Brouillon</option>
                      <option value="Planifie">Planifié</option>
                      <option value="En cours">En cours</option>
                      <option value="Cloture">Clôturé</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scénario</label>
                    <select
                      value={formScenario}
                      onChange={e => setFormScenario(e.target.value as Scenario)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="realiste">Réaliste</option>
                      <option value="optimiste">Optimiste</option>
                      <option value="pessimiste">Pessimiste</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowCreatePlanModal(false); resetForm(); }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/80 transition-colors"
                >
                  {editingPlan ? 'Mettre à jour' : 'Créer le Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL: Delete Confirmation ═══════════ */}
      {deletingPlanId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer ce plan de trésorerie ? Cette action est irréversible.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeletingPlanId(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeletePlan(deletingPlanId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL: Plan Detail + Lines ═══════════ */}
      {detailPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{detailPlan.name}</h3>
                <p className="text-sm text-gray-500">{detailPlan.periode} — par {detailPlan.author}</p>
              </div>
              <button
                onClick={() => { setDetailPlan(null); resetLineForm(); }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Plan summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Solde début</div>
                <div className="font-bold">{formatCurrency(detailPlan.soldeDebut)}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Encaissements</div>
                <div className="font-bold text-green-600">+{formatCurrency(detailPlan.encaissements)}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Décaissements</div>
                <div className="font-bold text-red-600">-{formatCurrency(detailPlan.decaissements)}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                <div className="text-xs text-gray-500">Solde fin</div>
                <div className={`font-bold ${detailPlan.soldeFin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(detailPlan.soldeFin)}
                </div>
              </div>
            </div>

            {/* Lines table */}
            <div className="border border-gray-200 rounded-lg mb-4">
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <h4 className="font-medium text-[var(--color-text-primary)]">Lignes du plan</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Libellé</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Catégorie</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase">Montant</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Récurrence</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {detailPlan.lines.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-gray-500 text-sm">
                          Aucune ligne. Ajoutez des encaissements et décaissements ci-dessous.
                        </td>
                      </tr>
                    ) : (
                      detailPlan.lines.map(line => (
                        <tr key={line.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{line.label}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                              line.category === 'encaissement' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {line.category === 'encaissement' ? 'Encaissement' : 'Décaissement'}
                            </span>
                          </td>
                          <td className={`px-3 py-2 text-right font-medium ${line.category === 'encaissement' ? 'text-green-600' : 'text-red-600'}`}>
                            {line.category === 'encaissement' ? '+' : '-'}{formatCurrency(line.amount)}
                          </td>
                          <td className="px-3 py-2 text-sm">{new Date(line.date).toLocaleDateString('fr-FR')}</td>
                          <td className="px-3 py-2 text-sm">{line.recurrent ? line.frequency : '—'}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleDeleteLine(line.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                              title="Supprimer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add line form */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Ajouter une ligne</h4>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Libellé</label>
                  <input
                    type="text"
                    value={newLineLabel}
                    onChange={e => setNewLineLabel(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[var(--color-primary)]"
                    placeholder="Ex: Loyer bureau"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
                  <select
                    value={newLineCategory}
                    onChange={e => setNewLineCategory(e.target.value as 'encaissement' | 'decaissement')}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[var(--color-primary)]"
                  >
                    <option value="encaissement">Encaissement</option>
                    <option value="decaissement">Décaissement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Montant</label>
                  <input
                    type="number"
                    value={newLineAmount || ''}
                    onChange={e => setNewLineAmount(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[var(--color-primary)]"
                    placeholder="0"
                    min="0"
                    step="1000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={newLineDate}
                    onChange={e => setNewLineDate(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="w-full px-3 py-1.5 bg-[var(--color-primary)] text-white rounded text-sm hover:bg-[var(--color-primary)]/80 transition-colors"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-4 mt-3">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newLineRecurrent}
                    onChange={e => setNewLineRecurrent(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Récurrent</span>
                </label>
                {newLineRecurrent && (
                  <select
                    value={newLineFrequency}
                    onChange={e => setNewLineFrequency(e.target.value as 'mensuel' | 'trimestriel' | 'annuel')}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="mensuel">Mensuel</option>
                    <option value="trimestriel">Trimestriel</option>
                    <option value="annuel">Annuel</option>
                  </select>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => { setDetailPlan(null); resetLineForm(); }}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/80 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Period selector modal */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => setDateRange(newDateRange)}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default PrevisionsTresoreriePage;
