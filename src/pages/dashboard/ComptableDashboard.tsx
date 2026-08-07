import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { useMoneyFormat } from '../../hooks/useMoneyFormat';
import { computeDashboardMetrics } from '../../utils/dashboardMetrics';
import { formatNumber } from '../../utils/formatters';
import {
  Calculator,
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Plus,
  Search,
  Filter,
  Download,
  Wallet,
  Receipt,
  Scale,
  Percent,
  Landmark
} from 'lucide-react';

const MONTH_LABELS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
// Seuils d'alerte partagés avec le Dashboard Manager (mêmes clés localStorage).
const DSO_THRESHOLD_DEFAULT = 60; const DSO_THRESHOLD_KEY = 'manager-dso-threshold';
const DPO_THRESHOLD_DEFAULT = 60; const DPO_THRESHOLD_KEY = 'manager-dpo-threshold';
const TRESO_THRESHOLD_DEFAULT = 0; const TRESO_THRESHOLD_KEY = 'manager-treso-threshold';
const BFR_DAYS_THRESHOLD_DEFAULT = 90; const BFR_DAYS_THRESHOLD_KEY = 'manager-bfr-days-threshold';

const ComptableDashboard: React.FC = () => {
  const { t } = useLanguage();
  const fmt = useMoneyFormat();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterParams, setFilterParams] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    type: 'all'
  });
  const { adapter } = useData();

  // Metrics from DataContext
  const [liveData, setLiveData] = useState<{ todayCount: number; pendingCount: number; validatedCount: number; treasuryBalance: number; recentEntries: any[] }>({ todayCount: 0, pendingCount: 0, validatedCount: 0, treasuryBalance: 0, recentEntries: [] });

  // Bloc « Créances, dettes & ratios » (identique au Dashboard Manager).
  const [bilan, setBilan] = useState<{
    revenue: number; receivables: number; payables: number; stocks: number; bfr: number; bfrDays: number;
    dso: number; dpo: number; margeBrute: number; ratioCD: number | null;
  }>({ revenue: 0, receivables: 0, payables: 0, stocks: 0, bfr: 0, bfrDays: 0, dso: 0, dpo: 0, margeBrute: 0, ratioCD: null });
  const [balHistory, setBalHistory] = useState<Array<{ label: string; creances: number; dettes: number }>>([]);
  const [dsoThreshold, setDsoThreshold] = useState<number>(() => { try { const v = Number(localStorage.getItem(DSO_THRESHOLD_KEY)); return v > 0 ? v : DSO_THRESHOLD_DEFAULT; } catch { return DSO_THRESHOLD_DEFAULT; } });
  const [dpoThreshold, setDpoThreshold] = useState<number>(() => { try { const v = Number(localStorage.getItem(DPO_THRESHOLD_KEY)); return v > 0 ? v : DPO_THRESHOLD_DEFAULT; } catch { return DPO_THRESHOLD_DEFAULT; } });
  const [tresoThreshold, setTresoThreshold] = useState<number>(() => { try { const s = localStorage.getItem(TRESO_THRESHOLD_KEY); return s !== null && s !== '' ? Number(s) : TRESO_THRESHOLD_DEFAULT; } catch { return TRESO_THRESHOLD_DEFAULT; } });
  const [bfrDaysThreshold, setBfrDaysThreshold] = useState<number>(() => { try { const v = Number(localStorage.getItem(BFR_DAYS_THRESHOLD_KEY)); return v > 0 ? v : BFR_DAYS_THRESHOLD_DEFAULT; } catch { return BFR_DAYS_THRESHOLD_DEFAULT; } });
  const updateThreshold = (key: string, setter: (n: number) => void, v: number, min: number, max: number) => {
    const val = Math.max(min, Math.min(max, Math.round(v || 0)));
    setter(val);
    try { localStorage.setItem(key, String(val)); } catch { /* ignore */ }
  };

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split('T')[0];
      const allEntries = await adapter.getAll<any>('journalEntries');
      const todayEntries = allEntries.filter((e: any) => e.date === today);
      const pendingEntries = allEntries.filter((e: any) => e.status === 'draft');
      // 'validated' ET 'posted' comptent comme validées (les 529 écritures sont 'validated').
      const validatedEntries = allEntries.filter((e: any) => e.status === 'validated' || e.status === 'posted');

      // Trésorerie via la source unique (classe 5 hors 58).
      const m = computeDashboardMetrics(allEntries);
      const treasuryBalance = m.treasury;

      // Bloc bilan & ratios (identique au Manager) — sur l'ensemble des écritures.
      const receivables = m.h.net('41');
      const payables = m.h.creditNet('40');
      const stocks = m.classNet['3'] || 0;
      const bfr = receivables + stocks - payables;
      const achats = m.h.net('60');
      const dso = m.ca > 0 ? Math.round((receivables / m.ca) * 365) : 0;
      const dpo = achats > 0 ? Math.round((payables / achats) * 365) : 0;
      const bfrDays = m.ca > 0 ? Math.round((bfr / m.ca) * 365) : 0;
      const margeBrute = m.ca > 0 ? ((m.ca - achats) / m.ca) * 100 : 0;
      const ratioCD = payables !== 0 ? receivables / payables : null;
      setBilan({ revenue: m.ca, receivables, payables, stocks, bfr, bfrDays, dso, dpo, margeBrute, ratioCD });

      // Historique 6 mois : encours créances/dettes cumulés à la fin de chaque mois.
      const anchor = new Date();
      const hist: Array<{ label: string; creances: number; dettes: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const monthEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i + 1, 0));
        const iso = monthEnd.toISOString().slice(0, 10);
        const mm = computeDashboardMetrics(allEntries, { to: iso });
        hist.push({ label: MONTH_LABELS_SHORT[monthEnd.getUTCMonth()], creances: mm.h.net('41'), dettes: mm.h.creditNet('40') });
      }
      setBalHistory(hist);

      // Recent entries — on garde les montants NUMÉRIQUES + date/statut bruts pour filtrer/formater.
      const recent = [...allEntries]
        .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
        .slice(0, 20)
        .map((e: any) => {
          const totalDebit = (e.lines || []).reduce((s: number, l: any) => s + (l.debit || 0), 0);
          const totalCredit = (e.lines || []).reduce((s: number, l: any) => s + (l.credit || 0), 0);
          return {
            id: e.entryNumber || e.id,
            rawDate: String(e.date || '').slice(0, 10),
            date: e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '—',
            description: e.description || e.label || e.reference || '-',
            debit: totalDebit,
            credit: totalCredit,
            status: (e.status === 'validated' || e.status === 'posted') ? 'validated' : e.status === 'draft' ? 'draft' : 'pending',
          };
        });

      setLiveData({
        todayCount: todayEntries.length,
        pendingCount: pendingEntries.length,
        validatedCount: validatedEntries.length,
        treasuryBalance,
        recentEntries: recent,
      });
    };
    load();
  }, [adapter]);

  const handleExportData = () => {
    const csvContent = recentEntries.map(e =>
      `${e.id};${e.rawDate};${e.description};${e.debit};${e.credit};${e.status}`
    ).join('\n');
    const blob = new Blob([`﻿N°;Date;Description;Débit;Crédit;Statut\n${csvContent}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ecritures_comptables.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleQuickAction = (path: string) => navigate(path);

  const metrics = [
    { title: 'Écritures du jour', value: formatNumber(liveData.todayCount), color: 'blue', icon: FileText, description: 'Saisies aujourd\'hui' },
    { title: 'En attente validation', value: formatNumber(liveData.pendingCount), color: 'orange', icon: Clock, description: 'Brouillons à valider' },
    { title: 'Écritures validées', value: formatNumber(liveData.validatedCount), color: 'green', icon: CheckCircle, description: 'Total comptabilisées' },
    { title: 'Solde de trésorerie', value: fmt(liveData.treasuryBalance), color: 'primary', icon: DollarSign, description: 'Classe 5 (hors 58)' },
  ];

  // Filtres réellement appliqués (recherche + période + statut + sens).
  const recentEntries = useMemo(() => {
    return liveData.recentEntries.filter((e: any) => {
      if (searchText && !`${e.id} ${e.description}`.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterParams.dateFrom && e.rawDate < filterParams.dateFrom) return false;
      if (filterParams.dateTo && e.rawDate > filterParams.dateTo) return false;
      if (filterParams.status !== 'all' && e.status !== filterParams.status) return false;
      if (filterParams.type === 'debit' && !(e.debit > 0)) return false;
      if (filterParams.type === 'credit' && !(e.credit > 0)) return false;
      return true;
    });
  }, [liveData.recentEntries, searchText, filterParams]);

  const quickActions = [
    { label: 'Nouvelle écriture', icon: Plus, color: 'blue', path: '/accounting/entries' },
    { label: 'Lettrage auto', icon: CheckCircle, color: 'green', path: '/accounting/lettrage' },
    { label: t('accounting.balance'), icon: BarChart3, color: 'primary', path: '/accounting/balance' },
    { label: 'États financiers', icon: PieChart, color: 'orange', path: '/financial-statements' },
  ];

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'entries', label: 'Écritures', icon: FileText },
    { id: 'validation', label: 'Validation', icon: CheckCircle },
    { id: 'reports', label: 'Rapports', icon: PieChart },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Espace Comptable</h1>
            <p className="text-[var(--color-text-primary)]">Tableau de bord opérationnel</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/accounting/entries')}
              className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle écriture</span>
            </button>
            <div className="w-10 h-10 bg-[var(--color-primary-lighter)] rounded-full flex items-center justify-center">
              <Calculator className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation par onglets */}
      <div className="bg-white border-b border-[var(--color-border)]">
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id 
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]' 
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="p-6">
        {activeTab === 'overview' && (
          <>
            {/* Métriques principales - Style Kads Agency */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {metrics.map((metric) => {
                const IconComponent = metric.icon;
                return (
                  <div key={metric.title} className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)] hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[var(--color-primary)]/10">
                        <IconComponent className="w-6 h-6 text-[var(--color-primary)]" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">{metric.value}</h3>
                      <p className="text-[var(--color-text-primary)] text-sm mb-1">{metric.title}</p>
                      <p className="text-[var(--color-text-secondary)] text-xs">{metric.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Créances, dettes & ratios — identique au Dashboard Manager */}
            <section className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)] mb-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Créances, dettes & ratios</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                    <Clock className="w-3.5 h-3.5" /> Seuil DSO
                    <input type="number" min={1} max={365} value={dsoThreshold} onChange={(e) => updateThreshold(DSO_THRESHOLD_KEY, setDsoThreshold, Number(e.target.value), 1, 365)} className="w-14 px-2 py-1 rounded border border-[var(--color-border-dark)] text-[var(--color-text-primary)] text-xs num-tabular focus:ring-2 focus:ring-blue-500" aria-label="Seuil DSO en jours" /> j
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                    Seuil DPO
                    <input type="number" min={1} max={365} value={dpoThreshold} onChange={(e) => updateThreshold(DPO_THRESHOLD_KEY, setDpoThreshold, Number(e.target.value), 1, 365)} className="w-14 px-2 py-1 rounded border border-[var(--color-border-dark)] text-[var(--color-text-primary)] text-xs num-tabular focus:ring-2 focus:ring-blue-500" aria-label="Seuil DPO en jours" /> j
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                    Seuil trésorerie
                    <input type="number" step={1000} value={tresoThreshold} onChange={(e) => updateThreshold(TRESO_THRESHOLD_KEY, setTresoThreshold, Number(e.target.value), -1e15, 1e15)} className="w-28 px-2 py-1 rounded border border-[var(--color-border-dark)] text-[var(--color-text-primary)] text-xs num-tabular focus:ring-2 focus:ring-blue-500" aria-label="Seuil trésorerie en FCFA" /> FCFA
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                    Seuil BFR
                    <input type="number" min={1} max={1000} value={bfrDaysThreshold} onChange={(e) => updateThreshold(BFR_DAYS_THRESHOLD_KEY, setBfrDaysThreshold, Number(e.target.value), 1, 1000)} className="w-16 px-2 py-1 rounded border border-[var(--color-border-dark)] text-[var(--color-text-primary)] text-xs num-tabular focus:ring-2 focus:ring-blue-500" aria-label="Seuil BFR en jours de CA" /> j de CA
                  </label>
                </div>
              </div>

              {/* Alertes dérivées (mêmes seuils que le Manager) */}
              {(() => {
                const al: string[] = [];
                if (bilan.dso > dsoThreshold) al.push(`DSO élevé : ${bilan.dso} j (seuil ${dsoThreshold} j)`);
                if (bilan.dpo > dpoThreshold) al.push(`DPO élevé : ${bilan.dpo} j (seuil ${dpoThreshold} j)`);
                if (bilan.revenue > 0 && bilan.bfrDays > bfrDaysThreshold) al.push(`BFR en forte hausse : ${bilan.bfrDays} j de CA (seuil ${bfrDaysThreshold} j)`);
                if (liveData.treasuryBalance < tresoThreshold) al.push(`Trésorerie sous le seuil : ${fmt(liveData.treasuryBalance)} (seuil ${fmt(tresoThreshold)})`);
                return al.length > 0 ? (
                  <div className="mb-4 space-y-2">
                    {al.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-[var(--color-warning-lightest)] border-l-4 border-yellow-400 text-[var(--color-text-primary)]">
                        <span className="font-medium">⚠ {a}</span>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}

              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
                {[
                  { label: 'Créances clients', value: fmt(bilan.receivables), sub: 'Solde 41x (débiteur)', icon: Wallet, tone: 'text-[var(--color-primary)]' },
                  { label: 'Dettes fournisseurs', value: fmt(bilan.payables), sub: 'Solde 40x (créditeur)', icon: Receipt, tone: 'text-[var(--color-warning-dark)]' },
                  { label: 'BFR', value: fmt(bilan.bfr), sub: `${bilan.bfrDays} j de CA · seuil ${bfrDaysThreshold} j`, icon: Scale, tone: (bilan.revenue > 0 && bilan.bfrDays > bfrDaysThreshold) ? 'text-[var(--color-error)]' : (bilan.bfr >= 0 ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-success)]') },
                  { label: 'DSO', value: `${bilan.dso} j`, sub: `Recouvrement · seuil ${dsoThreshold} j`, icon: Clock, tone: bilan.dso > dsoThreshold ? 'text-[var(--color-error)]' : 'text-[var(--color-text-primary)]' },
                  { label: 'DPO', value: `${bilan.dpo} j`, sub: `Paiement fourn. · seuil ${dpoThreshold} j`, icon: Clock, tone: bilan.dpo > dpoThreshold ? 'text-[var(--color-error)]' : 'text-[var(--color-text-primary)]' },
                  { label: 'Marge brute', value: `${bilan.margeBrute.toFixed(1)} %`, sub: '(CA − achats) / CA', icon: Percent, tone: 'text-[var(--color-success)]' },
                  { label: 'Créances / Dettes', value: bilan.ratioCD != null ? bilan.ratioCD.toFixed(2) : '—', sub: 'Couverture des dettes', icon: Landmark, tone: bilan.ratioCD != null && bilan.ratioCD >= 1 ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]' },
                ].map((r) => {
                  const Icon = r.icon;
                  return (
                    <div key={r.label} className="p-4 rounded-lg bg-[var(--color-background-secondary)] border border-[var(--color-border)]">
                      <div className="flex items-center gap-2 mb-2 text-[var(--color-text-secondary)]">
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-medium">{r.label}</span>
                      </div>
                      <p className={`text-base font-bold ${r.tone}`}>{r.value}</p>
                      <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">{r.sub}</p>
                    </div>
                  );
                })}
              </div>

              {/* Évolution créances vs dettes (6 mois, encours de fin de mois) */}
              {balHistory.length > 0 && (() => {
                const maxVal = Math.max(1, ...balHistory.flatMap(h => [h.creances, h.dettes]));
                return (
                  <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Évolution créances vs dettes (6 mois)</h3>
                      <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[var(--color-primary)]" /> Créances</span>
                        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[var(--color-warning)]" /> Dettes</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-3" style={{ height: 160 }}>
                      {balHistory.map((h) => (
                        <div key={h.label} className="flex-1 flex flex-col items-center justify-end h-full">
                          <div className="flex items-end justify-center gap-1 w-full" style={{ height: 130 }}>
                            <div className="rounded-t bg-[var(--color-primary)] transition-all" style={{ width: '38%', height: `${Math.max(2, (h.creances / maxVal) * 130)}px` }} title={`Créances ${h.label} : ${fmt(h.creances)}`} />
                            <div className="rounded-t bg-[var(--color-warning)] transition-all" style={{ width: '38%', height: `${Math.max(2, (h.dettes / maxVal) * 130)}px` }} title={`Dettes ${h.label} : ${fmt(h.dettes)}`} />
                          </div>
                          <span className="text-[11px] text-[var(--color-text-secondary)] mt-2">{h.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </section>

            {/* Actions rapides */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)] mb-8">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Actions rapides</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, index) => {
                  const IconComponent = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleQuickAction(action.path)}
                      className={`p-4 rounded-lg border-2 border-dashed border-${action.color}-200 hover:border-${action.color}-300 hover:bg-${action.color}-50 transition-colors group`}
                    >
                      <div className="text-center">
                        <div className={`w-10 h-10 rounded-lg bg-${action.color}-100 flex items-center justify-center mx-auto mb-2 group-hover:bg-${action.color}-200 transition-colors`}>
                          <IconComponent className={`w-5 h-5 text-${action.color}-600`} />
                        </div>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{action.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'entries' && (
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)]">
            {/* Header du tableau */}
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Écritures récentes</h2>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)]" />
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Rechercher..."
                      className="pl-10 pr-4 py-2 border border-[var(--color-border-dark)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilterModal(true)}
                    className="p-2 border border-[var(--color-border-dark)] rounded-lg hover:bg-[var(--color-background-secondary)]"
                    aria-label="Filtrer"
                  >
                    <Filter className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  </button>
                  <button
                    onClick={handleExportData}
                    className="p-2 border border-[var(--color-border-dark)] rounded-lg hover:bg-[var(--color-background-secondary)]"
                    aria-label="Télécharger"
                  >
                    <Download className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tableau style Kads Agency */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">N° Écriture</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('common.date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('accounting.debit')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('accounting.credit')}</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[var(--color-background-secondary)]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--color-text-primary)]">
                        {entry.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">
                        {entry.date}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-primary)]">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                        {entry.debit > 0 && (
                          <span className="text-[var(--color-error)]">{fmt(entry.debit)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                        {entry.credit > 0 && (
                          <span className="text-[var(--color-success)]">{fmt(entry.credit)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          entry.status === 'validated' 
                            ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]'
                            : entry.status === 'pending'
                            ? 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]'
                            : 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                        }`}>
                          {entry.status === 'validated' ? 'Validé' : entry.status === 'pending' ? 'En attente' : 'Brouillon'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Contenu des autres onglets à développer */}
      </main>

      {/* Modal Filtres */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Filter className="w-5 h-5 text-gray-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Filtres avancés</h2>
                </div>
                <button onClick={() => setShowFilterModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                  <input
                    type="date"
                    value={filterParams.dateFrom}
                    onChange={(e) => setFilterParams({ ...filterParams, dateFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                  <input
                    type="date"
                    value={filterParams.dateTo}
                    onChange={(e) => setFilterParams({ ...filterParams, dateTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={filterParams.status}
                  onChange={(e) => setFilterParams({ ...filterParams, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="validated">Validé</option>
                  <option value="pending">En attente</option>
                  <option value="draft">Brouillon</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterParams.type}
                  onChange={(e) => setFilterParams({ ...filterParams, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les types</option>
                  <option value="debit">Débit uniquement</option>
                  <option value="credit">Crédit uniquement</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-[var(--color-border)] flex justify-between">
              <button
                onClick={() => setFilterParams({ dateFrom: '', dateTo: '', status: 'all', type: 'all' })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Réinitialiser
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]"
                >
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComptableDashboard;