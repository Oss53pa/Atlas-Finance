import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';
import {
  Search, Plus, Filter, Eye, Edit, Trash2, X,
  Building, TrendingUp, AlertTriangle, CheckCircle, Clock,
  Euro, Calendar, FileText, Mail, Phone, MapPin,
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
  const navigate = useNavigate();

  // États
  const [activeTab, setActiveTab] = useState<string>('liste');
  const [balanceAgeeSubTab, setBalanceAgeeSubTab] = useState<'repartition' | 'detail' | 'risques'>('repartition');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
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

  // Mock Data Clients CEMAC avec données comptables complètes
  const clients: Client[] = [
    {
      id: '1',
      code: 'CLI001',
      raisonSociale: 'SOCIETE GENERALE CAMEROUN',
      nomCommercial: 'SGC',
      categorie: 'GRAND_COMPTE',
      secteurActivite: 'Banque & Finance',
      pays: 'Cameroun',
      compteComptable: '411100',
      compteAuxiliaire: 'CLI001',
      journalVentes: 'VE',
      rccm: 'RC/YDE/2015/B/1234',
      niu: 'M071512345678A',
      regimeTVA: 'REEL_NORMAL',
      tauxTVA: 19.25,
      adresse: 'Boulevard de la Liberté',
      codePostal: 'BP 1234',
      ville: 'Douala',
      region: 'Littoral',
      chiffreAffaires: 15000000,
      encoursActuel: 2500000,
      dso: 32,
      limiteCredit: 5000000,
      delaiPaiement: 45,
      remise: 5,
      escompte: 2,
      modeReglement: 'VIREMENT',
      devise: 'XAF',
      banque: 'BICEC',
      iban: 'CM2110001000000012345678901',
      swift: 'ABORABDX',
      scoreCredit: 92,
      tauxRecouvrement: 98,
      notationInterne: 'A',
      fidele: true,
      contactPrincipal: 'Jean-Pierre MBARGA',
      email: 'jp.mbarga@sgc.cm',
      telephone: '+237 691 234 567',
      telephoneSecondaire: '+237 233 456 789',
      statut: 'ACTIF',
      derniereFacture: '2024-09-15',
      prochainPaiement: '2024-10-30',
      alertes: 0,
      nonEchu: 1500000,
      echu0_30: 800000,
      echu31_60: 150000,
      echu61_90: 50000,
      echuPlus90: 0
    },
    {
      id: '2',
      code: 'CLI002',
      raisonSociale: 'BRASSERIES DU GABON',
      nomCommercial: 'BRAGA',
      categorie: 'GRAND_COMPTE',
      secteurActivite: 'Agroalimentaire',
      pays: 'Gabon',
      compteComptable: '411200',
      compteAuxiliaire: 'CLI002',
      journalVentes: 'VE',
      rccm: 'RC/LBV/2018/A/5678',
      niu: 'G021856789012B',
      regimeTVA: 'REEL_NORMAL',
      tauxTVA: 18,
      adresse: 'Zone Industrielle Oloumi',
      codePostal: 'BP 567',
      ville: 'Libreville',
      region: 'Estuaire',
      chiffreAffaires: 8500000,
      encoursActuel: 1200000,
      dso: 28,
      limiteCredit: 3000000,
      delaiPaiement: 30,
      modeReglement: 'VIREMENT',
      devise: 'XAF',
      banque: 'UGB',
      scoreCredit: 88,
      tauxRecouvrement: 95,
      notationInterne: 'A',
      fidele: true,
      contactPrincipal: 'Sylvie MOUBAMBA',
      email: 's.moubamba@braga.ga',
      telephone: '+241 01 345 678',
      statut: 'ACTIF',
      derniereFacture: '2024-09-10',
      prochainPaiement: '2024-10-10',
      alertes: 0,
      nonEchu: 900000,
      echu0_30: 250000,
      echu31_60: 50000,
      echu61_90: 0,
      echuPlus90: 0
    },
    {
      id: '3',
      code: 'CLI003',
      raisonSociale: 'CONGO TELECOM',
      categorie: 'GRAND_COMPTE',
      secteurActivite: 'Télécommunications',
      pays: 'Congo',
      compteComptable: '411300',
      compteAuxiliaire: 'CLI003',
      journalVentes: 'VE',
      rccm: 'RC/BZV/2016/C/9012',
      niu: 'C031690123456C',
      regimeTVA: 'REEL_NORMAL',
      tauxTVA: 18,
      adresse: 'Avenue des Trois Martyrs',
      codePostal: 'BP 890',
      ville: 'Brazzaville',
      region: 'Pool',
      chiffreAffaires: 12000000,
      encoursActuel: 3500000,
      dso: 45,
      limiteCredit: 4000000,
      delaiPaiement: 60,
      remise: 3,
      modeReglement: 'VIREMENT',
      devise: 'XAF',
      scoreCredit: 75,
      tauxRecouvrement: 85,
      notationInterne: 'B',
      fidele: true,
      contactPrincipal: 'André NGOUABI',
      email: 'a.ngouabi@congotelecom.cg',
      telephone: '+242 06 456 789',
      statut: 'ACTIF',
      derniereFacture: '2024-08-20',
      prochainPaiement: '2024-10-20',
      alertes: 2,
      nonEchu: 1800000,
      echu0_30: 800000,
      echu31_60: 500000,
      echu61_90: 300000,
      echuPlus90: 100000
    },
    {
      id: '4',
      code: 'CLI004',
      raisonSociale: 'TCHAD CONSTRUCTION SARL',
      categorie: 'PME',
      secteurActivite: 'BTP',
      pays: 'Tchad',
      compteComptable: '411400',
      compteAuxiliaire: 'CLI004',
      journalVentes: 'VE',
      rccm: 'RC/NDJ/2019/D/3456',
      niu: 'T041934567890D',
      regimeTVA: 'REEL_SIMPLIFIE',
      tauxTVA: 18,
      adresse: 'Quartier Moursal',
      codePostal: 'BP 345',
      ville: "N'Djamena",
      region: 'Chari-Baguirmi',
      chiffreAffaires: 2500000,
      encoursActuel: 450000,
      dso: 55,
      limiteCredit: 800000,
      delaiPaiement: 45,
      modeReglement: 'CHEQUE',
      devise: 'XAF',
      scoreCredit: 68,
      tauxRecouvrement: 78,
      notationInterne: 'C',
      fidele: false,
      contactPrincipal: 'Ibrahim DEBY',
      email: 'i.deby@tchadconstruction.td',
      telephone: '+235 66 789 012',
      statut: 'ACTIF',
      derniereFacture: '2024-09-05',
      prochainPaiement: '2024-10-20',
      alertes: 3,
      nonEchu: 150000,
      echu0_30: 100000,
      echu31_60: 80000,
      echu61_90: 70000,
      echuPlus90: 50000
    },
    {
      id: '5',
      code: 'CLI005',
      raisonSociale: 'GUINEE EQUATORIALE MINING',
      nomCommercial: 'GE Mining',
      categorie: 'GRAND_COMPTE',
      secteurActivite: 'Mines & Énergie',
      pays: 'Guinée Équatoriale',
      compteComptable: '411500',
      compteAuxiliaire: 'CLI005',
      journalVentes: 'VE',
      rccm: 'RC/MAL/2017/E/7890',
      niu: 'E051778901234E',
      regimeTVA: 'REEL_NORMAL',
      tauxTVA: 15,
      adresse: 'Carretera del Aeropuerto',
      codePostal: 'BP 789',
      ville: 'Malabo',
      region: 'Bioko Norte',
      chiffreAffaires: 25000000,
      encoursActuel: 5000000,
      dso: 38,
      limiteCredit: 8000000,
      delaiPaiement: 60,
      remise: 8,
      escompte: 3,
      modeReglement: 'VIREMENT',
      devise: 'XAF',
      banque: 'BGFI Bank',
      scoreCredit: 85,
      tauxRecouvrement: 92,
      notationInterne: 'A',
      fidele: true,
      contactPrincipal: 'Manuel OBIANG',
      email: 'm.obiang@gemining.gq',
      telephone: '+240 333 456 789',
      statut: 'ACTIF',
      derniereFacture: '2024-09-18',
      prochainPaiement: '2024-11-18',
      alertes: 0,
      nonEchu: 4000000,
      echu0_30: 800000,
      echu31_60: 200000,
      echu61_90: 0,
      echuPlus90: 0
    },
    {
      id: '6',
      code: 'CLI006',
      raisonSociale: 'RCA DISTRIBUTION',
      categorie: 'PME',
      secteurActivite: 'Commerce',
      pays: 'République Centrafricaine',
      compteComptable: '411600',
      compteAuxiliaire: 'CLI006',
      journalVentes: 'VE',
      rccm: 'RC/BGI/2020/F/1234',
      niu: 'R062012345678F',
      regimeTVA: 'FORFAIT',
      tauxTVA: 19,
      adresse: 'Avenue Boganda',
      codePostal: 'BP 123',
      ville: 'Bangui',
      region: 'Ombella-M\'Poko',
      chiffreAffaires: 1800000,
      encoursActuel: 850000,
      dso: 72,
      limiteCredit: 600000,
      delaiPaiement: 30,
      modeReglement: 'CHEQUE',
      devise: 'XAF',
      scoreCredit: 55,
      tauxRecouvrement: 65,
      notationInterne: 'D',
      fidele: false,
      contactPrincipal: 'Catherine SAMBA',
      email: 'c.samba@rcadistribution.cf',
      telephone: '+236 70 234 567',
      statut: 'BLOQUE',
      derniereFacture: '2024-07-15',
      alertes: 5,
      nonEchu: 100000,
      echu0_30: 150000,
      echu31_60: 200000,
      echu61_90: 200000,
      echuPlus90: 200000
    },
    {
      id: '7',
      code: 'CLI007',
      raisonSociale: 'CABINET EXPERTISE DOUALA',
      categorie: 'TPE',
      secteurActivite: 'Services',
      pays: 'Cameroun',
      compteComptable: '411700',
      compteAuxiliaire: 'CLI007',
      journalVentes: 'VE',
      rccm: 'RC/DLA/2021/G/5678',
      niu: 'M072156789012G',
      regimeTVA: 'REEL_SIMPLIFIE',
      tauxTVA: 19.25,
      adresse: 'Rue Joffre',
      codePostal: 'BP 456',
      ville: 'Douala',
      region: 'Littoral',
      chiffreAffaires: 450000,
      encoursActuel: 75000,
      dso: 25,
      limiteCredit: 200000,
      delaiPaiement: 30,
      modeReglement: 'VIREMENT',
      devise: 'XAF',
      scoreCredit: 90,
      tauxRecouvrement: 100,
      notationInterne: 'A',
      fidele: true,
      contactPrincipal: 'Patrice NKOULOU',
      email: 'p.nkoulou@cedouala.cm',
      telephone: '+237 677 890 123',
      statut: 'ACTIF',
      derniereFacture: '2024-09-20',
      prochainPaiement: '2024-10-20',
      alertes: 0,
      nonEchu: 75000,
      echu0_30: 0,
      echu31_60: 0,
      echu61_90: 0,
      echuPlus90: 0
    }
  ];

  // Données Balance Âgée
  const balanceAgeeData: BalanceAgeeItem[] = clients.map(client => ({
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
  }));

  // Calculs totaux Balance Âgée
  const totauxBalanceAgee = balanceAgeeData.reduce((acc, item) => ({
    totalCreances: acc.totalCreances + item.totalCreances,
    nonEchu: acc.nonEchu + item.nonEchu,
    echu0_30: acc.echu0_30 + item.echu0_30,
    echu31_60: acc.echu31_60 + item.echu31_60,
    echu61_90: acc.echu61_90 + item.echu61_90,
    echuPlus90: acc.echuPlus90 + item.echuPlus90,
    provision: acc.provision + item.provision
  }), {
    totalCreances: 0, nonEchu: 0, echu0_30: 0, echu31_60: 0, echu61_90: 0, echuPlus90: 0, provision: 0
  });

  const filteredClients = clients.filter(client => {
    const matchSearch = client.raisonSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       client.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       client.secteurActivite.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       client.compteComptable.includes(searchTerm);
    const matchCategory = selectedCategory === 'all' || client.categorie === selectedCategory;
    const matchStatut = selectedStatut === 'all' || client.statut === selectedStatut;

    return matchSearch && matchCategory && matchStatut;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getCategorieColor = (categorie: string) => {
    switch (categorie) {
      case 'GRAND_COMPTE': return 'bg-purple-100 text-purple-800';
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

  const handleOpenNewClientModal = () => {
    setShowNewClientModal(true);
    setFormStep(1);
  };

  const handleCloseNewClientModal = () => {
    setShowNewClientModal(false);
    setFormStep(1);
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

  const handleSaveNewClient = () => {
    handleCloseNewClientModal();
  };

  const handleViewClient = (clientId: string) => {
    navigate(`/tiers/clients/${clientId}`);
  };

  const handleEditClient = (clientId: string) => {
  };

  const handleDeleteClient = (clientId: string) => {
  };

  // Générer code client automatique
  const generateClientCode = () => {
    const lastCode = clients.length > 0 ? parseInt(clients[clients.length - 1].code.replace('CLI', '')) : 0;
    const newCode = `CLI${String(lastCode + 1).padStart(3, '0')}`;
    setNewClient({ ...newClient, code: newCode, compteAuxiliaire: newCode });
  };

  // Calcul des statistiques
  const totalEncours = clients.reduce((sum, c) => sum + c.encoursActuel, 0);
  const totalCA = clients.reduce((sum, c) => sum + c.chiffreAffaires, 0);
  const moyenneDSO = Math.round(clients.reduce((sum, c) => sum + c.dso, 0) / clients.length);
  const clientsActifs = clients.filter(c => c.statut === 'ACTIF').length;

  // Analytics Data
  const analyticsData = {
    clientsParCategorie: [
      { categorie: 'GRAND_COMPTE', count: 12, montant: 45000000 },
      { categorie: 'PME', count: 35, montant: 18000000 },
      { categorie: 'TPE', count: 48, montant: 5500000 },
      { categorie: 'PARTICULIER', count: 15, montant: 1200000 }
    ],
    evolutionCA: [
      { mois: 'Jan', ca2024: 8500000, ca2025: 9800000 },
      { mois: 'Fév', ca2024: 7200000, ca2025: 8500000 },
      { mois: 'Mar', ca2024: 9100000, ca2025: 10200000 },
      { mois: 'Avr', ca2024: 8800000, ca2025: 9500000 },
      { mois: 'Mai', ca2024: 10500000, ca2025: 12000000 },
      { mois: 'Juin', ca2024: 11200000, ca2025: 13500000 }
    ],
    performanceClients: [
      { critere: 'Fidélité', score: 85 },
      { critere: 'Paiement', score: 78 },
      { critere: 'Volume', score: 72 },
      { critere: 'Rentabilité', score: 88 },
      { critere: 'Potentiel', score: 82 }
    ]
  };

  // Data pour graphique Balance Âgée
  const balanceAgeeChartData = [
    { name: 'Non échu', value: totauxBalanceAgee.nonEchu, color: '#22c55e' },
    { name: '0-30 jours', value: totauxBalanceAgee.echu0_30, color: '#eab308' },
    { name: '31-60 jours', value: totauxBalanceAgee.echu31_60, color: '#f97316' },
    { name: '61-90 jours', value: totauxBalanceAgee.echu61_90, color: '#ef4444' },
    { name: '+90 jours', value: totauxBalanceAgee.echuPlus90, color: '#991b1b' }
  ];

  const COLORS = ['#6A8A82', '#B87333', '#7A99AC', '#5A79AC'];

  const tabs = [
    { id: 'liste', label: 'Liste Clients', icon: Users },
    { id: 'balance-agee', label: 'Balance Âgée', icon: Receipt },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header avec navigation */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-[#E8E8E8]">
        <h2 className="text-lg font-bold text-[#191919] mb-6">Gestion des Clients</h2>

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
                    ? 'bg-white text-[#7A99AC] shadow-sm'
                    : 'text-[#666666] hover:text-[#444444]'
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
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Encours</p>
                  <p className="text-lg font-bold text-purple-800">{formatCurrency(totalEncours)}</p>
                  <p className="text-xs text-purple-600 mt-1">Sur {clientsActifs} clients actifs</p>
                </div>
                <Euro className="w-8 h-8 text-purple-400" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Chiffre d'Affaires</p>
                  <p className="text-lg font-bold text-blue-800">{formatCurrency(totalCA)}</p>
                  <p className="text-xs text-blue-600 mt-1">Année en cours</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">DSO Moyen</p>
                  <p className="text-lg font-bold text-green-800">{moyenneDSO} jours</p>
                  <p className="text-xs text-green-600 mt-1">Délai encaissement</p>
                </div>
                <Clock className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Alertes</p>
                  <p className="text-lg font-bold text-orange-800">{clients.reduce((sum, c) => sum + c.alertes, 0)}</p>
                  <p className="text-xs text-orange-600 mt-1">À traiter</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </div>

          {/* Actions et Filtres */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-[#666666]" />
              <input
                type="text"
                placeholder="Rechercher (nom, code, compte comptable)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
            >
              <option value="all">Toutes catégories</option>
              <option value="GRAND_COMPTE">Grand Compte</option>
              <option value="PME">PME</option>
              <option value="TPE">TPE</option>
              <option value="PARTICULIER">Particulier</option>
            </select>

            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="px-4 py-3 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
            >
              <option value="all">Tous statuts</option>
              <option value="ACTIF">Actif</option>
              <option value="BLOQUE">Bloqué</option>
              <option value="SUSPENDU">Suspendu</option>
              <option value="INACTIF">Inactif</option>
            </select>

            <button
              type="button"
              onClick={handleOpenNewClientModal}
              className="flex items-center space-x-2 px-4 py-3 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">Nouveau Client</span>
            </button>
          </div>

          {/* Table des clients */}
          <div className="bg-white rounded-lg shadow-sm border border-[#E8E8E8]">
            <div className="p-4 border-b border-[#E8E8E8]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#666666]">
                  {filteredClients.length} client(s) trouvé(s)
                </p>
                <div className="flex items-center space-x-2">
                  {selectedClients.length > 0 && (
                    <span className="text-sm text-[#6A8A82] font-medium">
                      {selectedClients.length} sélectionné(s)
                    </span>
                  )}
                  <ExportMenu
                    data={filteredClients}
                    filename="clients"
                    columns={{
                      code: 'Code',
                      compteComptable: 'Compte',
                      raisonSociale: 'Client',
                      niu: 'NIU',
                      secteurActivite: 'Secteur',
                      categorie: 'Catégorie',
                      pays: 'Pays',
                      encoursActuel: 'Encours',
                      chiffreAffaires: 'CA',
                      dso: 'DSO',
                      notationInterne: 'Note',
                      statut: 'Statut'
                    }}
                    buttonText={t('common.export')}
                    buttonVariant="outline"
                  />
                  <button
                    type="button"
                    className="flex items-center space-x-2 px-3 py-2 text-sm border border-[#E8E8E8] rounded hover:bg-gray-50"
                  >
                    <Filter className="w-4 h-4" />
                    <span>Plus de filtres</span>
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
                    <th className="text-left p-3 text-sm font-medium text-[#666666]">Code</th>
                    <th className="text-left p-3 text-sm font-medium text-[#666666]">Compte</th>
                    <th className="text-left p-3 text-sm font-medium text-[#666666]">Client</th>
                    <th className="text-left p-3 text-sm font-medium text-[#666666]">NIU/RCCM</th>
                    <th className="text-left p-3 text-sm font-medium text-[#666666]">Catégorie</th>
                    <th className="text-right p-3 text-sm font-medium text-[#666666]">Encours</th>
                    <th className="text-center p-3 text-sm font-medium text-[#666666]">DSO</th>
                    <th className="text-center p-3 text-sm font-medium text-[#666666]">Note</th>
                    <th className="text-center p-3 text-sm font-medium text-[#666666]">Statut</th>
                    <th className="text-center p-3 text-sm font-medium text-[#666666]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-t border-[#E8E8E8] hover:bg-gray-50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => handleSelectClient(client.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-medium text-[#191919]">{client.code}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-mono text-[#6A8A82]">{client.compteComptable}</span>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium text-[#191919]">{client.raisonSociale}</p>
                          <p className="text-xs text-[#666666]">{client.secteurActivite}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-xs font-mono text-[#666666]">{client.niu}</p>
                          <p className="text-xs text-[#999999]">{client.rccm}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getCategorieColor(client.categorie)}`}>
                          {client.categorie.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div>
                          <p className="text-sm font-medium text-[#191919]">{formatCurrency(client.encoursActuel)}</p>
                          {client.encoursActuel > client.limiteCredit * 0.8 && (
                            <p className="text-xs text-orange-600">Proche limite</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Clock className="w-3 h-3 text-[#666666]" />
                          <span className="text-sm text-[#666666]">{client.dso}j</span>
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
                            className="p-1 text-[#6A8A82] hover:bg-[#6A8A82]/10 rounded"
                            title="Voir"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditClient(client.id)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClient(client.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Supprimer"
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
            <div className="p-4 border-t border-[#E8E8E8] flex items-center justify-between">
              <span className="text-sm text-[#666666]">
                Affichage de 1 à {filteredClients.length} sur {filteredClients.length} entrées
              </span>
              <div className="flex items-center space-x-2">
                <button type="button" className="px-3 py-1 border border-[#E8E8E8] rounded text-sm disabled:opacity-50" disabled>
                  Précédent
                </button>
                <button type="button" className="px-3 py-1 bg-[#6A8A82] text-white rounded text-sm">1</button>
                <button type="button" className="px-3 py-1 border border-[#E8E8E8] rounded text-sm disabled:opacity-50" disabled>
                  Suivant
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
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#191919]">Balance Âgée des Créances Clients</h3>
                <p className="text-sm text-[#666666]">Analyse de l'ancienneté des créances au {new Date().toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPeriodModal(true)}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Date d'arrêté</span>
                </button>
                <ExportMenu
                  data={balanceAgeeData}
                  filename="balance-agee-clients"
                  columns={{
                    clientCode: 'Code Client',
                    clientNom: 'Nom Client',
                    totalCreances: 'Total Créances',
                    nonEchu: 'Non Échu',
                    echu0_30: '0-30 jours',
                    echu31_60: '31-60 jours',
                    echu61_90: '61-90 jours',
                    echuPlus90: '+90 jours',
                    provision: 'Provision'
                  }}
                  buttonText="Exporter"
                />
                <button type="button" className="p-2 text-gray-600 hover:bg-gray-100 rounded" title="Imprimer">
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* KPIs Balance Âgée */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-lg font-bold text-[#191919]">{formatCurrency(totauxBalanceAgee.totalCreances)}</p>
              <p className="text-xs text-[#666666]">Total Créances</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-600">{((totauxBalanceAgee.nonEchu / totauxBalanceAgee.totalCreances) * 100).toFixed(1)}%</span>
              </div>
              <p className="text-lg font-bold text-green-800">{formatCurrency(totauxBalanceAgee.nonEchu)}</p>
              <p className="text-xs text-green-600">Non Échu</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-xs text-yellow-600">{((totauxBalanceAgee.echu0_30 / totauxBalanceAgee.totalCreances) * 100).toFixed(1)}%</span>
              </div>
              <p className="text-lg font-bold text-yellow-800">{formatCurrency(totauxBalanceAgee.echu0_30)}</p>
              <p className="text-xs text-yellow-600">0-30 jours</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="text-xs text-orange-600">{((totauxBalanceAgee.echu31_60 / totauxBalanceAgee.totalCreances) * 100).toFixed(1)}%</span>
              </div>
              <p className="text-lg font-bold text-orange-800">{formatCurrency(totauxBalanceAgee.echu31_60)}</p>
              <p className="text-xs text-orange-600">31-60 jours</p>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <AlertOctagon className="w-5 h-5 text-red-600" />
                <span className="text-xs text-red-600">{(((totauxBalanceAgee.echu61_90 + totauxBalanceAgee.echuPlus90) / totauxBalanceAgee.totalCreances) * 100).toFixed(1)}%</span>
              </div>
              <p className="text-lg font-bold text-red-800">{formatCurrency(totauxBalanceAgee.echu61_90 + totauxBalanceAgee.echuPlus90)}</p>
              <p className="text-xs text-red-600">+60 jours</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-lg font-bold text-purple-800">{formatCurrency(totauxBalanceAgee.provision)}</p>
              <p className="text-xs text-purple-600">Provisions</p>
            </div>
          </div>

          {/* Sous-onglets Balance Âgée */}
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm overflow-hidden">
            <div className="flex border-b border-[#E8E8E8]">
              <button
                type="button"
                onClick={() => setBalanceAgeeSubTab('repartition')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  balanceAgeeSubTab === 'repartition'
                    ? 'bg-[#6A8A82]/10 text-[#6A8A82] border-b-2 border-[#6A8A82]'
                    : 'text-[#666666] hover:bg-gray-50'
                }`}
              >
                <PieChart className="w-4 h-4" />
                <span>Répartition par ancienneté</span>
              </button>
              <button
                type="button"
                onClick={() => setBalanceAgeeSubTab('detail')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  balanceAgeeSubTab === 'detail'
                    ? 'bg-[#6A8A82]/10 text-[#6A8A82] border-b-2 border-[#6A8A82]'
                    : 'text-[#666666] hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Détail par client</span>
              </button>
              <button
                type="button"
                onClick={() => setBalanceAgeeSubTab('risques')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  balanceAgeeSubTab === 'risques'
                    ? 'bg-[#6A8A82]/10 text-[#6A8A82] border-b-2 border-[#6A8A82]'
                    : 'text-[#666666] hover:bg-gray-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Clients à risque & Recommandations</span>
              </button>
            </div>

            {/* Contenu sous-onglet: Répartition par ancienneté */}
            {balanceAgeeSubTab === 'repartition' && (
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Graphique Donut Moderne */}
                  <div className="lg:col-span-2 bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-6 shadow-inner">
                    <h4 className="text-lg font-semibold text-[#191919] mb-2 text-center">Distribution des Créances</h4>
                    <p className="text-sm text-[#666666] text-center mb-4">Répartition par ancienneté</p>
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={320}>
                        <RechartsPieChart>
                          <defs>
                            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                              <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15"/>
                            </filter>
                          </defs>
                          <Pie
                            data={balanceAgeeChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={120}
                            paddingAngle={3}
                            dataKey="value"
                            cornerRadius={6}
                            stroke="none"
                            filter="url(#shadow)"
                          >
                            {balanceAgeeChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                style={{ filter: 'brightness(1.05)' }}
                              />
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
                      {/* Centre du Donut avec Total */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center bg-white rounded-full w-32 h-32 flex flex-col items-center justify-center shadow-lg">
                          <p className="text-xs text-[#666666] uppercase tracking-wide">Total</p>
                          <p className="text-lg font-bold text-[#191919]">{formatCurrency(totauxBalanceAgee.totalCreances)}</p>
                          <p className="text-xs text-[#666666]">{balanceAgeeData.length} clients</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Légende détaillée et statistiques */}
                  <div className="lg:col-span-3 space-y-3">
                    <h4 className="text-lg font-semibold text-[#191919] mb-4">Détail par Tranche d'Ancienneté</h4>
                    {balanceAgeeChartData.map((item, idx) => {
                      const percent = totauxBalanceAgee.totalCreances > 0
                        ? ((item.value / totauxBalanceAgee.totalCreances) * 100).toFixed(1)
                        : '0';
                      const clientCount = balanceAgeeData.filter(c => {
                        if (item.name === 'Non échu') return c.nonEchu > 0;
                        if (item.name === '0-30 jours') return c.echu0_30 > 0;
                        if (item.name === '31-60 jours') return c.echu31_60 > 0;
                        if (item.name === '61-90 jours') return c.echu61_90 > 0;
                        if (item.name === '+90 jours') return c.echuPlus90 > 0;
                        return false;
                      }).length;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#E8E8E8] hover:shadow-md transition-all duration-200 cursor-pointer group"
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
                              <p className="font-semibold text-[#191919] group-hover:text-[#6A8A82] transition-colors">{item.name}</p>
                              <p className="text-sm text-[#666666]">{clientCount} client(s) concerné(s)</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-[#191919]">{formatCurrency(item.value)}</p>
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percent}%`, backgroundColor: item.color }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-[#666666] min-w-[45px] text-right">{percent}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Graphique en barres empilées */}
                <div className="mt-6 bg-gray-50 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-[#191919] mb-4">Évolution par Client</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={balanceAgeeData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                      <YAxis type="category" dataKey="clientCode" width={80} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar dataKey="nonEchu" stackId="a" fill="#22C55E" name="Non Échu" />
                      <Bar dataKey="echu0_30" stackId="a" fill="#EAB308" name="0-30j" />
                      <Bar dataKey="echu31_60" stackId="a" fill="#F97316" name="31-60j" />
                      <Bar dataKey="echu61_90" stackId="a" fill="#EF4444" name="61-90j" />
                      <Bar dataKey="echuPlus90" stackId="a" fill="#991B1B" name="+90j" />
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
                        placeholder="Rechercher un client..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="all">Toutes les tranches</option>
                      <option value="nonechu">Non Échu seulement</option>
                      <option value="0-30">0-30 jours</option>
                      <option value="31-60">31-60 jours</option>
                      <option value="61-90">61-90 jours</option>
                      <option value="+90">+90 jours</option>
                    </select>
                  </div>
                  <p className="text-sm text-[#666666]">{balanceAgeeData.length} clients</p>
                </div>

                {/* Tableau détaillé */}
                <div className="overflow-x-auto border border-[#E8E8E8] rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-medium text-[#666666]">Code</th>
                        <th className="text-left p-3 font-medium text-[#666666]">Client</th>
                        <th className="text-right p-3 font-medium text-[#666666]">Total Créances</th>
                        <th className="text-right p-3 font-medium text-green-600">Non Échu</th>
                        <th className="text-right p-3 font-medium text-yellow-600">0-30j</th>
                        <th className="text-right p-3 font-medium text-orange-600">31-60j</th>
                        <th className="text-right p-3 font-medium text-red-600">61-90j</th>
                        <th className="text-right p-3 font-medium text-red-800">+90j</th>
                        <th className="text-right p-3 font-medium text-purple-600">Provision</th>
                        <th className="text-center p-3 font-medium text-[#666666]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceAgeeData.map((item) => {
                        const hasRisk = item.echuPlus90 > 0 || item.echu61_90 > 0;
                        return (
                          <tr key={item.clientId} className={`border-t border-[#E8E8E8] hover:bg-gray-50 ${hasRisk ? 'bg-red-50/30' : ''}`}>
                            <td className="p-3">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{item.clientCode}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-[#191919]">{item.clientNom}</p>
                                {hasRisk && <AlertTriangle className="w-4 h-4 text-red-500" />}
                              </div>
                            </td>
                            <td className="p-3 text-right font-bold">{formatCurrency(item.totalCreances)}</td>
                            <td className="p-3 text-right text-green-600">{item.nonEchu > 0 ? formatCurrency(item.nonEchu) : '-'}</td>
                            <td className="p-3 text-right text-yellow-600">{item.echu0_30 > 0 ? formatCurrency(item.echu0_30) : '-'}</td>
                            <td className="p-3 text-right text-orange-600">{item.echu31_60 > 0 ? formatCurrency(item.echu31_60) : '-'}</td>
                            <td className="p-3 text-right text-red-600">{item.echu61_90 > 0 ? formatCurrency(item.echu61_90) : '-'}</td>
                            <td className="p-3 text-right text-red-800 font-bold">{item.echuPlus90 > 0 ? formatCurrency(item.echuPlus90) : '-'}</td>
                            <td className="p-3 text-right text-purple-600">{item.provision > 0 ? formatCurrency(item.provision) : '-'}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button type="button" className="p-1 text-gray-500 hover:text-[#6A8A82]" title="Voir détail">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button type="button" className="p-1 text-gray-500 hover:text-blue-600" title="Envoyer relance">
                                  <Mail className="w-4 h-4" />
                                </button>
                                <button type="button" className="p-1 text-gray-500 hover:text-orange-600" title="Imprimer">
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
                        <td className="p-3" colSpan={2}>TOTAUX ({balanceAgeeData.length} clients)</td>
                        <td className="p-3 text-right">{formatCurrency(totauxBalanceAgee.totalCreances)}</td>
                        <td className="p-3 text-right text-green-600">{formatCurrency(totauxBalanceAgee.nonEchu)}</td>
                        <td className="p-3 text-right text-yellow-600">{formatCurrency(totauxBalanceAgee.echu0_30)}</td>
                        <td className="p-3 text-right text-orange-600">{formatCurrency(totauxBalanceAgee.echu31_60)}</td>
                        <td className="p-3 text-right text-red-600">{formatCurrency(totauxBalanceAgee.echu61_90)}</td>
                        <td className="p-3 text-right text-red-800">{formatCurrency(totauxBalanceAgee.echuPlus90)}</td>
                        <td className="p-3 text-right text-purple-600">{formatCurrency(totauxBalanceAgee.provision)}</td>
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
                    <p className="text-sm text-red-700 mt-2">Clients critiques (+90j)</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <AlertTriangle className="w-8 h-8 text-orange-600" />
                      <span className="text-lg font-bold text-orange-800">
                        {balanceAgeeData.filter(i => i.echu61_90 > 0).length}
                      </span>
                    </div>
                    <p className="text-sm text-orange-700 mt-2">Clients à surveiller (61-90j)</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <Clock className="w-8 h-8 text-yellow-600" />
                      <span className="text-lg font-bold text-yellow-800">
                        {balanceAgeeData.filter(i => i.echu31_60 > 0).length}
                      </span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-2">Relances à prévoir (31-60j)</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <Shield className="w-8 h-8 text-purple-600" />
                      <span className="text-lg font-bold text-purple-800">
                        {formatCurrency(totauxBalanceAgee.provision)}
                      </span>
                    </div>
                    <p className="text-sm text-purple-700 mt-2">Provisions recommandées</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Liste des clients à risque élevé */}
                  <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                    <div className="p-4 bg-red-50 border-b border-red-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-md font-semibold text-red-800">Clients à Risque Élevé</h4>
                        <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                          {balanceAgeeData.filter(item => item.echuPlus90 > 0).length} clients
                        </span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">Créances échues de plus de 90 jours</p>
                    </div>
                    <div className="divide-y divide-[#E8E8E8] max-h-96 overflow-y-auto">
                      {balanceAgeeData
                        .filter(item => item.echuPlus90 > 0)
                        .sort((a, b) => b.echuPlus90 - a.echuPlus90)
                        .map((item, idx) => (
                          <div key={idx} className="p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-[#191919]">{item.clientNom}</p>
                                <p className="text-xs text-[#666666]">{item.clientCode}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-red-800">{formatCurrency(item.echuPlus90)}</p>
                                <p className="text-xs text-[#666666]">échu +90j</p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center space-x-2">
                              <button
                                type="button"
                                className="flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center space-x-1"
                              >
                                <Mail className="w-3 h-3" />
                                <span>Mise en demeure</span>
                              </button>
                              <button
                                type="button"
                                className="flex-1 px-3 py-1.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center justify-center space-x-1"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Appeler</span>
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
                        <div className="p-8 text-center text-[#666666]">
                          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                          <p>Aucun client à risque critique</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions recommandées */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                      <div className="p-4 bg-[#6A8A82]/10 border-b border-[#E8E8E8]">
                        <h4 className="text-md font-semibold text-[#191919]">Plan d'Actions Recommandé</h4>
                        <p className="text-xs text-[#666666] mt-1">Actions prioritaires basées sur l'analyse</p>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Action 1 */}
                        <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-red-800">🚨 Mises en demeure urgentes</p>
                              <p className="text-sm text-red-700">
                                {balanceAgeeData.filter(i => i.echuPlus90 > 0).length} clients avec créances +90 jours
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                              Traiter
                            </button>
                          </div>
                        </div>

                        {/* Action 2 */}
                        <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-orange-800">⚠️ Relances niveau 2</p>
                              <p className="text-sm text-orange-700">
                                {balanceAgeeData.filter(i => i.echu61_90 > 0).length} clients avec créances 61-90 jours
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">
                              Relancer
                            </button>
                          </div>
                        </div>

                        {/* Action 3 */}
                        <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-yellow-800">📧 Relances niveau 1</p>
                              <p className="text-sm text-yellow-700">
                                {balanceAgeeData.filter(i => i.echu31_60 > 0).length} clients avec créances 31-60 jours
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700">
                              Envoyer
                            </button>
                          </div>
                        </div>

                        {/* Action 4 */}
                        <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-purple-800">📊 Provisions à comptabiliser</p>
                              <p className="text-sm text-purple-700">
                                {formatCurrency(totauxBalanceAgee.provision)} selon règles SYSCOHADA
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">
                              Générer OD
                            </button>
                          </div>
                        </div>

                        {/* Action 5 */}
                        <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-gray-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-800">🔒 Comptes à bloquer</p>
                              <p className="text-sm text-gray-700">
                                {balanceAgeeData.filter(i => i.echuPlus90 > 500000).length} clients dépassent le seuil de 500K XAF
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">
                              Bloquer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Règles de provisionnement */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h5 className="font-medium text-blue-800 flex items-center">
                        <Info className="w-4 h-4 mr-2" />
                        Règles de Provisionnement SYSCOHADA
                      </h5>
                      <div className="mt-3 space-y-2 text-sm text-blue-700">
                        <div className="flex justify-between">
                          <span>Créances 61-90 jours</span>
                          <span className="font-medium">20% de provision</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Créances +90 jours</span>
                          <span className="font-medium">50% de provision</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Créances contentieuses</span>
                          <span className="font-medium">100% de provision</span>
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
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setShowPeriodModal(true)}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  <Calendar className="w-4 h-4 text-[#666666]" />
                  <span>
                    {dateRange.period === 'custom'
                      ? `${dateRange.startDate} - ${dateRange.endDate}`
                      : dateRange.period === 'day' ? t('common.today')
                      : dateRange.period === 'week' ? 'Cette semaine'
                      : dateRange.period === 'month' ? 'Ce mois'
                      : dateRange.period === 'quarter' ? 'Ce trimestre'
                      : 'Cette année'
                    }
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode(!compareMode)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    compareMode
                      ? 'bg-[#6A8A82] text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Mode Comparaison
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button type="button" className="p-2 text-gray-600 hover:text-gray-900" title="Actualiser">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <ExportMenu
                  data={filteredClients}
                  filename="dashboard-clients"
                  columns={{
                    code: 'Code',
                    raisonSociale: 'Client',
                    categorie: 'Catégorie',
                    chiffreAffaires: 'CA',
                    scoreCredit: 'Score Crédit',
                    tauxRecouvrement: 'Taux Recouvrement',
                    notationInterne: 'Note'
                  }}
                  buttonText="Export PDF"
                />
              </div>
            </div>
          </div>

          {/* KPIs principale */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Building className="w-5 h-5 text-[#6A8A82]" />
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">+12%</span>
              </div>
              <p className="text-lg font-bold text-[#191919]">110</p>
              <p className="text-sm text-[#666666]">Clients Actifs</p>
              <div className="mt-2 flex items-center text-xs text-gray-700">
                <ChevronUp className="w-3 h-3 text-green-500 mr-1" />
                <span>8 nouveaux ce mois</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">+18%</span>
              </div>
              <p className="text-lg font-bold text-[#191919]">69.7M</p>
              <p className="text-sm text-[#666666]">CA Total</p>
              <div className="mt-2 flex items-center text-xs text-gray-700">
                <TrendingUp className="w-3 h-3 text-purple-500 mr-1" />
                <span>FCFA YTD</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">-5j</span>
              </div>
              <p className="text-lg font-bold text-[#191919]">38j</p>
              <p className="text-sm text-[#666666]">DSO Moyen</p>
              <div className="mt-2 flex items-center text-xs text-gray-700">
                <ChevronDown className="w-3 h-3 text-green-500 mr-1" />
                <span>Amélioration</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Target className="w-5 h-5 text-orange-600" />
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">89%</span>
              </div>
              <p className="text-lg font-bold text-[#191919]">89%</p>
              <p className="text-sm text-[#666666]">Taux Recouvrement</p>
              <div className="mt-2 flex items-center text-xs text-gray-700">
                <Info className="w-3 h-3 text-orange-500 mr-1" />
                <span>Objectif: 95%</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">85%</span>
              </div>
              <p className="text-lg font-bold text-[#191919]">4.1/5</p>
              <p className="text-sm text-[#666666]">Score Fidélité</p>
              <div className="mt-2 flex items-center text-xs text-gray-700">
                <Award className="w-3 h-3 text-green-500 mr-1" />
                <span>Excellente fidélisation</span>
              </div>
            </div>
          </div>

          {/* Indicateurs de Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Ventes */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Performance Ventes</h3>
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#666666]">Taux de Conversion</span>
                    <span className="text-sm font-semibold text-[#191919]">78%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#666666]">Taux de Recouvrement</span>
                    <span className="text-sm font-semibold text-[#191919]">89%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '89%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#666666]">Respect Délais Paiement</span>
                    <span className="text-sm font-semibold text-[#191919]">82%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-[#6A8A82] h-2 rounded-full" style={{ width: '82%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#666666]">Satisfaction Client</span>
                    <span className="text-sm font-semibold text-[#191919]">92%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analyse par Catégorie */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Analyse par Catégorie</h3>
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Grands Comptes</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 mr-2">12</span>
                    <span className="text-xs text-gray-700">clients</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">PME</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 mr-2">45</span>
                    <span className="text-xs text-gray-700">clients</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">TPE</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 mr-2">38</span>
                    <span className="text-xs text-gray-700">clients</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-gray-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Particuliers</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 mr-2">15</span>
                    <span className="text-xs text-gray-700">clients</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Clients */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Top 5 Clients</h3>
                <Award className="w-5 h-5 text-[#B87333]" />
              </div>
              <div className="space-y-3">
                {[
                  { nom: 'GUINEE EQUATORIALE MINING', montant: 25000000, part: 35.9 },
                  { nom: 'COMILOG GABON', montant: 15500000, part: 22.2 },
                  { nom: 'CAMRAIL SA', montant: 8500000, part: 12.2 },
                  { nom: 'SOCAPALM', montant: 5800000, part: 8.3 },
                  { nom: 'CONGOLAISE DE BOIS', montant: 4200000, part: 6.0 }
                ].map((client, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-gray-100 text-gray-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#191919] truncate">{client.nom}</p>
                        <p className="text-xs text-[#666666]">{formatCurrency(client.montant)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#6A8A82]">{client.part}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Graphiques principaux */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolution du CA */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Évolution du CA</h3>
                <div className="flex items-center space-x-2">
                  <button type="button" className="p-1 text-gray-700 hover:text-gray-600" aria-label="Information">
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.evolutionCA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis tickFormatter={(value) => `${value / 1000000}M`} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  {compareMode && (
                    <Line
                      type="monotone"
                      dataKey="ca2024"
                      stroke="#B87333"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="CA 2024"
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="ca2025"
                    stroke="#6A8A82"
                    strokeWidth={2}
                    name="CA 2025"
                    dot={{ fill: '#6A8A82' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Répartition par Catégorie */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Répartition par Catégorie</h3>
                <div className="flex items-center space-x-2">
                  <select className="text-sm border border-gray-300 rounded px-2 py-1">
                    <option>Par CA</option>
                    <option>Par Nombre</option>
                  </select>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    dataKey="ca"
                    data={[
                      { categorie: 'GRAND_COMPTE', ca: 45000000 },
                      { categorie: 'PME', ca: 18000000 },
                      { categorie: 'TPE', ca: 5500000 },
                      { categorie: 'PARTICULIER', ca: 1200000 }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    label={({ categorie, percent }) => `${categorie} ${(percent * 100).toFixed(0)}%`}
                  >
                    {[
                      { categorie: 'GRAND_COMPTE', ca: 45000000 },
                      { categorie: 'PME', ca: 18000000 },
                      { categorie: 'TPE', ca: 5500000 },
                      { categorie: 'PARTICULIER', ca: 1200000 }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#6A8A82', '#B87333', '#7A99AC', '#5A79AC'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Analyse Performance & Risques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Performance */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Évaluation Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={analyticsData.performanceClients}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="critere" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Score Moyen" dataKey="score" stroke="#6A8A82" fill="#6A8A82" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Matrice Risques Clients */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Matrice des Risques Clients</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1 row-span-3"></div>
                <div className="text-center text-xs text-gray-700 pb-2">Faible Encours</div>
                <div className="text-center text-xs text-gray-700 pb-2">Fort Encours</div>

                <div className="text-right text-xs text-gray-700 pr-2">DSO Élevé</div>
                <div className="bg-yellow-100 p-4 rounded-lg text-center">
                  <p className="text-lg font-bold text-yellow-800">8</p>
                  <p className="text-xs text-yellow-600">À surveiller</p>
                </div>
                <div className="bg-red-100 p-4 rounded-lg text-center">
                  <p className="text-lg font-bold text-red-800">5</p>
                  <p className="text-xs text-red-600">Critiques</p>
                </div>

                <div className="text-right text-xs text-gray-700 pr-2">DSO Normal</div>
                <div className="bg-green-100 p-4 rounded-lg text-center">
                  <p className="text-lg font-bold text-green-800">72</p>
                  <p className="text-xs text-green-600">Sains</p>
                </div>
                <div className="bg-orange-100 p-4 rounded-lg text-center">
                  <p className="text-lg font-bold text-orange-800">25</p>
                  <p className="text-xs text-orange-600">Stratégiques</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Action Immédiate Requise</span>
                  <span className="text-lg font-bold text-red-600">5 clients critiques</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tableau de Bord Prédictif */}
          <div className="bg-gradient-to-r from-[#6A8A82] to-[#7A99AC] rounded-lg p-6 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold">Insights & Prédictions Clients</h3>
                <p className="text-sm opacity-90 mt-1">Analyse prédictive basée sur l'historique</p>
              </div>
              <Database className="w-8 h-8 opacity-50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Croissance</span>
                </div>
                <p className="text-lg font-bold">+18%</p>
                <p className="text-sm opacity-90">CA prévu T2 2025</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertOctagon className="w-5 h-5" />
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Risque</span>
                </div>
                <p className="text-lg font-bold">5</p>
                <p className="text-sm opacity-90">Clients à risque de perte</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Timer className="w-5 h-5" />
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Relances</span>
                </div>
                <p className="text-lg font-bold">12</p>
                <p className="text-sm opacity-90">Relances à effectuer</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Globe className="w-5 h-5" />
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Prospection</span>
                </div>
                <p className="text-lg font-bold">8</p>
                <p className="text-sm opacity-90">Nouveaux clients potentiels</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouveau Client - Multi-étapes */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E8E8E8]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#191919]">Nouveau Client</h3>
                  <p className="text-sm text-[#666666]">Étape {formStep} sur 4</p>
                </div>
                <button type="button" onClick={handleCloseNewClientModal} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-[#666666]" />
                </button>
              </div>
              {/* Progress bar */}
              <div className="flex mt-4 space-x-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 h-2 rounded-full ${step <= formStep ? 'bg-[#6A8A82]' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
              <div className="flex mt-2 text-xs text-[#666666]">
                <span className="flex-1">Identification</span>
                <span className="flex-1">Adresse & Contact</span>
                <span className="flex-1">Comptabilité</span>
                <span className="flex-1">Conditions</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Étape 1: Identification */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-[#191919] flex items-center">
                    <FileCheck className="w-5 h-5 mr-2 text-[#6A8A82]" />
                    Identification de l'entreprise
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#666666] mb-1">Code client *</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newClient.code}
                          onChange={(e) => setNewClient({ ...newClient, code: e.target.value })}
                          className="flex-1 px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          placeholder="CLI008"
                        />
                        <button
                          type="button"
                          onClick={generateClientCode}
                          className="px-3 py-2 bg-gray-100 text-[#666666] rounded-lg hover:bg-gray-200"
                        >
                          Auto
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[#666666] mb-1">Catégorie *</label>
                      <select
                        value={newClient.categorie}
                        onChange={(e) => setNewClient({ ...newClient, categorie: e.target.value as NewClientForm['categorie'] })}
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                      >
                        <option value="GRAND_COMPTE">Grand Compte</option>
                        <option value="PME">PME</option>
                        <option value="TPE">TPE</option>
                        <option value="PARTICULIER">Particulier</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-[#666666] mb-1">Raison sociale *</label>
                      <input
                        type="text"
                        value={newClient.raisonSociale}
                        onChange={(e) => setNewClient({ ...newClient, raisonSociale: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        placeholder="Nom légal de l'entreprise"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#666666] mb-1">Nom commercial</label>
                      <input
                        type="text"
                        value={newClient.nomCommercial}
                        onChange={(e) => setNewClient({ ...newClient, nomCommercial: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#666666] mb-1">Secteur d'activité *</label>
                      <input
                        type="text"
                        value={newClient.secteurActivite}
                        onChange={(e) => setNewClient({ ...newClient, secteurActivite: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        placeholder="Ex: Commerce, BTP, Services..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#666666] mb-1">RCCM *</label>
                      <input
                        type="text"
                        value={newClient.rccm}
                        onChange={(e) => setNewClient({ ...newClient, rccm: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        placeholder="RC/YDE/2024/X/XXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#666666] mb-1">NIU (Numéro d'Identification Unique) *</label>
                      <input
                        type="text"
                        value={newClient.niu}
                        onChange={(e) => setNewClient({ ...newClient, niu: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        placeholder="M0XXXXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#666666] mb-1">Régime TVA *</label>
                      <select
                        value={newClient.regimeTVA}
                        onChange={(e) => setNewClient({ ...newClient, regimeTVA: e.target.value as NewClientForm['regimeTVA'] })}
                        className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                      >
                        <option value="REEL_NORMAL">Réel Normal</option>
                        <option value="REEL_SIMPLIFIE">Réel Simplifié</option>
                        <option value="FORFAIT">Forfait</option>
                        <option value="EXONERE">Exonéré</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 2: Adresse & Contact */}
              {formStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-semibold text-[#191919] flex items-center mb-4">
                      <MapPin className="w-5 h-5 mr-2 text-[#6A8A82]" />
                      Adresse
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm text-[#666666] mb-1">Adresse *</label>
                        <input
                          type="text"
                          value={newClient.adresse}
                          onChange={(e) => setNewClient({ ...newClient, adresse: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          placeholder="Rue, numéro, quartier"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Boîte Postale</label>
                        <input
                          type="text"
                          value={newClient.codePostal}
                          onChange={(e) => setNewClient({ ...newClient, codePostal: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          placeholder="BP 1234"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Ville *</label>
                        <input
                          type="text"
                          value={newClient.ville}
                          onChange={(e) => setNewClient({ ...newClient, ville: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Région</label>
                        <input
                          type="text"
                          value={newClient.region}
                          onChange={(e) => setNewClient({ ...newClient, region: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Pays *</label>
                        <select
                          value={newClient.pays}
                          onChange={(e) => setNewClient({ ...newClient, pays: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        >
                          <option value="Cameroun">Cameroun</option>
                          <option value="Gabon">Gabon</option>
                          <option value="Congo">Congo</option>
                          <option value="Tchad">Tchad</option>
                          <option value="Guinée Équatoriale">Guinée Équatoriale</option>
                          <option value="République Centrafricaine">République Centrafricaine</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-[#191919] flex items-center mb-4">
                      <Users className="w-5 h-5 mr-2 text-[#6A8A82]" />
                      Contact Principal
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Nom du contact *</label>
                        <input
                          type="text"
                          value={newClient.contactPrincipal}
                          onChange={(e) => setNewClient({ ...newClient, contactPrincipal: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Fonction</label>
                        <input
                          type="text"
                          value={newClient.fonction}
                          onChange={(e) => setNewClient({ ...newClient, fonction: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          placeholder="Directeur Financier, DAF..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Email *</label>
                        <input
                          type="email"
                          value={newClient.email}
                          onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Téléphone *</label>
                        <input
                          type="tel"
                          value={newClient.telephone}
                          onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          placeholder="+237 6XX XXX XXX"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Téléphone secondaire</label>
                        <input
                          type="tel"
                          value={newClient.telephoneSecondaire}
                          onChange={(e) => setNewClient({ ...newClient, telephoneSecondaire: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Fax</label>
                        <input
                          type="tel"
                          value={newClient.fax}
                          onChange={(e) => setNewClient({ ...newClient, fax: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
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
                    <h4 className="text-md font-semibold text-[#191919] flex items-center mb-4">
                      <BookOpen className="w-5 h-5 mr-2 text-[#6A8A82]" />
                      Paramètres Comptables SYSCOHADA
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Compte comptable client *</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={newClient.compteComptable}
                            onChange={(e) => setNewClient({ ...newClient, compteComptable: e.target.value })}
                            className="w-24 px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82] font-mono"
                            placeholder="411"
                          />
                          <input
                            type="text"
                            value={newClient.compteAuxiliaire}
                            onChange={(e) => setNewClient({ ...newClient, compteAuxiliaire: e.target.value })}
                            className="flex-1 px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82] font-mono"
                            placeholder="Code auxiliaire"
                          />
                        </div>
                        <p className="text-xs text-[#999999] mt-1">Compte 411 - Clients (SYSCOHADA)</p>
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Journal de ventes *</label>
                        <select
                          value={newClient.journalVentes}
                          onChange={(e) => setNewClient({ ...newClient, journalVentes: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        >
                          <option value="VE">VE - Ventes</option>
                          <option value="VX">VX - Ventes Export</option>
                          <option value="PS">PS - Prestations de Services</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Taux TVA applicable (%)</label>
                        <select
                          value={newClient.tauxTVA}
                          onChange={(e) => setNewClient({ ...newClient, tauxTVA: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        >
                          <option value={19.25}>19,25% - Taux normal Cameroun</option>
                          <option value={18}>18% - Taux CEMAC standard</option>
                          <option value={15}>15% - Taux réduit</option>
                          <option value={0}>0% - Exonéré</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Devise *</label>
                        <select
                          value={newClient.devise}
                          onChange={(e) => setNewClient({ ...newClient, devise: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        >
                          <option value="XAF">XAF - Franc CFA CEMAC</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="USD">USD - Dollar US</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-[#191919] flex items-center mb-4">
                      <Landmark className="w-5 h-5 mr-2 text-[#6A8A82]" />
                      Coordonnées Bancaires (optionnel)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Banque</label>
                        <input
                          type="text"
                          value={newClient.banque}
                          onChange={(e) => setNewClient({ ...newClient, banque: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          placeholder="Nom de la banque"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Code SWIFT/BIC</label>
                        <input
                          type="text"
                          value={newClient.swift}
                          onChange={(e) => setNewClient({ ...newClient, swift: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82] font-mono"
                          placeholder="XXXXXXXX"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm text-[#666666] mb-1">IBAN / RIB</label>
                        <input
                          type="text"
                          value={newClient.iban}
                          onChange={(e) => setNewClient({ ...newClient, iban: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82] font-mono"
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
                    <h4 className="text-md font-semibold text-[#191919] flex items-center mb-4">
                      <CreditCard className="w-5 h-5 mr-2 text-[#6A8A82]" />
                      Conditions de Paiement
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Mode de règlement *</label>
                        <select
                          value={newClient.modeReglement}
                          onChange={(e) => setNewClient({ ...newClient, modeReglement: e.target.value as NewClientForm['modeReglement'] })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        >
                          <option value="VIREMENT">Virement bancaire</option>
                          <option value="CHEQUE">Chèque</option>
                          <option value="PRELEVEMENT">Prélèvement automatique</option>
                          <option value="TRAITE">Traite / Lettre de change</option>
                          <option value="ESPECES">Espèces</option>
                          <option value="MOBILE_MONEY">Mobile Money</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Délai de paiement (jours) *</label>
                        <select
                          value={newClient.delaiPaiement}
                          onChange={(e) => setNewClient({ ...newClient, delaiPaiement: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        >
                          <option value={0}>Comptant</option>
                          <option value={15}>15 jours</option>
                          <option value={30}>30 jours</option>
                          <option value={45}>45 jours</option>
                          <option value={60}>60 jours fin de mois</option>
                          <option value={90}>90 jours</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Limite de crédit (XAF) *</label>
                        <input
                          type="number"
                          value={newClient.limiteCredit}
                          onChange={(e) => setNewClient({ ...newClient, limiteCredit: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Remise commerciale (%)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={newClient.remise}
                          onChange={(e) => setNewClient({ ...newClient, remise: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#666666] mb-1">Escompte pour paiement anticipé (%)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={newClient.escompte}
                          onChange={(e) => setNewClient({ ...newClient, escompte: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Récapitulatif */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-[#191919] mb-3">Récapitulatif</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-[#666666]">Code client:</span>
                        <span className="ml-2 font-medium">{newClient.code || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[#666666]">Raison sociale:</span>
                        <span className="ml-2 font-medium">{newClient.raisonSociale || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[#666666]">Compte comptable:</span>
                        <span className="ml-2 font-mono">{newClient.compteComptable}{newClient.compteAuxiliaire}</span>
                      </div>
                      <div>
                        <span className="text-[#666666]">NIU:</span>
                        <span className="ml-2 font-mono">{newClient.niu || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[#666666]">Délai paiement:</span>
                        <span className="ml-2 font-medium">{newClient.delaiPaiement} jours</span>
                      </div>
                      <div>
                        <span className="text-[#666666]">Limite crédit:</span>
                        <span className="ml-2 font-medium">{formatCurrency(newClient.limiteCredit)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#E8E8E8] flex justify-between">
              <button
                type="button"
                onClick={() => formStep > 1 ? setFormStep(formStep - 1) : handleCloseNewClientModal()}
                className="px-4 py-2 border border-[#E8E8E8] rounded-lg text-[#666666] hover:bg-gray-50"
              >
                {formStep > 1 ? 'Précédent' : 'Annuler'}
              </button>
              <div className="flex space-x-3">
                {formStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep(formStep + 1)}
                    className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90"
                  >
                    Suivant
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveNewClient}
                    className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 font-semibold"
                  >
                    Créer le client
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Period Selector Modal */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        currentRange={dateRange}
        onPeriodChange={(newRange) => {
          setDateRange(newRange);
          setShowPeriodModal(false);
        }}
      />
    </div>
  );
};

export default ClientsModule;
