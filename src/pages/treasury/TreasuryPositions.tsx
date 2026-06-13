import React, { useState, useEffect, useMemo } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion } from 'framer-motion';
import {
  Banknote,
  Building2,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Plus,
  RefreshCw,
  Calendar,
  Globe,
  CreditCard,
  Wallet,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  ShieldCheck,
  PiggyBank,
  ArrowRightLeft,
  Layers
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts';
import {
  UnifiedCard,
  KPICard,
  SectionHeader,
  ElegantButton,
  PageContainer,
  ModernChartCard,
  ColorfulBarChart
} from '../../components/ui/DesignSystem';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';

interface BankPosition {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: 'current' | 'savings' | 'deposit' | 'credit';
  currency: string;
  balance: number;
  availableBalance: number;
  lastUpdate: string;
  status: 'active' | 'inactive' | 'frozen';
  iban: string;
  bic: string;
  branch: string;
  country: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface PositionModal {
  isOpen: boolean;
  mode: 'view' | 'edit' | 'create';
  position?: BankPosition;
}

// Carte KPI du cockpit temps réel (couleurs projet : clair, petrol/ambre).
const KpiCard: React.FC<{ label: string; value: number; sub: string; color: string; highlight?: boolean; prefixPlus?: boolean }> = ({ label, value, sub, color, highlight, prefixPlus }) => (
  <div className="bg-white rounded-xl border p-3.5" style={{ borderColor: highlight ? color : 'var(--color-border)', background: highlight ? 'rgba(232,154,46,0.06)' : undefined }}>
    <div className="text-xs uppercase tracking-wide mb-1.5" style={{ color: highlight ? color : 'var(--color-text-secondary)' }}>{label}</div>
    <div className="font-mono font-bold" style={{ fontSize: 19, color }}>{prefixPlus && value > 0 ? '+' : ''}{formatCurrency(value)}</div>
    <div className="text-xs mt-1 text-[var(--color-text-secondary)]">{sub}</div>
  </div>
);
const PosLigne: React.FC<{ label: string; value: number; color?: string; bold?: boolean; prefixPlus?: boolean }> = ({ label, value, color, bold, prefixPlus }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm" style={{ color: bold ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: bold ? 600 : 400 }}>{label}</span>
    <span className="font-mono" style={{ fontSize: 13, color: color || 'var(--color-text-primary)', fontWeight: bold ? 700 : 500 }}>
      {prefixPlus && value > 0 ? '+ ' : value < 0 ? '− ' : ''}{formatCurrency(Math.abs(value))}
    </span>
  </div>
);

const TreasuryPositions: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBank, setFilterBank] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [positionModal, setPositionModal] = useState<PositionModal>({ isOpen: false, mode: 'view' });
  const [newPosition, setNewPosition] = useState({
    bankName: '', iban: '', bic: '', branch: '', currency: 'XAF',
    balance: 0, availableBalance: 0, accountType: 'courant',
  });

  const [exchangeRatesData, setExchangeRatesData] = useState<any[]>([]);
  const [hedgingPositionsData, setHedgingPositionsData] = useState<any[]>([]);
  // Positions bancaires RÉELLES dérivées du Grand Livre : soldes des comptes de
  // trésorerie (classe 5 SYSCOHADA : 52 banques, 53 ét. financiers, 57 caisse…),
  // car le registre des comptes bancaires dédié n'est pas saisi.
  const [glTreasury, setGlTreasury] = useState<{ code: string; name: string; balance: number }[]>([]);
  // Position TEMPS RÉEL par compte de trésorerie : solde comptable + ventilation
  // rapproché (lettré) / à rapprocher (non lettré, hors À-Nouveau). Le « à rapprocher »
  // est scindé en reçus non crédités (débits) et émis non débités (crédits).
  const [glPosition, setGlPosition] = useState<{
    code: string; name: string; solde: number; rappro: number; recus: number; emis: number;
  }[]>([]);
  const [posTab, setPosTab] = useState<'temps-reel' | 'cockpit' | 'comptes'>('cockpit');
  // Flux EN CIRCULATION (lignes de trésorerie non lettrées, hors À-Nouveau) — réel.
  const [glFloat, setGlFloat] = useState<{ id: string; code: string; accountName: string; libelle: string; date: string; montant: number; sens: 'emis' | 'recu' }[]>([]);
  // Lignes de prévision (module Prévisions de trésorerie) pour l'atterrissage.
  const [planLines, setPlanLines] = useState<{ date: string; net: number }[]>([]);
  const [horizon, setHorizon] = useState<7 | 30 | 90>(30);
  // Sélecteur de banque/compte du cockpit ('all' = consolidé).
  const [selectedPosBank, setSelectedPosBank] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      const [er, hp, entries, accounts, plansSetting] = await Promise.all([
        adapter.getAll('exchangeRates'),
        adapter.getAll('hedgingPositions'),
        adapter.getAll<any>('journalEntries'),
        adapter.getAll<any>('accounts'),
        adapter.getById('settings', 'treasury_plans').catch(() => undefined),
      ]);
      setExchangeRatesData(er as Record<string, unknown>[]);
      setHedgingPositionsData(hp as Record<string, unknown>[]);

      const nameByCode = new Map<string, string>();
      for (const a of accounts) nameByCode.set(String(a.code), a.name || a.code);
      const bal: Record<string, number> = {};
      // Ventilation rapproché / à rapprocher (reçus = débits, émis = crédits).
      const pos: Record<string, { solde: number; rappro: number; recus: number; emis: number }> = {};
      const ensure = (c: string) => (pos[c] ||= { solde: 0, rappro: 0, recus: 0, emis: 0 });
      const floats: { id: string; code: string; accountName: string; libelle: string; date: string; montant: number; sens: 'emis' | 'recu' }[] = [];
      for (const e of entries) {
        if (e.status === 'draft') continue;
        const isAN = e.journal === 'AN' || e.journal === 'RAN';
        for (const l of (e.lines || [])) {
          const code = String(l.accountCode || '');
          if (/^5/.test(code) && !/^59/.test(code)) {
            const d = l.debit || 0, c = l.credit || 0;
            bal[code] = (bal[code] || 0) + d - c;
            const p = ensure(code);
            p.solde += d - c;
            const lettre = !!(l.lettrageCode || l.lettrage_code);
            if (lettre || isAN) {
              // À-Nouveau = solde d'ouverture (déjà en banque) ; lettré = rapproché.
              p.rappro += d - c;
            } else {
              // Non rapproché : débit = encaissement reçu non crédité ; crédit = paiement émis non débité.
              p.recus += d;
              p.emis += c;
              if (d > 0 || c > 0) {
                floats.push({
                  id: String(l.id || `${e.id}-${code}`),
                  code,
                  accountName: nameByCode.get(code) || code,
                  libelle: l.label || e.label || '—',
                  date: e.date || '',
                  montant: d > 0 ? d : c,
                  sens: d > 0 ? 'recu' : 'emis',
                });
              }
            }
          }
        }
      }
      setGlFloat(floats.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 200));

      // Prévisions (module Prévisions de trésorerie) : net quotidien par date.
      try {
        const plans = plansSetting ? JSON.parse((plansSetting as any).value) : [];
        const pls: { date: string; net: number }[] = [];
        for (const pl of plans) {
          for (const ln of (pl.lines || [])) {
            const amt = Number(ln.amount) || 0;
            pls.push({ date: ln.date, net: ln.category === 'encaissement' ? amt : -amt });
          }
        }
        setPlanLines(pls);
      } catch { setPlanLines([]); }
      setGlTreasury(
        Object.entries(bal)
          .filter(([, v]) => Math.abs(v) > 0.001)
          .map(([code, balance]) => ({ code, name: nameByCode.get(code) || code, balance }))
          .sort((a, b) => b.balance - a.balance),
      );
      setGlPosition(
        Object.entries(pos)
          .filter(([, v]) => Math.abs(v.solde) > 0.001 || v.recus > 0.001 || v.emis > 0.001)
          .map(([code, v]) => ({ code, name: nameByCode.get(code) || code, ...v }))
          .sort((a, b) => b.solde - a.solde),
      );
    };
    load();
  }, [adapter]);

  // Build exchange rate lookup from Dexie data (currency -> EUR rate)
  const exchangeRateLookup = useMemo(() => {
    const lookup: Record<string, number> = {};
    for (const er of exchangeRatesData) {
      if (er.toCurrency === 'EUR') {
        lookup[er.fromCurrency] = er.rate;
      }
    }
    return lookup;
  }, [exchangeRatesData]);

  // Positions = comptes de trésorerie réels du Grand Livre (classe 5) + éventuelles
  // positions de couverture (hedging) si la table dédiée est renseignée.
  const positions: BankPosition[] = useMemo(() => {
    const fromGL: BankPosition[] = glTreasury.map((a) => ({
      id: a.code,
      bankName: a.name,
      accountNumber: a.code,
      accountType: 'current' as const,
      currency: 'XAF',
      balance: a.balance,
      availableBalance: a.balance,
      lastUpdate: new Date().toISOString(),
      status: 'active' as const,
      iban: '',
      bic: '',
      branch: '',
      country: '',
      riskLevel: a.balance < 0 ? 'high' as const : 'low' as const,
    }));
    const fromHedging: BankPosition[] = hedgingPositionsData.map((hp) => ({
      id: hp.id,
      bankName: hp.type.charAt(0).toUpperCase() + hp.type.slice(1) + ' - ' + hp.currency,
      accountNumber: hp.id,
      accountType: 'current' as const,
      currency: hp.currency,
      balance: hp.amount,
      availableBalance: hp.amount,
      lastUpdate: hp.createdAt,
      status: hp.status === 'active' ? 'active' as const : 'inactive' as const,
      iban: hp.id,
      bic: '',
      branch: hp.type,
      country: '',
      riskLevel: hp.unrealizedPnL < 0 ? 'high' as const : 'low' as const
    }));
    return [...fromGL, ...fromHedging];
  }, [glTreasury, hedgingPositionsData]);

  // Filter positions based on search and filters
  const filteredPositions = useMemo(() => {
    return positions.filter(position => {
      const matchesSearch = position.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          position.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          position.branch.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCurrency = filterCurrency === 'all' || position.currency === filterCurrency;
      const matchesStatus = filterStatus === 'all' || position.status === filterStatus;
      const matchesBank = filterBank === 'all' || position.bankName === filterBank;

      return matchesSearch && matchesCurrency && matchesStatus && matchesBank;
    });
  }, [searchTerm, filterCurrency, filterStatus, filterBank, positions]);

  // Calculate aggregated metrics — devise de référence = FCFA (XAF, OHADA).
  const aggregatedData = useMemo(() => {
    const isBase = (c: string) => c === 'XAF' || c === 'FCFA';
    // Total en FCFA : positions déjà en FCFA + éventuelles devises converties si
    // un taux est disponible (sinon la position est comptée telle quelle).
    const totalBase = filteredPositions.reduce((sum, p) =>
      sum + (isBase(p.currency) ? p.balance : p.balance * (exchangeRateLookup[p.currency] || 1)), 0);

    // Répartition par devise réellement présente (pas de devises figées).
    const byCurrency: Record<string, number> = {};
    for (const p of filteredPositions) {
      byCurrency[p.currency] = (byCurrency[p.currency] || 0) + p.balance;
    }
    const devisesCount = Object.keys(byCurrency).length;

    return {
      totalPositions: filteredPositions.length,
      totalBase,
      byCurrency,
      devisesCount,
      activeAccounts: filteredPositions.filter(p => p.status === 'active').length,
      highRiskAccounts: filteredPositions.filter(p => p.riskLevel === 'high').length
    };
  }, [filteredPositions, exchangeRateLookup]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      case 'frozen': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'XAF':
      case 'FCFA': return 'FCFA';
      case 'EUR': return '€';
      case 'USD': return '$';
      case 'GBP': return '£';
      case 'CHF': return 'CHF';
      default: return currency;
    }
  };

  const uniqueCurrencies = [...new Set(positions.map(p => p.currency))];
  const uniqueBanks = [...new Set(positions.map(p => p.bankName))];

  // Répartition par devise réellement présente (en millions), couleurs cycliques.
  const CHART_COLORS = ['bg-[var(--color-primary)]', 'bg-green-500', 'bg-orange-500', 'bg-[var(--color-text-secondary)]', 'bg-blue-500'];
  const chartData = Object.entries(aggregatedData.byCurrency).map(([label, value], i) => ({
    label,
    value: value / 1000000,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title="Positions de Trésorerie"
          subtitle="Gestion et suivi des positions bancaires en temps réel"
          icon={Banknote}
          action={
            <div className="flex gap-3">
              <ElegantButton variant="outline" icon={RefreshCw}>
                Actualiser
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download}>
                Exporter
              </ElegantButton>
              <ElegantButton
                variant="primary"
                icon={Plus}
                onClick={() => setPositionModal({ isOpen: true, mode: 'create' })}
              >
                Nouveau Compte
              </ElegantButton>
            </div>
          }
        />

        {/* Onglets : Position temps réel | Comptes bancaires (table) */}
        <div className="flex gap-1 border-b border-neutral-200">
          {([
            { key: 'cockpit', label: 'Cockpit trésorerie' },
            { key: 'temps-reel', label: 'Position temps réel' },
            { key: 'comptes', label: 'Comptes bancaires' },
          ] as const).map(tb => (
            <button
              key={tb.key}
              onClick={() => setPosTab(tb.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                posTab === tb.key ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* ── ONGLET : Position TEMPS RÉEL (tableau simple par compte) ───── */}
        {posTab === 'temps-reel' && (() => {
          const tot = glPosition.reduce(
            (a, p) => ({ solde: a.solde + p.solde, rappro: a.rappro + p.rappro, recus: a.recus + p.recus, emis: a.emis + p.emis }),
            { solde: 0, rappro: 0, recus: 0, emis: 0 },
          );
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">Solde comptable (réel)</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{formatCurrency(tot.solde)}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Ce qui est dans les comptes (classe 5)</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-green-200">
                  <p className="text-xs text-green-700 uppercase tracking-wide">Reçus non crédités (+)</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(tot.recus)}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Encaissements en instance</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-red-200">
                  <p className="text-xs text-red-700 uppercase tracking-wide">Émis non débités (−)</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(tot.emis)}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Paiements en instance</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">Rapproché (lettré + À-nouveau)</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{formatCurrency(tot.rappro)}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Confirmé vs banque</p>
                </div>
              </div>

              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  « En circulation » = mouvements de trésorerie <span className="font-semibold">non encore rapprochés</span> (non
                  lettrés, hors à-nouveau). Le <span className="font-semibold">Cockpit trésorerie</span> propose une vue de pilotage
                  (alertes, atterrissage, conseils). Rapprochez vos relevés (module Rapprochement) pour n'y laisser que les vrais règlements en attente.
                </span>
              </div>

              <UnifiedCard variant="elevated" size="lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
                        <th className="text-left py-2 px-3 font-medium">Compte</th>
                        <th className="text-right py-2 px-3 font-medium">Solde comptable</th>
                        <th className="text-right py-2 px-3 font-medium">Reçus non crédités (+)</th>
                        <th className="text-right py-2 px-3 font-medium">Émis non débités (−)</th>
                        <th className="text-right py-2 px-3 font-medium">Rapproché</th>
                      </tr>
                    </thead>
                    <tbody>
                      {glPosition.length === 0 ? (
                        <tr><td colSpan={5} className="py-6 text-center text-[var(--color-text-tertiary)]">Aucun compte de trésorerie mouvementé.</td></tr>
                      ) : glPosition.map(p => (
                        <tr key={p.code} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                          <td className="py-2 px-3"><span className="font-mono text-xs text-[var(--color-primary)] mr-2">{p.code}</span>{p.name}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold">{formatCurrency(p.solde)}</td>
                          <td className="py-2 px-3 text-right font-mono text-green-600">{p.recus > 0 ? formatCurrency(p.recus) : '—'}</td>
                          <td className="py-2 px-3 text-right font-mono text-red-600">{p.emis > 0 ? formatCurrency(p.emis) : '—'}</td>
                          <td className="py-2 px-3 text-right font-mono text-[var(--color-text-secondary)]">{formatCurrency(p.rappro)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {glPosition.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-[var(--color-border)] font-bold">
                          <td className="py-2 px-3">TOTAL</td>
                          <td className="py-2 px-3 text-right font-mono">{formatCurrency(tot.solde)}</td>
                          <td className="py-2 px-3 text-right font-mono text-green-700">{formatCurrency(tot.recus)}</td>
                          <td className="py-2 px-3 text-right font-mono text-red-700">{formatCurrency(tot.emis)}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatCurrency(tot.rappro)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </UnifiedCard>
            </div>
          );
        })()}

        {/* ── ONGLET : Cockpit trésorerie (pilotage, données réelles) ───── */}
        {posTab === 'cockpit' && (() => {
          const PETROL = '#235A6E', AMBER = '#E89A2E', VERT = '#1D9E75', ROUGE = '#E24B4A';
          const fmtCourt = (n: number) => {
            const a = Math.abs(n), s = n < 0 ? '−' : '';
            if (a >= 1e9) return s + (a / 1e9).toFixed(2).replace('.', ',') + ' Md';
            if (a >= 1e6) return s + (a / 1e6).toFixed(0) + ' M';
            return formatCurrency(n);
          };
          // Filtrage par banque/compte sélectionné ('all' = consolidé).
          const view = selectedPosBank === 'all' ? glPosition : glPosition.filter(p => p.code === selectedPosBank);
          const floatView = selectedPosBank === 'all' ? glFloat : glFloat.filter(f => f.code === selectedPosBank);
          const tot = view.reduce(
            (a, p) => ({ solde: a.solde + p.solde, recus: a.recus + p.recus, emis: a.emis + p.emis, rappro: a.rappro + p.rappro }),
            { solde: 0, recus: 0, emis: 0, rappro: 0 },
          );
          const theorique = tot.solde - tot.emis + tot.recus;

          // Concentration : toujours sur l'ENSEMBLE des banques (sinon 100 % trivial).
          const totalReel = glPosition.reduce((s, p) => s + Math.max(0, p.solde), 0);
          const concentration = glPosition
            .map(p => ({ nom: p.name, code: p.code, pct: totalReel ? (Math.max(0, p.solde) / totalReel) * 100 : 0 }))
            .sort((a, b) => b.pct - a.pct);

          // Moteur déterministe (données réelles) : alertes + recommandations.
          const alertes: { sev: 'critique' | 'attention' | 'info'; titre: string; banque: string; detail: string }[] = [];
          view.filter(p => p.solde < 0).forEach(p => alertes.push({
            sev: 'critique', titre: 'Solde négatif', banque: `${p.code} ${p.name}`,
            detail: `Position débitrice de ${formatCurrency(Math.abs(p.solde))}. Régulariser ou niveler.`,
          }));
          if (concentration[0] && concentration[0].pct > 45) alertes.push({
            sev: 'attention', titre: 'Concentration bancaire', banque: concentration[0].nom,
            detail: `${concentration[0].nom} concentre ${concentration[0].pct.toFixed(0)} % de la trésorerie. Diversifier les contreparties.`,
          });
          if (tot.emis > 0 || tot.recus > 0) alertes.push({
            sev: 'info', titre: 'Flottant à rapprocher', banque: 'Toutes banques',
            detail: `${formatCurrency(tot.emis)} émis non débités et ${formatCurrency(tot.recus)} reçus non crédités en attente de rapprochement.`,
          });

          const reco: { type: 'nivellement' | 'placement'; de?: string; vers?: string; banque?: string; montant: number }[] = [];
          const surplus = [...glPosition].sort((a, b) => b.solde - a.solde)[0];
          glPosition.filter(p => p.solde < 0).forEach(n => {
            if (surplus && surplus.code !== n.code && surplus.solde > Math.abs(n.solde)) {
              reco.push({ type: 'nivellement', de: `${surplus.code} ${surplus.name}`, vers: `${n.code} ${n.name}`, montant: Math.ceil(Math.abs(n.solde) / 1e6) * 1e6 });
            }
          });
          glPosition.filter(p => p.solde > 100_000_000 && totalReel && p.solde / totalReel > 0.30).forEach(p =>
            reco.push({ type: 'placement', banque: `${p.code} ${p.name}`, montant: Math.floor((p.solde * 0.5) / 1e6) * 1e6 }));

          let score = 100;
          alertes.forEach(a => { score -= a.sev === 'critique' ? 30 : a.sev === 'attention' ? 15 : 0; });
          score = Math.max(0, Math.min(100, score));
          const sante = score >= 80 ? { label: 'Saine', color: VERT } : score >= 50 ? { label: 'Sous surveillance', color: AMBER } : { label: 'Tendue', color: ROUGE };

          // Atterrissage : solde théorique + cumul des prévisions futures par date.
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const todayIso = today.toISOString().slice(0, 10);
          const series: { jour: string; solde: number }[] = [];
          for (let dday = 0; dday <= horizon; dday++) {
            const cur = new Date(today); cur.setDate(cur.getDate() + dday);
            const iso = cur.toISOString().slice(0, 10);
            const cumul = planLines.filter(l => l.date && l.date >= todayIso && l.date <= iso).reduce((s, l) => s + l.net, 0);
            series.push({ jour: cur.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }), solde: theorique + cumul });
          }
          const hasPlan = planLines.some(l => l.date && l.date >= todayIso);

          return (
            <div className="space-y-5">
              {/* Sélecteur de banque/compte — filtre KPIs, détail et flux. */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-[var(--color-text-secondary)]">Banque / compte</label>
                <select
                  value={selectedPosBank}
                  onChange={(e) => setSelectedPosBank(e.target.value)}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white max-w-md focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="all">Toutes les banques</option>
                  {glPosition.map(p => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
                </select>
              </div>

              {/* KPIs — modèle de carte du projet (KPICard), montants COMPLETS avec
                  une police réduite (valueFontSize) pour tenir sur une ligne. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard title="Solde réel" value={formatCurrency(tot.solde)} subtitle="Ce qui est dans les comptes" icon={Wallet} color="primary" withChart valueFontSize="1.125rem" />
                <KPICard title="Émis non débités" value={formatCurrency(-tot.emis)} subtitle="Décaissements en attente" icon={ArrowDownRight} color="error" withChart valueFontSize="1.125rem" />
                <KPICard title="Reçus non crédités" value={`+ ${formatCurrency(tot.recus)}`} subtitle="Encaissements en attente" icon={ArrowUpRight} color="success" withChart valueFontSize="1.125rem" />
                <KPICard title="Solde théorique" value={formatCurrency(theorique)} subtitle="Flottant dénoué" icon={TrendingUp} color="primary" withChart valueFontSize="1.125rem" />
                <KPICard title="Liquidité disponible" value={formatCurrency(theorique)} subtitle="+ découvert autorisé (non renseigné)" icon={ShieldCheck} color="neutral" withChart valueFontSize="1.125rem" />
              </div>

              {/* Proph3t — conseil de trésorerie (déterministe) */}
              <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'rgba(232,154,46,0.4)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" style={{ color: AMBER }} />
                    <span style={{ fontFamily: "'Grand Hotel', cursive", color: AMBER, fontSize: 22, lineHeight: 1 }}>Proph3t</span>
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">— Conseil de trésorerie</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-secondary)]">Santé</span>
                    <div style={{ width: 90, height: 7, borderRadius: 99, background: 'var(--color-surface-hover)' }}>
                      <div style={{ width: `${score}%`, height: '100%', borderRadius: 99, background: sante.color }} />
                    </div>
                    <span className="font-mono text-sm" style={{ color: sante.color }}>{score}</span>
                    <span className="text-xs" style={{ color: sante.color }}>{sante.label}</span>
                  </div>
                </div>
                {alertes.length === 0 && reco.length === 0 && (
                  <p className="text-sm text-[var(--color-text-secondary)]">Aucune tension détectée. Trésorerie sous contrôle.</p>
                )}
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                  {alertes.map((a, i) => (
                    <div key={'a' + i} className="flex gap-2 p-3 rounded-lg bg-[var(--color-surface-hover)] border" style={{ borderColor: a.sev === 'critique' ? 'rgba(226,75,74,0.4)' : 'var(--color-border)' }}>
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: a.sev === 'critique' ? ROUGE : AMBER }} />
                      <div>
                        <div className="text-sm font-medium" style={{ color: a.sev === 'critique' ? ROUGE : 'var(--color-text-primary)' }}>{a.titre} — {a.banque}</div>
                        <div className="text-xs mt-0.5 text-[var(--color-text-secondary)]">{a.detail}</div>
                      </div>
                    </div>
                  ))}
                  {reco.map((r, i) => (
                    <div key={'r' + i} className="flex gap-2 p-3 rounded-lg bg-[var(--color-surface-hover)] border" style={{ borderColor: 'rgba(29,158,117,0.35)' }}>
                      {r.type === 'nivellement'
                        ? <ArrowRightLeft className="h-4 w-4 shrink-0 mt-0.5" style={{ color: VERT }} />
                        : <PiggyBank className="h-4 w-4 shrink-0 mt-0.5" style={{ color: VERT }} />}
                      <div>
                        {r.type === 'nivellement' ? (
                          <>
                            <div className="text-sm font-medium text-[var(--color-text-primary)]">Nivellement recommandé</div>
                            <div className="text-xs mt-0.5 text-[var(--color-text-secondary)]">Virer <span className="font-mono" style={{ color: VERT }}>{formatCurrency(r.montant)}</span> de {r.de} → {r.vers}.</div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-medium text-[var(--color-text-primary)]">Excédent dormant — {r.banque}</div>
                            <div className="text-xs mt-0.5 text-[var(--color-text-secondary)]">Jusqu'à <span className="font-mono" style={{ color: VERT }}>{formatCurrency(r.montant)}</span> mobilisables (placement / DAT court terme).</div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-3 text-[var(--color-text-tertiary)]">⚠︎ Conseils consultatifs — décision et exécution restent humaines. Calculs déterministes sur vos écritures réelles, jamais générés par IA.</p>
              </div>

              {/* Prévision d'atterrissage + Concentration bancaire (côte à côte) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--color-border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-[var(--color-text-primary)]">Prévision d'atterrissage</h3>
                  <div className="flex gap-1">
                    {[7, 30, 90].map(h => (
                      <button key={h} onClick={() => setHorizon(h as 7 | 30 | 90)} className="text-xs px-3 py-1 rounded-lg border"
                        style={{ borderColor: horizon === h ? AMBER : 'var(--color-border)', background: horizon === h ? 'rgba(232,154,46,0.12)' : 'transparent', color: horizon === h ? AMBER : 'var(--color-text-secondary)' }}>
                        J+{h}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs mb-2 text-[var(--color-text-tertiary)]">
                  {hasPlan
                    ? "Solde théorique + échéancier prévisionnel (module Prévisions de trésorerie)."
                    : "Aucune échéance future enregistrée — alimentez le module Prévisions de trésorerie. La ligne reflète le solde théorique constant."}
                </p>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="atterGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={AMBER} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="jour" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
                      <YAxis tickFormatter={fmtCourt} tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={62} />
                      <RTooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Solde projeté']} />
                      <ReferenceLine y={0} stroke={ROUGE} strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="solde" stroke={AMBER} strokeWidth={2} fill="url(#atterGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Concentration bancaire — Top 5, côte à côte avec l'atterrissage. */}
              <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
                <div className="flex items-center gap-2 mb-1"><Layers className="h-4 w-4" style={{ color: AMBER }} /><h3 className="font-semibold text-[var(--color-text-primary)]">Concentration bancaire</h3></div>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-3">Top 5 — soldes positifs</p>
                {concentration.length === 0 ? <p className="text-sm text-[var(--color-text-tertiary)]">Aucune position.</p> : concentration.slice(0, 5).map((c, i) => (
                  <div key={i} className="mb-2.5">
                    <div className="flex justify-between text-sm mb-1"><span className="text-[var(--color-text-primary)] truncate">{c.nom}</span><span className="font-mono" style={{ color: c.pct > 45 ? ROUGE : 'var(--color-text-secondary)' }}>{c.pct.toFixed(0)} %</span></div>
                    <div style={{ height: 6, borderRadius: 99, background: 'var(--color-surface-hover)' }}><div style={{ width: `${c.pct}%`, height: '100%', borderRadius: 99, background: c.pct > 45 ? ROUGE : AMBER }} /></div>
                  </div>
                ))}
              </div>
              </div>

              {/* Détail par compte */}
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}>
                {view.map(p => {
                  const th = p.solde - p.emis + p.recus;
                  const tension = p.solde < 0;
                  return (
                    <div key={p.code} className="bg-white rounded-xl border p-4" style={{ borderColor: tension ? 'rgba(226,75,74,0.4)' : 'var(--color-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-surface-hover)', color: PETROL }}><Building2 className="h-4 w-4" /></div>
                          <div><div className="text-sm font-medium text-[var(--color-text-primary)]">{p.name}</div><div className="text-xs font-mono text-[var(--color-text-secondary)]">{p.code}</div></div>
                        </div>
                        {tension && <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(226,75,74,0.12)', color: ROUGE }}>négatif</span>}
                      </div>
                      <PosLigne label="Solde réel" value={p.solde} />
                      <PosLigne label="Émis non débités" value={-p.emis} color={ROUGE} />
                      <PosLigne label="Reçus non crédités" value={p.recus} color={VERT} prefixPlus />
                      <div className="h-px bg-[var(--color-border)] my-2" />
                      <PosLigne label="Solde théorique" value={th} color={AMBER} bold />
                      <PosLigne label="Rapproché" value={p.rappro} color="var(--color-text-secondary)" />
                    </div>
                  );
                })}
              </div>

              {/* Flux en circulation (la Concentration bancaire est dans son propre onglet). */}
              <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
                <h3 className="font-semibold mb-3 text-[var(--color-text-primary)]">Flux en circulation <span className="text-xs font-normal text-[var(--color-text-secondary)]">— non rapprochés</span></h3>
                {floatView.length === 0 ? <p className="text-sm text-[var(--color-text-tertiary)]">Aucun flux en circulation (tout est rapproché, ou aucun mouvement).</p> : (
                  <div className="flex flex-col gap-1" style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {floatView.map((f, i) => (
                      <div key={f.id + i} className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: i < floatView.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center" style={{ background: f.sens === 'emis' ? 'rgba(226,75,74,0.12)' : 'rgba(29,158,117,0.12)', color: f.sens === 'emis' ? ROUGE : VERT }}>{f.sens === 'emis' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</span>
                          <div className="min-w-0"><div className="text-sm truncate text-[var(--color-text-primary)]">{f.libelle}</div><div className="text-xs text-[var(--color-text-secondary)]">{f.code} {f.accountName}</div></div>
                        </div>
                        <div className="text-right shrink-0"><div className="font-mono text-sm" style={{ color: f.sens === 'emis' ? ROUGE : VERT }}>{f.sens === 'emis' ? '− ' : '+ '}{formatCurrency(f.montant)}</div><div className="text-xs text-[var(--color-text-secondary)]">{f.date ? new Date(f.date).toLocaleDateString('fr-FR') : '—'}</div></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-[var(--color-text-tertiary)]">
                Solde théorique = Solde réel − Émis non débités + Reçus non crédités. « En circulation » = mouvements de trésorerie non lettrés (hors à-nouveau) ; rapprochez vos relevés (module Rapprochement) pour n'y laisser que les vrais règlements en attente.
              </p>
            </div>
          );
        })()}

        {/* ── ONGLET : Comptes bancaires (filtres + table) ──────────────── */}
        {posTab === 'comptes' && (<>
        {/* Filters and Search */}
        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">Filtres et Recherche</h3>
              <div className="flex gap-2">
                <PageHeaderActions
                  onToggleFilters={() => setShowFilters((v) => !v)}
                  filtersOpen={showFilters}
                  activeFilters={[searchTerm !== '', filterCurrency !== 'all', filterStatus !== 'all', filterBank !== 'all'].filter(Boolean).length}
                />
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'table' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  <Target className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              </div>

              {showFilters && (
              <>
              <select
                value={filterCurrency}
                onChange={(e) => setFilterCurrency(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              >
                <option value="all">Toutes les devises</option>
                {uniqueCurrencies.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
                <option value="frozen">Gelé</option>
              </select>

              <select
                value={filterBank}
                onChange={(e) => setFilterBank(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              >
                <option value="all">Toutes les banques</option>
                {uniqueBanks.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
              </>
              )}
            </div>
          </div>
        </UnifiedCard>

        {/* Positions Table/Grid */}
        <UnifiedCard variant="elevated" size="lg">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-neutral-800">
                Positions Bancaires ({filteredPositions.length})
              </h3>
            </div>

            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">Banque</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">{t('accounting.account')}</th>
                      <th className="text-right py-3 px-4 font-medium text-neutral-600">{t('accounting.balance')}</th>
                      <th className="text-right py-3 px-4 font-medium text-neutral-600">Disponible</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Statut</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Risque</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPositions.map((position, index) => (
                      <motion.tr
                        key={position.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-neutral-100 hover:bg-neutral-50"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-[var(--color-primary)]/5 rounded-lg">
                              <Building2 className="h-4 w-4 text-[var(--color-primary)]" />
                            </div>
                            <div>
                              <p className="font-medium text-neutral-800">{position.bankName}</p>
                              <p className="text-sm text-neutral-500">{position.branch}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-mono text-sm text-neutral-800">{position.iban}</p>
                            <p className="text-xs text-neutral-500">{position.accountType}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div>
                            <p className="font-semibold text-neutral-800">
                              {formatCurrency(position.balance, position.currency)}
                            </p>
                            <p className="text-sm text-neutral-500">{position.currency}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div>
                            <p className="font-medium text-neutral-800">
                              {formatCurrency(position.availableBalance, position.currency)}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {position.balance !== position.availableBalance ? 'Bloqué' : 'Libre'}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(position.status)}`}>
                            {position.status === 'active' ? 'Actif' :
                             position.status === 'inactive' ? 'Inactif' : 'Gelé'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(position.riskLevel)}`}>
                            {position.riskLevel === 'low' ? 'Faible' :
                             position.riskLevel === 'medium' ? 'Moyen' : 'Élevé'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => setPositionModal({ isOpen: true, mode: 'view', position })}
                              className="p-2 text-neutral-400 hover:text-[var(--color-primary)] transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setPositionModal({ isOpen: true, mode: 'edit', position })}
                              className="p-2 text-neutral-400 hover:text-green-600 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPositions.map((position, index) => (
                  <motion.div
                    key={position.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-[var(--color-primary)]/5 rounded-lg">
                            <Building2 className="h-5 w-5 text-[var(--color-primary)]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-neutral-800">{position.bankName}</h4>
                            <p className="text-sm text-neutral-500">{position.branch}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(position.status)}`}>
                            {position.status === 'active' ? 'Actif' :
                             position.status === 'inactive' ? 'Inactif' : 'Gelé'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-500">Solde:</span>
                          <span className="font-semibold text-neutral-800">
                            {formatCurrency(position.balance, position.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-500">Disponible:</span>
                          <span className="font-medium text-neutral-700">
                            {formatCurrency(position.availableBalance, position.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-100">
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(position.riskLevel)}`}>
                            Risque {position.riskLevel === 'low' ? 'Faible' :
                                    position.riskLevel === 'medium' ? 'Moyen' : 'Élevé'}
                          </span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setPositionModal({ isOpen: true, mode: 'view', position })}
                              className="p-2 text-neutral-400 hover:text-[var(--color-primary)] transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setPositionModal({ isOpen: true, mode: 'edit', position })}
                              className="p-2 text-neutral-400 hover:text-green-600 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </UnifiedCard>
        </>)}

        {/* Position Detail Modal */}
        {positionModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-neutral-800">
                    {positionModal.mode === 'create' ? 'Nouveau Compte' :
                     positionModal.mode === 'edit' ? 'Modifier le Compte' : 'Détails du Compte'}
                  </h3>
                  <button
                    onClick={() => setPositionModal({ isOpen: false, mode: 'view' })}
                    className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* CREATE MODE — Form */}
                {positionModal.mode === 'create' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Banque *</label>
                        <select value={newPosition.bankName} onChange={(e) => setNewPosition({ ...newPosition, bankName: e.target.value })}
                          className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]">
                          <option value="">Sélectionner...</option>
                          <option value="SGBC">Société Générale Cameroun</option>
                          <option value="Afriland">Afriland First Bank</option>
                          <option value="Ecobank">Ecobank</option>
                          <option value="UBA">United Bank for Africa</option>
                          <option value="BICEC">BICEC</option>
                          <option value="BOA">Bank of Africa</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Agence</label>
                        <input type="text" value={newPosition.branch} onChange={(e) => setNewPosition({ ...newPosition, branch: e.target.value })}
                          className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="Ex: Akwa, Douala" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">IBAN *</label>
                        <input type="text" value={newPosition.iban} onChange={(e) => setNewPosition({ ...newPosition, iban: e.target.value })}
                          className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)] font-mono" placeholder="CM21 XXXX XXXX XXXX" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">BIC/SWIFT</label>
                        <input type="text" value={newPosition.bic} onChange={(e) => setNewPosition({ ...newPosition, bic: e.target.value })}
                          className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)] font-mono" placeholder="SGCMCMCX" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Devise *</label>
                        <select value={newPosition.currency} onChange={(e) => setNewPosition({ ...newPosition, currency: e.target.value })}
                          className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]">
                          <option value="XAF">XAF (FCFA CEMAC)</option>
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                          <option value="GBP">GBP</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Solde initial</label>
                        <input type="number" value={newPosition.balance} onChange={(e) => setNewPosition({ ...newPosition, balance: parseFloat(e.target.value) || 0 })}
                          className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Type de compte</label>
                        <select value={newPosition.accountType} onChange={(e) => setNewPosition({ ...newPosition, accountType: e.target.value })}
                          className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]">
                          <option value="courant">Courant</option>
                          <option value="epargne">Épargne</option>
                          <option value="depot">Dépôt à terme</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW/EDIT MODE — Display existing data */}
                {positionModal.position && positionModal.mode !== 'create' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Banque</label>
                        <p className="text-neutral-800 font-semibold">{positionModal.position.bankName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">IBAN</label>
                        <p className="text-neutral-800 font-mono text-sm">{positionModal.position.iban}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">BIC/SWIFT</label>
                        <p className="text-neutral-800">{positionModal.position.bic}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Agence</label>
                        <p className="text-neutral-800">{positionModal.position.branch}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Solde</label>
                        <p className="text-neutral-800 font-bold text-lg">
                          {formatCurrency(positionModal.position.balance, positionModal.position.currency)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Solde Disponible</label>
                        <p className="text-neutral-800 font-semibold">
                          {formatCurrency(positionModal.position.availableBalance, positionModal.position.currency)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Dernière Mise à Jour</label>
                        <p className="text-neutral-800">{formatDate(positionModal.position.lastUpdate)}</p>
                      </div>
                      <div className="flex space-x-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Statut</label>
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(positionModal.position.status)}`}>
                            {positionModal.position.status === 'active' ? 'Actif' :
                             positionModal.position.status === 'inactive' ? 'Inactif' : 'Gelé'}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Risque</label>
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getRiskColor(positionModal.position.riskLevel)}`}>
                            {positionModal.position.riskLevel === 'low' ? 'Faible' :
                             positionModal.position.riskLevel === 'medium' ? 'Moyen' : 'Élevé'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                  <ElegantButton
                    variant="outline"
                    onClick={() => setPositionModal({ isOpen: false, mode: 'view' })}
                  >
                    {positionModal.mode === 'view' ? 'Fermer' : 'Annuler'}
                  </ElegantButton>
                  {positionModal.mode === 'create' && (
                    <ElegantButton variant="primary"
                      onClick={() => {
                        if (!newPosition.bankName || !newPosition.iban) return;
                        setPositionModal({ isOpen: false, mode: 'view' });
                        setNewPosition({ bankName: '', iban: '', bic: '', branch: '', currency: 'XAF', balance: 0, availableBalance: 0, accountType: 'courant' });
                      }}
                    >
                      Créer le compte
                    </ElegantButton>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default TreasuryPositions;