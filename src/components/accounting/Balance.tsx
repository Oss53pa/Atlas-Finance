import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import PeriodSelectorModal from '../shared/PeriodSelectorModal';
import ExportMenu from '../shared/ExportMenu';
import {
  ChevronDown, ChevronRight, FileText, Calendar, Filter,
  Printer, Search, Calculator, Scale, Download,
  TrendingUp, TrendingDown, Eye, EyeOff, Folder, FolderOpen,
  TreePine, List, Grid3x3, RefreshCw, Settings, Columns,
  Mail, FileSpreadsheet, Users, Building
} from 'lucide-react';
import PrintableArea from '../ui/PrintableArea';
import { usePrintReport } from '../../hooks/usePrint';
import { formatCurrency } from '../../utils/formatters';
import { useMoneyFormat } from '../../hooks/useMoneyFormat';
import { money } from '../../utils/money';
import { getAgedReceivables, type AgedReceivable } from '../../features/balance/services/balanceService';

interface BalanceAccount {
  code: string;
  libelle: string;
  niveau: number; // 1=Classe, 2=Compte principal, 3=Sous-compte
  parent?: string;
  soldeDebiteurAN: number; // A nouveau
  soldeCrediteurAN: number;
  mouvementsDebit: number;
  mouvementsCredit: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
  isExpanded: boolean;
  children?: BalanceAccount[];
}

const CLASSE_LABELS: Record<string, string> = {
  '1': 'COMPTES DE RESSOURCES DURABLES',
  '2': "COMPTES D'ACTIF IMMOBILISÉ",
  '3': 'COMPTES DE STOCKS',
  '4': 'COMPTES DE TIERS',
  '5': 'COMPTES DE TRÉSORERIE',
  '6': 'COMPTES DE CHARGES',
  '7': 'COMPTES DE PRODUITS',
  '8': 'COMPTES DE RÉSULTATS',
  '9': 'COMPTES ANALYTIQUES',
};

