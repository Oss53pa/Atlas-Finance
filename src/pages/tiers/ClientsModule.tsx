import React, { useState, useEffect, useMemo } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { toast } from 'sonner';
import { formatCurrency } from '../../utils/formatters';
import { buildPieceNumbers, pieceNumberOf } from '../../utils/pieceNumber';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { useAccountNames } from '../../hooks/useAccountNames';
import { generateNextCode, loadMappings } from '../../services/auxiliaryCode/auxiliaryCodeService';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';
import {
  Search, Plus, Filter, Eye, Edit, Trash2, X,
  Building, TrendingUp, AlertTriangle, CheckCircle, Clock,
  Calendar, FileText, Mail, Phone, MapPin,
  Users, Target, Activity, BarChart3, PieChart,
  DollarSign, TrendingDown, RefreshCw, ChevronUp, ChevronDown,
  Info, Database, Globe, Shield, Zap, Award, AlertCircle,
  CreditCard, Landmark, FileCheck, Printer, Download,
  BookOpen, Wallet, Receipt, AlertOctagon, Timer
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Interface Client complète avec données comptables
interface Client {
  id: string;
  code: string;
  raisonSociale: string;
  nomCommercial?: string;
  categorie: 'GRAND_COMPTE' | 'PME' | 'TPE' | 'PARTICULIER';
  secteurActivite: string;
  pays: string;

  // Données comptables SYSCOHADA
  compteComptable: string; // 411xxx
  compteAuxiliaire: string;
  journalVentes: string;

  // Données administratives
  rccm: string; // Registre du Commerce
  niu: string; // Numéro d'Identification Unique
  regimeTVA: 'REEL_NORMAL' | 'REEL_SIMPLIFIE' | 'FORFAIT' | 'EXONERE';
  tauxTVA: number;

  // Adresse complète
  adresse: string;
  codePostal: string;
  ville: string;
  region: string;

  // Données financières
  chiffreAffaires: number;
  encoursActuel: number;
  dso: number;
  limiteCredit: number;

  // Conditions commerciales
  delaiPaiement: number;
  remise?: number;
  escompte?: number;
  modeReglement: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES' | 'TRAITE' | 'MOBILE_MONEY';
  devise: string;

  // Coordonnées bancaires
  banque?: string;
  iban?: string;
  swift?: string;

  // Évaluation
  scoreCredit: number;
  tauxRecouvrement: number;
  notationInterne: 'A' | 'B' | 'C' | 'D';
  fidele: boolean;

  // Contact
  contactPrincipal: string;
  email: string;
  telephone: string;
  telephoneSecondaire?: string;
  fax?: string;

  // Statut
  statut: 'ACTIF' | 'BLOQUE' | 'SUSPENDU' | 'INACTIF';
  derniereFacture?: string;
  prochainPaiement?: string;
  alertes: number;

  // Balance âgée
  nonEchu: number;
  echu0_30: number;
  echu31_60: number;
  echu61_90: number;
  echuPlus90: number;
}

// Interface formulaire nouveau client
interface NewClientForm {
  // Identification
  code: string;
  raisonSociale: string;
  nomCommercial: string;
  categorie: 'GRAND_COMPTE' | 'PME' | 'TPE' | 'PARTICULIER';
  secteurActivite: string;

  // Données administratives
  rccm: string;
  niu: string;
  regimeTVA: 'REEL_NORMAL' | 'REEL_SIMPLIFIE' | 'FORFAIT' | 'EXONERE';

  // Adresse
  adresse: string;
  codePostal: string;
  ville: string;
  region: string;
  pays: string;

  // Contacts
  contactPrincipal: string;
  fonction: string;
  email: string;
  telephone: string;
  telephoneSecondaire: string;
  fax: string;

  // Données comptables
  compteComptable: string;
  compteAuxiliaire: string;
  codeCommercial: string;
  journalVentes: string;

  // Conditions commerciales
  delaiPaiement: number;
  limiteCredit: number;
  modeReglement: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES' | 'TRAITE' | 'MOBILE_MONEY';
  devise: string;
  remise: number;
  escompte: number;
  tauxTVA: number;

  // Coordonnées bancaires
  banque: string;
  iban: string;
  swift: string;
}

// Interface Balance Âgée
interface BalanceAgeeItem {
  clientId: string;
  clientCode: string;
  clientNom: string;
  totalCreances: number;
  nonEchu: number;
  echu0_30: number;
  echu31_60: number;
  echu61_90: number;
  echuPlus90: number;
  provision: number;
}

const ClientsModule: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const { format: fmtAccount } = useAccountNames();

  // États
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [agingDetail, setAgingDetail] = useState<BalanceAgeeItem | null>(null);
  const [activeTab, setActiveTab] = useState<string>('liste');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<string>('kpis');
  const [balanceAgeeSubTab, setBalanceAgeeSubTab] = useState<'repartition' | 'detail' | 'risques'>('repartition');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [showPeriodModal, setShowPeriodModal] = useState<boolean>(false);
  const [showNewClientModal, setShowNewClientModal] = useState<boolean>(false);
  const [formStep, setFormStep] = useState<number>(1);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    period: 'month' as 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  });
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // édition via l'assistant 4 étapes
  // Agrégats RÉELS des comptes clients (41x) — le détail par client n'est pas
  // attribuable (la migration a consolidé sur un compte collectif, sans code
  // tiers), mais le total des créances et le CA restent calculables.
  const [aggReceivables, setAggReceivables] = useState(0);
  const [aggCA, setAggCA] = useState(0);
  // Fiche client en consultation (bouton œil) + écritures par client.
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [clientLinesMap, setClientLinesMap] = useState<Record<string, { date: string; piece: string; libelle: string; debit: number; credit: number }[]>>({});

  // Relance client (ouvre le client mail avec un modèle pré-rempli).
  const sendRelance = (item: BalanceAgeeItem) => {
    const subject = t('clients.relanceSubject', { name: item.clientNom, code: item.clientCode });
    const body = t('clients.relanceBody', {
      total: formatCurrency(item.totalCreances),
      over60: formatCurrency(item.echu61_90 + item.echuPlus90),
    });
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Export CSV de la balance âgée d'un client (UTF-8 BOM pour Excel).
  const exportAgingCsv = (item: BalanceAgeeItem) => {
    const rows: (string | number)[][] = [
      [t('clients.csvAgingTitle'), item.clientCode, item.clientNom],
      [],
      [t('clients.csvBucket'), t('clients.csvAmountFcfa')],
      [t('clients.bucketNonEchu'), item.nonEchu],
      [t('clients.bucket030'), item.echu0_30],
      [t('clients.bucket3160'), item.echu31_60],
      [t('clients.bucket6190'), item.echu61_90],
      [t('clients.bucketPlus90'), item.echuPlus90],
      [t('clients.totalReceivables'), item.totalCreances],
      [t('clients.provision'), item.provision],
    ];
    const csv = '﻿' + rows.map(r => r.map(v => {
      const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = `balance-agee-${item.clientCode}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // État formulaire nouveau client
  const [newClient, setNewClient] = useState<NewClientForm>({
    code: '',
    raisonSociale: '',
    nomCommercial: '',
    categorie: 'PME',
    secteurActivite: '',
    rccm: '',
    niu: '',
    regimeTVA: 'REEL_NORMAL',
    adresse: '',
    codePostal: '',
    ville: '',
    region: '',
    pays: 'Cameroun',
    contactPrincipal: '',
    fonction: '',
    email: '',
    telephone: '',
    telephoneSecondaire: '',
    fax: '',
    compteComptable: '411',
    compteAuxiliaire: '',
    codeCommercial: '',
    journalVentes: 'VE',
    delaiPaiement: 30,
    limiteCredit: 500000,
    modeReglement: 'VIREMENT',
    devise: 'XAF',
    remise: 0,
    escompte: 0,
    tauxTVA: 19.25,
    banque: '',
    iban: '',
    swift: ''
  });

  // Chargement des données réelles depuis l'adaptateur
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [allThirdParties, allEntries] = await Promise.all([
          adapter.getAll('thirdParties'),
          adapter.getAll('journalEntries')
        ]);

        const pieceNumbers = buildPieceNumbers(allEntries as any);
        const customers = allThirdParties.filter(
          (tp: any) => tp.type === 'customer' || tp.type === 'both' || /^41/.test(tp.code || '')
        );

        const linesByClient: Record<string, { date: string; piece: string; libelle: string; debit: number; credit: number }[]> = {};

        // Ancienneté RÉELLE (FIFO) : les règlements (crédits) soldent les factures
        // (débits) les plus anciennes ; le reliquat ouvert est ventilé par âge à
        // la date d'arrêté. Remplace l'ancien « tout en non-échu ».
        const asOf = new Date();
        const DAY_MS = 86400000;
        const ageReceivable = (lns: { debit: number; credit: number; date: string }[]) => {
          const sorted = [...lns].sort((a, b) => String(a.date).localeCompare(String(b.date)));
          const invoices: { date: string; amount: number }[] = [];
          let pool = 0;
          for (const l of sorted) {
            if ((l.debit || 0) > 0) invoices.push({ date: l.date, amount: l.debit });
            pool += l.credit || 0;
          }
          const open: { date: string; amount: number }[] = [];
          for (const inv of invoices) {
            if (pool >= inv.amount) { pool -= inv.amount; }
            else { open.push({ date: inv.date, amount: inv.amount - pool }); pool = 0; }
          }
          let nonEchu = 0, e030 = 0, e3160 = 0, e6190 = 0, e90 = 0;
          for (const o of open) {
            const days = Math.floor((asOf.getTime() - new Date(o.date).getTime()) / DAY_MS);
            if (days < 0) nonEchu += o.amount;
            else if (days <= 30) e030 += o.amount;
            else if (days <= 60) e3160 += o.amount;
            else if (days <= 90) e6190 += o.amount;
            else e90 += o.amount;
          }
          return { nonEchu, echu0_30: e030, echu31_60: e3160, echu61_90: e6190, echuPlus90: e90 };
        };

        const clientsData: Client[] = customers.map((tp: any) => {
          const relatedLines: { debit: number; credit: number; date: string }[] = [];
          const detailLines: { date: string; piece: string; libelle: string; debit: number; credit: number }[] = [];
          allEntries.forEach((entry: any) => {
            if (entry.status === 'draft') return;
            (entry.lines || []).forEach((line: any) => {
              if (line.thirdPartyCode === tp.code || (tp.accountCode && line.accountCode === tp.accountCode)) {
                // Encours & balance âgée : on IGNORE les lignes lettrées (soldées).
                // L'historique (detailLines) conserve tout.
                if (!line.lettrageCode) relatedLines.push({ debit: line.debit || 0, credit: line.credit || 0, date: entry.date });
                detailLines.push({
                  date: entry.date,
                  piece: pieceNumberOf(entry, pieceNumbers),
                  libelle: line.label || entry.label || '',
                  debit: line.debit || 0,
                  credit: line.credit || 0,
                });
              }
            });
          });
          linesByClient[tp.id] = detailLines.sort((a, b) => String(b.date).localeCompare(String(a.date)));

          const totalDebit = relatedLines.reduce((s, l) => s + l.debit, 0);
          const totalCredit = relatedLines.reduce((s, l) => s + l.credit, 0);
          const encours = totalDebit - totalCredit;

          return {
            id: tp.id,
            code: tp.code || '',
            raisonSociale: tp.name || '',
            nomCommercial: tp.name,
            categorie: 'PME' as const,
            secteurActivite: '',
            pays: '',
            compteComptable: tp.accountCode || '411000',
            compteAuxiliaire: tp.code || '',
            journalVentes: 'VE',
            rccm: tp.rccm || '',
            niu: tp.taxId || '',
            regimeTVA: tp.regimeFiscal === 'RNI' ? 'REEL_NORMAL' as const : 'REEL_SIMPLIFIE' as const,
            tauxTVA: 19.25,
            adresse: tp.address || '',
            codePostal: '',
            ville: '',
            region: '',
            chiffreAffaires: totalDebit,
            encoursActuel: Math.max(encours, 0),
            dso: tp.conditionsPaiement?.delaiJours || 30,
            limiteCredit: 0,
            delaiPaiement: tp.conditionsPaiement?.delaiJours || 30,
            remise: 0,
            escompte: tp.conditionsPaiement?.escompte || 0,
            modeReglement: (tp.conditionsPaiement?.modePaiement === 'virement' ? 'VIREMENT' : tp.conditionsPaiement?.modePaiement === 'cheque' ? 'CHEQUE' : 'VIREMENT') as 'VIREMENT' | 'CHEQUE',
            devise: 'XAF',
            banque: tp.banque?.nomBanque,
            iban: tp.banque?.iban,
            swift: tp.banque?.swift,
            scoreCredit: tp.isActive ? 80 : 40,
            tauxRecouvrement: 0,
            notationInterne: 'B' as const,
            fidele: tp.isActive,
            contactPrincipal: '',
            email: tp.email || '',
            telephone: tp.phone || '',
            statut: tp.isActive ? 'ACTIF' as const : 'INACTIF' as const,
            alertes: 0,
            ...ageReceivable(relatedLines),
          };
        });

        // Agrégat réel des comptes clients (41x) sur toutes les écritures.
        let aggD = 0, aggC = 0;
        allEntries.forEach((entry: any) => {
          if (entry.status === 'draft') return;
          (entry.lines || []).forEach((line: any) => {
            if (String(line.accountCode || '').startsWith('41')) {
              aggD += line.debit || 0;
              aggC += line.credit || 0;
            }
          });
        });

        if (mounted) {
          setClients(clientsData);
          setClientLinesMap(linesByClient);
          setAggReceivables(Math.max(aggD - aggC, 0));
          setAggCA(aggD);
        }
      } catch (err) {
        /* ignored */
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [adapter]);

  // Données Balance Âgée
  const balanceAgeeData: BalanceAgeeItem[] = useMemo(() => clients.map(client => ({
    clientId: client.id,
    clientCode: client.code,
    clientNom: client.raisonSociale,
    totalCreances: client.nonEchu + client.echu0_30 + client.echu31_60 + client.echu61_90 + client.echuPlus90,
    nonEchu: client.nonEchu,
    echu0_30: client.echu0_30,
    echu31_60: client.echu31_60,
    echu61_90: client.echu61_90,
    echuPlus90: client.echuPlus90,
    provision: client.echuPlus90 * 0.5 + client.echu61_90 * 0.2 // Provision pour créances douteuses
  })), [clients]);

  // Calculs totaux Balance Âgée
  const totauxBalanceAgee = useMemo(() => balanceAgeeData.reduce((acc, item) => ({
    totalCreances: acc.totalCreances + item.totalCreances,
    nonEchu: acc.nonEchu + item.nonEchu,
    echu0_30: acc.echu0_30 + item.echu0_30,
    echu31_60: acc.echu31_60 + item.echu31_60,
    echu61_90: acc.echu61_90 + item.echu61_90,
    echuPlus90: acc.echuPlus90 + item.echuPlus90,
    provision: acc.provision + item.provision
  }), {
    totalCreances: 0, nonEchu: 0, echu0_30: 0, echu31_60: 0, echu61_90: 0, echuPlus90: 0, provision: 0
  }), [balanceAgeeData]);

  const filteredClients = useMemo(() => clients.filter(client => {
    const matchSearch = client.raisonSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       client.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       client.secteurActivite.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       client.compteComptable.includes(searchTerm);
    const matchCategory = selectedCategory === 'all' || client.categorie === selectedCategory;
    const matchStatut = selectedStatut === 'all' || client.statut === selectedStatut;

    return matchSearch && matchCategory && matchStatut;
  }), [clients, searchTerm, selectedCategory, selectedStatut]);


  const getCategorieColor = (categorie: string) => {
    switch (categorie) {
      case 'GRAND_COMPTE': return 'bg-primary-100 text-primary-800';
      case 'PME': return 'bg-blue-100 text-blue-800';
      case 'TPE': return 'bg-green-100 text-green-800';
      case 'PARTICULIER': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'ACTIF': return 'bg-green-100 text-green-800';
      case 'BLOQUE': return 'bg-red-100 text-red-800';
      case 'SUSPENDU': return 'bg-yellow-100 text-yellow-800';
      case 'INACTIF': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNotationColor = (notation: string) => {
    switch (notation) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedClients(filteredClients.map(c => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (id: string) => {
    if (selectedClients.includes(id)) {
      setSelectedClients(selectedClients.filter(cId => cId !== id));
    } else {
      setSelectedClients([...selectedClients, id]);
    }
  };

  const handleOpenNewClientModal = async () => {
    setShowNewClientModal(true);
    setFormStep(1);
    try {
      const mappings = await loadMappings(adapter);
      const { compteAuxiliaire, codeCommercial } = await generateNextCode(adapter, '411', mappings);
      setNewClient(prev => ({
        ...prev,
        compteAuxiliaire,
        codeCommercial,
      }));
    } catch {
      // ignore code generation errors — user can fill manually
    }
  };

  const handleCloseNewClientModal = () => {
    setShowNewClientModal(false);
    setFormStep(1);
    setEditingId(null);
    setNewClient({
      code: '',
      raisonSociale: '',
      nomCommercial: '',
      categorie: 'PME',
      secteurActivite: '',
      rccm: '',
      niu: '',
      regimeTVA: 'REEL_NORMAL',
      adresse: '',
      codePostal: '',
      ville: '',
      region: '',
      pays: 'Cameroun',
      contactPrincipal: '',
      fonction: '',
      email: '',
      telephone: '',
      telephoneSecondaire: '',
      fax: '',
      compteComptable: '411',
      compteAuxiliaire: '',
      codeCommercial: '',
      journalVentes: 'VE',
      delaiPaiement: 30,
      limiteCredit: 500000,
      modeReglement: 'VIREMENT',
      devise: 'XAF',
      remise: 0,
      escompte: 0,
      tauxTVA: 19.25,
      banque: '',
      iban: '',
      swift: ''
    });
  };

  const handleSaveNewClient = async () => {
    try {
      // Validation : raison sociale obligatoire + unicité du code (évite les fiches
      // fantômes et les collisions de rattachement des écritures).
      if (!newClient.raisonSociale?.trim()) {
        toast.error(t('clients.errCompanyNameRequired'));
        return;
      }
      if (newClient.code?.trim()) {
        const existing = (await adapter.getAll<any>('thirdParties')).find(
          (tp: any) => tp.code === newClient.code && tp.id !== editingId
        );
        if (existing) {
          toast.error(t('clients.errCodeAlreadyUsed', { code: newClient.code, name: String(existing.name || existing.raisonSociale || '') }));
          return;
        }
      }
      const common = {
        code: newClient.code,
        name: newClient.raisonSociale,
        taxId: newClient.niu,
        rccm: newClient.rccm,
        email: newClient.email,
        phone: newClient.telephone,
        address: newClient.adresse,
        conditionsPaiement: {
          delaiJours: newClient.delaiPaiement,
          modePaiement: newClient.modeReglement.toLowerCase(),
          escompte: newClient.escompte,
        },
        regimeFiscal: newClient.regimeTVA === 'REEL_NORMAL' ? 'RNI' : 'RSI',
      };
      if (editingId) {
        await adapter.update('thirdParties', editingId, common);
        toast.success(t('clients.toastClientUpdated'));
      } else {
        const id = crypto.randomUUID();
        await adapter.create('thirdParties', {
          id,
          type: 'customer',
          accountCode: `${newClient.compteComptable}${newClient.code || id.slice(0, 6).toUpperCase()}`,
          isActive: true,
          createdAt: new Date().toISOString(),
          ...common,
        });
      }
      // Reload
      const [allThirdParties, allEntries] = await Promise.all([
        adapter.getAll('thirdParties'),
        adapter.getAll('journalEntries')
      ]);
      const customers = (allThirdParties as any[]).filter((tp: any) =>
        tp.type === 'customer' || tp.type === 'both' ||
        /^41/.test(tp.code || '')  // 411xxx = clients SYSCOHADA
      );
      setClients(customers.map((tp: any) => {
        const lines: { debit: number; credit: number }[] = [];
        (allEntries as any[]).forEach((e: any) => {
          if (e.status === 'draft') return;
          (e.lines || []).forEach((l: any) => {
            if (l.thirdPartyCode === tp.code || l.accountCode === tp.accountCode)
              lines.push({ debit: l.debit || 0, credit: l.credit || 0 });
          });
        });
        const encours = lines.reduce((s, l) => s + l.debit - l.credit, 0);
        return {
          id: tp.id, code: tp.code || '', raisonSociale: tp.name || '',
          nomCommercial: tp.name, categorie: 'PME' as const, secteurActivite: '', pays: '',
          compteComptable: tp.accountCode || '411000', compteAuxiliaire: tp.code || '',
          journalVentes: 'VE', rccm: tp.rccm || '', niu: tp.taxId || '',
          regimeTVA: tp.regimeFiscal === 'RNI' ? 'REEL_NORMAL' as const : 'REEL_SIMPLIFIE' as const,
          tauxTVA: 19.25, adresse: tp.address || '', codePostal: '', ville: '', region: '',
          chiffreAffaires: lines.reduce((s, l) => s + l.debit, 0),
          encoursActuel: Math.max(encours, 0), dso: tp.conditionsPaiement?.delaiJours || 30,
          limiteCredit: 0, delaiPaiement: tp.conditionsPaiement?.delaiJours || 30,
          remise: 0, escompte: tp.conditionsPaiement?.escompte || 0,
          modeReglement: 'VIREMENT' as const, devise: 'XAF',
          banque: tp.banque?.nomBanque, iban: tp.banque?.iban, swift: tp.banque?.swift,
          scoreCredit: tp.isActive ? 80 : 40, tauxRecouvrement: 0,
          notationInterne: 'B' as const, fidele: tp.isActive,
          contactPrincipal: '', email: tp.email || '', telephone: tp.phone || '',
          statut: tp.isActive ? 'ACTIF' as const : 'INACTIF' as const,
          alertes: 0, nonEchu: Math.max(encours, 0), echu0_30: 0, echu31_60: 0, echu61_90: 0, echuPlus90: 0
        };
      }));
      handleCloseNewClientModal();
    } catch {
      toast.error(t('clients.errCreateClient'));
    }
  };

  const handleViewClient = (clientId: string) => {
    // Bouton « œil » → fiche détail en lecture seule (infos + écritures du tiers).
    const client = clients.find(c => c.id === clientId);
    if (client) setViewingClient(client);
  };

  const handleEditClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    // Ouvre l'assistant complet (4 étapes) pré-rempli, au lieu du mini-formulaire.
    setNewClient({
      code: client.code || '',
      raisonSociale: client.raisonSociale || '',
      nomCommercial: client.nomCommercial || '',
      categorie: client.categorie || 'PME',
      secteurActivite: client.secteurActivite || '',
      rccm: client.rccm || '',
      niu: client.niu || '',
      regimeTVA: client.regimeTVA || 'REEL_NORMAL',
      adresse: client.adresse || '',
      codePostal: client.codePostal || '',
      ville: client.ville || '',
      region: client.region || '',
      pays: client.pays || 'Cameroun',
      contactPrincipal: client.contactPrincipal || '',
      fonction: '',
      email: client.email || '',
      telephone: client.telephone || '',
      telephoneSecondaire: '',
      fax: '',
      compteComptable: client.compteComptable || '411',
      compteAuxiliaire: client.compteAuxiliaire || client.code || '',
      codeCommercial: '',
      journalVentes: client.journalVentes || 'VE',
      delaiPaiement: client.delaiPaiement ?? 30,
      limiteCredit: client.limiteCredit ?? 0,
      modeReglement: client.modeReglement || 'VIREMENT',
      devise: client.devise || 'XAF',
      remise: client.remise ?? 0,
      escompte: client.escompte ?? 0,
      tauxTVA: client.tauxTVA ?? 19.25,
      banque: client.banque || '',
      iban: client.iban || '',
      swift: client.swift || '',
    });
    setEditingId(clientId);
    setFormStep(1);
    setShowNewClientModal(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    // Bloquer la suppression d'un client mouvementé (encours ou CA ≠ 0) : cela orphelinerait
    // les écritures 411 rattachées. On propose de le DÉSACTIVER à la place (SYSCOHADA).
    const client = clients.find(c => c.id === clientId);
    if (client && (client.encoursActuel !== 0 || client.chiffreAffaires !== 0)) {
      if (window.confirm(t('clients.confirmDeactivateInstead'))) {
        try {
          await adapter.update('thirdParties', clientId, { isActive: false });
          setClients(prev => prev.map(c => c.id === clientId ? { ...c, statut: 'INACTIF' as any } : c));
          toast.success(t('clients.toastClientDeactivated'));
        } catch {
          toast.error(t('clients.errDeactivate'));
        }
      }
      return;
    }
    if (!window.confirm(t('clients.confirmDeleteClient'))) return;
    try {
      await adapter.delete('thirdParties', clientId);
      setClients(prev => prev.filter(c => c.id !== clientId));
      toast.success(t('clients.toastClientDeleted'));
    } catch {
      toast.error(t('clients.errDeleteClient'));
    }
  };

  // Générer code client automatique
  const generateClientCode = () => {
    const lastCode = clients.length > 0 ? parseInt(clients[clients.length - 1].code.replace(/[^0-9]/g, '') || '0') : 0;
    const newCode = `CLI${String(lastCode + 1).padStart(3, '0')}`;
    setNewClient({ ...newClient, code: newCode, compteAuxiliaire: newCode });
  };

  // Calcul des statistiques
  const { moyenneDSO, clientsActifs } = useMemo(() => ({
    moyenneDSO: clients.length ? Math.round(clients.reduce((sum, c) => sum + c.dso, 0) / clients.length) : 0,
    clientsActifs: clients.filter(c => c.statut === 'ACTIF').length,
  }), [clients]);

  // Analytics Data computed from real clients
  const analyticsData = useMemo(() => {
    const categories = ['GRAND_COMPTE', 'PME', 'TPE', 'PARTICULIER'] as const;
    const clientsParCategorie = categories.map(cat => ({
      categorie: cat,
      count: clients.filter(c => c.categorie === cat).length,
      montant: clients.filter(c => c.categorie === cat).reduce((s, c) => s + c.chiffreAffaires, 0)
    }));
    return {
      clientsParCategorie,
      evolutionCA: [] as { mois: string; ca2024: number; ca2025: number }[],
      performanceClients: [
        { critere: t('clients.critLoyalty'), score: clients.length > 0 ? Math.round(clients.filter(c => c.fidele).length / clients.length * 100) : 0 },
        { critere: t('clients.critPayment'), score: clients.length > 0 ? Math.round(clients.filter(c => c.statut === 'ACTIF').length / clients.length * 100) : 0 },
        { critere: t('clients.critVolume'), score: clients.length > 0 ? Math.min(100, Math.round(clients.reduce((s, c) => s + c.chiffreAffaires, 0) / 1000000)) : 0 },
        { critere: t('clients.critProfitability'), score: 0 },
        { critere: t('clients.critPotential'), score: 0 }
      ]
    };
  }, [clients, t]);

  // Data pour graphique Balance Âgée
  const balanceAgeeChartData = [
    { key: 'nonEchu', name: t('clients.bucketNonEchu'), value: totauxBalanceAgee.nonEchu, color: '#15803D' },
    { key: 'echu0_30', name: t('clients.bucket030'), value: totauxBalanceAgee.echu0_30, color: '#E89A2E' },
    { key: 'echu31_60', name: t('clients.bucket3160'), value: totauxBalanceAgee.echu31_60, color: '#E89A2E' },
    { key: 'echu61_90', name: t('clients.bucket6190'), value: totauxBalanceAgee.echu61_90, color: '#C0322B' },
    { key: 'echuPlus90', name: t('clients.bucketPlus90'), value: totauxBalanceAgee.echuPlus90, color: '#C0322B' }
  ];

  const COLORS = ['#235A6E', '#E89A2E', '#15803D', '#4E7E8D', '#C77E2C', '#7FA3AF'];

  const tabs = [
    { id: 'liste', label: t('clients.tabList'), icon: Users },
    { id: 'balance-agee', label: t('clients.tabAging'), icon: Receipt },
    { id: 'analytics', label: t('clients.tabAnalytics'), icon: BarChart3 }
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[var(--color-text-secondary)] mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">{t('clients.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header avec navigation */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-[var(--color-border)]">
        <h2 className="text-lg font-bold text-[var(--color-primary)] mb-6">{t('clients.title')}</h2>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-6 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-[var(--color-text-tertiary)] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[#404040]'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Liste Tab */}
      {activeTab === 'liste' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-4 border border-primary-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary-600 font-medium">{t('clients.kpiTotalOutstanding')}</p>
                  <p className="text-lg font-bold text-primary-800">{formatCurrency(aggReceivables)}</p>
                  <p className="text-xs text-primary-600 mt-1">{t('clients.kpiOnActiveClients', { count: String(clientsActifs) })}</p>
                </div>
                <Wallet className="w-8 h-8 text-primary-400" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">{t('clients.kpiRevenue')}</p>
                  <p className="text-lg font-bold text-blue-800">{formatCurrency(aggCA)}</p>
                  <p className="text-xs text-blue-600 mt-1">{t('clients.kpiCurrentYear')}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">{t('clients.kpiAvgDso')}</p>
                  <p className="text-lg font-bold text-green-800">{moyenneDSO} {t('clients.days')}</p>
                  <p className="text-xs text-green-600 mt-1">{t('clients.kpiCollectionDelay')}</p>
                </div>
                <Clock className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">{t('clients.kpiAlerts')}</p>
                  <p className="text-lg font-bold text-orange-800">{clients.reduce((sum, c) => sum + c.alertes, 0)}</p>
                  <p className="text-xs text-orange-600 mt-1">{t('clients.kpiToProcess')}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </div>

          {/* Actions et Filtres */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-[var(--color-text-secondary)]" />
              <input
                type="text"
                placeholder={t('clients.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            {showFilters && (
            <>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="all">{t('clients.allCategories')}</option>
              <option value="GRAND_COMPTE">{t('clients.catLargeAccount')}</option>
              <option value="PME">{t('clients.catSme')}</option>
              <option value="TPE">{t('clients.catVse')}</option>
              <option value="PARTICULIER">{t('clients.catIndividual')}</option>
            </select>

            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="all">{t('clients.allStatuses')}</option>
              <option value="ACTIF">{t('clients.statusActive')}</option>
              <option value="BLOQUE">{t('clients.statusBlocked')}</option>
              <option value="SUSPENDU">{t('clients.statusSuspended')}</option>
              <option value="INACTIF">{t('clients.statusInactive')}</option>
            </select>
            </>
            )}

            <PageHeaderActions
              onToggleFilters={() => setShowFilters((v) => !v)}
              filtersOpen={showFilters}
              activeFilters={[searchTerm !== '', selectedCategory !== 'all', selectedStatut !== 'all'].filter(Boolean).length}
            />

            <button
              type="button"
              onClick={handleOpenNewClientModal}
              className="flex items-center space-x-2 px-4 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">{t('clients.newClient')}</span>
            </button>
          </div>

          {/* Table des clients */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--color-border)]">
            <div className="p-4 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t('clients.clientsFound', { count: String(filteredClients.length) })}
                </p>
                <div className="flex items-center space-x-2">
                  {selectedClients.length > 0 && (
                    <span className="text-sm text-[var(--color-primary)] font-medium">
                      {t('clients.selectedCount', { count: String(selectedClients.length) })}
                    </span>
                  )}
                  <ExportMenu
                    data={filteredClients as unknown as Record<string, unknown>[]}
                    filename="clients"
                    columns={{
                      code: t('clients.colCode'),
                      compteComptable: t('clients.colAccount'),
                      raisonSociale: t('clients.colClient'),
                      niu: t('clients.colNiu'),
                      secteurActivite: t('clients.colSector'),
                      categorie: t('clients.colCategory'),
                      pays: t('clients.colCountry'),
                      encoursActuel: t('clients.colOutstanding'),
                      chiffreAffaires: t('clients.colRevenue'),
                      dso: t('clients.colDso'),
                      notationInterne: t('clients.colRating'),
                      statut: t('clients.colStatus')
                    }}
                    buttonText={t('common.export')}
                    buttonVariant="outline"
                  />
                  <button
                    type="button"
                    className="flex items-center space-x-2 px-3 py-2 text-sm border border-[var(--color-border)] rounded hover:bg-gray-50"
                  >
                    <Filter className="w-4 h-4" />
                    <span>{t('clients.moreFilters')}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 p-3">
                      <input
                        type="checkbox"
                        checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('clients.colCode')}</th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('clients.colAccount')}</th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('clients.colClient')}</th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('clients.colNiuRccm')}</th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('clients.colCategory')}</th>
                    <th className="text-right p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('clients.colOutstanding')}</th>
                    <th className="text-center p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('clients.colDso')}</th>
                    <th className="text-center p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('clients.colRating')}</th>
                    <th className="text-center p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('clients.colStatus')}</th>
                    <th className="text-center p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('clients.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-t border-[var(--color-border)] hover:bg-gray-50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => handleSelectClient(client.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-medium text-[var(--color-primary)]">{client.code}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-mono text-[var(--color-primary)]">{fmtAccount(client.compteComptable)}</span>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-primary)]">{client.raisonSociale}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{client.secteurActivite}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-xs font-mono text-[var(--color-text-secondary)]">{client.niu}</p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">{client.rccm}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getCategorieColor(client.categorie)}`}>
                          {client.categorie.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-primary)]">{formatCurrency(client.encoursActuel)}</p>
                          {client.encoursActuel > client.limiteCredit * 0.8 && (
                            <p className="text-xs text-orange-600">{t('clients.nearLimit')}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Clock className="w-3 h-3 text-[var(--color-text-secondary)]" />
                          <span className="text-sm text-[var(--color-text-secondary)]">{client.dso}{t('clients.daysShort')}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getNotationColor(client.notationInterne)}`}>
                          {client.notationInterne}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatutColor(client.statut)}`}>
                            {client.statut}
                          </span>
                          {client.alertes > 0 && (
                            <span className="flex items-center space-x-1 text-xs text-orange-600">
                              <AlertCircle className="w-3 h-3" />
                              <span>{client.alertes}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleViewClient(client.id)}
                            className="p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded"
                            title={t('clients.view')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditClient(client.id)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title={t('clients.edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClient(client.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title={t('clients.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">
                {t('clients.paginationShowing', { to: String(filteredClients.length), total: String(filteredClients.length) })}
              </span>
              <div className="flex items-center space-x-2">
                <button type="button" className="px-3 py-1 border border-[var(--color-border)] rounded text-sm disabled:opacity-50" disabled>
                  {t('clients.previous')}
                </button>
                <button type="button" className="px-3 py-1 bg-[var(--color-primary)] text-white rounded text-sm">1</button>
                <button type="button" className="px-3 py-1 border border-[var(--color-border)] rounded text-sm disabled:opacity-50" disabled>
                  {t('clients.next')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Balance Âgée Tab */}
      {activeTab === 'balance-agee' && (
        <div className="space-y-6">
          {/* Header avec actions */}
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('clients.agingTitle')}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">{t('clients.agingSubtitle', { date: new Date().toLocaleDateString('fr-FR') })}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPeriodModal(true)}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{t('clients.cutoffDate')}</span>
                </button>
                <ExportMenu
                  data={balanceAgeeData as unknown as Record<string, unknown>[]}
                  filename="balance-agee-clients"
                  columns={{
                    clientCode: t('clients.colClientCode'),
                    clientNom: t('clients.colClientName'),
                    totalCreances: t('clients.colTotalReceivables'),
                    nonEchu: t('clients.bucketNonEchu'),
                    echu0_30: t('clients.bucket030'),
                    echu31_60: t('clients.bucket3160'),
                    echu61_90: t('clients.bucket6190'),
                    echuPlus90: t('clients.bucketPlus90'),
                    provision: t('clients.provision')
                  }}
                  buttonText={t('clients.export')}
                />
                <button type="button" className="p-2 text-gray-600 hover:bg-gray-100 rounded" title={t('clients.print')}>
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* KPIs Balance Âgée */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(totauxBalanceAgee.totalCreances)}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{t('clients.colTotalReceivables')}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-600">{((totauxBalanceAgee.nonEchu / totauxBalanceAgee.totalCreances) * 100).toFixed(1)}%</span>
              </div>
              <p className="text-lg font-bold text-green-800">{formatCurrency(totauxBalanceAgee.nonEchu)}</p>
              <p className="text-xs text-green-600">{t('clients.bucketNonEchu')}</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-xs text-yellow-600">{((totauxBalanceAgee.echu0_30 / totauxBalanceAgee.totalCreances) * 100).toFixed(1)}%</span>
              </div>
              <p className="text-lg font-bold text-yellow-800">{formatCurrency(totauxBalanceAgee.echu0_30)}</p>
              <p className="text-xs text-yellow-600">{t('clients.bucket030')}</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="text-xs text-orange-600">{((totauxBalanceAgee.echu31_60 / totauxBalanceAgee.totalCreances) * 100).toFixed(1)}%</span>
              </div>
              <p className="text-lg font-bold text-orange-800">{formatCurrency(totauxBalanceAgee.echu31_60)}</p>
              <p className="text-xs text-orange-600">{t('clients.bucket3160')}</p>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <AlertOctagon className="w-5 h-5 text-red-600" />
                <span className="text-xs text-red-600">{(((totauxBalanceAgee.echu61_90 + totauxBalanceAgee.echuPlus90) / totauxBalanceAgee.totalCreances) * 100).toFixed(1)}%</span>
              </div>
              <p className="text-lg font-bold text-red-800">{formatCurrency(totauxBalanceAgee.echu61_90 + totauxBalanceAgee.echuPlus90)}</p>
              <p className="text-xs text-red-600">{t('clients.bucketPlus60')}</p>
            </div>

            <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-5 h-5 text-primary-600" />
              </div>
              <p className="text-lg font-bold text-primary-800">{formatCurrency(totauxBalanceAgee.provision)}</p>
              <p className="text-xs text-primary-600">{t('clients.provisions')}</p>
            </div>
          </div>

          {/* Sous-onglets Balance Âgée */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
            <div className="flex border-b border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setBalanceAgeeSubTab('repartition')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  balanceAgeeSubTab === 'repartition'
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
                }`}
              >
                <PieChart className="w-4 h-4" />
                <span>{t('clients.subtabDistribution')}</span>
              </button>
              <button
                type="button"
                onClick={() => setBalanceAgeeSubTab('detail')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  balanceAgeeSubTab === 'detail'
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{t('clients.subtabDetail')}</span>
              </button>
              <button
                type="button"
                onClick={() => setBalanceAgeeSubTab('risques')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  balanceAgeeSubTab === 'risques'
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{t('clients.subtabRisks')}</span>
              </button>
            </div>

            {/* Contenu sous-onglet: Répartition par ancienneté */}
            {balanceAgeeSubTab === 'repartition' && (
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Graphique Donut Moderne */}
                  <div className="lg:col-span-2 bg-gradient-to-br from-primary-50 to-gray-100 rounded-2xl p-6 shadow-inner">
                    <h4 className="text-lg font-semibold text-[var(--color-primary)] mb-2 text-center">{t('clients.distributionTitle')}</h4>
                    <p className="text-sm text-[var(--color-text-secondary)] text-center mb-4">{t('clients.subtabDistribution')}</p>
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={320}>
                        <RechartsPieChart>
                          <Pie
                            data={balanceAgeeChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={72}
                            outerRadius={118}
                            paddingAngle={1}
                            dataKey="value"
                            stroke="#fff"
                            strokeWidth={2}
                          >
                            {balanceAgeeChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatCurrency(value as number)}
                            contentStyle={{
                              borderRadius: '12px',
                              border: 'none',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                              padding: '12px 16px'
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                      {/* Centre du Donut avec Total (cercle net, sans ombre qui bave) */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center bg-white rounded-full w-32 h-32 flex flex-col items-center justify-center border border-[var(--color-border)] px-3">
                          <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">{t('clients.total')}</p>
                          <p className="text-base font-bold text-[var(--color-primary)] leading-tight">{formatCurrency(totauxBalanceAgee.totalCreances)}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{t('clients.clientsCount', { count: String(balanceAgeeData.length) })}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Légende détaillée et statistiques */}
                  <div className="lg:col-span-3 space-y-3">
                    <h4 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('clients.detailByBucket')}</h4>
                    {balanceAgeeChartData.map((item, idx) => {
                      const percent = totauxBalanceAgee.totalCreances > 0
                        ? ((item.value / totauxBalanceAgee.totalCreances) * 100).toFixed(1)
                        : '0';
                      const clientCount = balanceAgeeData.filter(c => {
                        if (item.key === 'nonEchu') return c.nonEchu > 0;
                        if (item.key === 'echu0_30') return c.echu0_30 > 0;
                        if (item.key === 'echu31_60') return c.echu31_60 > 0;
                        if (item.key === 'echu61_90') return c.echu61_90 > 0;
                        if (item.key === 'echuPlus90') return c.echuPlus90 > 0;
                        return false;
                      }).length;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 bg-white rounded-xl border border-[var(--color-border)] hover:shadow-md transition-all duration-200 cursor-pointer group"
                          style={{ borderLeft: `4px solid ${item.color}` }}
                        >
                          <div className="flex items-center space-x-4">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                              style={{ backgroundColor: `${item.color}20` }}
                            >
                              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: item.color }}></div>
                            </div>
                            <div>
                              <p className="font-semibold text-[var(--color-primary)] group-hover:text-[var(--color-primary)] transition-colors">{item.name}</p>
                              <p className="text-sm text-[var(--color-text-secondary)]">{t('clients.clientsConcerned', { count: String(clientCount) })}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(item.value)}</p>
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percent}%`, backgroundColor: item.color }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-[var(--color-text-secondary)] min-w-[45px] text-right">{percent}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Graphique en barres empilées */}
                <div className="mt-6 bg-gray-50 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-[var(--color-primary)] mb-4">{t('clients.evolutionByClient')}</h4>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={balanceAgeeData.slice(0, 8).map(d => ({ ...d, label: `${d.clientCode} · ${(d.clientNom || '').slice(0, 22)}` }))} layout="vertical" margin={{ left: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                      <YAxis type="category" dataKey="label" width={200} tick={{ fontSize: 11 }} interval={0} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar radius={[6,6,0,0]} dataKey="nonEchu" stackId="a" fill="url(#gradGreen)" name={t('clients.bucketNonEchu')} />
                      <Bar radius={[6,6,0,0]} dataKey="echu0_30" stackId="a" fill="url(#gradAmber)" name={t('clients.bucket030Short')} />
                      <Bar radius={[6,6,0,0]} dataKey="echu31_60" stackId="a" fill="url(#gradAmber)" name={t('clients.bucket3160Short')} />
                      <Bar radius={[6,6,0,0]} dataKey="echu61_90" stackId="a" fill="url(#gradRed)" name={t('clients.bucket6190Short')} />
                      <Bar radius={[6,6,0,0]} dataKey="echuPlus90" stackId="a" fill="url(#gradRed)" name={t('clients.bucketPlus90Short')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Contenu sous-onglet: Détail par client */}
            {balanceAgeeSubTab === 'detail' && (
              <div className="p-6">
                {/* Filtres */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder={t('clients.searchClientPlaceholder')}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="all">{t('clients.allBuckets')}</option>
                      <option value="nonechu">{t('clients.nonEchuOnly')}</option>
                      <option value="0-30">{t('clients.bucket030')}</option>
                      <option value="31-60">{t('clients.bucket3160')}</option>
                      <option value="61-90">{t('clients.bucket6190')}</option>
                      <option value="+90">{t('clients.bucketPlus90')}</option>
                    </select>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('clients.clientsCount', { count: String(balanceAgeeData.length) })}</p>
                </div>

                {/* Tableau détaillé */}
                <div className="overflow-x-auto border border-[var(--color-border)] rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">{t('clients.colCode')}</th>
                        <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">{t('clients.colClient')}</th>
                        <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">{t('clients.colTotalReceivables')}</th>
                        <th className="text-right p-3 font-medium text-green-600">{t('clients.bucketNonEchu')}</th>
                        <th className="text-right p-3 font-medium text-yellow-600">{t('clients.bucket030Short')}</th>
                        <th className="text-right p-3 font-medium text-orange-600">{t('clients.bucket3160Short')}</th>
                        <th className="text-right p-3 font-medium text-red-600">{t('clients.bucket6190Short')}</th>
                        <th className="text-right p-3 font-medium text-red-800">{t('clients.bucketPlus90Short')}</th>
                        <th className="text-right p-3 font-medium text-primary-600">{t('clients.provision')}</th>
                        <th className="text-center p-3 font-medium text-[var(--color-text-secondary)]">{t('clients.colActions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceAgeeData.map((item) => {
                        const hasRisk = item.echuPlus90 > 0 || item.echu61_90 > 0;
                        return (
                          <tr key={item.clientId} className={`border-t border-[var(--color-border)] hover:bg-gray-50 ${hasRisk ? 'bg-red-50/30' : ''}`}>
                            <td className="p-3">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{item.clientCode}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-[var(--color-primary)]">{item.clientNom}</p>
                                {hasRisk && (
                                  <span title={t('clients.overdueTooltip', { amount: formatCurrency(item.echu61_90 + item.echuPlus90) })} className="cursor-help">
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right font-bold">{formatCurrency(item.totalCreances)}</td>
                            <td className="p-3 text-right text-green-600">{item.nonEchu > 0 ? formatCurrency(item.nonEchu) : '-'}</td>
                            <td className="p-3 text-right text-yellow-600">{item.echu0_30 > 0 ? formatCurrency(item.echu0_30) : '-'}</td>
                            <td className="p-3 text-right text-orange-600">{item.echu31_60 > 0 ? formatCurrency(item.echu31_60) : '-'}</td>
                            <td className="p-3 text-right text-red-600">{item.echu61_90 > 0 ? formatCurrency(item.echu61_90) : '-'}</td>
                            <td className="p-3 text-right text-red-800 font-bold">{item.echuPlus90 > 0 ? formatCurrency(item.echuPlus90) : '-'}</td>
                            <td className="p-3 text-right text-primary-600">{item.provision > 0 ? formatCurrency(item.provision) : '-'}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button type="button" onClick={() => setAgingDetail(item)} className="p-1 text-gray-500 hover:text-[var(--color-primary)]" title={t('clients.viewDetail')}>
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button type="button" onClick={() => sendRelance(item)} className="p-1 text-gray-500 hover:text-blue-600" title={t('clients.sendReminder')}>
                                  <Mail className="w-4 h-4" />
                                </button>
                                <button type="button" onClick={() => exportAgingCsv(item)} className="p-1 text-gray-500 hover:text-orange-600" title={t('clients.exportCsv')}>
                                  <Printer className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold">
                      <tr>
                        <td className="p-3" colSpan={2}>{t('clients.totalsRow', { count: String(balanceAgeeData.length) })}</td>
                        <td className="p-3 text-right">{formatCurrency(totauxBalanceAgee.totalCreances)}</td>
                        <td className="p-3 text-right text-green-600">{formatCurrency(totauxBalanceAgee.nonEchu)}</td>
                        <td className="p-3 text-right text-yellow-600">{formatCurrency(totauxBalanceAgee.echu0_30)}</td>
                        <td className="p-3 text-right text-orange-600">{formatCurrency(totauxBalanceAgee.echu31_60)}</td>
                        <td className="p-3 text-right text-red-600">{formatCurrency(totauxBalanceAgee.echu61_90)}</td>
                        <td className="p-3 text-right text-red-800">{formatCurrency(totauxBalanceAgee.echuPlus90)}</td>
                        <td className="p-3 text-right text-primary-600">{formatCurrency(totauxBalanceAgee.provision)}</td>
                        <td className="p-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Contenu sous-onglet: Clients à risque et recommandations */}
            {balanceAgeeSubTab === 'risques' && (
              <div className="p-6 space-y-6">
                {/* Indicateurs de risque */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center justify-between">
                      <AlertOctagon className="w-8 h-8 text-red-600" />
                      <span className="text-lg font-bold text-red-800">
                        {balanceAgeeData.filter(i => i.echuPlus90 > 0).length}
                      </span>
                    </div>
                    <p className="text-sm text-red-700 mt-2">{t('clients.criticalClients')}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <AlertTriangle className="w-8 h-8 text-orange-600" />
                      <span className="text-lg font-bold text-orange-800">
                        {balanceAgeeData.filter(i => i.echu61_90 > 0).length}
                      </span>
                    </div>
                    <p className="text-sm text-orange-700 mt-2">{t('clients.clientsToWatch')}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <Clock className="w-8 h-8 text-yellow-600" />
                      <span className="text-lg font-bold text-yellow-800">
                        {balanceAgeeData.filter(i => i.echu31_60 > 0).length}
                      </span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-2">{t('clients.remindersToPlan')}</p>
                  </div>
                  <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                    <div className="flex items-center justify-between">
                      <Shield className="w-8 h-8 text-primary-600" />
                      <span className="text-lg font-bold text-primary-800">
                        {formatCurrency(totauxBalanceAgee.provision)}
                      </span>
                    </div>
                    <p className="text-sm text-primary-700 mt-2">{t('clients.recommendedProvisions')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Liste des clients à risque élevé */}
                  <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                    <div className="p-4 bg-red-50 border-b border-red-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-md font-semibold text-red-800">{t('clients.highRiskClients')}</h4>
                        <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                          {t('clients.clientsCount', { count: String(balanceAgeeData.filter(item => item.echuPlus90 > 0).length) })}
                        </span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">{t('clients.receivablesOver90')}</p>
                    </div>
                    <div className="divide-y divide-[var(--color-border)] max-h-96 overflow-y-auto">
                      {balanceAgeeData
                        .filter(item => item.echuPlus90 > 0)
                        .sort((a, b) => b.echuPlus90 - a.echuPlus90)
                        .map((item, idx) => (
                          <div key={idx} className="p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-[var(--color-primary)]">{item.clientNom}</p>
                                <p className="text-xs text-[var(--color-text-secondary)]">{item.clientCode}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-red-800">{formatCurrency(item.echuPlus90)}</p>
                                <p className="text-xs text-[var(--color-text-secondary)]">{t('clients.overduePlus90')}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center space-x-2">
                              <button
                                type="button"
                                className="flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center space-x-1"
                              >
                                <Mail className="w-3 h-3" />
                                <span>{t('clients.formalNotice')}</span>
                              </button>
                              <button
                                type="button"
                                className="flex-1 px-3 py-1.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center justify-center space-x-1"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{t('clients.call')}</span>
                              </button>
                              <button
                                type="button"
                                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      {balanceAgeeData.filter(item => item.echuPlus90 > 0).length === 0 && (
                        <div className="p-8 text-center text-[var(--color-text-secondary)]">
                          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                          <p>{t('clients.noCriticalRisk')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions recommandées */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                      <div className="p-4 bg-[var(--color-primary)]/10 border-b border-[var(--color-border)]">
                        <h4 className="text-md font-semibold text-[var(--color-primary)]">{t('clients.recommendedActionPlan')}</h4>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">{t('clients.priorityActions')}</p>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Action 1 */}
                        <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-red-800">{t('clients.urgentFormalNotices')}</p>
                              <p className="text-sm text-red-700">
                                {t('clients.clientsWithOver90', { count: String(balanceAgeeData.filter(i => i.echuPlus90 > 0).length) })}
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                              {t('clients.process')}
                            </button>
                          </div>
                        </div>

                        {/* Action 2 */}
                        <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-orange-800">{t('clients.remindersLevel2')}</p>
                              <p className="text-sm text-orange-700">
                                {t('clients.clientsWith6190', { count: String(balanceAgeeData.filter(i => i.echu61_90 > 0).length) })}
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">
                              {t('clients.remind')}
                            </button>
                          </div>
                        </div>

                        {/* Action 3 */}
                        <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-yellow-800">{t('clients.remindersLevel1')}</p>
                              <p className="text-sm text-yellow-700">
                                {t('clients.clientsWith3160', { count: String(balanceAgeeData.filter(i => i.echu31_60 > 0).length) })}
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700">
                              {t('clients.send')}
                            </button>
                          </div>
                        </div>

                        {/* Action 4 */}
                        <div className="p-3 bg-primary-50 rounded-lg border-l-4 border-primary-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-primary-800">{t('clients.provisionsToRecord')}</p>
                              <p className="text-sm text-primary-700">
                                {t('clients.perSyscohadaRules', { amount: formatCurrency(totauxBalanceAgee.provision) })}
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700">
                              {t('clients.generateJournalEntry')}
                            </button>
                          </div>
                        </div>

                        {/* Action 5 */}
                        <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-gray-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-800">{t('clients.accountsToBlock')}</p>
                              <p className="text-sm text-gray-700">
                                {t('clients.clientsOverThreshold', { count: String(balanceAgeeData.filter(i => i.echuPlus90 > 500000).length) })}
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">
                              {t('clients.block')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Règles de provisionnement */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h5 className="font-medium text-blue-800 flex items-center">
                        <Info className="w-4 h-4 mr-2" />
                        {t('clients.syscohadaProvisionRules')}
                      </h5>
                      <div className="mt-3 space-y-2 text-sm text-blue-700">
                        <div className="flex justify-between">
                          <span>{t('clients.receivables6190')}</span>
                          <span className="font-medium">{t('clients.provision20')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('clients.receivablesPlus90')}</span>
                          <span className="font-medium">{t('clients.provision50')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('clients.receivablesLitigation')}</span>
                          <span className="font-medium">{t('clients.provision100')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (() => {
        const totalCA = clients.reduce((s, c) => s + (c.chiffreAffaires || 0), 0);
        const activeClients = clients.filter(c => c.statut === 'ACTIF');
        const avgDSO = clients.length > 0 ? Math.round(clients.reduce((s, c) => s + (c.dso || 0), 0) / clients.length) : 0;
        const avgRecouvrement = clients.length > 0 ? Math.round(clients.reduce((s, c) => s + (c.tauxRecouvrement || 0), 0) / clients.length) : 0;
        const avgScore = clients.length > 0 ? (clients.reduce((s, c) => s + (c.scoreCredit || 0), 0) / clients.length / 20).toFixed(1) : '0';
        const catData = analyticsData.clientsParCategorie;
        const pieData = catData.map(c => ({ categorie: c.categorie, ca: c.montant }));
        const topClients = [...clients].sort((a, b) => (b.chiffreAffaires || 0) - (a.chiffreAffaires || 0)).slice(0, 5);
        const riskClients = clients.filter(c => (c.scoreCredit || 0) < 50);

        const analyticsSubTabs = [
          { key: 'kpis', label: t('clients.subtabKpis'), icon: BarChart3 },
          { key: 'charts', label: t('clients.subtabCharts'), icon: PieChart },
          { key: 'performance', label: t('clients.subtabPerformance'), icon: Target },
        ];

        return (
        <div className="space-y-6">
          {/* Sub-tabs */}
          <div className="flex items-center bg-white rounded-xl p-1 border shadow-sm w-fit">
            {analyticsSubTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.key} type="button" onClick={() => setAnalyticsSubTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    analyticsSubTab === tab.key ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}>
                  <Icon className="w-4 h-4" />{tab.label}
                </button>
              );
            })}
          </div>

          {/* Sub-tab: KPIs */}
          {analyticsSubTab === 'kpis' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <Building className="w-5 h-5 text-[var(--color-primary)] mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{activeClients.length}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('clients.activeClients')}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <DollarSign className="w-5 h-5 text-primary-600 mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(totalCA)}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('clients.totalRevenue')}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <Clock className="w-5 h-5 text-blue-600 mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{avgDSO}{t('clients.daysShort')}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('clients.kpiAvgDso')}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <Target className="w-5 h-5 text-orange-600 mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{avgRecouvrement}%</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('clients.collectionRate')}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <Shield className="w-5 h-5 text-green-600 mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{avgScore}/5</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('clients.avgScore')}</p>
                </div>
              </div>

              {/* Catégories + Top clients */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('clients.analysisByCategory')}</h3>
                  <div className="space-y-3">
                    {catData.map((cat) => (
                      <div key={cat.categorie} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">{cat.categorie}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-900">{cat.count}</span>
                          <span className="text-xs text-gray-500">{formatCurrency(cat.montant)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('clients.topClients')}</h3>
                  <div className="space-y-3">
                    {topClients.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">{t('clients.noClients')}</p>
                    ) : topClients.map((c, idx) => (
                      <div key={c.id} className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-600'
                          }`}>{idx + 1}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--color-primary)] truncate">{c.raisonSociale}</p>
                            <p className="text-xs text-[var(--color-text-secondary)]">{formatCurrency(c.chiffreAffaires || 0)}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[var(--color-primary)]">
                          {totalCA > 0 ? ((c.chiffreAffaires || 0) / totalCA * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab: Graphiques */}
          {analyticsSubTab === 'charts' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('clients.distributionByCategory')}</h3>
                {pieData.some(d => d.ca > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie dataKey="ca" data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#235A6E"
                        label={({ categorie, percent }) => `${categorie} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <p className="text-sm">{t('clients.noRevenueData')}</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('clients.performanceEvaluation')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={analyticsData.performanceClients}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="critere" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name={t('clients.score')} dataKey="score" stroke="#235A6E" fill="#235A6E" fillOpacity={0.6} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Sub-tab: Performance */}
          {analyticsSubTab === 'performance' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('clients.riskClients')}</h3>
                {riskClients.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">{t('clients.noRiskClients')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {riskClients.slice(0, 10).map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.raisonSociale}</p>
                          <p className="text-xs text-gray-600">{t('clients.scoreDsoLine', { score: String(c.scoreCredit), dso: String(c.dso) })}</p>
                        </div>
                        <span className="text-sm font-bold text-red-600">{formatCurrency(c.encoursActuel || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {/* Modal Nouveau Client - Multi-étapes */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-primary)]">{editingId ? t('clients.editClient') : t('clients.newClient')}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('clients.stepOf4', { step: String(formStep) })}</p>
                </div>
                <button type="button" onClick={handleCloseNewClientModal} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </button>
              </div>
              {/* Progress bar */}
              <div className="flex mt-4 space-x-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 h-2 rounded-full ${step <= formStep ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
              <div className="flex mt-2 text-xs text-[var(--color-text-secondary)]">
                <span className="flex-1">{t('clients.stepIdentification')}</span>
                <span className="flex-1">{t('clients.stepAddressContact')}</span>
                <span className="flex-1">{t('clients.stepAccounting')}</span>
                <span className="flex-1">{t('clients.stepTerms')}</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Étape 1: Identification */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center">
                    <FileCheck className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
                    {t('clients.companyIdentification')}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelClientCode')}</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newClient.code}
                          onChange={(e) => setNewClient({ ...newClient, code: e.target.value })}
                          className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="CLI008"
                        />
                        <button
                          type="button"
                          onClick={generateClientCode}
                          className="px-3 py-2 bg-gray-100 text-[var(--color-text-secondary)] rounded-lg hover:bg-gray-200"
                        >
                          {t('clients.auto')}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelCategory')}</label>
                      <select
                        value={newClient.categorie}
                        onChange={(e) => setNewClient({ ...newClient, categorie: e.target.value as NewClientForm['categorie'] })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <option value="GRAND_COMPTE">{t('clients.catLargeAccount')}</option>
                        <option value="PME">{t('clients.catSme')}</option>
                        <option value="TPE">{t('clients.catVse')}</option>
                        <option value="PARTICULIER">{t('clients.catIndividual')}</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelCompanyName')}</label>
                      <input
                        type="text"
                        value={newClient.raisonSociale}
                        onChange={(e) => setNewClient({ ...newClient, raisonSociale: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder={t('clients.phCompanyLegalName')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelTradeName')}</label>
                      <input
                        type="text"
                        value={newClient.nomCommercial}
                        onChange={(e) => setNewClient({ ...newClient, nomCommercial: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelSector')}</label>
                      <input
                        type="text"
                        value={newClient.secteurActivite}
                        onChange={(e) => setNewClient({ ...newClient, secteurActivite: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder={t('clients.phSector')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelRccm')}</label>
                      <input
                        type="text"
                        value={newClient.rccm}
                        onChange={(e) => setNewClient({ ...newClient, rccm: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder="RC/YDE/2024/X/XXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelNiu')}</label>
                      <input
                        type="text"
                        value={newClient.niu}
                        onChange={(e) => setNewClient({ ...newClient, niu: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder="M0XXXXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelVatRegime')}</label>
                      <select
                        value={newClient.regimeTVA}
                        onChange={(e) => setNewClient({ ...newClient, regimeTVA: e.target.value as NewClientForm['regimeTVA'] })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <option value="REEL_NORMAL">{t('clients.vatRealNormal')}</option>
                        <option value="REEL_SIMPLIFIE">{t('clients.vatRealSimplified')}</option>
                        <option value="FORFAIT">{t('clients.vatFlatRate')}</option>
                        <option value="EXONERE">{t('clients.vatExempt')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 2: Adresse & Contact */}
              {formStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center mb-4">
                      <MapPin className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
                      {t('clients.address')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelAddress')}</label>
                        <input
                          type="text"
                          value={newClient.adresse}
                          onChange={(e) => setNewClient({ ...newClient, adresse: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder={t('clients.phAddress')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelPoBox')}</label>
                        <input
                          type="text"
                          value={newClient.codePostal}
                          onChange={(e) => setNewClient({ ...newClient, codePostal: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="BP 1234"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelCity')}</label>
                        <input
                          type="text"
                          value={newClient.ville}
                          onChange={(e) => setNewClient({ ...newClient, ville: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelRegion')}</label>
                        <input
                          type="text"
                          value={newClient.region}
                          onChange={(e) => setNewClient({ ...newClient, region: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelCountry')}</label>
                        <select
                          value={newClient.pays}
                          onChange={(e) => setNewClient({ ...newClient, pays: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value="Cameroun">{t('clients.countryCameroon')}</option>
                          <option value="Gabon">{t('clients.countryGabon')}</option>
                          <option value="Congo">{t('clients.countryCongo')}</option>
                          <option value="Tchad">{t('clients.countryChad')}</option>
                          <option value="Guinée Équatoriale">{t('clients.countryEqGuinea')}</option>
                          <option value="République Centrafricaine">{t('clients.countryCar')}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center mb-4">
                      <Users className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
                      {t('clients.mainContact')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelContactName')}</label>
                        <input
                          type="text"
                          value={newClient.contactPrincipal}
                          onChange={(e) => setNewClient({ ...newClient, contactPrincipal: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelPosition')}</label>
                        <input
                          type="text"
                          value={newClient.fonction}
                          onChange={(e) => setNewClient({ ...newClient, fonction: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder={t('clients.phPosition')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelEmail')}</label>
                        <input
                          type="email"
                          value={newClient.email}
                          onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelPhone')}</label>
                        <input
                          type="tel"
                          value={newClient.telephone}
                          onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="+237 6XX XXX XXX"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelPhone2')}</label>
                        <input
                          type="tel"
                          value={newClient.telephoneSecondaire}
                          onChange={(e) => setNewClient({ ...newClient, telephoneSecondaire: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelFax')}</label>
                        <input
                          type="tel"
                          value={newClient.fax}
                          onChange={(e) => setNewClient({ ...newClient, fax: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 3: Comptabilité */}
              {formStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center mb-4">
                      <BookOpen className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
                      {t('clients.syscohadaAccountingSettings')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelCustomerAccount')}</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={newClient.compteComptable}
                            onChange={(e) => setNewClient({ ...newClient, compteComptable: e.target.value })}
                            className="w-24 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                            placeholder="411"
                          />
                          <input
                            type="text"
                            value={newClient.compteAuxiliaire}
                            onChange={(e) => setNewClient({ ...newClient, compteAuxiliaire: e.target.value })}
                            className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                            placeholder={t('clients.phSubAccount')}
                          />
                        </div>
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{t('clients.hint411')}</p>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelCommercialCode')}</label>
                        <input
                          type="text"
                          value={newClient.codeCommercial}
                          onChange={(e) => setNewClient({ ...newClient, codeCommercial: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                          placeholder={t('clients.phCommercialCode')}
                        />
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{t('clients.hintCommercialCode')}</p>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelSalesJournal')}</label>
                        <select
                          value={newClient.journalVentes}
                          onChange={(e) => setNewClient({ ...newClient, journalVentes: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value="VE">{t('clients.journalVe')}</option>
                          <option value="VX">{t('clients.journalVx')}</option>
                          <option value="PS">{t('clients.journalPs')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelVatRate')}</label>
                        <select
                          value={newClient.tauxTVA}
                          onChange={(e) => setNewClient({ ...newClient, tauxTVA: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value={19.25}>{t('clients.vat1925')}</option>
                          <option value={18}>{t('clients.vat18')}</option>
                          <option value={15}>{t('clients.vat15')}</option>
                          <option value={0}>{t('clients.vat0')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelCurrency')}</label>
                        <select
                          value={newClient.devise}
                          onChange={(e) => setNewClient({ ...newClient, devise: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value="XAF">{t('clients.currencyXaf')}</option>
                          <option value="EUR">{t('clients.currencyEur')}</option>
                          <option value="USD">{t('clients.currencyUsd')}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center mb-4">
                      <Landmark className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
                      {t('clients.bankDetailsOptional')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelBank')}</label>
                        <input
                          type="text"
                          value={newClient.banque}
                          onChange={(e) => setNewClient({ ...newClient, banque: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder={t('clients.phBankName')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelSwift')}</label>
                        <input
                          type="text"
                          value={newClient.swift}
                          onChange={(e) => setNewClient({ ...newClient, swift: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                          placeholder="XXXXXXXX"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelIban')}</label>
                        <input
                          type="text"
                          value={newClient.iban}
                          onChange={(e) => setNewClient({ ...newClient, iban: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                          placeholder="CM21 XXXX XXXX XXXX XXXX XXXX XXX"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 4: Conditions commerciales */}
              {formStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center mb-4">
                      <CreditCard className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
                      {t('clients.paymentTerms')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelPaymentMethod')}</label>
                        <select
                          value={newClient.modeReglement}
                          onChange={(e) => setNewClient({ ...newClient, modeReglement: e.target.value as NewClientForm['modeReglement'] })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value="VIREMENT">{t('clients.payTransfer')}</option>
                          <option value="CHEQUE">{t('clients.payCheque')}</option>
                          <option value="PRELEVEMENT">{t('clients.payDirectDebit')}</option>
                          <option value="TRAITE">{t('clients.payBillOfExchange')}</option>
                          <option value="ESPECES">{t('clients.payCash')}</option>
                          <option value="MOBILE_MONEY">{t('clients.payMobileMoney')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelPaymentDelay')}</label>
                        <select
                          value={newClient.delaiPaiement}
                          onChange={(e) => setNewClient({ ...newClient, delaiPaiement: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value={0}>{t('clients.payImmediate')}</option>
                          <option value={15}>{t('clients.days15')}</option>
                          <option value={30}>{t('clients.days30')}</option>
                          <option value={45}>{t('clients.days45')}</option>
                          <option value={60}>{t('clients.days60Eom')}</option>
                          <option value={90}>{t('clients.days90')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelCreditLimit')}</label>
                        <input
                          type="number"
                          value={newClient.limiteCredit}
                          onChange={(e) => setNewClient({ ...newClient, limiteCredit: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelDiscount')}</label>
                        <input
                          type="number"
                          step="0.5"
                          value={newClient.remise}
                          onChange={(e) => setNewClient({ ...newClient, remise: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('clients.labelEarlyDiscount')}</label>
                        <input
                          type="number"
                          step="0.5"
                          value={newClient.escompte}
                          onChange={(e) => setNewClient({ ...newClient, escompte: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Récapitulatif */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-[var(--color-primary)] mb-3">{t('clients.summary')}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-[var(--color-text-secondary)]">{t('clients.summaryClientCode')}</span>
                        <span className="ml-2 font-medium">{newClient.code || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-secondary)]">{t('clients.summaryCompanyName')}</span>
                        <span className="ml-2 font-medium">{newClient.raisonSociale || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-secondary)]">{t('clients.summaryAccount')}</span>
                        <span className="ml-2 font-mono">{fmtAccount(`${newClient.compteComptable}${newClient.compteAuxiliaire}`)}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-secondary)]">{t('clients.summaryNiu')}</span>
                        <span className="ml-2 font-mono">{newClient.niu || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-secondary)]">{t('clients.summaryPaymentDelay')}</span>
                        <span className="ml-2 font-medium">{newClient.delaiPaiement} {t('clients.days')}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-secondary)]">{t('clients.summaryCreditLimit')}</span>
                        <span className="ml-2 font-medium">{formatCurrency(newClient.limiteCredit)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[var(--color-border)] flex justify-between">
              <button
                type="button"
                onClick={() => formStep > 1 ? setFormStep(formStep - 1) : handleCloseNewClientModal()}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:bg-gray-50"
              >
                {formStep > 1 ? t('clients.previous') : t('clients.cancel')}
              </button>
              <div className="flex space-x-3">
                {formStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep(formStep + 1)}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90"
                  >
                    {t('clients.next')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveNewClient}
                    className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 font-semibold"
                  >
                    {editingId ? t('clients.saveChanges') : t('clients.createClient')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fiche Client (lecture seule + écritures) — bouton œil */}
      {viewingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-primary)]">{viewingClient.raisonSociale}</h3>
                <p className="text-sm text-gray-500 font-mono">{viewingClient.code} · {fmtAccount(viewingClient.compteComptable)}</p>
              </div>
              <button onClick={() => setViewingClient(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-gray-500">{t('clients.colNiu')}</span><p className="font-medium">{viewingClient.niu || '—'}</p></div>
                <div><span className="text-gray-500">{t('clients.phone')}</span><p className="font-medium">{viewingClient.telephone || '—'}</p></div>
                <div><span className="text-gray-500">{t('clients.email')}</span><p className="font-medium">{viewingClient.email || '—'}</p></div>
                <div><span className="text-gray-500">{t('clients.colStatus')}</span><p className="font-medium">{viewingClient.statut}</p></div>
                <div><span className="text-gray-500">{t('clients.colOutstanding')}</span><p className="font-semibold text-[var(--color-primary)]">{formatCurrency(viewingClient.encoursActuel)}</p></div>
                <div className="col-span-2 md:col-span-3"><span className="text-gray-500">{t('clients.address')}</span><p className="font-medium">{viewingClient.adresse || '—'}</p></div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('clients.entriesCount', { count: String((clientLinesMap[viewingClient.id] || []).length) })}</h4>
                <div className="border rounded-lg overflow-auto max-h-[40vh]">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-600 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2">{t('clients.colDate')}</th>
                        <th className="text-left px-3 py-2">{t('clients.colDocument')}</th>
                        <th className="text-left px-3 py-2">{t('clients.colLabel')}</th>
                        <th className="text-right px-3 py-2">{t('clients.colDebit')}</th>
                        <th className="text-right px-3 py-2">{t('clients.colCredit')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(clientLinesMap[viewingClient.id] || []).length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">{t('clients.noEntriesForClient')}</td></tr>
                      )}
                      {(clientLinesMap[viewingClient.id] || []).slice(0, 300).map((l, i) => (
                        <tr key={i} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-1.5 whitespace-nowrap">{l.date}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap">{l.piece}</td>
                          <td className="px-3 py-1.5">{l.libelle}</td>
                          <td className="px-3 py-1.5 text-right text-red-600 whitespace-nowrap">{l.debit ? formatCurrency(l.debit) : ''}</td>
                          <td className="px-3 py-1.5 text-right text-green-600 whitespace-nowrap">{l.credit ? formatCurrency(l.credit) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                    {(clientLinesMap[viewingClient.id] || []).length > 0 && (
                      <tfoot className="sticky bottom-0 bg-gray-100 border-t-2 border-gray-300 font-semibold text-gray-900">
                        <tr>
                          <td className="px-3 py-2" colSpan={3}>{t('clients.totalCount', { count: String((clientLinesMap[viewingClient.id] || []).length) })}</td>
                          <td className="px-3 py-2 text-right text-red-700 whitespace-nowrap">{formatCurrency((clientLinesMap[viewingClient.id] || []).reduce((s, l) => s + (l.debit || 0), 0))}</td>
                          <td className="px-3 py-2 text-right text-green-700 whitespace-nowrap">{formatCurrency((clientLinesMap[viewingClient.id] || []).reduce((s, l) => s + (l.credit || 0), 0))}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => { const c = viewingClient; setViewingClient(null); if (c) handleEditClient(c.id); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">{t('clients.edit')}</button>
              <button onClick={() => setViewingClient(null)} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm">{t('clients.close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Édition Client */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--color-primary)]">{t('clients.editClient')}</h3>
              <button type="button" onClick={() => setEditingClient(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('clients.labelCompanyName')}</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={editingClient.raisonSociale}
                  onChange={e => setEditingClient({ ...editingClient, raisonSociale: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('clients.colCode')}</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 bg-gray-50"
                  readOnly
                  value={editingClient.code}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('clients.colNiu')}</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={editingClient.niu || ''}
                  onChange={e => setEditingClient({ ...editingClient, niu: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('clients.phone')}</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={editingClient.telephone || ''}
                  onChange={e => setEditingClient({ ...editingClient, telephone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('clients.email')}</label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={editingClient.email || ''}
                  onChange={e => setEditingClient({ ...editingClient, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('clients.labelCollectiveAccount')}</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={editingClient.compteComptable || '411'}
                  onChange={e => setEditingClient({ ...editingClient, compteComptable: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">{t('clients.address')}</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={editingClient.adresse || ''}
                  onChange={e => setEditingClient({ ...editingClient, adresse: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('clients.colStatus')}</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={editingClient.statut}
                  onChange={e => setEditingClient({ ...editingClient, statut: e.target.value as Client['statut'] })}
                >
                  <option value="ACTIF">{t('clients.statusActive')}</option>
                  <option value="BLOQUE">{t('clients.statusBlocked')}</option>
                  <option value="SUSPENDU">{t('clients.statusSuspended')}</option>
                  <option value="INACTIF">{t('clients.statusInactive')}</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('clients.labelCreditLimitFcfa')}</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={editingClient.limiteCredit || 0}
                  onChange={e => setEditingClient({ ...editingClient, limiteCredit: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                {t('clients.cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await adapter.update('thirdParties', editingClient.id, {
                      name: editingClient.raisonSociale,
                      code: editingClient.code,
                      email: editingClient.email,
                      phone: editingClient.telephone,
                      address: editingClient.adresse,
                      accountCode: editingClient.compteComptable,
                      taxId: editingClient.niu,
                      isActive: editingClient.statut === 'ACTIF',
                    });
                    setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...editingClient } : c));
                    toast.success(t('clients.toastClientUpdated'));
                    setEditingClient(null);
                  } catch {
                    toast.error(t('clients.errUpdate'));
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                {t('clients.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Period Selector Modal */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        initialDateRange={{ start: dateRange.startDate, end: dateRange.endDate }}
        onApply={(newRange) => {
          setDateRange(prev => ({ ...prev, startDate: newRange.start, endDate: newRange.end }));
          setShowPeriodModal(false);
        }}
      />

      {/* Modale détail balance âgée d'un client */}
      {agingDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setAgingDetail(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">{agingDetail.clientNom}</h3>
                <p className="text-xs text-[var(--color-text-secondary)] font-mono">{agingDetail.clientCode}</p>
              </div>
              <button onClick={() => setAgingDetail(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-2">
              {[
                { label: t('clients.bucketNonEchu'), value: agingDetail.nonEchu, cls: 'text-green-600' },
                { label: t('clients.bucket030'), value: agingDetail.echu0_30, cls: 'text-yellow-600' },
                { label: t('clients.bucket3160'), value: agingDetail.echu31_60, cls: 'text-orange-600' },
                { label: t('clients.bucket6190'), value: agingDetail.echu61_90, cls: 'text-red-600' },
                { label: t('clients.bucketPlus90'), value: agingDetail.echuPlus90, cls: 'text-red-800' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-sm text-gray-600">{r.label}</span>
                  <span className={`text-sm font-mono font-medium ${r.cls}`}>{formatCurrency(r.value)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold">{t('clients.totalReceivables')}</span>
                <span className="text-base font-mono font-bold text-[var(--color-primary)]">{formatCurrency(agingDetail.totalCreances)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('clients.provision')}</span>
                <span className="text-sm font-mono">{formatCurrency(agingDetail.provision)}</span>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => sendRelance(agingDetail)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"><Mail className="w-4 h-4" /> {t('clients.remind')}</button>
              <button onClick={() => exportAgingCsv(agingDetail)} className="px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg flex items-center gap-1"><Printer className="w-4 h-4" /> {t('clients.export')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsModule;
