import { formatCurrency } from '@/utils/formatters';
import { makeGLHelpers } from '@/features/financial/glHelpers';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useNavigate } from 'react-router-dom';
import {
  Building2, TrendingUp, BarChart3, Download, ArrowLeft,
  DollarSign, Target, FileText, Calculator, PieChart,
  Eye, ChevronRight, X, ChevronDown
} from 'lucide-react';
import PrintableArea from '../../components/ui/PrintableArea';
import { usePrintReport } from '../../hooks/usePrint';
import { useData } from '../../contexts/DataContext';

interface DirectSectionProps {
  title: string;
  rows: { key: string; label: string; value: number }[];
  total: number;
  totalLabel: string;
  tftExpandedRows: Set<string>;
  setTftExpandedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  rawEntries: any[];
  directPrefixMap: Record<string, string[]>;
  t: (key: string) => string;
}

const DirectSection: React.FC<DirectSectionProps> = ({ title, rows, total, totalLabel, tftExpandedRows, setTftExpandedRows, rawEntries, directPrefixMap, t }) => (
  <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
    <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4">{title}</h3>
    <table className="w-full text-sm">
      <thead><tr className="border-b border-[var(--color-border)]"><th className="text-left p-3 font-semibold text-[var(--color-primary)]">{t('accounting.label')}</th><th className="text-right p-3 font-semibold text-[var(--color-primary)]">{t('bilan.amount')}</th></tr></thead>
      <tbody>
        {rows.map((r) => {
          const rowKey = `d-${r.key}`;
          const isExp = tftExpandedRows.has(rowKey);
          const pfx = directPrefixMap[r.key] || [];
          const dets = isExp && pfx.length > 0 ? rawEntries.filter(e => { if (e.journal === 'AN' || e.journal === 'RAN') return false; const hasCash = e.lines?.some((l: any) => l.accountCode.startsWith('5')); const hasP = e.lines?.some((l: any) => pfx.some(p => l.accountCode.startsWith(p))); return hasCash && hasP; }).slice(0, 20).map(e => { let cd = 0, cc = 0; for (const l of e.lines) if (l.accountCode.startsWith('5')) { cd += l.debit; cc += l.credit; } return { ref: e.entryNumber || e.id?.substring(0, 8), date: e.date, label: e.label, journal: e.journal, amount: cd - cc }; }) : [];
          return (
          <React.Fragment key={r.key}>
          <tr className="border-b border-[var(--color-border)] hover:bg-gray-50 cursor-pointer" onClick={() => pfx.length > 0 && setTftExpandedRows(prev => { const s = new Set(prev); s.has(rowKey) ? s.delete(rowKey) : s.add(rowKey); return s; })}>
            <td className="p-3 text-[#404040]">
              <div className="flex items-center space-x-2">
                {pfx.length > 0 && (isExp ? <ChevronRight className="w-3 h-3 text-blue-500 rotate-90" /> : <ChevronRight className="w-3 h-3 text-gray-400" />)}
                <span>{r.label}</span>
              </div>
            </td>
            <td className={`p-3 text-right font-mono ${r.value < 0 ? 'text-red-600' : 'text-[var(--color-primary)]'}`}>{r.value < 0 ? '(' : ''}{formatCurrency(Math.abs(r.value))}{r.value < 0 ? ')' : ''}</td>
          </tr>
          {isExp && dets.map((d: any, di: number) => (
            <tr key={`${rowKey}-${di}`} className="bg-blue-50/40 border-b border-blue-100">
              <td className="p-2 pl-10 text-xs text-gray-600"><span className="font-mono text-gray-400 mr-2">{d.date}</span><span className="text-gray-500 mr-1">[{d.journal}]</span> {d.ref} — {d.label}</td>
              <td className={`p-2 text-right font-mono text-xs ${d.amount < 0 ? 'text-red-500' : 'text-gray-700'}`}>{formatCurrency(d.amount)}</td>
            </tr>
          ))}
          {isExp && dets.length === 0 && <tr className="bg-gray-50"><td colSpan={2} className="p-2 pl-10 text-xs text-gray-400 italic">{t('bilan.noEntries')}</td></tr>}
          </React.Fragment>
          );
        })}
        <tr className="border-t-2 border-[var(--color-border)] bg-gray-50">
          <td className="p-3 font-bold text-[var(--color-primary)]">{totalLabel}</td>
          <td className={`p-3 text-right text-lg font-bold ${total < 0 ? 'text-red-600' : 'text-[var(--color-primary)]'}`}>{total < 0 ? '(' : ''}{formatCurrency(Math.abs(total))}{total < 0 ? ')' : ''}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

const BilanSYSCOHADAPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { adapter } = useData();
  const [activeTab, setActiveTab] = useState('bilan');
  const [tftMethod, setTftMethod] = useState<'indirect' | 'direct'>('indirect');
  const [tftExpandedRows, setTftExpandedRows] = useState<Set<string>>(new Set());
  const [periode, setPeriode] = useState('current');

  // États pour la modal de détails
  const [selectedDetail, setSelectedDetail] = useState<{ type: string; title: string; data: Array<Record<string, any>>; total?: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  const { printRef, handlePrint } = usePrintReport({
    orientation: 'landscape',
    fileName: 'bilan-syscohada.pdf'
  });

  // Onglets des états financiers SYSCOHADA
  const tabs = [
    { id: 'bilan', label: t('bilan.tabBilan'), icon: BarChart3 },
    { id: 'bilan-fonctionnel', label: t('bilan.tabBilanFonctionnel'), icon: Building2 },
    { id: 'compte-resultat', label: t('bilan.tabCompteResultat'), icon: DollarSign },
    { id: 'tableau-financement', label: t('bilan.tabTableauFinancement'), icon: PieChart },
    { id: 'flux-tresorerie', label: t('bilan.tabFluxTresorerie'), icon: TrendingUp },
    { id: 'sig', label: t('bilan.tabSig'), icon: Target },
    { id: 'ratios', label: t('bilan.tabRatios'), icon: Calculator },
    { id: 'export', label: t('bilan.tabExport'), icon: Download },
  ];

  // ========== DONNÉES RÉELLES DEPUIS DEXIE ==========
  const { data: rawEntries = [] } = useQuery<any[]>({
    queryKey: ['bilan-syscohada-entries'],
    queryFn: () => adapter.getAll<any>('journalEntries'),
  });

  // Derive current fiscal year from entries (most frequent year, or current year)
  const fiscalYear = useMemo(() => {
    const years: Record<string, number> = {};
    for (const e of rawEntries) {
      if (e.status === 'draft') continue;
      const y = e.date?.split('-')[0];
      if (y) years[y] = (years[y] || 0) + 1;
    }
    const sorted = Object.entries(years).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || String(new Date().getFullYear());
  }, [rawEntries]);

  const prevFiscalYear = String(Number(fiscalYear) - 1);

  // Helper: filter entries by periode selector (current year only, previous year only, or both)
  const filterByPeriode = (entries: any[]) => {
    if (periode === 'previous') {
      return entries.filter(e => e.date?.startsWith(prevFiscalYear));
    }
    // 'current' and 'comparison' both show current year for net/creditNet
    return entries.filter(e => e.date?.startsWith(fiscalYear));
  };

  // Moteur d'agrégation CANONIQUE partagé (glHelpers) : UNE seule implémentation de
  // net/creditNet/netP pour toutes les pages d'états financiers → fin des divergences.
  // Entrées filtrées par période sélectionnée + hors brouillons.
  const glH = makeGLHelpers(filterByPeriode(rawEntries).filter((e: any) => e.status !== 'draft'));
  const net = (prefixes: string[]) => glH.net(...prefixes);
  const creditNet = (prefixes: string[]) => glH.creditNet(...prefixes);

  // N-1 helpers: use AN (À Nouveau) journal entries — they carry previous-year closing balances
  const netN1 = (prefixes: string[]) => {
    let t = 0;
    for (const e of rawEntries) {
      if (e.journal !== 'AN' && e.journal !== 'RAN') continue;
      for (const l of e.lines)
        if (prefixes.some(p => l.accountCode.startsWith(p))) t += l.debit - l.credit;
    }
    return t;
  };
  const creditNetN1 = (prefixes: string[]) => {
    let t = 0;
    for (const e of rawEntries) {
      if (e.journal !== 'AN' && e.journal !== 'RAN') continue;
      for (const l of e.lines)
        if (prefixes.some(p => l.accountCode.startsWith(p))) t += l.credit - l.debit;
    }
    return t;
  };

  // Bilan data — placement de CHAQUE compte de bilan (classes 1-5) selon le
  // SIGNE de son solde : solde débiteur → actif, créditeur → passif ; les
  // comptes de contrepartie d'actif (28/29/39/49/59 : amort./dépréciations)
  // viennent en déduction de l'actif. Le résultat net (7−6−89) va au passif.
  // Conséquence : Actif = Passif à l'exact (Σ des soldes des classes 1-5 =
  // résultat net). L'ancienne version bornait chaque poste à Math.max(0,…) et
  // omettait des comptes (46 créditeur de 8,36 Md, 47/48/49/17/19/55/57) → le
  // passif était sous-évalué et le bilan ne s'équilibrait pas.
  const BILAN_LABELS: Record<string, string> = {
    '10': 'Capital social', '11': 'Réserves', '12': 'Report à nouveau', '13': "Résultat de l'exercice",
    '14': "Subventions d'investissement", '15': 'Provisions réglementées', '16': 'Emprunts et dettes financières',
    '17': 'Dettes de crédit-bail', '18': 'Dettes liées aux participations', '19': 'Provisions pour risques et charges',
    '20': 'Charges immobilisées', '21': 'Immobilisations incorporelles', '22': 'Terrains',
    '23': 'Bâtiments, installations et agencements', '24': 'Matériel, mobilier et transport',
    '25': 'Avances et acomptes sur immobilisations', '26': 'Titres de participation', '27': 'Autres immobilisations financières',
    '28': 'Amortissements', '29': 'Dépréciations des immobilisations',
    '31': 'Stocks de marchandises', '32': 'Stocks de matières premières', '33': 'Autres approvisionnements',
    '34': 'Produits et travaux en cours', '35': 'Produits finis', '36': 'Stocks en cours', '37': 'Stocks (autres)',
    '38': 'Stocks en transit', '39': 'Dépréciations des stocks',
    '40': 'Fournisseurs et comptes rattachés', '41': 'Clients et comptes rattachés', '42': 'Personnel',
    '43': 'Organismes sociaux', '44': 'État et collectivités', '45': 'Organismes internationaux',
    '46': 'Débiteurs et créditeurs divers', '47': 'Comptes transitoires ou d\'attente', '48': 'Créances et dettes HAO',
    '49': 'Dépréciations des comptes de tiers',
    '50': 'Titres de placement', '51': 'Valeurs à encaisser', '52': 'Banques', '53': 'Établissements financiers',
    '54': 'Instruments de trésorerie', '55': 'Caisse (régies)', '56': 'Crédits de trésorerie', '57': 'Caisse',
    '58': 'Régies d\'avances et virements internes', '59': 'Dépréciations de trésorerie',
  };
  const CONTRA_ACTIF = new Set(['28', '29', '39', '49', '59']);
  // Comptes de nature fixe (présentation SYSCOHADA) ; le reste (tiers 40-48,
  // trésorerie 50-58) est placé selon le signe du solde. Quel que soit le côté,
  // chaque compte contribue identiquement à (Actif − Passif) → l'équilibre tient.
  const ALWAYS_PASSIF = new Set(['10', '11', '12', '13', '14', '15', '16', '17', '18', '19']);
  const ALWAYS_ACTIF = new Set(['20', '21', '22', '23', '24', '25', '26', '27', '31', '32', '33', '34', '35', '36', '37', '38']);

  const bilanData = useMemo(() => {
    const nEntries = filterByPeriode(rawEntries).filter((e: any) => e.status !== 'draft');
    const n1Entries = rawEntries.filter((e: any) => e.journal === 'AN' || e.journal === 'RAN');
    const aggByClass2 = (entries: any[]) => {
      const m = new Map<string, number>();
      for (const e of entries) for (const l of (e.lines || [])) {
        const code = String(l.accountCode || '');
        if (!['1', '2', '3', '4', '5'].includes(code[0])) continue;
        const c2 = code.substring(0, 2);
        m.set(c2, (m.get(c2) || 0) + (Number(l.debit) || 0) - (Number(l.credit) || 0));
      }
      return m;
    };
    const mN = aggByClass2(nEntries);
    const mN1 = aggByClass2(n1Entries);
    const codes = Array.from(new Set([...mN.keys(), ...mN1.keys()])).sort();

    const actif: Array<{ code: string; libelle: string; exerciceN: number; exerciceN1: number }> = [];
    const passif: typeof actif = [];
    for (const c2 of codes) {
      const vN = mN.get(c2) || 0;
      const vN1 = mN1.get(c2) || 0;
      const libelle = BILAN_LABELS[c2] || `Classe ${c2}`;
      if (CONTRA_ACTIF.has(c2)) {
        // Contrepartie d'actif (solde créditeur) → en déduction de l'actif.
        actif.push({ code: c2, libelle: `${libelle} (à déduire)`, exerciceN: vN, exerciceN1: vN1 });
        continue;
      }
      if (ALWAYS_PASSIF.has(c2)) { passif.push({ code: c2, libelle, exerciceN: -vN, exerciceN1: -vN1 }); continue; }
      if (ALWAYS_ACTIF.has(c2)) { actif.push({ code: c2, libelle, exerciceN: vN, exerciceN1: vN1 }); continue; }
      // Tiers (40-48) & trésorerie (50-58) : placés selon le signe du solde.
      const ref = vN !== 0 ? vN : vN1;
      if (ref === 0) continue;
      if (ref > 0) actif.push({ code: c2, libelle, exerciceN: vN, exerciceN1: vN1 });
      else passif.push({ code: c2, libelle, exerciceN: -vN, exerciceN1: -vN1 });
    }
    // Résultat NET d'impôt (− cl.89) au passif (capitaux propres).
    passif.push({ code: '13', libelle: "Résultat net de l'exercice", exerciceN: creditNet(['7']) - net(['6']) - net(['89']), exerciceN1: creditNetN1(['13']) });
    return { actif, passif };
  }, [rawEntries]);

  // Compte de Résultat — N-1 not available from AN entries (income stmt doesn't carry forward)
  // We show 0 with a clear label; a full N-1 would require a prior-year dataset
  const compteResultatData = useMemo(() => ({
    produits: [
      { code: '70', libelle: 'Ventes de marchandises', exerciceN: creditNet(['70']), exerciceN1: 0 },
      { code: '72', libelle: 'Production vendue', exerciceN: creditNet(['72']), exerciceN1: 0 },
      { code: '74', libelle: 'Subventions d\'exploitation', exerciceN: creditNet(['74']), exerciceN1: 0 },
      { code: '75', libelle: 'Autres produits de gestion', exerciceN: creditNet(['75']), exerciceN1: 0 },
      { code: '77', libelle: 'Revenus financiers', exerciceN: creditNet(['77']), exerciceN1: 0 },
      { code: '78', libelle: 'Reprises de provisions', exerciceN: creditNet(['78']), exerciceN1: 0 },
    ],
    charges: [
      { code: '60', libelle: 'Achats de marchandises', exerciceN: net(['60']), exerciceN1: 0 },
      { code: '61', libelle: 'Transports', exerciceN: net(['61']), exerciceN1: 0 },
      { code: '62', libelle: 'Services extérieurs A', exerciceN: net(['62']), exerciceN1: 0 },
      { code: '63', libelle: 'Services extérieurs B', exerciceN: net(['63']), exerciceN1: 0 },
      { code: '64', libelle: 'Impôts et taxes', exerciceN: net(['64']), exerciceN1: 0 },
      { code: '65', libelle: 'Autres charges', exerciceN: net(['65']), exerciceN1: 0 },
      { code: '66', libelle: 'Charges de personnel', exerciceN: net(['66']), exerciceN1: 0 },
      { code: '68', libelle: 'Dotations aux amortissements', exerciceN: net(['68']), exerciceN1: 0 },
      { code: '69', libelle: 'Dotations aux provisions', exerciceN: net(['69']), exerciceN1: 0 },
      { code: '67', libelle: 'Charges financières', exerciceN: net(['67']), exerciceN1: 0 },
    ],
  }), [rawEntries]);

  // Bilan Fonctionnel
  const bilanFonctionnelData = useMemo(() => {
    const emploisStables = Math.max(0, net(['2']) + net(['28']));
    const aceVal = Math.max(0, net(['3'])) + Math.max(0, net(['41']));
    const acheVal = Math.max(0, net(['46']));
    const atVal = Math.max(0, net(['5']));
    const totalEmplois = emploisStables + aceVal + acheVal + atVal;

    const rs = creditNet(['10', '11', '12']) + creditNet(['16', '17']);
    const pce = creditNet(['40']);
    const pche = creditNet(['42', '43', '44', '47']);
    const totalRessources = rs + pce + pche;

    return {
      emplois: [
        { code: 'ES', libelle: t('bilan.bfStableUses'), valeur: emploisStables, pourcentage: totalEmplois ? (emploisStables / totalEmplois) * 100 : 0 },
        { code: 'ACE', libelle: t('bilan.bfOperatingCurrentAssets'), valeur: aceVal, pourcentage: totalEmplois ? (aceVal / totalEmplois) * 100 : 0 },
        { code: 'ACHE', libelle: t('bilan.bfNonOperatingCurrentAssets'), valeur: acheVal, pourcentage: totalEmplois ? (acheVal / totalEmplois) * 100 : 0 },
        { code: 'AT', libelle: t('bilan.bfTreasuryAssets'), valeur: atVal, pourcentage: totalEmplois ? (atVal / totalEmplois) * 100 : 0 },
      ],
      ressources: [
        { code: 'RS', libelle: t('bilan.bfStableResources'), valeur: rs, pourcentage: totalRessources ? (rs / totalRessources) * 100 : 0 },
        { code: 'PCE', libelle: t('bilan.bfOperatingCurrentLiabilities'), valeur: pce, pourcentage: totalRessources ? (pce / totalRessources) * 100 : 0 },
        { code: 'PCHE', libelle: t('bilan.bfNonOperatingCurrentLiabilities'), valeur: pche, pourcentage: totalRessources ? (pche / totalRessources) * 100 : 0 },
        { code: 'PT', libelle: t('bilan.bfTreasuryLiabilities'), valeur: 0, pourcentage: 0 },
      ],
    };
  }, [rawEntries, t]);

  // SIG
  const sigData = useMemo(() => {
    const ventesMarc = creditNet(['701']);
    const achatsMarc = net(['601']);
    const mc = ventesMarc - achatsMarc;
    const prodExercice = creditNet(['70', '71', '72', '73']);
    const va = mc + prodExercice - net(['60', '61', '62', '63']);
    const ebe = va + creditNet(['74']) - net(['66']) - net(['64']);
    const re = ebe - net(['68']) + creditNet(['75', '78', '79']) - net(['65']);
    const rc = re + creditNet(['77']) - net(['67']);
    const rn = rc - net(['89']);
    // Note: SIG N-1 requires a separate prior-year dataset (not carried in AN entries)
    return [
      { libelle: 'Marge commerciale', exerciceN: mc, exerciceN1: 0, variation: '—' },
      { libelle: 'Production de l\'exercice', exerciceN: prodExercice, exerciceN1: 0, variation: '—' },
      { libelle: 'Valeur ajoutée', exerciceN: va, exerciceN1: 0, variation: '—' },
      { libelle: 'Excédent brut d\'exploitation', exerciceN: ebe, exerciceN1: 0, variation: '—' },
      { libelle: 'Résultat d\'exploitation', exerciceN: re, exerciceN1: 0, variation: '—' },
      { libelle: 'Résultat courant avant impôt', exerciceN: rc, exerciceN1: 0, variation: '—' },
      { libelle: 'Résultat net', exerciceN: rn, exerciceN1: 0, variation: '—' },
    ];
  }, [rawEntries]);

  // Flux de trésorerie (TFT méthode indirecte)
  const fluxTresorerieData = useMemo(() => {
    // Flux de PÉRIODE (hors À Nouveau) via le moteur canonique partagé.
    const netP = (pfx: string[]) => glH.netP(...pfx);
    const creditNetP = (pfx: string[]) => glH.creditNetP(...pfx);
    const rn = creditNetP(['7']) - netP(['6']) - netP(['89']); // résultat NET d'impôt (FO1)
    const dotAmort = netP(['68']);
    return {
      activitesOperationnelles: [
        { code: 'FO1', libelle: t('bilan.foNetIncome'), montant: rn },
        { code: 'FO2', libelle: t('bilan.foDepreciationCharges'), montant: dotAmort },
        { code: 'FO3', libelle: t('bilan.foProvisionCharges'), montant: netP(['69']) },
        { code: 'FO4', libelle: t('bilan.foGainsLossesOnDisposals'), montant: 0 },
        { code: 'FO5', libelle: t('bilan.foChangeInReceivables'), montant: -netP(['41']) },
        { code: 'FO6', libelle: t('bilan.foChangeInInventories'), montant: -netP(['3']) },
        { code: 'FO7', libelle: t('bilan.foChangeInPayables'), montant: creditNetP(['40']) },
        { code: 'FO8', libelle: t('bilan.foChangeInOtherReceivablesPayables'), montant: 0 },
      ],
      activitesInvestissement: [
        { code: 'FI1', libelle: t('bilan.fiTangibleAcquisitions'), montant: -Math.max(0, netP(['22', '23', '24', '25'])) },
        { code: 'FI2', libelle: t('bilan.fiIntangibleAcquisitions'), montant: -Math.max(0, netP(['20', '21'])) },
        { code: 'FI3', libelle: t('bilan.fiDisposals'), montant: Math.max(0, creditNetP(['82'])) },
        { code: 'FI4', libelle: t('bilan.fiEquityInvestments'), montant: -Math.max(0, netP(['26', '27'])) },
      ],
      activitesFinancement: [
        { code: 'FF1', libelle: t('bilan.ffCapitalIncrease'), montant: Math.max(0, creditNetP(['10', '11', '12', '13'])) },
        { code: 'FF2', libelle: t('bilan.ffNewBorrowings'), montant: Math.max(0, creditNetP(['16', '17'])) },
        { code: 'FF3', libelle: t('bilan.ffLoanRepayments'), montant: -Math.max(0, netP(['16', '17'])) },
        { code: 'FF4', libelle: t('bilan.ffDividendsPaid'), montant: -Math.max(0, netP(['465'])) },
        { code: 'FF5', libelle: t('bilan.ffInterestPaid'), montant: 0 },
      ],
    };
  }, [rawEntries, t]);

  // Tableau de Financement
  const tableauFinancementData = useMemo(() => {
    const caf = (creditNet(['7']) - net(['6'])) + net(['68']);
    return {
      emplois: [
        { code: 'TF1', libelle: t('bilan.tfDistributionsPaid'), montant: net(['465']) },
        { code: 'TF2', libelle: t('bilan.tfFixedAssetAcquisitions'), montant: Math.max(0, net(['2']) + net(['28'])) },
        { code: 'TF3', libelle: t('bilan.tfDeferredCharges'), montant: net(['20']) },
        { code: 'TF4', libelle: t('bilan.tfEquityReduction'), montant: 0 },
        { code: 'TF5', libelle: t('bilan.tfFinancialDebtRepayments'), montant: net(['16']) > 0 ? net(['16']) : 0 },
      ],
      ressources: [
        { code: 'TF6', libelle: t('bilan.tfSelfFinancingCapacity'), montant: caf },
        { code: 'TF7', libelle: t('bilan.tfFixedAssetDisposals'), montant: 0 },
        { code: 'TF8', libelle: t('bilan.tfEquityIncrease'), montant: creditNet(['10']) },
        { code: 'TF9', libelle: t('bilan.tfFinancialDebtIncrease'), montant: creditNet(['16']) },
      ],
      variationFdr: [
        { code: 'TF10', libelle: t('bilan.tfWorkingCapitalChange'), montant: caf - Math.max(0, net(['2']) + net(['28'])) },
      ],
    };
  }, [rawEntries, t]);

  // Ratios — computed from bilan/CR data
  const ratiosData = useMemo(() => {
    const totalActif = bilanData.actif.reduce((s, r) => s + r.exerciceN, 0);
    const cp = bilanData.passif.filter(r => ['10','11','12','13'].includes(r.code)).reduce((s, r) => s + r.exerciceN, 0);
    const emprunts = bilanData.passif.find(r => r.code === '16')?.exerciceN || 0;
    const detteCT = bilanData.passif.filter(r => ['40','42','43','44','47'].includes(r.code)).reduce((s, r) => s + r.exerciceN, 0);
    const actifCirculant = bilanData.actif.filter(r => ['31','32','41','46','50','52','53'].includes(r.code)).reduce((s, r) => s + r.exerciceN, 0);
    const creancesTreso = bilanData.actif.filter(r => ['41','50','52','53'].includes(r.code)).reduce((s, r) => s + r.exerciceN, 0);
    const treso = bilanData.actif.filter(r => ['52','53'].includes(r.code)).reduce((s, r) => s + r.exerciceN, 0);
    const ca = compteResultatData.produits.find(r => r.code === '70')?.exerciceN || 0;
    const rn = sigData[sigData.length - 1]?.exerciceN || 0;

    const safe = (a: number, b: number) => b === 0 ? 0 : a / b;

    return [
      {
        categorie: t('bilan.ratioCatStructure'),
        ratios: [
          { nom: t('bilan.ratioFinancialAutonomy'), calcul: t('bilan.ratioFinancialAutonomyCalc'), valeur: safe(cp, totalActif), norme: '> 0.5', status: safe(cp, totalActif) > 0.5 ? 'bon' : 'moyen' },
          { nom: t('bilan.ratioFixedAssetFunding'), calcul: t('bilan.ratioFixedAssetFundingCalc'), valeur: safe(cp + emprunts, bilanData.actif.filter(r => r.code < '30').reduce((s, r) => s + r.exerciceN, 0) || 1), norme: '> 1', status: 'moyen' },
          { nom: t('bilan.ratioDebt'), calcul: t('bilan.ratioDebtCalc'), valeur: safe(emprunts, cp), norme: '< 1', status: safe(emprunts, cp) < 1 ? 'bon' : 'moyen' },
        ],
      },
      {
        categorie: t('bilan.ratioCatLiquidity'),
        ratios: [
          { nom: t('bilan.ratioCurrentLiquidity'), calcul: t('bilan.ratioCurrentLiquidityCalc'), valeur: safe(actifCirculant, detteCT), norme: '> 1.5', status: safe(actifCirculant, detteCT) > 1.5 ? 'bon' : 'moyen' },
          { nom: t('bilan.ratioQuickLiquidity'), calcul: t('bilan.ratioQuickLiquidityCalc'), valeur: safe(creancesTreso, detteCT), norme: '> 1', status: safe(creancesTreso, detteCT) > 1 ? 'bon' : 'moyen' },
          { nom: t('bilan.ratioCashLiquidity'), calcul: t('bilan.ratioCashLiquidityCalc'), valeur: safe(treso, detteCT), norme: '> 0.3', status: safe(treso, detteCT) > 0.3 ? 'excellent' : 'moyen' },
        ],
      },
      {
        categorie: t('bilan.ratioCatProfitability'),
        ratios: [
          { nom: t('bilan.ratioReturnOnAssets'), calcul: t('bilan.ratioReturnOnAssetsCalc'), valeur: safe(rn, totalActif), norme: '> 0.05', status: safe(rn, totalActif) > 0.05 ? 'excellent' : 'moyen' },
          { nom: t('bilan.ratioReturnOnEquity'), calcul: t('bilan.ratioReturnOnEquityCalc'), valeur: safe(rn, cp), norme: '> 0.10', status: safe(rn, cp) > 0.10 ? 'excellent' : 'moyen' },
          { nom: t('bilan.ratioNetMargin'), calcul: t('bilan.ratioNetMarginCalc'), valeur: safe(rn, ca), norme: '> 0.05', status: safe(rn, ca) > 0.05 ? 'excellent' : 'moyen' },
        ],
      },
    ];
  }, [bilanData, compteResultatData, sigData, t]);

  // Real transaction details from rawEntries for a given account prefix
  const generateTransactionDetails = (accountCode: string, _period: string, _amount: number) => {
    const result: Array<{ id: string; date: string; reference: string; libelle: string; montant: number; tiers: string; piece: string }> = [];
    for (const e of rawEntries) {
      if (e.status === 'draft') continue;
      for (const l of e.lines) {
        if (l.accountCode.startsWith(accountCode)) {
          result.push({
            id: `${e.id}-${l.accountCode}`,
            date: e.date,
            reference: e.entryNumber || e.pieceRef || e.id?.substring(0, 8) || '',
            libelle: l.label || e.label || '',
            montant: l.debit - l.credit,
            tiers: (e as any).thirdPartyName || '',
            piece: e.pieceRef || '',
          });
        }
      }
    }
    return result;
  };

  // Génération des sous-comptes pour un compte principal — données réelles depuis les écritures
  const generateSubAccounts = (mainAccountCode: string, _amount: number) => {
    const accountTotals: Record<string, { debit: number; credit: number; label: string }> = {};
    for (const e of rawEntries) {
      if (e.status === 'draft') continue;
      for (const l of e.lines) {
        if (l.accountCode.startsWith(mainAccountCode) && l.accountCode.length > mainAccountCode.length) {
          if (!accountTotals[l.accountCode]) {
            accountTotals[l.accountCode] = { debit: 0, credit: 0, label: l.label || l.accountCode };
          }
          accountTotals[l.accountCode].debit += l.debit;
          accountTotals[l.accountCode].credit += l.credit;
        }
      }
    }
    const entries = Object.entries(accountTotals);
    const totalAbs = entries.reduce((s, [, v]) => s + Math.abs(v.debit - v.credit), 0);
    return entries
      .map(([code, v]) => ({
        code,
        libelle: v.label,
        montant: Math.round(v.debit - v.credit),
      }))
      .filter(s => s.montant !== 0)
      .sort((a, b) => Math.abs(b.montant) - Math.abs(a.montant));
  };

  // Fonction pour ouvrir la modal de détails
  const openDetailModal = (accountCode: string, accountName: string, period: string, amount: number) => {
    if (period === 'sous-comptes') {
      const subAccounts = generateSubAccounts(accountCode, amount);
      setSelectedDetail({
        type: 'sous-comptes',
        title: t('bilan.modalSubAccountsTitle', { code: accountCode, name: accountName }),
        data: subAccounts
      });
    } else {
      const transactions = generateTransactionDetails(accountCode, period, amount);
      setSelectedDetail({
        type: 'transactions',
        title: t('bilan.modalTransactionsTitle', { code: accountCode, name: accountName, period }),
        data: transactions,
        total: amount
      });
    }
    setSelectedPeriod(period);
    setIsModalOpen(true);
  };

  // Fonction pour fermer la modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDetail(null);
    setSelectedPeriod('');
  };

  return (
    <div className="min-h-screen bg-[var(--color-border)] ">
      <PrintableArea
        ref={printRef}
        orientation="landscape"
        pageSize="A4"
        showPrintButton={false}
        headerContent={
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">{t('bilan.title')}</h2>
            <p className="text-sm text-gray-600">{tabs.find(tb => tb.id === activeTab)?.label || t('bilan.tabBilan')}</p>
          </div>
        }
      >
      {/* En-tête */}
      <div className="bg-white border-b border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/financial-analysis-advanced')}
              className="flex items-center space-x-2 px-4 py-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">{t('bilan.backToFinancialAnalysis')}</span>
            </button>
            <div className="h-6 w-px bg-[var(--color-border)]" />
            <div>
              <h1 className="text-lg font-bold text-[var(--color-primary)]">{t('bilan.title')}</h1>
              <p className="text-sm text-[var(--color-text-tertiary)]">{t('bilan.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <PageHeaderActions printTitle={t('bilan.title')} />
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-text-secondary)]/20"
            >
              <option value="current">{t('bilan.fiscalYearOption', { year: fiscalYear })}</option>
              <option value="previous">{t('bilan.fiscalYearOption', { year: prevFiscalYear })}</option>
              <option value="comparison">{t('bilan.comparison')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm">
        <div className="px-6 border-b border-[var(--color-border)]">
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
                      ? 'border-[var(--color-text-secondary)] text-[var(--color-text-secondary)]'
                      : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[#404040]'
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

        {/* Contenu des onglets */}
        <div className="p-6">
          {/* BILAN SYSCOHADA */}
          {activeTab === 'bilan' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">{t('bilan.balanceSheetHeading')}</h2>
                <p className="text-[var(--color-text-tertiary)]">{t('bilan.fiscalPeriod', { year: fiscalYear })}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ACTIF */}
                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
                  <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4 text-center">{t('bilan.assets')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="text-left p-2 text-[var(--color-primary)]">{t('bilan.ref')}</th>
                          <th className="text-left p-2 text-[var(--color-primary)]">{t('accounting.label')}</th>
                          <th className="text-right p-2 text-[var(--color-primary)]">N</th>
                          <th className="text-right p-2 text-[var(--color-primary)]">N-1</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-gray-50">
                          <td className="p-2 font-bold">AD</td>
                          <td className="p-2 font-bold">{t('bilan.fixedAssets')}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(bilanData.actif.filter(r => r.code < '30').reduce((s, i) => s + i.exerciceN, 0))}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(bilanData.actif.filter(r => r.code < '30').reduce((s, i) => s + i.exerciceN1, 0))}</td>
                        </tr>
                        {bilanData.actif.filter(r => r.code < '30').map((item, index) => (
                          <tr key={index} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                            <td className="p-2 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, t('bilan.subAccountsOfLabel', { name: item.libelle }), 'sous-comptes', item.exerciceN)}
                                  className="p-1 hover:bg-[var(--color-text-secondary)] hover:text-white rounded transition-colors"
                                  title={t('bilan.viewSubAccountsOf', { code: item.code })}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-2">{item.libelle}</td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.exerciceN)}
                              title={t('bilan.clickToViewTransactionsN')}
                            >
                              {formatCurrency(item.exerciceN)}
                            </td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN1', item.exerciceN1)}
                              title={t('bilan.clickToViewTransactionsN1')}
                            >
                              {formatCurrency(item.exerciceN1)}
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-gray-50">
                          <td className="p-2 font-bold">AE</td>
                          <td className="p-2 font-bold">{t('bilan.currentAssets')}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(bilanData.actif.filter(r => r.code >= '30').reduce((s, i) => s + i.exerciceN, 0))}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(bilanData.actif.filter(r => r.code >= '30').reduce((s, i) => s + i.exerciceN1, 0))}</td>
                        </tr>
                        {bilanData.actif.filter(r => r.code >= '30').map((item, index) => (
                          <tr key={index} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                            <td className="p-2 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, t('bilan.subAccountsOfLabel', { name: item.libelle }), 'sous-comptes', item.exerciceN)}
                                  className="p-1 hover:bg-[var(--color-text-secondary)] hover:text-white rounded transition-colors"
                                  title={t('bilan.viewSubAccountsOf', { code: item.code })}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-2">{item.libelle}</td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.exerciceN)}
                              title={t('bilan.clickToViewTransactionsN')}
                            >
                              {formatCurrency(item.exerciceN)}
                            </td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN1', item.exerciceN1)}
                              title={t('bilan.clickToViewTransactionsN1')}
                            >
                              {formatCurrency(item.exerciceN1)}
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-gray-100 font-bold">
                          <td className="p-3">TA</td>
                          <td className="p-3">{t('bilan.totalAssets')}</td>
                          <td className="p-3 text-right text-lg">{formatCurrency(bilanData.actif.reduce((s, i) => s + i.exerciceN, 0))}</td>
                          <td className="p-3 text-right text-lg">{formatCurrency(bilanData.actif.reduce((s, i) => s + i.exerciceN1, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PASSIF */}
                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
                  <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4 text-center">{t('bilan.liabilities')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="text-left p-2 text-[var(--color-primary)]">{t('bilan.ref')}</th>
                          <th className="text-left p-2 text-[var(--color-primary)]">{t('accounting.label')}</th>
                          <th className="text-right p-2 text-[var(--color-primary)]">N</th>
                          <th className="text-right p-2 text-[var(--color-primary)]">N-1</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-gray-50">
                          <td className="p-2 font-bold">CP</td>
                          <td className="p-2 font-bold">{t('bilan.equity')}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(bilanData.passif.filter(r => r.code < '20').reduce((s, i) => s + i.exerciceN, 0))}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(bilanData.passif.filter(r => r.code < '20').reduce((s, i) => s + i.exerciceN1, 0))}</td>
                        </tr>
                        {bilanData.passif.filter(r => r.code < '20').map((item, index) => (
                          <tr key={index} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                            <td className="p-2 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, t('bilan.subAccountsOfLabel', { name: item.libelle }), 'sous-comptes', item.exerciceN)}
                                  className="p-1 hover:bg-[var(--color-text-secondary)] hover:text-white rounded transition-colors"
                                  title={t('bilan.viewSubAccountsOf', { code: item.code })}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-2">{item.libelle}</td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.exerciceN)}
                              title={t('bilan.clickToViewTransactionsN')}
                            >
                              {formatCurrency(item.exerciceN)}
                            </td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN1', item.exerciceN1)}
                              title={t('bilan.clickToViewTransactionsN1')}
                            >
                              {formatCurrency(item.exerciceN1)}
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-gray-50">
                          <td className="p-2 font-bold">DT</td>
                          <td className="p-2 font-bold">{t('bilan.liabilitiesDebts')}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(bilanData.passif.filter(r => r.code >= '20').reduce((s, i) => s + i.exerciceN, 0))}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(bilanData.passif.filter(r => r.code >= '20').reduce((s, i) => s + i.exerciceN1, 0))}</td>
                        </tr>
                        {bilanData.passif.filter(r => r.code >= '20').map((item, index) => (
                          <tr key={index} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                            <td className="p-2 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, t('bilan.subAccountsOfLabel', { name: item.libelle }), 'sous-comptes', item.exerciceN)}
                                  className="p-1 hover:bg-[var(--color-text-secondary)] hover:text-white rounded transition-colors"
                                  title={t('bilan.viewSubAccountsOf', { code: item.code })}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-2">{item.libelle}</td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.exerciceN)}
                              title={t('bilan.clickToViewTransactionsN')}
                            >
                              {formatCurrency(item.exerciceN)}
                            </td>
                            <td
                              className="p-2 text-right font-mono hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN1', item.exerciceN1)}
                              title={t('bilan.clickToViewTransactionsN1')}
                            >
                              {formatCurrency(item.exerciceN1)}
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-gray-100 font-bold">
                          <td className="p-3">TP</td>
                          <td className="p-3">{t('bilan.totalLiabilities')}</td>
                          <td className="p-3 text-right text-lg">{formatCurrency(bilanData.passif.reduce((s, i) => s + i.exerciceN, 0))}</td>
                          <td className="p-3 text-right text-lg">{formatCurrency(bilanData.passif.reduce((s, i) => s + i.exerciceN1, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPTE DE RESULTAT */}
          {activeTab === 'compte-resultat' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">{t('bilan.incomeStatementHeading')}</h2>
                <p className="text-[var(--color-text-tertiary)]">{t('bilan.fiscalPeriod', { year: fiscalYear })}</p>
              </div>

              <div className="space-y-8">
                {/* PRODUITS EN HAUT */}
                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
                  <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4 text-center">{t('bilan.revenues')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-[var(--color-border)]">
                          <th className="text-left p-3 text-[var(--color-primary)] font-semibold">{t('bilan.ref')}</th>
                          <th className="text-left p-3 text-[var(--color-primary)] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[var(--color-primary)] font-semibold">{t('bilan.exerciseN')}</th>
                          <th className="text-right p-3 text-[var(--color-primary)] font-semibold">{t('bilan.exerciseN1')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compteResultatData.produits.map((item, index) => (
                          <tr key={index} className="border-b border-[var(--color-border)]">
                            <td className="p-3 text-[#404040]">{item.code}</td>
                            <td className="p-3 text-[#404040]">{item.libelle}</td>
                            <td className="p-3 text-right font-mono text-[var(--color-primary)]">{formatCurrency(item.exerciceN)}</td>
                            <td className="p-3 text-right font-mono text-[var(--color-primary)]">{formatCurrency(item.exerciceN1)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[var(--color-border)] bg-gray-50">
                          <td className="p-3 font-bold text-[var(--color-primary)]">TP</td>
                          <td className="p-3 font-bold text-[var(--color-primary)]">{t('bilan.totalRevenues')}</td>
                          <td className="p-3 text-right text-lg font-bold text-[var(--color-primary)]">{formatCurrency(compteResultatData.produits.reduce((s, i) => s + i.exerciceN, 0))}</td>
                          <td className="p-3 text-right text-lg font-bold text-[var(--color-primary)]">{formatCurrency(compteResultatData.produits.reduce((s, i) => s + i.exerciceN1, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CHARGES EN BAS */}
                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
                  <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4 text-center">{t('bilan.expenses')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-[var(--color-border)]">
                          <th className="text-left p-3 text-[var(--color-primary)] font-semibold">{t('bilan.ref')}</th>
                          <th className="text-left p-3 text-[var(--color-primary)] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[var(--color-primary)] font-semibold">{t('bilan.exerciseN')}</th>
                          <th className="text-right p-3 text-[var(--color-primary)] font-semibold">{t('bilan.exerciseN1')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compteResultatData.charges.map((item, index) => (
                          <tr key={index} className="border-b border-[var(--color-border)]">
                            <td className="p-3 text-[#404040]">{item.code}</td>
                            <td className="p-3 text-[#404040]">{item.libelle}</td>
                            <td className="p-3 text-right font-mono text-[var(--color-primary)]">{formatCurrency(item.exerciceN)}</td>
                            <td className="p-3 text-right font-mono text-[var(--color-primary)]">{formatCurrency(item.exerciceN1)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[var(--color-border)] bg-gray-50">
                          <td className="p-3 font-bold text-[var(--color-primary)]">TC</td>
                          <td className="p-3 font-bold text-[var(--color-primary)]">{t('bilan.totalExpenses')}</td>
                          <td className="p-3 text-right text-lg font-bold text-[var(--color-primary)]">{formatCurrency(compteResultatData.charges.reduce((s, i) => s + i.exerciceN, 0))}</td>
                          <td className="p-3 text-right text-lg font-bold text-[var(--color-primary)]">{formatCurrency(compteResultatData.charges.reduce((s, i) => s + i.exerciceN1, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RÉSULTAT NET */}
                <div className="bg-white rounded-lg p-6 border-2 border-[var(--color-border)] text-center">
                  <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4">{t('bilan.netIncomeHeading')}</h3>
                  <div className="grid grid-cols-2 gap-6">
                    {(() => {
                      const rnN = compteResultatData.produits.reduce((s, i) => s + i.exerciceN, 0) - compteResultatData.charges.reduce((s, i) => s + i.exerciceN, 0);
                      const rnN1 = compteResultatData.produits.reduce((s, i) => s + i.exerciceN1, 0) - compteResultatData.charges.reduce((s, i) => s + i.exerciceN1, 0);
                      return (<>
                        <div className="p-4 border border-[var(--color-border)] rounded">
                          <p className="text-[var(--color-text-tertiary)] font-medium mb-2">{t('bilan.exerciseN')}</p>
                          <p className={`text-lg font-bold ${rnN >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(rnN)}</p>
                          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">({rnN >= 0 ? t('bilan.profit') : t('bilan.loss')})</p>
                        </div>
                        <div className="p-4 border border-[var(--color-border)] rounded">
                          <p className="text-[var(--color-text-tertiary)] font-medium mb-2">{t('bilan.exerciseN1')}</p>
                          <p className={`text-lg font-bold ${rnN1 >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(rnN1)}</p>
                          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">({rnN1 >= 0 ? t('bilan.profit') : t('bilan.loss')})</p>
                        </div>
                      </>);
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BILAN FONCTIONNEL */}
          {activeTab === 'bilan-fonctionnel' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">{t('bilan.functionalHeading')}</h2>
                <p className="text-[var(--color-text-tertiary)]">{t('bilan.functionalSubtitle')}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* EMPLOIS */}
                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
                  <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4 text-center">{t('bilan.uses')}</h3>
                  <div className="space-y-3">
                    {bilanFonctionnelData.emplois.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-[var(--color-text-secondary)] font-medium text-sm">{item.code}</span>
                            <button
                              onClick={() => openDetailModal(item.code, t('bilan.subAccountsOfLabel', { name: item.libelle }), 'sous-comptes', item.valeur)}
                              className="p-1 hover:bg-[var(--color-text-secondary)] hover:text-white rounded transition-colors"
                              title={t('bilan.viewSubAccountsOf', { code: item.code })}
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-medium">{item.libelle}</span>
                        </div>
                        <div className="text-right">
                          <div
                            className="font-mono font-bold hover:bg-blue-50 cursor-pointer px-2 py-1 rounded"
                            onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.valeur)}
                            title={t('bilan.clickToViewTransactions')}
                          >
                            {formatCurrency(item.valeur)}
                          </div>
                          <div className="text-sm text-[var(--color-text-tertiary)]">{item.pourcentage.toFixed(2)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RESSOURCES */}
                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
                  <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4 text-center">{t('bilan.resources')}</h3>
                  <div className="space-y-3">
                    {bilanFonctionnelData.ressources.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-[var(--color-text-secondary)] font-medium text-sm">{item.code}</span>
                            <button
                              onClick={() => openDetailModal(item.code, t('bilan.subAccountsOfLabel', { name: item.libelle }), 'sous-comptes', item.valeur)}
                              className="p-1 hover:bg-[var(--color-text-secondary)] hover:text-white rounded transition-colors"
                              title={t('bilan.viewSubAccountsOf', { code: item.code })}
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-medium">{item.libelle}</span>
                        </div>
                        <div className="text-right">
                          <div
                            className="font-mono font-bold hover:bg-blue-50 cursor-pointer px-2 py-1 rounded"
                            onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.valeur)}
                            title={t('bilan.clickToViewTransactions')}
                          >
                            {formatCurrency(item.valeur)}
                          </div>
                          <div className="text-sm text-[var(--color-text-tertiary)]">{item.pourcentage.toFixed(2)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Indicateurs de l'équilibre financier */}
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
                <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4">{t('bilan.financialBalanceIndicators')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(() => {
                    const rs = bilanFonctionnelData.ressources.find(r => r.code === 'RS')?.valeur || 0;
                    const es = bilanFonctionnelData.emplois.find(r => r.code === 'ES')?.valeur || 0;
                    const frng = rs - es;
                    const ace = bilanFonctionnelData.emplois.find(r => r.code === 'ACE')?.valeur || 0;
                    const pce = bilanFonctionnelData.ressources.find(r => r.code === 'PCE')?.valeur || 0;
                    const bfr = ace - pce;
                    const tn = frng - bfr;
                    return (<>
                      <div className="p-4 border border-[var(--color-border)] rounded text-center">
                        <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('bilan.workingCapital')}</h4>
                        <p className={`text-lg font-bold ${frng >= 0 ? 'text-[var(--color-primary)]' : 'text-red-600'}`}>{formatCurrency(frng)}</p>
                        <p className="text-sm text-[var(--color-text-tertiary)]">{t('bilan.workingCapitalFormula')}</p>
                      </div>
                      <div className="p-4 border border-[var(--color-border)] rounded text-center">
                        <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('bilan.workingCapitalRequirement')}</h4>
                        <p className={`text-lg font-bold ${bfr >= 0 ? 'text-[var(--color-primary)]' : 'text-green-600'}`}>{formatCurrency(bfr)}</p>
                        <p className="text-sm text-[var(--color-text-tertiary)]">{t('bilan.workingCapitalRequirementFormula')}</p>
                      </div>
                      <div className="p-4 border border-[var(--color-border)] rounded text-center">
                        <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('bilan.netTreasury')}</h4>
                        <p className={`text-lg font-bold ${tn >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(tn)}</p>
                        <p className="text-sm text-[var(--color-text-tertiary)]">FRNG - BFR</p>
                      </div>
                    </>);
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* SIG - SOLDES INTERMÉDIAIRES DE GESTION */}
          {activeTab === 'sig' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">{t('bilan.sigHeading')}</h2>
                <p className="text-[var(--color-text-tertiary)]">{t('bilan.sigSubtitle')}</p>
              </div>

              <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4">{t('bilan.sigColumn')}</th>
                      <th className="text-right p-4">{t('bilan.exerciseN')}</th>
                      <th className="text-right p-4">{t('bilan.exerciseN1')}</th>
                      <th className="text-right p-4">{t('bilan.variation')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sigData.map((sig, index) => (
                      <tr key={index} className={`border-b border-[var(--color-border)] ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="p-4 font-medium text-[var(--color-primary)]">{sig.libelle}</td>
                        <td className="p-4 text-right font-mono text-[var(--color-primary)]">{formatCurrency(sig.exerciceN)}</td>
                        <td className="p-4 text-right font-mono text-[var(--color-text-tertiary)]">{formatCurrency(sig.exerciceN1)}</td>
                        <td className={`p-4 text-right font-medium ${sig.variation.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                          {sig.variation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {(() => {
                  const mc = sigData.find(s => s.libelle.includes('Marge commerciale'))?.exerciceN || 0;
                  const va = sigData.find(s => s.libelle.includes('Valeur ajoutée'))?.exerciceN || 0;
                  const rn = sigData.find(s => s.libelle.includes('Résultat net'))?.exerciceN || 0;
                  const ca = creditNet(['70', '71', '72']);
                  const prodEx = sigData.find(s => s.libelle.includes('Production'))?.exerciceN || 1;
                  const ventesMarc = creditNet(['701']);
                  return (<>
                    <div className="bg-white rounded-lg p-4 border border-[var(--color-border)]">
                      <h4 className="font-bold text-[var(--color-primary)] mb-2">{t('bilan.grossMarginRate')}</h4>
                      <p className="text-lg font-bold text-[var(--color-primary)]">{ventesMarc > 0 ? (mc / ventesMarc * 100).toFixed(1) : '0.0'}%</p>
                      <p className="text-sm text-[var(--color-text-tertiary)]">{t('bilan.grossMarginRateFormula')}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-[var(--color-border)]">
                      <h4 className="font-bold text-[var(--color-primary)] mb-2">{t('bilan.valueAddedRate')}</h4>
                      <p className="text-lg font-bold text-[var(--color-primary)]">{prodEx > 0 ? (va / prodEx * 100).toFixed(1) : '0.0'}%</p>
                      <p className="text-sm text-[var(--color-text-tertiary)]">{t('bilan.valueAddedRateFormula')}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-[var(--color-border)]">
                      <h4 className="font-bold text-[var(--color-primary)] mb-2">{t('bilan.profitabilityRate')}</h4>
                      <p className="text-lg font-bold text-[var(--color-primary)]">{ca > 0 ? (rn / ca * 100).toFixed(1) : '0.0'}%</p>
                      <p className="text-sm text-[var(--color-text-tertiary)]">{t('bilan.profitabilityRateFormula')}</p>
                    </div>
                  </>);
                })()}
              </div>
            </div>
          )}

          {/* RATIOS FINANCIERS */}
          {activeTab === 'ratios' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">{t('bilan.ratiosHeading')}</h2>
                <p className="text-[var(--color-text-tertiary)]">{t('bilan.ratiosSubtitle')}</p>
              </div>

              {ratiosData.map((categorie, catIndex) => (
                <div key={catIndex} className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                  <div className="bg-gray-50 p-4">
                    <h3 className="text-lg font-bold text-[var(--color-primary)]">{categorie.categorie}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-4">{t('bilan.ratio')}</th>
                          <th className="text-left p-4">{t('bilan.calculationMethod')}</th>
                          <th className="text-right p-4">{t('bilan.value')}</th>
                          <th className="text-center p-4">{t('bilan.benchmark')}</th>
                          <th className="text-center p-4">{t('bilan.assessment')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categorie.ratios.map((ratio, ratioIndex) => (
                          <tr key={ratioIndex} className="border-b border-[var(--color-border)]">
                            <td className="p-4 font-medium text-[var(--color-primary)]">{ratio.nom}</td>
                            <td className="p-4 text-[var(--color-text-tertiary)] text-sm">{ratio.calcul}</td>
                            <td className="p-4 text-right font-mono text-[var(--color-primary)]">
                              {ratio.valeur.toFixed(2)}
                            </td>
                            <td className="p-4 text-center text-[var(--color-text-tertiary)]">{ratio.norme}</td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                ratio.status === 'excellent' ? 'bg-green-100 text-green-800' :
                                ratio.status === 'bon' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {ratio.status === 'excellent' ? t('bilan.statusExcellent') :
                                 ratio.status === 'bon' ? t('bilan.statusGood') : t('bilan.statusAverage')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TABLEAU DE FINANCEMENT */}
          {activeTab === 'tableau-financement' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">{t('bilan.fundsFlowHeading')}</h2>
                <p className="text-[var(--color-text-tertiary)]">{t('bilan.fundsFlowSubtitle')}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* EMPLOIS */}
                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
                  <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4 text-center">{t('bilan.uses')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="text-left p-3 text-[var(--color-primary)] font-semibold">{t('bilan.ref')}</th>
                          <th className="text-left p-3 text-[var(--color-primary)] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[var(--color-primary)] font-semibold">{t('bilan.amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableauFinancementData.emplois.map((item, index) => (
                          <tr key={index} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                            <td className="p-3 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, t('bilan.subAccountsOfLabel', { name: item.libelle }), 'sous-comptes', item.montant)}
                                  className="p-1 hover:bg-[var(--color-text-secondary)] hover:text-white rounded transition-colors"
                                  title={t('bilan.viewSubAccountsOf', { code: item.code })}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#404040]">{item.libelle}</td>
                            <td
                              className="p-3 text-right font-mono text-[var(--color-primary)] hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.montant)}
                              title={t('bilan.clickToViewTransactions')}
                            >
                              {formatCurrency(item.montant)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[var(--color-border)] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[var(--color-primary)]">{t('bilan.totalUses')}</td>
                          <td className="p-3 text-right text-lg font-bold text-[var(--color-primary)]">{formatCurrency(tableauFinancementData.emplois.reduce((s, i) => s + i.montant, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RESSOURCES */}
                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
                  <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4 text-center">{t('bilan.resources')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="text-left p-3 text-[var(--color-primary)] font-semibold">{t('bilan.ref')}</th>
                          <th className="text-left p-3 text-[var(--color-primary)] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[var(--color-primary)] font-semibold">{t('bilan.amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableauFinancementData.ressources.map((item, index) => (
                          <tr key={index} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                            <td className="p-3 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                <button
                                  onClick={() => openDetailModal(item.code, t('bilan.subAccountsOfLabel', { name: item.libelle }), 'sous-comptes', item.montant)}
                                  className="p-1 hover:bg-[var(--color-text-secondary)] hover:text-white rounded transition-colors"
                                  title={t('bilan.viewSubAccountsOf', { code: item.code })}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[#404040]">{item.libelle}</td>
                            <td
                              className="p-3 text-right font-mono text-[var(--color-primary)] hover:bg-blue-50 cursor-pointer"
                              onClick={() => openDetailModal(item.code, item.libelle, 'exerciceN', item.montant)}
                              title={t('bilan.clickToViewTransactions')}
                            >
                              {formatCurrency(item.montant)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[var(--color-border)] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[var(--color-primary)]">{t('bilan.totalResources')}</td>
                          <td className="p-3 text-right text-lg font-bold text-[var(--color-primary)]">{formatCurrency(tableauFinancementData.ressources.reduce((s, i) => s + i.montant, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Variation du Fonds de Roulement */}
              <div className="bg-white rounded-lg p-6 border-2 border-[var(--color-border)] text-center">
                <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4">{t('bilan.workingCapitalChangeHeading')}</h3>
                <div className="flex justify-center">
                  <div className="p-6 border border-[var(--color-border)] rounded-lg">
                    {(() => {
                      const totalRessources = tableauFinancementData.ressources.reduce((s, i) => s + i.montant, 0);
                      const totalEmplois = tableauFinancementData.emplois.reduce((s, i) => s + i.montant, 0);
                      const variation = totalRessources - totalEmplois;
                      return (<>
                        <p className="text-[var(--color-text-tertiary)] font-medium mb-2">{t('bilan.resourcesMinusUses')}</p>
                        <p className={`text-lg font-bold ${variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>{variation >= 0 ? '+' : ''}{formatCurrency(variation)}</p>
                        <p className="text-sm text-[var(--color-text-tertiary)] mt-2">{variation >= 0 ? t('bilan.workingCapitalIncrease') : t('bilan.workingCapitalDecrease')}</p>
                      </>);
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TABLEAU DE FLUX DE TRÉSORERIE */}
          {activeTab === 'flux-tresorerie' && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">{t('bilan.cashFlowHeading')}</h2>
                <p className="text-[var(--color-text-tertiary)]">{t('bilan.cashFlowSubtitle')}</p>
              </div>

              {/* Sous-onglets Méthode Indirecte / Directe */}
              <div className="flex justify-center">
                <div className="inline-flex bg-gray-100 rounded-lg p-1">
                  <button onClick={() => setTftMethod('indirect')} className={`px-5 py-2.5 text-sm font-semibold rounded-md transition-all ${tftMethod === 'indirect' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t('bilan.indirectMethod')}</button>
                  <button onClick={() => setTftMethod('direct')} className={`px-5 py-2.5 text-sm font-semibold rounded-md transition-all ${tftMethod === 'direct' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t('bilan.directMethod')}</button>
                </div>
              </div>

              {/* MÉTHODE INDIRECTE */}
              {tftMethod === 'indirect' && (
              <div className="space-y-6">
                {/* ACTIVITÉS OPÉRATIONNELLES */}
                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
                  <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4">{t('bilan.cashFlowOperating')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="text-left p-3 text-[var(--color-primary)] font-semibold">{t('bilan.ref')}</th>
                          <th className="text-left p-3 text-[var(--color-primary)] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[var(--color-primary)] font-semibold">{t('bilan.amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fluxTresorerieData.activitesOperationnelles.map((item, index) => {
                          const rowKey = `op-${item.code}`;
                          const isExpanded = tftExpandedRows.has(rowKey);
                          const prefixMap: Record<string, string[]> = { FO1: ['6','7'], FO2: ['681'], FO3: ['69'], FO4: ['81','82'], FO5: ['41'], FO6: ['3'], FO7: ['40'], FO8: ['46'] };
                          const pfx = prefixMap[item.code] || [];
                          const details = isExpanded ? rawEntries.filter(e => e.lines?.some((l: any) => pfx.some(p => l.accountCode.startsWith(p)))).slice(0, 20).map(e => ({ ref: e.entryNumber || e.id?.substring(0, 8), date: e.date, label: e.label, journal: e.journal, amount: e.lines.filter((l: any) => pfx.some(p => l.accountCode.startsWith(p))).reduce((s: number, l: any) => s + l.debit - l.credit, 0) })) : [];
                          return (
                          <React.Fragment key={index}>
                          <tr className="border-b border-[var(--color-border)] hover:bg-gray-50 cursor-pointer" onClick={() => setTftExpandedRows(prev => { const s = new Set(prev); s.has(rowKey) ? s.delete(rowKey) : s.add(rowKey); return s; })}>
                            <td className="p-3 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                {isExpanded ? <ChevronDown className="w-3 h-3 text-blue-500" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                              </div>
                            </td>
                            <td className="p-3 text-[#404040]">{item.libelle}</td>
                            <td className={`p-3 text-right font-mono ${item.montant >= 0 ? 'text-[var(--color-primary)]' : 'text-red-600'}`}>
                              {item.montant >= 0 ? '' : '('}{formatCurrency(Math.abs(item.montant))}{item.montant >= 0 ? '' : ')'}
                            </td>
                          </tr>
                          {isExpanded && details.map((d, di) => (
                            <tr key={`${rowKey}-${di}`} className="bg-blue-50/50 border-b border-blue-100">
                              <td className="p-1"></td>
                              <td className="p-2 pl-8 text-xs text-gray-600"><span className="font-mono text-gray-400 mr-2">{d.date}</span><span className="text-gray-500 mr-1">[{d.journal}]</span> {d.ref} — {d.label}</td>
                              <td className={`p-2 text-right font-mono text-xs ${d.amount < 0 ? 'text-red-500' : 'text-gray-700'}`}>{formatCurrency(d.amount)}</td>
                            </tr>
                          ))}
                          {isExpanded && details.length === 0 && <tr className="bg-gray-50"><td></td><td colSpan={2} className="p-2 pl-8 text-xs text-gray-400 italic">{t('bilan.noEntries')}</td></tr>}
                          </React.Fragment>
                          );
                        })}
                        <tr className="border-t-2 border-[var(--color-border)] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[var(--color-primary)]">{t('bilan.netCashFlowOperating')}</td>
                          {(() => { const total = fluxTresorerieData.activitesOperationnelles.reduce((s, i) => s + i.montant, 0); return <td className={`p-3 text-right text-lg font-bold ${total >= 0 ? 'text-[var(--color-primary)]' : 'text-red-600'}`}>{total >= 0 ? '' : '('}{formatCurrency(Math.abs(total))}{total >= 0 ? '' : ')'}</td>; })()}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ACTIVITÉS D'INVESTISSEMENT */}
                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
                  <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4">{t('bilan.cashFlowInvesting')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="text-left p-3 text-[var(--color-primary)] font-semibold">{t('bilan.ref')}</th>
                          <th className="text-left p-3 text-[var(--color-primary)] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[var(--color-primary)] font-semibold">{t('bilan.amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fluxTresorerieData.activitesInvestissement.map((item, index) => {
                          const rowKey = `inv-${item.code}`;
                          const isExpanded = tftExpandedRows.has(rowKey);
                          const prefixMap: Record<string, string[]> = { FI1: ['24','245','246','247'], FI2: ['21'], FI3: ['82'], FI4: ['26'] };
                          const pfx = prefixMap[item.code] || [];
                          const details = isExpanded ? rawEntries.filter(e => e.lines?.some((l: any) => pfx.some(p => l.accountCode.startsWith(p)))).slice(0, 20).map(e => ({ ref: e.entryNumber || e.id?.substring(0, 8), date: e.date, label: e.label, journal: e.journal, amount: e.lines.filter((l: any) => pfx.some(p => l.accountCode.startsWith(p))).reduce((s: number, l: any) => s + l.debit - l.credit, 0) })) : [];
                          return (
                          <React.Fragment key={index}>
                          <tr className="border-b border-[var(--color-border)] hover:bg-gray-50 cursor-pointer" onClick={() => setTftExpandedRows(prev => { const s = new Set(prev); s.has(rowKey) ? s.delete(rowKey) : s.add(rowKey); return s; })}>
                            <td className="p-3 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                <span>{item.code}</span>
                                {isExpanded ? <ChevronDown className="w-3 h-3 text-blue-500" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                              </div>
                            </td>
                            <td className="p-3 text-[#404040]">{item.libelle}</td>
                            <td className={`p-3 text-right font-mono ${item.montant >= 0 ? 'text-[var(--color-primary)]' : 'text-red-600'}`}>
                              {item.montant >= 0 ? '' : '('}{formatCurrency(Math.abs(item.montant))}{item.montant >= 0 ? '' : ')'}
                            </td>
                          </tr>
                          {isExpanded && details.map((d, di) => (
                            <tr key={`${rowKey}-${di}`} className="bg-orange-50/50 border-b border-orange-100">
                              <td className="p-1"></td>
                              <td className="p-2 pl-8 text-xs text-gray-600"><span className="font-mono text-gray-400 mr-2">{d.date}</span><span className="text-gray-500 mr-1">[{d.journal}]</span> {d.ref} — {d.label}</td>
                              <td className={`p-2 text-right font-mono text-xs ${d.amount < 0 ? 'text-red-500' : 'text-gray-700'}`}>{formatCurrency(d.amount)}</td>
                            </tr>
                          ))}
                          {isExpanded && details.length === 0 && <tr className="bg-gray-50"><td></td><td colSpan={2} className="p-2 pl-8 text-xs text-gray-400 italic">{t('bilan.noEntries')}</td></tr>}
                          </React.Fragment>
                          );
                        })}
                        <tr className="border-t-2 border-[var(--color-border)] bg-gray-50">
                          <td className="p-3"></td>
                          <td className="p-3 font-bold text-[var(--color-primary)]">{t('bilan.netCashFlowInvesting')}</td>
                          {(() => { const total = fluxTresorerieData.activitesInvestissement.reduce((s, i) => s + i.montant, 0); return <td className={`p-3 text-right text-lg font-bold ${total >= 0 ? 'text-[var(--color-primary)]' : 'text-red-600'}`}>{total >= 0 ? '' : '('}{formatCurrency(Math.abs(total))}{total >= 0 ? '' : ')'}</td>; })()}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ACTIVITÉS DE FINANCEMENT */}
                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
                  <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4">{t('bilan.cashFlowFinancing')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="text-left p-3 text-[var(--color-primary)] font-semibold">{t('accounting.label')}</th>
                          <th className="text-right p-3 text-[var(--color-primary)] font-semibold">{t('bilan.amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fluxTresorerieData.activitesFinancement.map((item, index) => {
                          const rowKey = `fin-${item.code}`;
                          const isExpanded = tftExpandedRows.has(rowKey);
                          const prefixMap: Record<string, string[]> = { FF1: ['10'], FF2: ['16'], FF3: ['16'], FF4: ['465'], FF5: ['67'] };
                          const pfx = prefixMap[item.code] || [];
                          const details = isExpanded ? rawEntries.filter(e => e.lines?.some((l: any) => pfx.some(p => l.accountCode.startsWith(p)))).slice(0, 20).map(e => ({ ref: e.entryNumber || e.id?.substring(0, 8), date: e.date, label: e.label, journal: e.journal, amount: e.lines.filter((l: any) => pfx.some(p => l.accountCode.startsWith(p))).reduce((s: number, l: any) => s + l.debit - l.credit, 0) })) : [];
                          return (
                          <React.Fragment key={index}>
                          <tr className="border-b border-[var(--color-border)] hover:bg-gray-50 cursor-pointer" onClick={() => setTftExpandedRows(prev => { const s = new Set(prev); s.has(rowKey) ? s.delete(rowKey) : s.add(rowKey); return s; })}>
                            <td className="p-3 text-[#404040]">
                              <div className="flex items-center space-x-2">
                                {isExpanded ? <ChevronDown className="w-3 h-3 text-blue-500" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                                <span>{item.libelle}</span>
                              </div>
                            </td>
                            <td className={`p-3 text-right font-mono ${item.montant >= 0 ? 'text-[var(--color-primary)]' : 'text-red-600'}`}>
                              {item.montant >= 0 ? '' : '('}{formatCurrency(Math.abs(item.montant))}{item.montant >= 0 ? '' : ')'}
                            </td>
                          </tr>
                          {isExpanded && details.map((d, di) => (
                            <tr key={`${rowKey}-${di}`} className="bg-purple-50/50 border-b border-purple-100">
                              <td className="p-2 pl-10 text-xs text-gray-600"><span className="font-mono text-gray-400 mr-2">{d.date}</span><span className="text-gray-500 mr-1">[{d.journal}]</span> {d.ref} — {d.label}</td>
                              <td className={`p-2 text-right font-mono text-xs ${d.amount < 0 ? 'text-red-500' : 'text-gray-700'}`}>{formatCurrency(d.amount)}</td>
                            </tr>
                          ))}
                          {isExpanded && details.length === 0 && <tr className="bg-gray-50"><td colSpan={2} className="p-2 pl-10 text-xs text-gray-400 italic">{t('bilan.noEntries')}</td></tr>}
                          </React.Fragment>
                          );
                        })}
                        <tr className="border-t-2 border-[var(--color-border)] bg-gray-50">
                          <td className="p-3 font-bold text-[var(--color-primary)]">{t('bilan.netCashFlowFinancing')}</td>
                          {(() => { const total = fluxTresorerieData.activitesFinancement.reduce((s, i) => s + i.montant, 0); return <td className={`p-3 text-right text-lg font-bold ${total >= 0 ? 'text-[var(--color-primary)]' : 'text-red-600'}`}>{total >= 0 ? '' : '('}{formatCurrency(Math.abs(total))}{total >= 0 ? '' : ')'}</td>; })()}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* VARIATION NETTE DE TRÉSORERIE */}
                <div className="bg-white rounded-lg p-6 border-2 border-[var(--color-border)]">
                  <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4 text-center">{t('bilan.netCashChangeHeading')}</h3>
                  {(() => {
                    const fluxOp = fluxTresorerieData.activitesOperationnelles.reduce((s, i) => s + i.montant, 0);
                    const fluxInv = fluxTresorerieData.activitesInvestissement.reduce((s, i) => s + i.montant, 0);
                    const fluxFin = fluxTresorerieData.activitesFinancement.reduce((s, i) => s + i.montant, 0);
                    const variation = fluxOp + fluxInv + fluxFin;
                    // Trésorerie = TOUTE la classe 5 (banques 52x, cartes 554, caisses 57x) hors 59.
                    const tresoFin = net(['50', '51', '52', '53', '54', '55', '56', '57', '58']);
                    const tresoDebut = tresoFin - variation;
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="p-4 border border-[var(--color-border)] rounded">
                          <p className="text-[var(--color-text-tertiary)] font-medium mb-2">{t('bilan.openingCash')}</p>
                          <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(tresoDebut)}</p>
                        </div>
                        <div className="p-4 border border-[var(--color-border)] rounded">
                          <p className="text-[var(--color-text-tertiary)] font-medium mb-2">{t('bilan.netChange')}</p>
                          <p className={`text-lg font-bold ${variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>{variation >= 0 ? '+' : ''}{formatCurrency(variation)}</p>
                        </div>
                        <div className="p-4 border border-[var(--color-border)] rounded">
                          <p className="text-[var(--color-text-tertiary)] font-medium mb-2">{t('bilan.closingCash')}</p>
                          <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(tresoFin)}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              )}

              {/* MÉTHODE DIRECTE */}
              {tftMethod === 'direct' && (() => {
                let encClients = 0, decFournisseurs = 0, decPersonnel = 0, decImpots = 0, autresEnc = 0, autresDec = 0;
                let decAcqImmos = 0, encCessions = 0, decAcqFinanc = 0;
                let encCapital = 0, encEmprunts = 0, decRembEmprunts = 0, decDividendes = 0;
                for (const e of rawEntries) {
                  if (e.journal === 'AN' || e.journal === 'RAN') continue;
                  if (e.status === 'draft') continue; // exclude drafts
                  const cashL = e.lines?.filter((l: any) => l.accountCode.startsWith('5')) || [];
                  const otherL = e.lines?.filter((l: any) => !l.accountCode.startsWith('5')) || [];
                  if (cashL.length === 0) continue;
                  let cd = 0, cc = 0; for (const c of cashL) { cd += c.debit; cc += c.credit; }
                  const nc = cd - cc;
                  const has = (p: string) => otherL.some((l: any) => l.accountCode.startsWith(p));
                  if (has('41')) { if (nc > 0) encClients += nc; else autresDec += Math.abs(nc); }
                  else if (has('40')) { if (nc < 0) decFournisseurs += Math.abs(nc); else autresEnc += nc; }
                  else if (has('42') || has('43')) { if (nc < 0) decPersonnel += Math.abs(nc); }
                  else if (has('44') || has('89')) { if (nc < 0) decImpots += Math.abs(nc); }
                  else if (has('21') || has('22') || has('23') || has('24') || has('25')) { if (nc < 0) decAcqImmos += Math.abs(nc); else encCessions += nc; }
                  else if (has('26') || has('27')) { if (nc < 0) decAcqFinanc += Math.abs(nc); }
                  else if (has('10') || has('11') || has('12')) { if (nc > 0) encCapital += nc; }
                  else if (has('16')) { if (nc > 0) encEmprunts += nc; else decRembEmprunts += Math.abs(nc); }
                  else if (has('465')) { if (nc < 0) decDividendes += Math.abs(nc); }
                  else { if (nc > 0) autresEnc += nc; else autresDec += Math.abs(nc); }
                }
                // Investissement & financement par VARIATION DE CLASSES de période (hors AN) :
                // les écritures OD "regroupées" mélangent toutes les classes dans une seule
                // écriture → la classification par contrepartie d'écriture est impossible (tout
                // tombait en exploitation → investissement à 0 à tort). On dérive ces flux des
                // mouvements nets de classes de la période, comme un bilan (immune au regroupement).
                const netPeriod = (pfx: string[]) => glH.netP(...pfx);
                decAcqImmos = Math.max(0, netPeriod(['20', '21', '22', '23', '24', '25'])); // acquisitions immos brutes
                decAcqFinanc = Math.max(0, netPeriod(['26', '27']));
                encCessions = Math.max(0, -netPeriod(['82'])); // produits de cessions (classe 82)
                decRembEmprunts = Math.max(0, netPeriod(['16', '17']));
                encEmprunts = Math.max(0, -netPeriod(['16', '17']));
                encCapital = Math.max(0, -netPeriod(['10', '11', '12', '13']));
                decDividendes = Math.max(0, netPeriod(['465']));
                const dFluxInvest = encCessions - decAcqImmos - decAcqFinanc;
                const dFluxFinanc = encCapital + encEmprunts - decRembEmprunts - decDividendes;
                // Variation réelle de trésorerie de période = tous les mouvements classe 5 (hors AN).
                const dVariation = netPeriod(['5']);
                // Activité = résiduel → le total reconcilie avec la variation réelle de trésorerie.
                const dFluxExploit = dVariation - dFluxInvest - dFluxFinanc;
                // Trésorerie = TOUTE la classe 5 (banques 52x, cartes 554, caisses 57x…) hors
                // dépréciations 59. Solde de clôture (À Nouveau inclus).
                const tresoFin = net(['50', '51', '52', '53', '54', '55', '56', '57', '58']);
                const tresoDebut = tresoFin - dVariation;

                const directPrefixMap: Record<string, string[]> = {
                  'enc-clients': ['41'], 'autres-enc': [], 'dec-fournisseurs': ['40'], 'dec-personnel': ['42','43'], 'dec-impots': ['44','89'], 'autres-dec': [],
                  'dec-acq-immos': ['21','22','23','24','25'], 'dec-acq-financ': ['26','27'], 'enc-cessions': ['82'],
                  'enc-capital': ['10'], 'enc-emprunts': ['16'], 'remb-emprunts': ['16'], 'div-verses': ['465'],
                };
                return (
                  <div className="space-y-6">
                    <DirectSection title={t('bilan.directOperatingTitle')} totalLabel={t('bilan.directOperatingTotal')} total={dFluxExploit} tftExpandedRows={tftExpandedRows} setTftExpandedRows={setTftExpandedRows} rawEntries={rawEntries} directPrefixMap={directPrefixMap} t={t} rows={[
                      { key: 'enc-clients', label: t('bilan.dirCustomerReceipts'), value: encClients },
                      { key: 'autres-enc', label: t('bilan.dirOtherOperatingReceipts'), value: autresEnc },
                      { key: 'dec-fournisseurs', label: t('bilan.dirSupplierPayments'), value: -decFournisseurs },
                      { key: 'dec-personnel', label: t('bilan.dirPayrollPayments'), value: -decPersonnel },
                      { key: 'dec-impots', label: t('bilan.dirIncomeTaxPaid'), value: -decImpots },
                      { key: 'autres-dec', label: t('bilan.dirOtherOperatingPayments'), value: -autresDec },
                    ]} />
                    <DirectSection title={t('bilan.directInvestingTitle')} totalLabel={t('bilan.directInvestingTotal')} total={dFluxInvest} tftExpandedRows={tftExpandedRows} setTftExpandedRows={setTftExpandedRows} rawEntries={rawEntries} directPrefixMap={directPrefixMap} t={t} rows={[
                      { key: 'dec-acq-immos', label: t('bilan.dirFixedAssetPurchases'), value: -decAcqImmos },
                      { key: 'dec-acq-financ', label: t('bilan.dirFinancialAssetPurchases'), value: -decAcqFinanc },
                      { key: 'enc-cessions', label: t('bilan.dirFixedAssetDisposals'), value: encCessions },
                    ]} />
                    <DirectSection title={t('bilan.directFinancingTitle')} totalLabel={t('bilan.directFinancingTotal')} total={dFluxFinanc} tftExpandedRows={tftExpandedRows} setTftExpandedRows={setTftExpandedRows} rawEntries={rawEntries} directPrefixMap={directPrefixMap} t={t} rows={[
                      { key: 'enc-capital', label: t('bilan.dirCapitalIncrease'), value: encCapital },
                      { key: 'enc-emprunts', label: t('bilan.dirBorrowingProceeds'), value: encEmprunts },
                      { key: 'remb-emprunts', label: t('bilan.dirLoanRepayments'), value: -decRembEmprunts },
                      { key: 'div-verses', label: t('bilan.dirDividendsPaid'), value: -decDividendes },
                    ]} />
                    <div className="bg-white rounded-lg p-6 border-2 border-[var(--color-border)]">
                      <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4 text-center">{t('bilan.netCashChangeHeading')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="p-4 border border-[var(--color-border)] rounded"><p className="text-[var(--color-text-tertiary)] font-medium mb-2">{t('bilan.openingCashShort')}</p><p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(tresoDebut)}</p></div>
                        <div className="p-4 border border-[var(--color-border)] rounded"><p className="text-[var(--color-text-tertiary)] font-medium mb-2">{t('bilan.netChange')}</p><p className={`text-lg font-bold ${dVariation >= 0 ? 'text-green-600' : 'text-red-600'}`}>{dVariation >= 0 ? '+' : ''}{formatCurrency(dVariation)}</p></div>
                        <div className="p-4 border border-[var(--color-border)] rounded"><p className="text-[var(--color-text-tertiary)] font-medium mb-2">{t('bilan.closingCashShort')}</p><p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(tresoFin)}</p></div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-2">{t('bilan.exportHeading')}</h2>
                <p className="text-[var(--color-text-tertiary)]">{t('bilan.exportSubtitle')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tabs.slice(0, -1).map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <div key={tab.id} className="bg-white rounded-lg p-6 border border-[var(--color-border)] hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[var(--color-text-secondary)]/10 flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-[var(--color-text-secondary)]" />
                        </div>
                        <h3 className="font-semibold text-[var(--color-primary)]">{tab.label}</h3>
                      </div>
                      <div className="space-y-3">
                        <button
                          onClick={() => { setActiveTab(tab.id); setTimeout(handlePrint, 150); }}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-[var(--color-text-secondary)] text-white rounded-lg hover:bg-[#404040] transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={() => toast(t('bilan.excelExportUnavailable'), { icon: 'ℹ️' })}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-[var(--color-border)] text-[#404040] rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Excel</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
                <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4">{t('bilan.fullExport')}</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handlePrint}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-[var(--color-text-secondary)] text-white rounded-lg hover:bg-[#404040] transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    <span>{t('bilan.downloadAllPdf')}</span>
                  </button>
                  <button
                    onClick={() => toast(t('bilan.excelGlobalExportUnavailable'), { icon: 'ℹ️' })}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 border border-[var(--color-border)] text-[#404040] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    <span>{t('bilan.downloadAllExcel')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de détails */}
      {isModalOpen && selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-bold text-[var(--color-primary)]">{selectedDetail.title}</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label={t('bilan.close')}>
                <X className="w-5 h-5 text-[var(--color-text-tertiary)]" />
              </button>
            </div>

            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              {selectedDetail.type === 'sous-comptes' ? (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">{t('bilan.subAccountDetail')}</h3>
                    <p className="text-[var(--color-text-tertiary)] text-sm">{t('bilan.subAccountBreakdown')}</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 border-b border-[var(--color-border)]">{t('bilan.code')}</th>
                          <th className="text-left p-3 border-b border-[var(--color-border)]">{t('accounting.label')}</th>
                          <th className="text-right p-3 border-b border-[var(--color-border)]">{t('bilan.amount')}</th>
                          <th className="text-center p-3 border-b border-[var(--color-border)]">{t('bilan.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetail.data.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                              {t('bilan.noSubAccountFound', { title: selectedDetail.title })}
                            </td>
                          </tr>
                        ) : (
                          selectedDetail.data.map((subAccount: Record<string, any>, index: number) => (
                            <tr key={index} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                              <td className="p-3 font-medium text-[var(--color-text-secondary)]">{subAccount.code}</td>
                              <td className="p-3 text-[var(--color-primary)]">{subAccount.libelle}</td>
                              <td className="p-3 text-right font-mono">{formatCurrency(subAccount.montant)}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => openDetailModal(String(subAccount.code), String(subAccount.libelle), selectedPeriod, Number(subAccount.montant))}
                                  className="text-[var(--color-text-secondary)] hover:text-[#404040] p-1 rounded"
                                  title={t('bilan.viewTransactions')}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">{t('bilan.transactionDetail')}</h3>
                    <div className="flex justify-between items-center">
                      <p className="text-[var(--color-text-tertiary)] text-sm">{t('bilan.journalEntryList')}</p>
                      <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                        {t('bilan.total')}: {formatCurrency(selectedDetail.total ?? 0)}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 border-b border-[var(--color-border)]">{t('common.date')}</th>
                          <th className="text-left p-3 border-b border-[var(--color-border)]">{t('bilan.reference')}</th>
                          <th className="text-left p-3 border-b border-[var(--color-border)]">{t('accounting.label')}</th>
                          <th className="text-left p-3 border-b border-[var(--color-border)]">{t('bilan.thirdParty')}</th>
                          <th className="text-right p-3 border-b border-[var(--color-border)]">{t('bilan.amount')}</th>
                          <th className="text-left p-3 border-b border-[var(--color-border)]">{t('accounting.piece')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetail.data.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                              {t('bilan.noTransactionFound')}
                            </td>
                          </tr>
                        ) : (
                          selectedDetail.data.map((transaction: Record<string, any>, index: number) => (
                            <tr key={index} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                              <td className="p-3 text-[var(--color-text-tertiary)]">{transaction.date}</td>
                              <td className="p-3 font-medium text-[var(--color-text-secondary)]">{transaction.reference}</td>
                              <td className="p-3 text-[var(--color-primary)]">{transaction.libelle}</td>
                              <td className="p-3 text-[var(--color-text-tertiary)] text-xs">{transaction.tiers}</td>
                              <td className="p-3 text-right font-mono text-[var(--color-primary)]">{formatCurrency(transaction.montant)}</td>
                              <td className="p-3 text-[var(--color-text-tertiary)] text-xs">{transaction.piece}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PrintableArea>
  </div>
  );
};

export default BilanSYSCOHADAPage;