const Balance: React.FC = () => {
  const { t } = useLanguage();
  const fmt = useMoneyFormat();
  const { adapter } = useData();
  const { printRef, handlePrint } = usePrintReport({
    title: 'Balance Comptable',
    orientation: 'landscape',
    pageSize: 'A4'
  });

  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: `${new Date().getFullYear()}-01-01`, end: `${new Date().getFullYear()}-12-31` });
  const [searchAccount, setSearchAccount] = useState('');
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [balanceType, setBalanceType] = useState<'generale' | 'auxiliaire' | 'agee' | 'cloture'>('generale');
  const [viewMode, setViewMode] = useState<'tree' | 'list' | 'grid'>('tree');
  const [displayLevel, setDisplayLevel] = useState<1 | 2 | 3>(3);
  const [showFilters, setShowFilters] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [columnCount, setColumnCount] = useState<4 | 5 | 6>(6);
  const [visibleColumns, setVisibleColumns] = useState({
    compte: true,
    libelle: true,
    soldeDebiteurAN: true,
    soldeCrediteurAN: true,
    mouvementsDebit: true,
    mouvementsCredit: true,
    soldeDebiteur: true,
    soldeCrediteur: true
  });

  // Load real data from adapter
  const [accounts, setAccounts] = useState<BalanceAccount[]>([]);
  const [agedReceivables, setAgedReceivables] = useState<AgedReceivable[]>([]);
  // Balance auxiliaire PAR TIERS (groupée sur third_party_code des lignes) —
  // possible depuis que les codes tiers sont attribués. Vide si aucun code tiers.
  const [tiersBalances, setTiersBalances] = useState<{
    clients: { code: string; libelle: string; debit: number; credit: number; solde: number }[];
    fournisseurs: { code: string; libelle: string; debit: number; credit: number; solde: number }[];
  }>({ clients: [], fournisseurs: [] });

  // Balance âgée des créances — calculée depuis les écritures (comptes 411)
  useEffect(() => {
    let cancelled = false;
    getAgedReceivables(adapter, new Date(dateRange.end))
      .then((rows) => { if (!cancelled) setAgedReceivables(rows); })
      .catch(() => { if (!cancelled) setAgedReceivables([]); });
    return () => { cancelled = true; };
  }, [adapter, dateRange.end]);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const [dbAccounts, dbEntries] = await Promise.all([
          adapter.getAll<any>('accounts'),
          adapter.getAll<any>('journalEntries'),
        ]);

        // Sépare À-Nouveau (journal AN/RAN = soldes d'OUVERTURE) et mouvements de
        // période, par code de compte. La balance SYSCOHADA distingue les colonnes
        // « Soldes à Nouveau » (ouverture) des « Mouvements » (période).
        type Stat = { anDebit: number; anCredit: number; movDebit: number; movCredit: number };
        const EMPTY: Stat = { anDebit: 0, anCredit: 0, movDebit: 0, movCredit: 0 };
        const stats: Record<string, Stat> = {};
        for (const entry of dbEntries) {
          if (!entry.lines) continue;
          const j = String((entry as any).journal || '').toUpperCase();
          const isAN = j === 'AN' || j === 'RAN';
          for (const line of entry.lines) {
            const code = String(line.accountCode || '');
            if (!code) continue;
            if (!stats[code]) stats[code] = { anDebit: 0, anCredit: 0, movDebit: 0, movCredit: 0 };
            const d = money(line.debit || 0), c = money(line.credit || 0);
            if (isAN) {
              stats[code].anDebit = money(stats[code].anDebit).add(d).toNumber();
              stats[code].anCredit = money(stats[code].anCredit).add(c).toNumber();
            } else {
              stats[code].movDebit = money(stats[code].movDebit).add(d).toNumber();
              stats[code].movCredit = money(stats[code].movCredit).add(c).toNumber();
            }
          }
        }

        // Build flat account list : debit/credit = MOUVEMENTS ; anDebit/anCredit = À-Nouveau.
        const flatAccounts: { code: string; name: string; anDebit: number; anCredit: number; debit: number; credit: number }[] = [];

        // From DB accounts
        for (const acc of dbAccounts) {
          const code = String(acc.code || acc.number || '');
          if (!code) continue;
          const s = stats[code] || EMPTY;
          flatAccounts.push({ code, name: acc.name || acc.libelle || code, anDebit: s.anDebit, anCredit: s.anCredit, debit: s.movDebit, credit: s.movCredit });
        }

        // Also include accounts found only in entries (not in chart)
        const dbCodes = new Set(flatAccounts.map(a => a.code));
        for (const [code, s] of Object.entries(stats)) {
          if (!dbCodes.has(code)) {
            flatAccounts.push({ code, name: code, anDebit: s.anDebit, anCredit: s.anCredit, debit: s.movDebit, credit: s.movCredit });
          }
        }

        // Build hierarchical structure: Class > 2-digit > 3-digit
        const classeMap: Record<string, BalanceAccount> = {};

        for (const acc of flatAccounts) {
          const cls = acc.code.charAt(0);
          if (cls < '1' || cls > '9') continue;

          // Ensure class node exists
          if (!classeMap[cls]) {
            classeMap[cls] = {
              code: cls,
              libelle: CLASSE_LABELS[cls] || `CLASSE ${cls}`,
              niveau: 1,
              soldeDebiteurAN: 0, soldeCrediteurAN: 0,
              mouvementsDebit: 0, mouvementsCredit: 0,
              soldeDebiteur: 0, soldeCrediteur: 0,
              isExpanded: false,
              children: [],
            };
          }
          const classeNode = classeMap[cls];

          // Find or create 2-digit parent
          const code2 = acc.code.substring(0, 2);
          let parent2 = classeNode.children?.find(c => c.code === code2);
          if (!parent2 && acc.code.length >= 2) {
            parent2 = {
              code: code2,
              libelle: acc.code.length === 2 ? acc.name : code2,
              niveau: 2,
              parent: cls,
              soldeDebiteurAN: 0, soldeCrediteurAN: 0,
              mouvementsDebit: 0, mouvementsCredit: 0,
              soldeDebiteur: 0, soldeCrediteur: 0,
              isExpanded: false,
              children: [],
            };
            classeNode.children!.push(parent2);
          }

          // À-Nouveau net (ouverture) du compte → colonnes Soldes à Nouveau D/C.
          const anNetAcc = money(acc.anDebit).subtract(money(acc.anCredit)).toNumber();
          const accAnD = anNetAcc > 0 ? anNetAcc : 0;
          const accAnC = anNetAcc < 0 ? Math.abs(anNetAcc) : 0;

          // Add as level 3 if code >= 3 digits
          if (acc.code.length >= 3 && parent2) {
            // Solde de CLÔTURE = À-Nouveau + mouvements de période.
            const soldeNet = money(acc.debit).subtract(money(acc.credit)).add(money(anNetAcc)).toNumber();
            const leaf: BalanceAccount = {
              code: acc.code,
              libelle: acc.name,
              niveau: 3,
              parent: code2,
              soldeDebiteurAN: accAnD, soldeCrediteurAN: accAnC,
              mouvementsDebit: acc.debit,
              mouvementsCredit: acc.credit,
              soldeDebiteur: soldeNet > 0 ? soldeNet : 0,
              soldeCrediteur: soldeNet < 0 ? Math.abs(soldeNet) : 0,
              isExpanded: false,
            };
            parent2.children!.push(leaf);

            // Aggregate to parent : mouvements + À-Nouveau (D/C bruts cumulés).
            parent2.mouvementsDebit = money(parent2.mouvementsDebit).add(money(acc.debit)).toNumber();
            parent2.mouvementsCredit = money(parent2.mouvementsCredit).add(money(acc.credit)).toNumber();
            parent2.soldeDebiteurAN = money(parent2.soldeDebiteurAN).add(money(accAnD)).toNumber();
            parent2.soldeCrediteurAN = money(parent2.soldeCrediteurAN).add(money(accAnC)).toNumber();
            const p2Net = money(parent2.mouvementsDebit).subtract(money(parent2.mouvementsCredit))
              .add(money(parent2.soldeDebiteurAN)).subtract(money(parent2.soldeCrediteurAN)).toNumber();
            parent2.soldeDebiteur = p2Net > 0 ? p2Net : 0;
            parent2.soldeCrediteur = p2Net < 0 ? Math.abs(p2Net) : 0;
          } else if (acc.code.length === 2 && parent2) {
            // 2-digit account: update its own name + À-Nouveau propre
            parent2.libelle = acc.name;
            parent2.mouvementsDebit = money(parent2.mouvementsDebit).add(money(acc.debit)).toNumber();
            parent2.mouvementsCredit = money(parent2.mouvementsCredit).add(money(acc.credit)).toNumber();
            parent2.soldeDebiteurAN = money(parent2.soldeDebiteurAN).add(money(accAnD)).toNumber();
            parent2.soldeCrediteurAN = money(parent2.soldeCrediteurAN).add(money(accAnC)).toNumber();
            const p2Net = money(parent2.mouvementsDebit).subtract(money(parent2.mouvementsCredit))
              .add(money(parent2.soldeDebiteurAN)).subtract(money(parent2.soldeCrediteurAN)).toNumber();
            parent2.soldeDebiteur = p2Net > 0 ? p2Net : 0;
            parent2.soldeCrediteur = p2Net < 0 ? Math.abs(p2Net) : 0;
          } else if (acc.code.length === 1) {
            // 1-digit only — aggregate directly
            classeNode.mouvementsDebit = money(classeNode.mouvementsDebit).add(money(acc.debit)).toNumber();
            classeNode.mouvementsCredit = money(classeNode.mouvementsCredit).add(money(acc.credit)).toNumber();
            classeNode.soldeDebiteurAN = money(classeNode.soldeDebiteurAN).add(money(accAnD)).toNumber();
            classeNode.soldeCrediteurAN = money(classeNode.soldeCrediteurAN).add(money(accAnC)).toNumber();
          }
        }

        // Aggregate class totals from children (mouvements + À-Nouveau).
        for (const cls of Object.values(classeMap)) {
          cls.mouvementsDebit = (cls.children || []).reduce((s, c) => money(s).add(money(c.mouvementsDebit)).toNumber(), 0);
          cls.mouvementsCredit = (cls.children || []).reduce((s, c) => money(s).add(money(c.mouvementsCredit)).toNumber(), 0);
          cls.soldeDebiteurAN = (cls.children || []).reduce((s, c) => money(s).add(money(c.soldeDebiteurAN)).toNumber(), 0);
          cls.soldeCrediteurAN = (cls.children || []).reduce((s, c) => money(s).add(money(c.soldeCrediteurAN)).toNumber(), 0);
          const netCls = money(cls.mouvementsDebit).subtract(money(cls.mouvementsCredit))
            .add(money(cls.soldeDebiteurAN)).subtract(money(cls.soldeCrediteurAN)).toNumber();
          cls.soldeDebiteur = netCls > 0 ? netCls : 0;
          cls.soldeCrediteur = netCls < 0 ? Math.abs(netCls) : 0;
        }

        // Sort and set
        const result = Object.values(classeMap).sort((a, b) => a.code.localeCompare(b.code));
        // Expand first class by default
        if (result.length > 0) result[0].isExpanded = true;
        setAccounts(result);

        // ── Balance auxiliaire PAR TIERS (regroupée sur third_party_code) ──────
        const tiersMap = new Map<string, { code: string; libelle: string; debit: number; credit: number; isClient: boolean }>();
        for (const entry of dbEntries) {
          if ((entry as any).status === 'draft') continue;
          for (const line of ((entry as any).lines || [])) {
            const tpc = line.thirdPartyCode || line.third_party_code;
            if (!tpc) continue;
            const acc = String(line.accountCode || line.account_code || '');
            const isClient = acc.startsWith('41');
            const isSupplier = acc.startsWith('40');
            if (!isClient && !isSupplier) continue;
            const t = tiersMap.get(tpc) || {
              code: tpc,
              libelle: line.thirdPartyName || line.third_party_name || tpc,
              debit: 0, credit: 0, isClient,
            };
            t.debit += Number(line.debit || 0);
            t.credit += Number(line.credit || 0);
            tiersMap.set(tpc, t);
          }
        }
        const toRows = (clientSide: boolean) => Array.from(tiersMap.values())
          .filter(t => t.isClient === clientSide)
          .map(t => ({ code: t.code, libelle: t.libelle, debit: t.debit, credit: t.credit, solde: t.debit - t.credit }))
          .sort((a, b) => Math.abs(b.solde) - Math.abs(a.solde));
        setTiersBalances({ clients: toRows(true), fournisseurs: toRows(false) });
      } catch (err) {
        /* ignored */
      }
    };
    loadBalance();
  }, [adapter]);

  // Balance auxiliaire RÉELLE — dérivée des comptes de tiers (clients 41x,
  // fournisseurs 40x) calculés depuis les écritures. Remplace les anciennes
  // données fictives (Client A SARL, etc.).
  const auxiliaryRows = useMemo(() => {
    // 1) Détail PAR TIERS si les codes tiers sont disponibles (third_party_code).
    let clients = tiersBalances.clients;
    let fournisseurs = tiersBalances.fournisseurs;
    // 2) Sinon repli sur les comptes collectifs (par code de compte).
    if (clients.length === 0 && fournisseurs.length === 0) {
      const leaves: BalanceAccount[] = [];
      const walk = (nodes?: BalanceAccount[]) => (nodes || []).forEach(n => {
        if (n.children && n.children.length) walk(n.children);
        else leaves.push(n);
      });
      walk(accounts);
      const mk = (prefix: string) => leaves
        .filter(l => l.code.startsWith(prefix) && l.code.length > 2)
        .map(l => ({
          code: l.code,
          libelle: l.libelle,
          debit: l.mouvementsDebit || 0,
          credit: l.mouvementsCredit || 0,
          solde: (l.soldeDebiteur || 0) - (l.soldeCrediteur || 0),
        }))
        .sort((a, b) => a.code.localeCompare(b.code));
      clients = mk('41');
      fournisseurs = mk('40');
    }
    return {
      clients,
      fournisseurs,
      totalClients: clients.reduce((s, c) => s + c.solde, 0),
      totalFournisseurs: fournisseurs.reduce((s, c) => s + c.solde, 0),
    };
  }, [accounts, tiersBalances]);

  // Résultat de l'exercice RÉEL : produits (classe 7) − charges (classe 6).
  const resultatExercice = useMemo(() => {
    const find = (c: string) => accounts.find(a => a.code === c);
    const c7 = find('7');
    const c6 = find('6');
    const produits = c7 ? (c7.mouvementsCredit || 0) - (c7.mouvementsDebit || 0) : 0;
    const charges = c6 ? (c6.mouvementsDebit || 0) - (c6.mouvementsCredit || 0) : 0;
    return produits - charges;
  }, [accounts]);

  // Synthèse de clôture RÉELLE par grande masse (bilan 1-5, charges 6, produits 7).
  const clotureSummary = useMemo(() => {
    const get = (c: string) => accounts.find(a => a.code === c);
    const masse = (codes: string[]) => {
      let md = 0, mc = 0, sd = 0, sc = 0;
      for (const c of codes) {
        const n = get(c);
        if (!n) continue;
        md += n.mouvementsDebit || 0; mc += n.mouvementsCredit || 0;
        sd += n.soldeDebiteur || 0; sc += n.soldeCrediteur || 0;
      }
      return { md, mc, sd, sc };
    };
    const bilan = masse(['1', '2', '3', '4', '5']);
    const charges = masse(['6']);
    const produits = masse(['7']);
    return {
      bilan, charges, produits,
      totMvtD: bilan.md + charges.md + produits.md,
      totMvtC: bilan.mc + charges.mc + produits.mc,
      totCloD: bilan.sd + charges.sd + produits.sd,
      totCloC: bilan.sc + charges.sc + produits.sc,
    };
  }, [accounts]);

  const toggleAccount = (code: string, accounts: BalanceAccount[]): BalanceAccount[] => {
    return accounts.map(account => {
      if (account.code === code) {
        return { ...account, isExpanded: !account.isExpanded };
      }
      if (account.children) {
        return { ...account, children: toggleAccount(code, account.children) };
      }
      return account;
    });
  };

  const handleToggle = (code: string) => {
    setAccounts(prev => toggleAccount(code, prev));
  };

  const toggleAllAccounts = (accounts: BalanceAccount[], expand: boolean): BalanceAccount[] => {
    return accounts.map(account => ({
      ...account,
      isExpanded: expand,
      children: account.children ? toggleAllAccounts(account.children, expand) : undefined
    }));
  };

  const formatAmount = (amount: number) => {
    return fmt(amount);
  };

  // Balance âgée : libellé + classes du badge de risque
  const RISQUE_BADGE: Record<AgedReceivable['risque'], { label: string; cls: string }> = {
    faible: { label: 'Faible', cls: 'bg-green-100 text-green-800' },
    moyen: { label: 'Moyen', cls: 'bg-orange-100 text-orange-800' },
    eleve: { label: 'Élevé', cls: 'bg-red-100 text-red-800' },
  };
  const agedCell = (n: number) => (n > 0 ? formatAmount(n) : '—');

  // Fonctions pour les actions rapides
  const handleExportExcel = () => {
    // Créer un fichier Excel avec les données de la balance
    const data = [
      ['Balance de Clôture - Exercice 2024'],
      [''],
      ['Classe', 'Libellé', 'Solde Débit', 'Solde Crédit'],
      ['1-5', 'COMPTES DE BILAN', '18 000 000', '11 500 000'],
      ['6', 'COMPTES DE CHARGES', '23 500 000', '—'],
      ['7', 'COMPTES DE PRODUITS', '—', '37 500 000'],
      ['89', 'RÉSULTAT NET', '14 000 000 (BÉNÉFICE)', ''],
      [''],
      ['TOTAUX GÉNÉRAUX', '', '41 500 000', '63 000 000'],
      ['ÉTAT DE L\'EXERCICE', 'BÉNÉFICIAIRE', '+59.6%', '']
    ];

    // Simuler le téléchargement
    const csvContent = data.map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'balance_cloture_2024.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export Excel généré avec succès !');
  };

  const handleGeneratePDF = () => {
    // Simuler la génération d'un rapport PDF
    toast('Génération du rapport PDF en cours...\n\nLe rapport sera disponible dans quelques instants.');
  };

  const handleSendEmail = () => {
    // Simuler l'envoi par email
    const email = prompt('Entrez l\'adresse email de destination:');
    if (email) {
      toast.success(`Balance de clôture envoyée avec succès à: ${email}\n\nObjet: Balance de Clôture - Exercice 2024\nContenu: Rapport de balance avec synthèse et actions de clôture.`);
    }
  };

  // Fonctions pour les actions des lignes de tableau
  const handleViewAccount = (account: BalanceAccount) => {
    toast(`Consultation du compte:\n\nCode: ${account.code}\nLibellé: ${account.libelle}\nSolde Débiteur: ${formatAmount(account.soldeDebiteur)}\nSolde Créditeur: ${formatAmount(account.soldeCrediteur)}`);
  };

  const handleEditAccount = (account: BalanceAccount) => {
    const newLibelle = prompt(`Modifier le libellé du compte ${account.code}:`, account.libelle);
    if (newLibelle && newLibelle !== account.libelle) {
      // Mettre à jour le compte
      const updatedAccounts = accounts.map(acc =>
        acc.code === account.code
          ? { ...acc, libelle: newLibelle }
          : acc
      );
      setAccounts(updatedAccounts);
      toast.success(`Compte ${account.code} modifié avec succès !`);
    }
  };

  const handleDeleteAccount = (account: BalanceAccount) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le compte ?\n\nCode: ${account.code}\nLibellé: ${account.libelle}\n\nCette action est irréversible.`)) {
      // Supprimer le compte
      const updatedAccounts = accounts.filter(acc => acc.code !== account.code);
      setAccounts(updatedAccounts);
      toast.success(`Compte ${account.code} supprimé avec succès !`);
    }
  };

  const handlePrintAccount = (account: BalanceAccount) => {
    toast.success(`Impression du détail du compte ${account.code} - ${account.libelle}\n\nLe document sera envoyé vers votre imprimante.`);
  };

  const handleExportAccountExcel = (account: BalanceAccount) => {
    const data = [
      [`Détail du compte ${account.code}`],
      [''],
      ['Code', 'Libellé', 'Solde Débiteur', 'Solde Créditeur'],
      [account.code, account.libelle, formatAmount(account.soldeDebiteur), formatAmount(account.soldeCrediteur)]
    ];

    const csvContent = data.map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `compte_${account.code}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Export Excel du compte ${account.code} généré avec succès !`);
  };

  const getNiveauStyle = (niveau: number) => {
    switch (niveau) {
      case 1:
        return 'font-bold text-base bg-[var(--color-primary)]/20';
      case 2:
        return 'font-semibold text-sm bg-[var(--color-text-tertiary)]/10';
      case 3:
        return 'text-sm';
      default:
        return 'text-sm';
    }
  };

  const renderAccounts = (accounts: BalanceAccount[], parentLevel = 0) => {
    return accounts.map((account) => (
      <React.Fragment key={account.code}>
        <tr className={`hover:bg-[var(--color-border)] ${getNiveauStyle(account.niveau)}`}>
          {visibleColumns.compte && (
            <td className={`px-4 py-2 ${account.niveau > 1 ? `pl-${4 + (account.niveau - 1) * 8}` : ''}`}>
              <div className="flex items-center space-x-2">
                {account.children && account.children.length > 0 && (
                  <button
                    onClick={() => handleToggle(account.code)}
                    className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
                  >
                    {account.isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                )}
                {account.niveau === 1 && (
                  <Folder className={`w-4 h-4 text-[var(--color-text-secondary)] ${account.isExpanded ? 'hidden' : ''}`} />
                )}
                {account.niveau === 1 && account.isExpanded && (
                  <FolderOpen className="w-4 h-4 text-[var(--color-text-secondary)]" />
                )}
                <span className={`font-mono ${account.niveau === 1 ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-primary)]'}`}>
                  {account.code}
                </span>
              </div>
            </td>
          )}
          {visibleColumns.libelle && <td className="px-4 py-2">{account.libelle}</td>}
          {visibleColumns.soldeDebiteurAN && (
            <td className="px-4 py-2 text-right">
              {account.soldeDebiteurAN > 0 ? formatAmount(account.soldeDebiteurAN) : '-'}
            </td>
          )}
          {visibleColumns.soldeCrediteurAN && (
            <td className="px-4 py-2 text-right">
              {account.soldeCrediteurAN > 0 ? formatAmount(account.soldeCrediteurAN) : '-'}
            </td>
          )}
          {visibleColumns.mouvementsDebit && (
            <td className="px-4 py-2 text-right text-red-600">
              {account.mouvementsDebit > 0 ? formatAmount(account.mouvementsDebit) : '-'}
            </td>
          )}
          {visibleColumns.mouvementsCredit && (
            <td className="px-4 py-2 text-right text-green-600">
              {account.mouvementsCredit > 0 ? formatAmount(account.mouvementsCredit) : '-'}
            </td>
          )}
          {visibleColumns.soldeDebiteur && (
            <td className="px-4 py-2 text-right font-semibold text-red-600">
              {account.soldeDebiteur > 0 ? formatAmount(account.soldeDebiteur) : '-'}
            </td>
          )}
          {visibleColumns.soldeCrediteur && (
            <td className="px-4 py-2 text-right font-semibold text-green-600">
              {account.soldeCrediteur > 0 ? formatAmount(account.soldeCrediteur) : '-'}
            </td>
          )}
        </tr>
        {account.isExpanded && account.children && renderAccounts(account.children, account.niveau)}
      </React.Fragment>
    ));
  };

  // Calcul des totaux
  const calculateTotals = (accounts: BalanceAccount[]): { soldeDebiteurAN: number; soldeCrediteurAN: number; mouvementsDebit: number; mouvementsCredit: number; soldeDebiteur: number; soldeCrediteur: number } => {
    const totals = {
      soldeDebiteurAN: 0,
      soldeCrediteurAN: 0,
      mouvementsDebit: 0,
      mouvementsCredit: 0,
      soldeDebiteur: 0,
      soldeCrediteur: 0
    };

    const addAccountTotals = (account: BalanceAccount) => {
      if (!account.children || account.children.length === 0) {
        totals.soldeDebiteurAN = money(totals.soldeDebiteurAN).add(money(account.soldeDebiteurAN)).toNumber();
        totals.soldeCrediteurAN = money(totals.soldeCrediteurAN).add(money(account.soldeCrediteurAN)).toNumber();
        totals.mouvementsDebit = money(totals.mouvementsDebit).add(money(account.mouvementsDebit)).toNumber();
        totals.mouvementsCredit = money(totals.mouvementsCredit).add(money(account.mouvementsCredit)).toNumber();
        totals.soldeDebiteur = money(totals.soldeDebiteur).add(money(account.soldeDebiteur)).toNumber();
        totals.soldeCrediteur = money(totals.soldeCrediteur).add(money(account.soldeCrediteur)).toNumber();
      } else {
        account.children.forEach(addAccountTotals);
      }
    };

    accounts.forEach(addAccountTotals);
    return totals;
  };

  const totals = calculateTotals(accounts);

  return (
    <div className="p-6 space-y-6 bg-[var(--color-surface-hover)] min-h-screen">
      <PrintableArea
        ref={printRef}
        documentTitle={`Balance Comptable - ${dateRange.start} au ${dateRange.end}`}
        orientation="landscape"
        showPrintButton={false}
        headerContent={
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold">Balance Comptable</h1>
            <p>Période: {dateRange.start} au {dateRange.end}</p>
          </div>
        }
      >
      {/* En-tête */}
      <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 border border-[var(--color-border)] shadow-sm print-hide">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Scale className="w-6 h-6 text-[var(--color-primary)]" />
            <div>
              <h2 className="text-lg font-bold text-[var(--color-primary)]">Balance Générale</h2>
              <p className="text-sm text-[var(--color-primary)]/70">Vue synthétique des comptes</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Bouton de sélection de période */}
            <button
              onClick={() => setShowPeriodModal(true)}
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] text-left flex items-center space-x-2 hover:bg-gray-50"
            >
              <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-sm">
                {dateRange.start && dateRange.end
                  ? `${new Date(dateRange.start).toLocaleDateString('fr-FR')} - ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                  : 'Période'
                }
              </span>
            </button>

            {/* BOUTONS DE MODE D'AFFICHAGE */}
            <div className="flex bg-[var(--color-border)] rounded-lg p-1">
              <button
                onClick={() => setViewMode('tree')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-[var(--color-primary)] text-[var(--color-surface-hover)]'
                    : 'text-[var(--color-primary)]/70 hover:bg-[var(--color-border)]'
                }`}
              >
                Arborescence
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--color-primary)] text-[var(--color-surface-hover)]'
                    : 'text-[var(--color-primary)]/70 hover:bg-[var(--color-border)]'
                }`}
              >
                Liste
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[var(--color-primary)] text-[var(--color-surface-hover)]'
                    : 'text-[var(--color-primary)]/70 hover:bg-[var(--color-border)]'
                }`}
              >
                Grille
              </button>
            </div>

            <select
              value={balanceType}
              onChange={(e) => setBalanceType(e.target.value as typeof balanceType)}
              className="px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="generale">Balance Générale</option>
              <option value="auxiliaire">Balance Auxiliaire</option>
              <option value="agee">Balance Âgée</option>
              <option value="cloture">Balance de Clôture</option>
            </select>

            <div className="relative">
              <button
                onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
                className="px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-border)] flex items-center space-x-1"
              >
                <Columns className="w-4 h-4" />
                <span>Colonnes ({columnCount})</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showColumnsDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Format d'affichage des colonnes</h3>
                    <div className="space-y-3">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="columnFormat"
                          checked={columnCount === 4}
                          onChange={() => setColumnCount(4)}
                          className="mt-1 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">4 colonnes (Version simplifiée)</div>
                          <div className="text-xs text-gray-700 mt-1">
                            N° compte • Intitulé • Total Débit • Total Crédit
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="columnFormat"
                          checked={columnCount === 5}
                          onChange={() => setColumnCount(5)}
                          className="mt-1 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">5 colonnes (Version intermédiaire)</div>
                          <div className="text-xs text-gray-700 mt-1">
                            N° compte • Intitulé • Total Débit • Total Crédit • Solde (avec mention D/C)
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="columnFormat"
                          checked={columnCount === 6}
                          onChange={() => setColumnCount(6)}
                          className="mt-1 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">6 colonnes (Version complète SYSCOHADA)</div>
                          <div className="text-xs text-gray-700 mt-1">
                            N° compte • Intitulé • Total Débit • Total Crédit • Solde Débiteur • Solde Créditeur
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button className="px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors flex items-center space-x-1" aria-label="Actualiser">
              <RefreshCw className="w-4 h-4" />
              <span>{t('common.refresh')}</span>
            </button>

          </div>
        </div>
      </div>



      {/* Table de la balance - Mode Arborescence */}
      {viewMode === 'tree' && balanceType === 'generale' && (
        <div className="bg-white rounded-lg border-2 border-[var(--color-primary)] overflow-hidden shadow-lg h-[600px] flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {visibleColumns.compte && <th className="px-4 py-3 text-left font-semibold text-[var(--color-primary)]">{t('accounting.account')}</th>}
                  {visibleColumns.libelle && <th className="px-4 py-3 text-left font-semibold text-[var(--color-primary)]">{t('accounting.label')}</th>}
                  {(visibleColumns.soldeDebiteurAN || visibleColumns.soldeCrediteurAN) && (
                    <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]"
                        colSpan={(visibleColumns.soldeDebiteurAN && visibleColumns.soldeCrediteurAN) ? 2 : 1}>
                      <div className="text-center">Soldes à nouveau</div>
                    </th>
                  )}
                  {(visibleColumns.mouvementsDebit || visibleColumns.mouvementsCredit) && (
                    <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]"
                        colSpan={(visibleColumns.mouvementsDebit && visibleColumns.mouvementsCredit) ? 2 : 1}>
                      <div className="text-center">Mouvements période</div>
                    </th>
                  )}
                  {(visibleColumns.soldeDebiteur || visibleColumns.soldeCrediteur) && (
                    <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]"
                        colSpan={(visibleColumns.soldeDebiteur && visibleColumns.soldeCrediteur) ? 2 : 1}>
                      <div className="text-center">Soldes fin période</div>
                    </th>
                  )}
                </tr>
                <tr className="text-xs text-[var(--color-text-tertiary)]">
                  {visibleColumns.compte && <th className="px-4 py-2 text-left font-medium"></th>}
                  {visibleColumns.libelle && <th className="px-4 py-2 text-left font-medium"></th>}
                  {visibleColumns.soldeDebiteurAN && <th className="px-4 py-2 text-right font-medium">Débiteur</th>}
                  {visibleColumns.soldeCrediteurAN && <th className="px-4 py-2 text-right font-medium">Créditeur</th>}
                  {visibleColumns.mouvementsDebit && <th className="px-4 py-2 text-right font-medium">{t('accounting.debit')}</th>}
                  {visibleColumns.mouvementsCredit && <th className="px-4 py-2 text-right font-medium">{t('accounting.credit')}</th>}
                  {visibleColumns.soldeDebiteur && <th className="px-4 py-2 text-right font-medium">Débiteur</th>}
                  {visibleColumns.soldeCrediteur && <th className="px-4 py-2 text-right font-medium">Créditeur</th>}
                </tr>
              </thead>
              <tbody>
                {renderAccounts(accounts)}

                {/* Ligne de totaux */}
                <tr className="bg-[var(--color-text-secondary)]/20 font-bold border-t-2 border-[var(--color-text-secondary)]">
                  <td colSpan={(visibleColumns.compte ? 1 : 0) + (visibleColumns.libelle ? 1 : 0)} className="px-4 py-3 text-[var(--color-primary)]">TOTAUX</td>
                  {visibleColumns.soldeDebiteurAN && <td className="px-4 py-3 text-right">{formatAmount(totals.soldeDebiteurAN)}</td>}
                  {visibleColumns.soldeCrediteurAN && <td className="px-4 py-3 text-right">{formatAmount(totals.soldeCrediteurAN)}</td>}
                  {visibleColumns.mouvementsDebit && <td className="px-4 py-3 text-right text-red-600">{formatAmount(totals.mouvementsDebit)}</td>}
                  {visibleColumns.mouvementsCredit && <td className="px-4 py-3 text-right text-green-600">{formatAmount(totals.mouvementsCredit)}</td>}
                  {visibleColumns.soldeDebiteur && <td className="px-4 py-3 text-right text-red-600">{formatAmount(totals.soldeDebiteur)}</td>}
                  {visibleColumns.soldeCrediteur && <td className="px-4 py-3 text-right text-green-600">{formatAmount(totals.soldeCrediteur)}</td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mode Liste */}
      {viewMode === 'list' && balanceType === 'generale' && (
        <div className="bg-white rounded-lg border-2 border-[var(--color-primary)] overflow-hidden shadow-lg h-[600px] flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-primary)]">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-primary)]">N° Compte</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-primary)]">Intitulé</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]">Total Débit</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]">Total Crédit</th>
                  {columnCount >= 5 && (
                    <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]">{t('accounting.balance')}</th>
                  )}
                  {columnCount === 6 && (
                    <>
                      <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]">Solde Débiteur</th>
                      <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]">Solde Créditeur</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center font-semibold text-[var(--color-primary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Aplatir tous les comptes pour la vue liste */}
                {accounts.flatMap(classe => [
                  classe,
                  ...(classe.children || []).flatMap(compte => [
                    compte,
                    ...(compte.children || [])
                  ])
                ]).map((account, index) => (
                  <tr key={`${account.code}-${index}`} className="hover:bg-gray-50 border-b">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedAccounts.includes(account.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAccounts([...selectedAccounts, account.code]);
                          } else {
                            setSelectedAccounts(selectedAccounts.filter(acc => acc !== account.code));
                          }
                        }}
                      />
                    </td>
                    <td className={`px-4 py-2 font-mono ${account.niveau === 1 ? 'font-bold text-[var(--color-text-secondary)]' : 'text-[var(--color-primary)]'}`}>
                      {account.code}
                    </td>
                    <td className={`px-4 py-2 ${account.niveau === 1 ? 'font-bold' : ''}`}>
                      {account.libelle}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600">
                      {account.mouvementsDebit > 0 ? formatAmount(account.mouvementsDebit) : '-'}
                    </td>
                    <td className="px-4 py-2 text-right text-green-600">
                      {account.mouvementsCredit > 0 ? formatAmount(account.mouvementsCredit) : '-'}
                    </td>
                    {columnCount >= 5 && (
                      <td className="px-4 py-2 text-right font-semibold">
                        {account.soldeDebiteur > 0
                          ? `${formatAmount(account.soldeDebiteur)} D`
                          : account.soldeCrediteur > 0
                          ? `${formatAmount(account.soldeCrediteur)} C`
                          : '-'}
                      </td>
                    )}
                    {columnCount === 6 && (
                      <>
                        <td className="px-4 py-2 text-right font-semibold text-red-600">
                          {account.soldeDebiteur > 0 ? formatAmount(account.soldeDebiteur) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-green-600">
                          {account.soldeCrediteur > 0 ? formatAmount(account.soldeCrediteur) : '-'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900 transition-colors mr-2"
                          title="Voir détail"
                          onClick={() => handleViewAccount(account)}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="text-green-600 hover:text-green-800 transition-colors mr-2"
                          title="Modifier le compte"
                          onClick={() => handleEditAccount(account)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          className="text-orange-600 hover:text-orange-800 transition-colors mr-2"
                          title="Exporter le compte"
                          onClick={() => handleExportAccountExcel(account)}
                        >
                          <ExportMenu
                            data={[account] as unknown as Record<string, unknown>[]}
                            filename={`compte-${account.code}`}
                            columns={{
                              code: 'Code',
                              libelle: 'Libellé',
                              soldeDebiteur: 'Solde Débiteur',
                              soldeCrediteur: 'Solde Créditeur'
                            }}
                            buttonText=""
                            buttonVariant="ghost"
                          />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Supprimer le compte"
                          onClick={() => handleDeleteAccount(account)}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Ligne de totaux */}
              <tfoot className="bg-[var(--color-text-secondary)]/20 font-bold">
                <tr className="border-t-2 border-[var(--color-text-secondary)]">
                  <td className="px-4 py-3"></td>
                  <td colSpan={2} className="px-4 py-3 text-[var(--color-primary)]">TOTAUX</td>
                  <td className="px-4 py-3 text-right">{formatAmount(totals.soldeDebiteurAN)}</td>
                  <td className="px-4 py-3 text-right">{formatAmount(totals.soldeCrediteurAN)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatAmount(totals.mouvementsDebit)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatAmount(totals.mouvementsCredit)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatAmount(totals.soldeDebiteur)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatAmount(totals.soldeCrediteur)}</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Mode Grille */}
      {viewMode === 'grid' && balanceType === 'generale' && (
        <div className="bg-white rounded-lg border-2 border-[var(--color-primary)] overflow-hidden shadow-lg h-[600px] flex flex-col">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold text-[var(--color-primary)]">Balance Générale - Vue Grille</h3>
          </div>
          <div className="overflow-auto flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {accounts.map((account) => (
                <div key={account.code} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {account.niveau === 1 ? (
                        <Folder className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      ) : (
                        <FileText className="w-4 h-4 text-[var(--color-primary)]" />
                      )}
                      <span className={`font-mono text-sm ${account.niveau === 1 ? 'text-[var(--color-text-secondary)] font-bold' : 'text-[var(--color-primary)]'}`}>
                        {account.code}
                      </span>
                    </div>
                    {account.children && account.children.length > 0 && (
                      <button
                        onClick={() => handleToggle(account.code)}
                        className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
                      >
                        {account.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  <h4 className={`text-sm mb-3 ${account.niveau === 1 ? 'font-semibold' : ''}`}>
                    {account.libelle}
                  </h4>

                  <div className="space-y-2 text-xs">
                    {(account.soldeDebiteurAN > 0 || account.soldeCrediteurAN > 0) && (
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Solde AN:</span>
                        <span className={account.soldeDebiteurAN > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                          {account.soldeDebiteurAN > 0 ? `D: ${formatAmount(account.soldeDebiteurAN)}` : `C: ${formatAmount(account.soldeCrediteurAN)}`}
                        </span>
                      </div>
                    )}

                    {(account.mouvementsDebit > 0 || account.mouvementsCredit > 0) && (
                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Mouvements:</span>
                        <div className="text-right">
                          {account.mouvementsDebit > 0 && (
                            <div className="text-red-600">D: {formatAmount(account.mouvementsDebit)}</div>
                          )}
                          {account.mouvementsCredit > 0 && (
                            <div className="text-green-600">C: {formatAmount(account.mouvementsCredit)}</div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span className="text-gray-600 font-semibold">Solde Final:</span>
                      <span className={account.soldeDebiteur > 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                        {account.soldeDebiteur > 0 ? `D: ${formatAmount(account.soldeDebiteur)}` : `C: ${formatAmount(account.soldeCrediteur)}`}
                      </span>
                    </div>
                  </div>

                  {account.isExpanded && account.children && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {account.children.map((child) => (
                        <div key={child.code} className="pl-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">{child.code} - {child.libelle}</span>
                            <span className={child.soldeDebiteur > 0 ? "text-red-600" : "text-green-600"}>
                              {child.soldeDebiteur > 0 ? formatAmount(child.soldeDebiteur) : formatAmount(child.soldeCrediteur)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Balance Auxiliaire */}
      {balanceType === 'auxiliaire' && (
        <>
          {viewMode === 'tree' && (
            <div className="bg-white rounded-lg border-2 border-[var(--color-primary)] overflow-hidden shadow-lg h-[600px] flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)]">Balance Auxiliaire - Vue Arborescence</h3>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm">Clients (411)</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">Fournisseurs (401)</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">Personnel (421)</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">Associés (455)</button>
                  </div>
                </div>
              </div>
              <div className="overflow-auto flex-1 p-4">
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <ChevronDown className="w-4 h-4 text-[var(--color-primary)]" />
                        <span className="font-bold text-[var(--color-primary)]">41 - CLIENTS</span>
                      </div>
                      <span className="font-semibold">Solde Total: {formatCurrency(auxiliaryRows.totalClients)}</span>
                    </div>
                    <div className="ml-6 space-y-2">
                      {auxiliaryRows.clients.length === 0 && (
                        <p className="text-sm text-gray-500">Aucun compte client mouvementé sur la période.</p>
                      )}
                      {auxiliaryRows.clients.map(c => (
                        <div key={c.code} className="flex items-center justify-between p-2 bg-white rounded">
                          <span className="text-sm">{c.code} - {c.libelle}</span>
                          <span className="text-sm font-semibold">{formatCurrency(c.solde)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4 bg-orange-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <ChevronRight className="w-4 h-4 text-[var(--color-primary)]" />
                        <span className="font-bold text-[var(--color-primary)]">40 - FOURNISSEURS</span>
                      </div>
                      <span className="font-semibold">Solde Total: {formatCurrency(auxiliaryRows.totalFournisseurs)}</span>
                    </div>
                    <div className="ml-6 space-y-2">
                      {auxiliaryRows.fournisseurs.length === 0 && (
                        <p className="text-sm text-gray-500">Aucun compte fournisseur mouvementé sur la période.</p>
                      )}
                      {auxiliaryRows.fournisseurs.map(c => (
                        <div key={c.code} className="flex items-center justify-between p-2 bg-white rounded">
                          <span className="text-sm">{c.code} - {c.libelle}</span>
                          <span className="text-sm font-semibold">{formatCurrency(c.solde)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'list' && (
            <div className="bg-white rounded-lg border-2 border-[var(--color-primary)] overflow-hidden shadow-lg h-[600px] flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)]">Balance Auxiliaire - Vue Liste</h3>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm">Clients (411)</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">Fournisseurs (401)</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">Personnel (421)</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">Associés (455)</button>
                  </div>
                </div>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-primary)]">{t('accounting.account')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-primary)]">Tiers</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]">Solde Antérieur</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]">Débit Période</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]">Crédit Période</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]">Solde Final</th>
                  <th className="px-4 py-3 text-center font-semibold text-[var(--color-primary)]">{t('thirdParty.reconciliation')}</th>
                  <th className="px-4 py-3 text-center font-semibold text-[var(--color-primary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...auxiliaryRows.clients, ...auxiliaryRows.fournisseurs].length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                      Aucun compte auxiliaire mouvementé sur la période.
                    </td>
                  </tr>
                )}
                {[...auxiliaryRows.clients, ...auxiliaryRows.fournisseurs].map((row) => (
                  <tr key={row.code} className="hover:bg-gray-50 border-b">
                    <td className="px-4 py-2 font-mono text-[var(--color-primary)]">{row.code}</td>
                    <td className="px-4 py-2">{row.libelle}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(0)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{formatCurrency(row.debit)}</td>
                    <td className="px-4 py-2 text-right text-green-600">{formatCurrency(row.credit)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatCurrency(row.solde)}</td>
                    <td className="px-4 py-2 text-center">—</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        className="text-blue-600 hover:text-blue-900 mr-2"
                        onClick={() => toast('Consultation des détails du compte')}
                        title="Voir détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          )}

          {viewMode === 'grid' && (
            <div className="bg-white rounded-lg border-2 border-[var(--color-primary)] overflow-hidden shadow-lg h-[600px] flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">Balance Auxiliaire - Vue Grille</h3>
              </div>
              <div className="overflow-auto flex-1 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...auxiliaryRows.clients, ...auxiliaryRows.fournisseurs].length === 0 && (
                    <p className="text-sm text-gray-500 col-span-full">Aucun compte auxiliaire mouvementé sur la période.</p>
                  )}
                  {[...auxiliaryRows.clients, ...auxiliaryRows.fournisseurs].map((row) => {
                    const isClient = row.code.startsWith('41');
                    return (
                      <div key={row.code} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            {isClient
                              ? <Users className="w-5 h-5 text-[var(--color-text-secondary)]" />
                              : <Building className="w-5 h-5 text-[var(--color-primary)]" />}
                            <span className="font-mono text-sm text-[var(--color-primary)] font-bold">{row.code}</span>
                          </div>
                        </div>

                        <h4 className="text-sm mb-3 font-semibold">{row.libelle}</h4>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                            <span className="text-gray-600">Mouvements:</span>
                            <div className="text-right">
                              <div className="text-red-600">D: {formatCurrency(row.debit)}</div>
                              <div className="text-green-600">C: {formatCurrency(row.credit)}</div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                            <span className="text-gray-600 font-semibold">Solde Final:</span>
                            <span className={`font-bold ${row.solde >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {row.solde >= 0 ? 'D' : 'C'}: {formatCurrency(Math.abs(row.solde))}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Balance Âgée */}
      {balanceType === 'agee' && (
        <>
          {viewMode === 'tree' && (
        <div className="bg-white rounded-lg border-2 border-[var(--color-primary)] overflow-hidden shadow-lg h-[600px] flex flex-col">
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-primary)]">Balance Âgée des Créances</h3>
              <div className="flex space-x-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm">Non échu</span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md text-sm">0-30 jours</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-md text-sm">31-60 jours</span>
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm">&gt;60 jours</span>
              </div>
            </div>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-primary)]">Client</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]">Solde Total</th>
                  <th className="px-4 py-3 text-right font-semibold text-green-700">Non échu</th>
                  <th className="px-4 py-3 text-right font-semibold text-yellow-700">0-30 jours</th>
                  <th className="px-4 py-3 text-right font-semibold text-orange-700">31-60 jours</th>
                  <th className="px-4 py-3 text-right font-semibold text-red-700">&gt;60 jours</th>
                  <th className="px-4 py-3 text-center font-semibold text-[var(--color-primary)]">Risque</th>
                  <th className="px-4 py-3 text-center font-semibold text-[var(--color-primary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agedReceivables.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-[var(--color-text-secondary)]">
                      Aucune créance client sur la période.
                    </td>
                  </tr>
                )}
                {agedReceivables.map((r) => (
                  <tr key={r.clientCode} className="hover:bg-gray-50 border-b">
                    <td className="px-4 py-2">
                      <div>
                        <span className="font-mono text-[var(--color-primary)]">{r.clientCode}</span> - {r.clientName}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">{formatAmount(r.total)}</td>
                    <td className="px-4 py-2 text-right text-green-600">{agedCell(r.nonEchu)}</td>
                    <td className="px-4 py-2 text-right text-yellow-600">{agedCell(r.days0_30)}</td>
                    <td className="px-4 py-2 text-right text-orange-600">{agedCell(r.days31_60)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{agedCell(r.days60plus)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${RISQUE_BADGE[r.risque].cls}`}>{RISQUE_BADGE[r.risque].label}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        className="text-blue-600 hover:text-blue-900 mr-2"
                        onClick={() => toast(`Créances de ${r.clientName}`)}
                        title="Voir détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="text-orange-600 hover:text-orange-800"
                        onClick={() => toast.success(`Relance envoyée à ${r.clientName}`)}
                        title="Envoyer relance"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          )}

          {viewMode === 'list' && (
            <div className="bg-white rounded-lg border-2 border-[var(--color-primary)] overflow-hidden shadow-lg h-[600px] flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">Balance Âgée - Vue Liste</h3>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left">{t('accounting.account')}</th>
                      <th className="px-4 py-3 text-left">Client</th>
                      <th className="px-4 py-3 text-right">Solde Total</th>
                      <th className="px-4 py-3 text-right">Non échu</th>
                      <th className="px-4 py-3 text-right">0-30 jours</th>
                      <th className="px-4 py-3 text-right">31-60 jours</th>
                      <th className="px-4 py-3 text-right">&gt;60 jours</th>
                      <th className="px-4 py-3 text-center">Risque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agedReceivables.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-[var(--color-text-secondary)]">
                          Aucune créance client sur la période.
                        </td>
                      </tr>
                    )}
                    {agedReceivables.map((r) => (
                      <tr key={r.clientCode} className="hover:bg-gray-50 border-b">
                        <td className="px-4 py-2 font-mono text-[var(--color-primary)]">{r.clientCode}</td>
                        <td className="px-4 py-2">{r.clientName}</td>
                        <td className="px-4 py-2 text-right font-semibold">{formatAmount(r.total)}</td>
                        <td className="px-4 py-2 text-right text-green-600">{agedCell(r.nonEchu)}</td>
                        <td className="px-4 py-2 text-right text-yellow-600">{agedCell(r.days0_30)}</td>
                        <td className="px-4 py-2 text-right text-orange-600">{agedCell(r.days31_60)}</td>
                        <td className="px-4 py-2 text-right text-red-600">{agedCell(r.days60plus)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${RISQUE_BADGE[r.risque].cls}`}>{RISQUE_BADGE[r.risque].label}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="bg-white rounded-lg border-2 border-[var(--color-primary)] overflow-hidden shadow-lg h-[600px] flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">Balance Âgée - Vue Grille</h3>
              </div>
              <div className="overflow-auto flex-1 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {agedReceivables.length === 0 && (
                    <div className="col-span-full py-10 text-center text-[var(--color-text-secondary)]">
                      Aucune créance client sur la période.
                    </div>
                  )}
                  {agedReceivables.map((r) => (
                    <div key={r.clientCode} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Users className="w-5 h-5 text-[var(--color-text-secondary)]" />
                          <span className="font-mono text-sm text-[var(--color-text-secondary)] font-bold">{r.clientCode}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${RISQUE_BADGE[r.risque].cls}`}>{RISQUE_BADGE[r.risque].label}</span>
                      </div>

                      <h4 className="text-sm mb-3 font-semibold">{r.clientName}</h4>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <span className="text-gray-600">Non échu:</span>
                          <span className="text-green-600 font-semibold">{agedCell(r.nonEchu)}</span>
                        </div>

                        <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                          <span className="text-gray-600">0-30j:</span>
                          <span className="text-yellow-600 font-semibold">{agedCell(r.days0_30)}</span>
                        </div>

                        <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                          <span className="text-gray-600">31-60j:</span>
                          <span className="text-orange-600 font-semibold">{agedCell(r.days31_60)}</span>
                        </div>

                        <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                          <span className="text-gray-600">&gt;60j:</span>
                          <span className="text-red-600 font-semibold">{agedCell(r.days60plus)}</span>
                        </div>

                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                          <span className="text-gray-600 font-semibold">Total:</span>
                          <span className="text-blue-600 font-bold">{formatAmount(r.total)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Balance de Clôture */}
      {balanceType === 'cloture' && (
        <>
          {viewMode === 'tree' && (
        <div className="bg-white rounded-lg border-2 border-[var(--color-primary)] overflow-hidden shadow-lg h-[600px] flex flex-col">
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-primary)]">Balance de Clôture</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Exercice: {(dateRange.start || '').slice(0, 4)}</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm">État: En cours</span>
              </div>
            </div>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-primary)]">{t('accounting.account')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-primary)]">{t('accounting.label')}</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]" colSpan={2}>
                    <div className="text-center">Soldes d'ouverture</div>
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]" colSpan={2}>
                    <div className="text-center">Mouvements de l'exercice</div>
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-primary)]" colSpan={2}>
                    <div className="text-center">Soldes de clôture</div>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-[var(--color-primary)]">Affectation</th>
                </tr>
                <tr className="text-xs text-[var(--color-text-tertiary)]">
                  <th className="px-4 py-2"></th>
                  <th className="px-4 py-2"></th>
                  <th className="px-4 py-2 text-right">{t('accounting.debit')}</th>
                  <th className="px-4 py-2 text-right">{t('accounting.credit')}</th>
                  <th className="px-4 py-2 text-right">{t('accounting.debit')}</th>
                  <th className="px-4 py-2 text-right">{t('accounting.credit')}</th>
                  <th className="px-4 py-2 text-right">{t('accounting.debit')}</th>
                  <th className="px-4 py-2 text-right">{t('accounting.credit')}</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 border-b bg-blue-50">
                  <td className="px-4 py-2 font-mono text-[var(--color-primary)] font-bold">1-5</td>
                  <td className="px-4 py-2 font-semibold">BILAN</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(0)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(0)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{formatCurrency(clotureSummary.bilan.md)}</td>
                  <td className="px-4 py-2 text-right text-green-600">{formatCurrency(clotureSummary.bilan.mc)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(clotureSummary.bilan.sd)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(clotureSummary.bilan.sc)}</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{t('accounting.balanceSheet')}</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 border-b bg-green-50">
                  <td className="px-4 py-2 font-mono text-[var(--color-primary)] font-bold">6</td>
                  <td className="px-4 py-2 font-semibold">CHARGES</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(0)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(0)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{formatCurrency(clotureSummary.charges.md)}</td>
                  <td className="px-4 py-2 text-right text-green-600">{formatCurrency(clotureSummary.charges.mc)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-red-600">{formatCurrency(clotureSummary.charges.sd)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(clotureSummary.charges.sc)}</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Résultat</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 border-b bg-green-50">
                  <td className="px-4 py-2 font-mono text-[var(--color-primary)] font-bold">7</td>
                  <td className="px-4 py-2 font-semibold">PRODUITS</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(0)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(0)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{formatCurrency(clotureSummary.produits.md)}</td>
                  <td className="px-4 py-2 text-right text-green-600">{formatCurrency(clotureSummary.produits.mc)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(clotureSummary.produits.sd)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-green-600">{formatCurrency(clotureSummary.produits.sc)}</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Résultat</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 border-b bg-yellow-50">
                  <td className="px-4 py-2 font-mono text-[var(--color-primary)] font-bold">89</td>
                  <td className="px-4 py-2 font-semibold">RÉSULTAT NET</td>
                  <td className="px-4 py-2 text-right">0,00</td>
                  <td className="px-4 py-2 text-right">0,00</td>
                  <td className="px-4 py-2 text-right">0,00</td>
                  <td className="px-4 py-2 text-right">0,00</td>
                  <td className="px-4 py-2 text-right font-semibold">0,00</td>
                  <td className={`px-4 py-2 text-right font-semibold ${resultatExercice >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(resultatExercice)}</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Calculé</span>
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-[var(--color-text-secondary)]/20 font-bold">
                <tr className="border-t-2 border-[var(--color-text-secondary)]">
                  <td colSpan={2} className="px-4 py-3 text-[var(--color-primary)]">TOTAUX</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(0)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(0)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatCurrency(clotureSummary.totMvtD)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(clotureSummary.totMvtC)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatCurrency(clotureSummary.totCloD)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(clotureSummary.totCloC)}</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className={`text-sm font-semibold ${resultatExercice >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Résultat de l'exercice: {formatCurrency(Math.abs(resultatExercice))} ({resultatExercice >= 0 ? 'Bénéfice' : 'Perte'})
                </span>
              </div>
              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] text-sm">
                  Valider la clôture
                </button>
                <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
          )}

          {viewMode === 'list' && (
            <div className="bg-white rounded-lg border-2 border-[var(--color-primary)] overflow-hidden shadow-lg h-[600px] flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">Balance de Clôture - Vue Liste</h3>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left">{t('accounting.account')}</th>
                      <th className="px-4 py-3 text-left">{t('accounting.label')}</th>
                      <th className="px-4 py-3 text-right">Solde Ouverture</th>
                      <th className="px-4 py-3 text-right">Mouvements</th>
                      <th className="px-4 py-3 text-right">Solde Clôture</th>
                      <th className="px-4 py-3 text-center">Affectation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { code: '1-5', label: 'BILAN', m: clotureSummary.bilan, aff: t('accounting.balanceSheet') },
                      { code: '6', label: 'CHARGES', m: clotureSummary.charges, aff: 'Résultat' },
                      { code: '7', label: 'PRODUITS', m: clotureSummary.produits, aff: 'Résultat' },
                    ].map((r) => (
                      <tr key={r.code} className="hover:bg-gray-50 border-b">
                        <td className="px-4 py-2 font-mono text-[var(--color-primary)]">{r.code}</td>
                        <td className="px-4 py-2">{r.label}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(0)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(r.m.md + r.m.mc)}</td>
                        <td className="px-4 py-2 text-right font-semibold">{formatCurrency(r.m.sd - r.m.sc)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{r.aff}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="bg-white rounded-lg border-2 border-[var(--color-primary)] overflow-hidden shadow-lg h-[600px] flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">Balance de Clôture - Vue Grille</h3>
              </div>
              <div className="overflow-auto flex-1 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

                  {/* Carte BILAN */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Scale className="w-5 h-5 text-[var(--color-primary)]" />
                        <span className="font-mono text-sm text-[var(--color-primary)] font-bold">1-5</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">COMPTES DE BILAN</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Solde AN:</span>
                        <span className="text-gray-700 font-semibold">—</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Mouvements:</span>
                        <div className="text-right">
                          <div className="text-red-600">D: {formatCurrency(clotureSummary.bilan.md)}</div>
                          <div className="text-green-600">C: {formatCurrency(clotureSummary.bilan.mc)}</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600 font-semibold">Solde Final:</span>
                        <span className="text-blue-600 font-bold">D: {formatCurrency(clotureSummary.bilan.sd)} | C: {formatCurrency(clotureSummary.bilan.sc)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Carte CHARGES */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <TrendingDown className="w-5 h-5 text-[var(--color-text-secondary)]" />
                        <span className="font-mono text-sm text-[var(--color-text-secondary)] font-bold">6</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">COMPTES DE CHARGES</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Solde AN:</span>
                        <span className="text-gray-700 font-semibold">—</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Mouvements:</span>
                        <div className="text-right">
                          <div className="text-red-600">D: {formatCurrency(clotureSummary.charges.md)}</div>
                          <div className="text-gray-700">C: {formatCurrency(clotureSummary.charges.mc)}</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600 font-semibold">Solde Final:</span>
                        <span className="text-red-600 font-bold">D: {formatCurrency(clotureSummary.charges.sd)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Carte PRODUITS */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="font-mono text-sm text-green-600 font-bold">7</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">COMPTES DE PRODUITS</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Solde AN:</span>
                        <span className="text-gray-700 font-semibold">—</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Mouvements:</span>
                        <div className="text-right">
                          <div className="text-gray-700">D: {formatCurrency(clotureSummary.produits.md)}</div>
                          <div className="text-green-600">C: {formatCurrency(clotureSummary.produits.mc)}</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600 font-semibold">Solde Final:</span>
                        <span className="text-green-600 font-bold">C: {formatCurrency(clotureSummary.produits.sc)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Carte RÉSULTAT NET */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Calculator className="w-5 h-5 text-[var(--color-text-secondary)]" />
                        <span className="font-mono text-sm text-[var(--color-text-secondary)] font-bold">89</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">RÉSULTAT NET</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Exercice:</span>
                        <span className={`font-semibold ${resultatExercice >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(resultatExercice))}</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600">Type:</span>
                        <span className={`font-bold ${resultatExercice >= 0 ? 'text-green-600' : 'text-red-600'}`}>{resultatExercice >= 0 ? 'BÉNÉFICE' : 'PERTE'}</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Marge nette:</span>
                        <span className="text-orange-600 font-bold">{(() => { const p = clotureSummary.produits.mc - clotureSummary.produits.md; return p > 0 ? ((resultatExercice / p) * 100).toFixed(1) : '0'; })()}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Carte Synthèse Globale */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="w-5 h-5 text-[var(--color-primary)]" />
                        <span className="font-mono text-sm text-[var(--color-primary)] font-bold">ΣΣ</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">SYNTHÈSE DE CLÔTURE</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Total Débit:</span>
                        <span className="text-red-600 font-semibold">{formatCurrency(clotureSummary.totCloD)}</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Total Crédit:</span>
                        <span className="text-green-600 font-semibold">{formatCurrency(clotureSummary.totCloC)}</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600 font-semibold">État:</span>
                        <span className={`font-bold ${resultatExercice >= 0 ? 'text-green-600' : 'text-red-600'}`}>{resultatExercice >= 0 ? 'BÉNÉFICIAIRE' : 'DÉFICITAIRE'}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <button className="w-full px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] text-sm font-semibold">
                        Valider la clôture
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Actions rapides */}
          {viewMode === 'grid' && (
            <div className="mt-4 bg-white rounded-lg border-2 border-[var(--color-primary)] p-4 shadow-lg">
              <h4 className="font-bold text-[var(--color-primary)] mb-3">Actions rapides</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium flex items-center justify-center transition-all"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </button>
                <ExportMenu
                  data={accounts as unknown as Record<string, unknown>[]}
                  filename="balance-comptable"
                  columns={{
                    code: 'Code',
                    libelle: 'Libellé',
                    soldeDebiteurAN: 'Solde Débiteur AN',
                    soldeCrediteurAN: 'Solde Créditeur AN',
                    mouvementsDebit: 'Mouvements Débit',
                    mouvementsCredit: 'Mouvements Crédit',
                    soldeDebiteur: 'Solde Débiteur',
                    soldeCrediteur: 'Solde Créditeur'
                  }}
                  buttonText="Exporter Excel"
                  buttonVariant="outline"
                />
                <button
                  onClick={handleGeneratePDF}
                  className="px-3 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 text-sm font-medium flex items-center justify-center transition-all"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Rapport PDF
                </button>
                <button
                  onClick={handleSendEmail}
                  className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm font-medium flex items-center justify-center transition-all"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Envoyer
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Résumé */}
      {balanceType === 'generale' && (
        <div className="bg-white rounded-lg p-4 border-2 border-[var(--color-text-secondary)]">
        <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-3 flex items-center">
          <Calculator className="w-5 h-5 mr-2 text-[var(--color-text-secondary)]" />
          Contrôle d'équilibre
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-[var(--color-text-tertiary)]">Balance A Nouveau</p>
            <div className="mt-2">
              <p className="text-sm">Débit: <span className="font-bold">{formatAmount(totals.soldeDebiteurAN)}</span></p>
              <p className="text-sm">Crédit: <span className="font-bold">{formatAmount(totals.soldeCrediteurAN)}</span></p>
            </div>
            {totals.soldeDebiteurAN === totals.soldeCrediteurAN && (
              <p className="text-green-600 text-sm mt-1">Équilibrée</p>
            )}
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-[var(--color-text-tertiary)]">Mouvements Période</p>
            <div className="mt-2">
              <p className="text-sm">Débit: <span className="font-bold text-red-600">{formatAmount(totals.mouvementsDebit)}</span></p>
              <p className="text-sm">Crédit: <span className="font-bold text-green-600">{formatAmount(totals.mouvementsCredit)}</span></p>
            </div>
            {totals.mouvementsDebit === totals.mouvementsCredit && (
              <p className="text-green-600 text-sm mt-1">Équilibrée</p>
            )}
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-[var(--color-text-tertiary)]">Soldes Fin Période</p>
            <div className="mt-2">
              <p className="text-sm">Débiteur: <span className="font-bold text-red-600">{formatAmount(totals.soldeDebiteur)}</span></p>
              <p className="text-sm">Créditeur: <span className="font-bold text-green-600">{formatAmount(totals.soldeCrediteur)}</span></p>
            </div>
            {totals.soldeDebiteur === totals.soldeCrediteur && (
              <p className="text-green-600 text-sm mt-1">Équilibrée</p>
            )}
          </div>
        </div>
      </div>
      )}
    </PrintableArea>

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

export default Balance;