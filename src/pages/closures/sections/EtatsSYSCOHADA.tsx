
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import { useEtatsFinanciers } from '../hooks/useEtatsFinanciers';
import { formatCurrency } from '../../../utils/formatters';
import { Money } from '@/utils/money';
import { motion } from 'framer-motion';
import {
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Calculator,
  Building,
  DollarSign,
  Calendar,
  Download,
  Eye,
  Edit,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Brain,
  Zap,
  BookOpen,
  Scale,
  Award,
  Target,
  Activity,
  LineChart,
  BarChart,
  Archive,
  CreditCard,
  Users,
  Factory,
  Truck,
  Settings,
  Info,
  HelpCircle,
  Shield,
  Flag,
  Layers,
  Grid,
  List,
  Hash,
  Percent,
  Globe,
  Lock,
  Unlock,
  Clock,
  Search,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/Progress';

interface EtatFinancier {
  id: string;
  nom: string;
  codeSYSCOHADA: string;
  description: string;
  typeEtat: 'bilan' | 'compte_resultat' | 'tafire' | 'notes' | 'flux_tresorerie';
  obligatoire: boolean;
  periodicite: 'mensuel' | 'trimestriel' | 'annuel';
  statutGeneration: 'brouillon' | 'provisoire' | 'definitif' | 'transmis';
  dateGeneration?: string;
  dateValidation?: string;
  dateTransmission?: string;
  validateur?: string;
  conformiteSYSCOHADA: boolean;
  controlesCritiques: {
    nom: string;
    statut: 'conforme' | 'non_conforme' | 'attention';
    message: string;
  }[];
}

interface PosteBilan {
  code: string;
  libelle: string;
  noteBilan?: string;
  exerciceActuel: number;
  exercicePrecedent: number;
  variation: number;
  variationPourcentage: number;
  niveau: number;
  sousTotal?: boolean;
  total?: boolean;
}

interface PosteCompteResultat {
  code: string;
  libelle: string;
  noteCompte?: string;
  exerciceActuel: number;
  exercicePrecedent: number;
  variation: number;
  variationPourcentage: number;
  niveau: number;
  sousTotal?: boolean;
  total?: boolean;
}

interface RatioFinancier {
  nom: string;
  valeur: number;
  valeurPrecedente: number;
  unite: string;
  interpretation: string;
  seuil?: number;
  statut: 'bon' | 'moyen' | 'mauvais' | 'critique';
  evolution: 'amelioration' | 'deterioration' | 'stable';
  formuleCalcul: string;
}


interface DocumentReglementaire {
  nom: string;
  description: string;
  obligatoire: boolean;
  frequence: string;
  dateLimite: string;
  statut: 'non_commence' | 'en_cours' | 'complete' | 'transmis';
  autoriteDestinataire: string;
  sanctions?: string;
}

const EtatsSYSCOHADA: React.FC = () => {
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
  const [selectedTab, setSelectedTab] = useState('vue-ensemble');
  const [selectedEtat, setSelectedEtat] = useState<string>('bilan');
  const [periodeComparaison, setPeriodeComparaison] = useState<string>('N-1');
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'bilan' as 'balance' | 'grand_livre' | 'journal' | 'bilan' | 'resultat' | 'tresorerie',
    etats_selectionnes: [] as string[],
    periode_debut: '',
    periode_fin: '',
    format: 'pdf' as 'pdf' | 'excel' | 'csv',
    donnees_comparatives_n1: false,
    notes_explicatives: false,
    devise_edition: 'XAF',
    generation_immediate: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const etatsData = useEtatsFinanciers();

  const resetForm = () => {
    setFormData({
      type: 'bilan',
      etats_selectionnes: [],
      periode_debut: '',
      periode_fin: '',
      format: 'pdf',
      donnees_comparatives_n1: false,
      notes_explicatives: false,
      devise_edition: 'XAF',
      generation_immediate: true,
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    if (field === 'etats_selectionnes') {
      const currentArray = Array.isArray(formData.etats_selectionnes) ? formData.etats_selectionnes : [];
      const strValue = String(value);
      const newArray = currentArray.includes(strValue)
        ? currentArray.filter(item => item !== strValue)
        : [...currentArray, strValue];
      setFormData(prev => ({ ...prev, etats_selectionnes: newArray }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.etats_selectionnes.length) {
      toast.error(t('syscohadaStatements.selectAtLeastOne'));
      return;
    }
    etatsData.refresh();
    toast.success(t('syscohadaStatements.recomputed'));
    setShowGenerationModal(false);
  };

  // --- Computed from real Dexie data via useEtatsFinanciers hook ---
  const { getSolde, getSoldeDebiteur, getSoldeCrediteur, totalActif: realTotalActif, totalPassif: realTotalPassif, resultatNet: realResultat, isBalanced, totalEntries, fiscalYear, balances } = etatsData;

  // --- Contrôles de conformité RÉELS -----------------------------------------
  // Les états déclaraient auparavant `conformiteSYSCOHADA: true` EN DUR pour le
  // compte de résultat et le TAFIRE — ce dernier affichant pourtant « aucune
  // donnée » deux écrans plus bas. Le KPI « X conformes SYSCOHADA » annonçait
  // donc 100 % sur un état non calculable.
  const ecartBilan = Math.abs(realTotalActif - realTotalPassif);
  const impotsClasse8 = getSolde(['8']);
  const resultatAvantImpot = getSoldeCrediteur(['7']) - getSoldeDebiteur(['6']);

  // Comptes de gestion à solde inversé (charge créditrice / produit débiteur) :
  // signal d'erreur d'imputation qui fausse directement le compte de résultat.
  const comptesGestionInverses = React.useMemo(() => {
    const out: string[] = [];
    for (const [code, bal] of balances) {
      if (code.startsWith('6') && bal.solde < -1000) out.push(code);
      if (code.startsWith('7') && bal.solde > 1000) out.push(code);
    }
    return out;
  }, [balances]);

  // Le TAFIRE exige les variations de bilan N/N-1, indisponibles à l'import.
  const tafireCalculable = false;

  // Libellé de l'exercice actif (réel). Pas de données N-1 disponibles à l'import.
  const exerciceLabel = fiscalYear?.startDate
    ? new Date(fiscalYear.startDate).getFullYear().toString()
    : (fiscalYear?.code ?? '—');
  const dateClotureLabel = fiscalYear?.endDate
    ? new Date(fiscalYear.endDate).toLocaleDateString('fr-FR')
    : (exerciceLabel !== '—' ? `31/12/${exerciceLabel}` : '—');

  // Pas de comparatif N-1 (l'import ne fournit pas l'exercice précédent) → exercicePrecedent laissé à 0, affiché "—".
  const p = (val: number) => ({ exerciceActuel: val, exercicePrecedent: 0, variation: val, variationPourcentage: val !== 0 ? 100 : 0 });

  const etatsFinanciers: EtatFinancier[] = [
    {
      id: '1', nom: t('syscohadaStatements.balanceSheetName'), codeSYSCOHADA: 'BILAN-SYS',
      description: t('syscohadaStatements.balanceSheetDesc'),
      typeEtat: 'bilan', obligatoire: true, periodicite: 'annuel',
      statutGeneration: totalEntries > 0 ? 'definitif' : 'brouillon',
      dateGeneration: new Date().toISOString().split('T')[0],
      conformiteSYSCOHADA: isBalanced,
      controlesCritiques: [
        {
          nom: t('syscohadaStatements.checkBalanceName'),
          statut: isBalanced ? 'conforme' : 'non_conforme',
          message: isBalanced
            ? t('syscohadaStatements.checkBalanceOk', { amount: formatCurrency(realTotalActif) })
            : t('syscohadaStatements.checkBalanceKo', {
              gap: formatCurrency(ecartBilan),
              assets: formatCurrency(realTotalActif),
              liabilities: formatCurrency(realTotalPassif),
            }),
        },
        {
          nom: t('syscohadaStatements.checkResultName'),
          statut: 'conforme',
          message: t('syscohadaStatements.checkResultMsg', { amount: formatCurrency(realResultat) }),
        },
      ],
    },
    {
      id: '2', nom: t('syscohadaStatements.incomeStatementName'), codeSYSCOHADA: 'CRESULT-SYS',
      description: t('syscohadaStatements.incomeStatementDesc'),
      typeEtat: 'compte_resultat', obligatoire: true, periodicite: 'annuel',
      statutGeneration: totalEntries > 0 ? 'definitif' : 'brouillon',
      dateGeneration: new Date().toISOString().split('T')[0],
      conformiteSYSCOHADA: comptesGestionInverses.length === 0 && impotsClasse8 !== 0,
      controlesCritiques: [
        {
          nom: t('syscohadaStatements.checkSignName'),
          statut: comptesGestionInverses.length === 0 ? 'conforme' : 'non_conforme',
          message: comptesGestionInverses.length === 0
            ? t('syscohadaStatements.checkSignOk')
            : t('syscohadaStatements.checkSignKo', {
              count: String(comptesGestionInverses.length),
              accounts: comptesGestionInverses.slice(0, 5).join(', '),
            }),
        },
        {
          // Gotcha projet : oublier la classe 89 (IMF/IS) casse l'équilibre du bilan.
          nom: t('syscohadaStatements.checkTaxName'),
          statut: impotsClasse8 !== 0 ? 'conforme' : 'attention',
          message: impotsClasse8 !== 0
            ? t('syscohadaStatements.checkTaxOk', {
              before: formatCurrency(resultatAvantImpot),
              tax: formatCurrency(impotsClasse8),
              net: formatCurrency(realResultat),
            })
            : t('syscohadaStatements.checkTaxKo'),
        },
      ],
    },
    {
      id: '3', nom: 'TAFIRE', codeSYSCOHADA: 'TAFIRE-SYS',
      description: t('syscohadaStatements.tafireDesc'),
      typeEtat: 'tafire', obligatoire: true, periodicite: 'annuel',
      statutGeneration: tafireCalculable ? 'provisoire' : 'brouillon',
      dateGeneration: new Date().toISOString().split('T')[0],
      // Honnêteté : cet état affiche « aucune donnée » — le déclarer conforme
      // gonflait artificiellement le taux de conformité à 100 %.
      conformiteSYSCOHADA: tafireCalculable,
      controlesCritiques: [
        {
          nom: t('syscohadaStatements.checkTafireName'),
          statut: tafireCalculable ? 'conforme' : 'non_conforme',
          message: tafireCalculable
            ? t('syscohadaStatements.checkTafireOk')
            : t('syscohadaStatements.checkTafireKo'),
        },
      ],
    },
  ];

  // Bilan Actif — placement par SIGNE du solde (net), pour que Actif = Passif =
  // Σ soldes cl.1-5 (identité comptable). Immo en NET : les contreparties
  // créditrices 28/29 (amortissements + dépréciations) sont déduites.
  const immoIncorp = getSolde(['20', '21']);
  // 25 = avances/immobilisations en cours → corporelles (PAS financières),
  // cohérent avec le Bilan canonique (financialStatementsService).
  const immoCorp = getSolde(['22', '23', '24', '25']);
  const immoFin = getSolde(['26', '27']);
  const amortImmo = getSoldeCrediteur(['28', '29']); // amortissements + dépréciations d'immo.
  const totalImmo = immoIncorp + immoCorp + immoFin - amortImmo; // = getSolde(['2'])
  const stocks = getSolde(['3']); // net des dépréciations de stocks (39)
  // Emplois/créances = TOUS les comptes DÉBITEURS des classes 1 & 4 (dont 40 & 48
  // débiteurs). Se restreindre à 41-47 droppait les fournisseurs débiteurs (409),
  // les créances HAO (48) et les débiteurs de classe 1 → déséquilibre.
  const creances = getSoldeDebiteur(['1', '4']);
  const tresoActif = getSoldeDebiteur(['5']);
  const totalCirculant = stocks + creances + tresoActif;
  const totalGenActif = totalImmo + totalCirculant;

  const postesActif: PosteBilan[] = [
    { code: 'AD', libelle: 'CHARGES IMMOBILISEES', noteBilan: '3', ...p(0), niveau: 1 },
    { code: 'AE', libelle: 'IMMOBILISATIONS INCORPORELLES', noteBilan: '4', ...p(immoIncorp), niveau: 1 },
    { code: 'AF', libelle: 'IMMOBILISATIONS CORPORELLES', noteBilan: '5', ...p(immoCorp - amortImmo), niveau: 1 },
    { code: 'AG', libelle: 'IMMOBILISATIONS FINANCIERES', noteBilan: '6', ...p(immoFin), niveau: 1 },
    { code: 'AI', libelle: 'TOTAL ACTIF IMMOBILISE', ...p(totalImmo), niveau: 0, total: true },
    { code: 'AJ', libelle: 'ACTIF CIRCULANT HAO', noteBilan: '7', ...p(0), niveau: 1 },
    { code: 'AK', libelle: 'STOCKS ET ENCOURS', noteBilan: '8', ...p(stocks), niveau: 1 },
    { code: 'AL', libelle: 'CREANCES ET EMPLOIS ASSIMILES', noteBilan: '9', ...p(creances), niveau: 1 },
    { code: 'AN', libelle: 'TRESORERIE-ACTIF', noteBilan: '10', ...p(tresoActif), niveau: 1 },
    { code: 'AO', libelle: 'TOTAL ACTIF CIRCULANT', ...p(totalCirculant), niveau: 0, total: true },
    { code: 'AQ', libelle: 'ECART DE CONVERSION ACTIF', noteBilan: '11', ...p(0), niveau: 1 },
    { code: 'AR', libelle: 'TOTAL GENERAL ACTIF', ...p(totalGenActif), niveau: 0, total: true },
  ];

  // Bilan Passif
  const capital = getSoldeCrediteur(['10']);
  // Réserves : 11 & 12 UNIQUEMENT — le compte 13 (résultat de l'exercice) est
  // porté séparément par `realResultat`, sinon le résultat est compté DEUX FOIS.
  const reserves = getSoldeCrediteur(['11', '12']);
  // Pas de Math.max(0) : une perte doit réduire les capitaux propres.
  const capitauxPropres = capital + reserves + realResultat;
  const subventions = getSoldeCrediteur(['14']);
  const provisions = getSoldeCrediteur(['15', '19']);
  const dettesFinancieres = getSoldeCrediteur(['16', '17', '18']);
  // TOUS les comptes CRÉDITEURS de la classe 4 (40 fournisseurs, 41 clients
  // créditeurs, 48 dettes HAO, 49 dépréciations…). Se restreindre à 40/42-47
  // droppait 41-créditeur, 48 et 49 → déséquilibre.
  const dettesCirculantes = getSoldeCrediteur(['4']);
  const tresoPassif = getSoldeCrediteur(['5']);
  const totalDettes = provisions + dettesFinancieres + dettesCirculantes + tresoPassif;
  const totalGenPassif = capitauxPropres + subventions + totalDettes;

  const postesPassif: PosteBilan[] = [
    { code: 'CA', libelle: 'CAPITAL', noteBilan: '12', ...p(capital), niveau: 1 },
    { code: 'CB', libelle: 'PRIMES ET RESERVES', noteBilan: '13', ...p(reserves), niveau: 1 },
    { code: 'CD', libelle: 'RESULTAT NET', noteBilan: '14', ...p(realResultat), niveau: 1 },
    { code: 'CF', libelle: 'TOTAL CAPITAUX PROPRES', ...p(capitauxPropres), niveau: 0, total: true },
    { code: 'CG', libelle: 'SUBVENTIONS D\'INVESTISSEMENT', noteBilan: '15', ...p(subventions), niveau: 1 },
    { code: 'CI', libelle: 'TOTAL CAPITAUX PROPRES ET RESSOURCES', ...p(capitauxPropres + subventions), niveau: 0, total: true },
    { code: 'CJ', libelle: 'PROVISIONS POUR RISQUES ET CHARGES', noteBilan: '17', ...p(provisions), niveau: 1 },
    { code: 'CK', libelle: 'DETTES FINANCIERES', noteBilan: '18', ...p(dettesFinancieres), niveau: 1 },
    { code: 'CM', libelle: 'DETTES CIRCULANTES', noteBilan: '20', ...p(dettesCirculantes), niveau: 1 },
    { code: 'CN', libelle: 'TRESORERIE-PASSIF', noteBilan: '21', ...p(tresoPassif), niveau: 1 },
    { code: 'CO', libelle: 'TOTAL DETTES', ...p(totalDettes), niveau: 0, total: true },
    { code: 'CQ', libelle: 'TOTAL GENERAL PASSIF', ...p(totalGenPassif), niveau: 0, total: true },
  ];

  // Compte de Résultat — computed from real account balances
  const venteMarchandises = getSoldeCrediteur(['70']);
  const achatsMarchandises = getSoldeDebiteur(['60']);
  const margeCommerciale = venteMarchandises - achatsMarchandises;
  const productionVendue = getSoldeCrediteur(['71']);
  const autresAchats = getSoldeDebiteur(['61', '62']);
  const transports = getSoldeDebiteur(['63']);
  const impotsTaxes = getSoldeDebiteur(['64']);
  const autresCharges = getSoldeDebiteur(['65']);
  const VA = margeCommerciale + productionVendue - autresAchats - transports - impotsTaxes - autresCharges;
  const chargesPersonnel = getSoldeDebiteur(['66']);
  const EBE = VA - chargesPersonnel;
  const dotationsAmort = getSoldeDebiteur(['681']);
  const dotationsProv = getSoldeDebiteur(['69']);
  const resultatExploit = EBE - dotationsAmort - dotationsProv;
  const revFinanciers = getSoldeCrediteur(['77']);
  const chargesFinancieres = getSoldeDebiteur(['67']);
  const resultatFinancier = revFinanciers - chargesFinancieres;
  const resultatAO = resultatExploit + resultatFinancier;
  const produitsHAO = getSoldeCrediteur(['84', '85', '86', '87', '88']);
  const chargesHAO = getSoldeDebiteur(['83', '85']);
  const resultatHAO = produitsHAO - chargesHAO;
  const impotResultat = getSoldeDebiteur(['89']);

  const CA = venteMarchandises + productionVendue;

  const postesResultat: PosteCompteResultat[] = [
    { code: 'TA', libelle: 'VENTES DE MARCHANDISES', noteCompte: '23', ...p(venteMarchandises), niveau: 1 },
    { code: 'TB', libelle: 'ACHATS DE MARCHANDISES', noteCompte: '24', ...p(-achatsMarchandises), niveau: 1 },
    { code: 'TD', libelle: 'MARGE COMMERCIALE', ...p(margeCommerciale), niveau: 0, sousTotal: true },
    { code: 'TE', libelle: 'PRODUCTION VENDUE', noteCompte: '26', ...p(productionVendue), niveau: 1 },
    { code: 'TI', libelle: 'CHIFFRE D\'AFFAIRES', ...p(CA), niveau: 0, sousTotal: true },
    { code: 'TJ', libelle: 'AUTRES ACHATS', noteCompte: '29', ...p(-autresAchats), niveau: 1 },
    { code: 'TM', libelle: 'IMPOTS ET TAXES', noteCompte: '32', ...p(-impotsTaxes), niveau: 1 },
    { code: 'TO', libelle: 'VALEUR AJOUTEE', ...p(VA), niveau: 0, sousTotal: true },
    { code: 'TP', libelle: 'CHARGES DE PERSONNEL', noteCompte: '34', ...p(-chargesPersonnel), niveau: 1 },
    { code: 'TQ', libelle: 'EXCEDENT BRUT D\'EXPLOITATION', ...p(EBE), niveau: 0, sousTotal: true },
    { code: 'TR', libelle: 'DOTATIONS AUX AMORTISSEMENTS', noteCompte: '35', ...p(-dotationsAmort), niveau: 1 },
    { code: 'TS', libelle: 'DOTATIONS AUX PROVISIONS', noteCompte: '36', ...p(-dotationsProv), niveau: 1 },
    { code: 'TT', libelle: 'RESULTAT D\'EXPLOITATION', ...p(resultatExploit), niveau: 0, sousTotal: true },
    { code: 'TU', libelle: 'REVENUS FINANCIERS', noteCompte: '37', ...p(revFinanciers), niveau: 1 },
    { code: 'TV', libelle: 'CHARGES FINANCIERES', noteCompte: '38', ...p(-chargesFinancieres), niveau: 1 },
    { code: 'TW', libelle: 'RESULTAT FINANCIER', ...p(resultatFinancier), niveau: 0, sousTotal: true },
    { code: 'TX', libelle: 'RESULTAT DES ACTIVITES ORDINAIRES', ...p(resultatAO), niveau: 0, sousTotal: true },
    { code: 'TY', libelle: 'PRODUITS HAO', noteCompte: '39', ...p(produitsHAO), niveau: 1 },
    { code: 'TZ', libelle: 'CHARGES HAO', noteCompte: '40', ...p(-chargesHAO), niveau: 1 },
    { code: 'UA', libelle: 'RESULTAT HAO', ...p(resultatHAO), niveau: 0, sousTotal: true },
    { code: 'UC', libelle: 'IMPOTS SUR LE RESULTAT', noteCompte: '42', ...p(-impotResultat), niveau: 1 },
    { code: 'UD', libelle: 'RESULTAT NET DE L\'EXERCICE', ...p(realResultat), niveau: 0, total: true },
  ];

  // Ratios financiers — computed from real data
  const ratios: RatioFinancier[] = useMemo(() => {
    const totalDettesVal = totalDettes || 1;
    const capitauxPropresVal = capitauxPropres || 1;
    const totalActifVal = totalGenActif || 1;
    const liquidite = totalCirculant / (dettesCirculantes + tresoPassif || 1);
    const endettement = totalDettes / capitauxPropresVal;
    const roa = (realResultat / totalActifVal) * 100;
    const roe = (realResultat / capitauxPropresVal) * 100;
    return [
      { nom: t('syscohadaStatements.ratioLiquidityName'), valeur: new Money(liquidite).round().toNumber(), valeurPrecedente: 0, unite: '', interpretation: t('syscohadaStatements.ratioLiquidityInterp'), seuil: 1.5, statut: liquidite >= 1.5 ? 'bon' as const : liquidite >= 1 ? 'moyen' as const : 'mauvais' as const, evolution: 'stable' as const, formuleCalcul: t('syscohadaStatements.ratioLiquidityFormula') },
      { nom: t('syscohadaStatements.ratioDebtName'), valeur: new Money(endettement).round().toNumber(), valeurPrecedente: 0, unite: '', interpretation: t('syscohadaStatements.ratioDebtInterp'), seuil: 0.7, statut: endettement <= 0.7 ? 'bon' as const : endettement <= 1 ? 'moyen' as const : 'mauvais' as const, evolution: 'stable' as const, formuleCalcul: t('syscohadaStatements.ratioDebtFormula') },
      { nom: t('syscohadaStatements.ratioRoaName'), valeur: new Money(roa).round(1).toNumber(), valeurPrecedente: 0, unite: '%', interpretation: t('syscohadaStatements.ratioRoaInterp'), seuil: 5.0, statut: roa >= 5 ? 'bon' as const : roa >= 2 ? 'moyen' as const : 'mauvais' as const, evolution: 'stable' as const, formuleCalcul: t('syscohadaStatements.ratioRoaFormula') },
      { nom: t('syscohadaStatements.ratioRoeName'), valeur: new Money(roe).round(1).toNumber(), valeurPrecedente: 0, unite: '%', interpretation: t('syscohadaStatements.ratioRoeInterp'), seuil: 10.0, statut: roe >= 10 ? 'bon' as const : roe >= 5 ? 'moyen' as const : 'mauvais' as const, evolution: 'stable' as const, formuleCalcul: t('syscohadaStatements.ratioRoeFormula') },
    ];
  }, [etatsData.balances, t]);

  // Documents réglementaires — static
  const documentsReglementaires: DocumentReglementaire[] = [
    { nom: t('syscohadaStatements.docDsfName'), description: t('syscohadaStatements.docDsfDesc'), obligatoire: true, frequence: t('syscohadaStatements.frequencyAnnual'), dateLimite: `${new Date().getFullYear() + 1}-04-30`, statut: totalEntries > 0 ? 'en_cours' : 'non_commence', autoriteDestinataire: t('syscohadaStatements.authorityDgi'), sanctions: t('syscohadaStatements.sanctionsDsf') },
    { nom: t('syscohadaStatements.docOhadaName'), description: t('syscohadaStatements.docOhadaDesc'), obligatoire: true, frequence: t('syscohadaStatements.frequencyAnnual'), dateLimite: `${new Date().getFullYear() + 1}-06-30`, statut: totalEntries > 0 ? 'en_cours' : 'non_commence', autoriteDestinataire: t('syscohadaStatements.authorityRegistry') },
  ];

  // Calculs des KPIs
  const kpis = useMemo(() => {
    const totalActif = postesActif.find(p => p.code === 'AR')?.exerciceActuel || 0;
    const capitauxPropres = postesPassif.find(p => p.code === 'CF')?.exerciceActuel || 0;
    const chiffreAffaires = postesResultat.find(p => p.code === 'TI')?.exerciceActuel || 0;
    const resultatNet = postesResultat.find(p => p.code === 'UD')?.exerciceActuel || 0;

    const etatsGeneres = etatsFinanciers.length;
    const etatsConformes = etatsFinanciers.filter(e => e.conformiteSYSCOHADA).length;
    const documentsCompletes = documentsReglementaires.filter(d => d.statut === 'complete').length;

    return {
      totalActif,
      capitauxPropres,
      chiffreAffaires,
      resultatNet,
      etatsGeneres,
      etatsConformes,
      documentsCompletes,
      tauxConformite: (etatsConformes / etatsFinanciers.length) * 100,
      tauxCompletude: (documentsCompletes / documentsReglementaires.length) * 100
    };
  }, [totalGenActif, capitauxPropres, CA, realResultat, totalEntries, isBalanced]);

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'definitif': return <Lock className="w-4 h-4 text-[var(--color-success)]" />;
      case 'provisoire': return <Unlock className="w-4 h-4 text-[var(--color-warning)]" />;
      case 'brouillon': return <Edit className="w-4 h-4 text-[var(--color-text-primary)]" />;
      case 'transmis': return <CheckCircle className="w-4 h-4 text-[var(--color-primary)]" />;
      default: return <Clock className="w-4 h-4 text-[var(--color-text-primary)]" />;
    }
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, string> = {
      'definitif': 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
      'provisoire': 'bg-[var(--color-warning-lighter)] text-yellow-800',
      'brouillon': 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]',
      'transmis': 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]'
    };
    return variants[statut] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
  };

  const getRatioStatutColor = (statut: string) => {
    switch (statut) {
      case 'bon': return 'text-[var(--color-success)]';
      case 'moyen': return 'text-[var(--color-warning)]';
      case 'mauvais': return 'text-[var(--color-warning)]';
      case 'critique': return 'text-[var(--color-error)]';
      default: return 'text-[var(--color-text-primary)]';
    }
  };

  const getEvolutionIcon = (evolution: string) => {
    switch (evolution) {
      case 'amelioration': return <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />;
      case 'deterioration': return <TrendingDown className="w-4 h-4 text-[var(--color-error)]" />;
      case 'stable': return <Activity className="w-4 h-4 text-[var(--color-primary)]" />;
      default: return <Activity className="w-4 h-4 text-[var(--color-text-primary)]" />;
    }
  };

  const formatNumber = (num: number): string => {
    if (Math.abs(num) >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return formatCurrency(num);
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Total Actif</p>
                <p className="text-lg font-bold">{(kpis.totalActif / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{t('syscohadaStatements.kpiFiscalYear', { year: exerciceLabel })}</p>
              </div>
              <Building className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.kpiNetResult')}</p>
                <p className="text-lg font-bold text-[var(--color-success)]">{(kpis.resultatNet / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{t('syscohadaStatements.kpiFiscalYear', { year: exerciceLabel })}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-[var(--color-success)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.kpiGenerated')}</p>
                <p className="text-lg font-bold">{kpis.etatsGeneres}</p>
                <p className="text-xs text-[var(--color-primary)] mt-1">{t('syscohadaStatements.kpiCompliantCount', { count: String(kpis.etatsConformes) })}</p>
              </div>
              <FileText className="w-8 h-8 text-primary-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.kpiCompliance')}</p>
                <p className="text-lg font-bold">{kpis.tauxConformite.toFixed(0)}%</p>
                <Progress value={kpis.tauxConformite} className="mt-2" />
              </div>
              <Award className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes de Conformité */}
      <div className="space-y-4">
        <Alert className="border-l-4 border-l-green-500">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('syscohadaStatements.alertComplianceLabel')}</strong>{' '}
            {t('syscohadaStatements.alertComplianceText')}
          </AlertDescription>
        </Alert>

        <Alert className="border-l-4 border-l-blue-500">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('syscohadaStatements.alertDeadlineLabel')}</strong>{' '}
            {t('syscohadaStatements.alertDeadlineText', { year: exerciceLabel !== '—' ? String(Number(exerciceLabel) + 1) : 'N+1' })}
          </AlertDescription>
        </Alert>
      </div>

      {/* Tabs principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="vue-ensemble">{t('syscohadaStatements.tabOverview')}</TabsTrigger>
          <TabsTrigger value="bilan">{t('syscohadaStatements.tabBalanceSheet')}</TabsTrigger>
          <TabsTrigger value="compte-resultat">{t('syscohadaStatements.tabIncome')}</TabsTrigger>
          <TabsTrigger value="ratios">{t('syscohadaStatements.tabRatios')}</TabsTrigger>
          <TabsTrigger value="etats-annexes">{t('syscohadaStatements.tabAnnexes')}</TabsTrigger>
          <TabsTrigger value="obligations">{t('syscohadaStatements.tabObligations')}</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="vue-ensemble" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('syscohadaStatements.generationStatus')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {etatsFinanciers.map(etat => (
                    <div key={etat.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-[var(--color-primary)]" />
                        <div>
                          <p className="font-medium">{etat.nom}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">{etat.codeSYSCOHADA}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatutIcon(etat.statutGeneration)}
                        <Badge className={getStatutBadge(etat.statutGeneration)}>
                          {etat.statutGeneration}
                        </Badge>
                        {etat.conformiteSYSCOHADA && (
                          <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('syscohadaStatements.kpiTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-[var(--color-primary-lightest)] rounded">
                      <p className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.revenue')}</p>
                      <p className="text-lg font-bold text-[var(--color-primary)]">{formatNumber(kpis.chiffreAffaires)}</p>
                    </div>
                    <div className="text-center p-3 bg-[var(--color-success-lightest)] rounded">
                      <p className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.kpiNetResult')}</p>
                      <p className="text-lg font-bold text-[var(--color-success)]">{formatNumber(kpis.resultatNet)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-primary-50 rounded">
                      <p className="text-sm text-[var(--color-text-primary)]">ROE</p>
                      <p className="text-lg font-bold text-primary-600">{ratios.find(r => r.nom.includes('ROE'))?.valeur.toFixed(1) || '0'}%</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded">
                      <p className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.debtRatio')}</p>
                      <p className="text-lg font-bold text-[var(--color-warning)]">{ratios.find(r => r.nom.includes('endettement'))?.valeur.toFixed(0) || '0'}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('syscohadaStatements.balancesEvolution')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: t('syscohadaStatements.fixedAssets'), value: totalImmo, total: totalGenActif, color: '#235A6E' },
                  { label: t('syscohadaStatements.currentAssets'), value: totalCirculant, total: totalGenActif, color: '#15803D' },
                  { label: t('syscohadaStatements.equity'), value: capitauxPropres, total: totalGenPassif, color: '#C77E2C' },
                  { label: t('syscohadaStatements.totalDebt'), value: totalDettes, total: totalGenPassif, color: '#dc2626' },
                ].map((item, idx) => {
                  const pct = item.total > 0 ? Math.round(item.value / item.total * 100) : 0;
                  const circumference = 2 * Math.PI * 40;
                  const dashLen = (pct / 100) * circumference;
                  return (
                    <div key={idx} className="text-center">
                      <h4 className="font-medium mb-2">{item.label}</h4>
                      <div className="relative w-24 h-24 mx-auto">
                        <svg width="96" height="96" viewBox="0 0 96 96">
                          <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                          <circle cx="48" cy="48" r="40" fill="none" stroke={item.color} strokeWidth="8"
                            strokeDasharray={`${dashLen} ${circumference}`}
                            strokeLinecap="round"
                            transform="rotate(-90 48 48)"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold">{pct}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--color-text-primary)] mt-2">{formatCurrency(item.value)}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bilan */}
        <TabsContent value="bilan" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('syscohadaStatements.balanceSheetAt', { date: dateClotureLabel })}</h3>
            <div className="flex gap-2">
              <select
                className="px-4 py-2 border rounded-lg"
                value={periodeComparaison}
                onChange={(e) => setPeriodeComparaison(e.target.value)}
              >
                <option value="N-1">{t('syscohadaStatements.compareN1')}</option>
                <option value="N-2">{t('syscohadaStatements.compareN2')}</option>
                <option value="budget">{t('syscohadaStatements.compareBudget')}</option>
              </select>
              <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t('syscohadaStatements.exportPdf')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ACTIF */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center bg-[var(--color-primary-lightest)] py-2">{t('syscohadaStatements.assets')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-background-secondary)]">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">{t('accounting.label')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('syscohadaStatements.colNote')}</th>
                      <th className="px-3 py-2 text-right font-medium">{exerciceLabel}</th>
                      <th className="px-3 py-2 text-right font-medium">N-1</th>
                      <th className="px-3 py-2 text-right font-medium">{t('syscohadaStatements.colVarPct')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postesActif.map(poste => (
                      <tr
                        key={poste.code}
                        className={`border-t ${
                          poste.total ? 'bg-[var(--color-primary-lightest)] font-bold' :
                          poste.sousTotal ? 'bg-[var(--color-background-secondary)] font-medium' :
                          poste.niveau === 0 ? 'font-medium' : ''
                        }`}
                      >
                        <td className={`px-3 py-2 ${poste.niveau === 1 ? 'pl-6' : ''}`}>
                          {poste.libelle}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-[var(--color-text-secondary)]">
                          {poste.noteBilan}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatNumber(poste.exerciceActuel)}
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--color-text-secondary)]">
                          —
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--color-text-secondary)]">
                          —
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* PASSIF */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center bg-[var(--color-success-lightest)] py-2">{t('syscohadaStatements.liabilities')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-background-secondary)]">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">{t('accounting.label')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('syscohadaStatements.colNote')}</th>
                      <th className="px-3 py-2 text-right font-medium">{exerciceLabel}</th>
                      <th className="px-3 py-2 text-right font-medium">N-1</th>
                      <th className="px-3 py-2 text-right font-medium">{t('syscohadaStatements.colVarPct')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postesPassif.map(poste => (
                      <tr
                        key={poste.code}
                        className={`border-t ${
                          poste.total ? 'bg-[var(--color-success-lightest)] font-bold' :
                          poste.sousTotal ? 'bg-[var(--color-background-secondary)] font-medium' :
                          poste.niveau === 0 ? 'font-medium' : ''
                        }`}
                      >
                        <td className={`px-3 py-2 ${poste.niveau === 1 ? 'pl-6' : ''}`}>
                          {poste.libelle}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-[var(--color-text-secondary)]">
                          {poste.noteBilan}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatNumber(poste.exerciceActuel)}
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--color-text-secondary)]">
                          —
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--color-text-secondary)]">
                          —
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          <Alert className="border-l-4 border-l-blue-500">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('syscohadaStatements.balanceSheetAlertLabel', { year: exerciceLabel })}</strong>{' '}
              {isBalanced ? t('syscohadaStatements.balancedText') : t('syscohadaStatements.unbalancedText')}
              {' '}{t('syscohadaStatements.noPriorYear')}
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Compte de Résultat */}
        <TabsContent value="compte-resultat" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('syscohadaStatements.incomeStatementFor', { year: exerciceLabel })}</h3>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {t('syscohadaStatements.charts')}
              </button>
              <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t('syscohadaStatements.export')}
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t('accounting.label')}</th>
                    <th className="px-4 py-3 text-right font-medium">{t('syscohadaStatements.colNote')}</th>
                    <th className="px-4 py-3 text-right font-medium">{exerciceLabel}</th>
                    <th className="px-4 py-3 text-right font-medium">N-1</th>
                    <th className="px-4 py-3 text-right font-medium">{t('syscohadaStatements.colVariation')}</th>
                    <th className="px-4 py-3 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {postesResultat.map(poste => (
                    <tr
                      key={poste.code}
                      className={`border-t ${
                        poste.total ? 'bg-[var(--color-primary-lightest)] font-bold text-lg' :
                        poste.sousTotal ? 'bg-[var(--color-background-secondary)] font-medium' :
                        poste.niveau === 0 ? 'font-medium' : ''
                      }`}
                    >
                      <td className={`px-4 py-3 ${poste.niveau === 1 ? 'pl-8' : ''}`}>
                        {poste.libelle}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[var(--color-text-secondary)]">
                        {poste.noteCompte}
                      </td>
                      <td className={`px-4 py-3 text-right ${
                        poste.exerciceActuel > 0 ? 'text-black' : 'text-[var(--color-error)]'
                      }`}>
                        {formatNumber(poste.exerciceActuel)}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">
                        —
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">
                        —
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">
                        —
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-sm">{t('syscohadaStatements.sigTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2 bg-[var(--color-primary-lightest)] rounded">
                    <span>{t('syscohadaStatements.grossMargin')}</span>
                    <span className="font-bold">{formatNumber(margeCommerciale)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-primary-50 rounded">
                    <span>{t('syscohadaStatements.valueAdded')}</span>
                    <span className="font-bold">{formatNumber(VA)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-[var(--color-success-lightest)] rounded">
                    <span>EBE</span>
                    <span className="font-bold">{formatNumber(EBE)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-[var(--color-error-lightest)] rounded">
                    <span>{t('syscohadaStatements.operatingResult')}</span>
                    <span className={`font-bold ${resultatExploit < 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}`}>{formatNumber(resultatExploit)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-[var(--color-background-secondary)] rounded">
                    <span>{t('syscohadaStatements.haoResult')}</span>
                    <span className={`font-bold ${resultatHAO < 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}`}>{formatNumber(resultatHAO)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center text-sm">{t('syscohadaStatements.activityRatios')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span>{t('syscohadaStatements.grossMarginRate')}</span>
                    <span className="font-bold">{CA > 0 ? `${(margeCommerciale / CA * 100).toFixed(1)}%` : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('syscohadaStatements.valueAddedRate')}</span>
                    <span className="font-bold">{CA > 0 ? `${(VA / CA * 100).toFixed(1)}%` : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('syscohadaStatements.ebeRate')}</span>
                    <span className="font-bold">{CA > 0 ? `${(EBE / CA * 100).toFixed(1)}%` : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('syscohadaStatements.payrollOverVa')}</span>
                    <span className="font-bold">{VA > 0 ? `${(chargesPersonnel / VA * 100).toFixed(1)}%` : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('syscohadaStatements.netResultRate')}</span>
                    <span className="font-bold">{CA > 0 ? `${(realResultat / CA * 100).toFixed(1)}%` : '—'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center text-sm">{t('syscohadaStatements.annualEvolution')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
                  {t('syscohadaStatements.noPriorYearData')}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Ratios & Analyse */}
        <TabsContent value="ratios" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('syscohadaStatements.financialRatios')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ratios.map((ratio, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{ratio.nom}</h4>
                          <p className="text-sm text-[var(--color-text-primary)]">{ratio.interpretation}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getEvolutionIcon(ratio.evolution)}
                          <Badge className={`${getRatioStatutColor(ratio.statut)} bg-opacity-10`}>
                            {ratio.statut}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div className="text-center">
                          <p className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.currentValue')}</p>
                          <p className={`text-lg font-bold ${getRatioStatutColor(ratio.statut)}`}>
                            {ratio.valeur.toFixed(ratio.unite === '%' ? 1 : 2)}{ratio.unite}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.priorValue')}</p>
                          <p className="text-lg font-bold text-[var(--color-text-primary)]">
                            {ratio.valeurPrecedente.toFixed(ratio.unite === '%' ? 1 : 2)}{ratio.unite}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.threshold')}</p>
                          <p className="text-lg font-bold text-[var(--color-primary)]">
                            {ratio.seuil?.toFixed(ratio.unite === '%' ? 1 : 2)}{ratio.unite}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-[var(--color-text-secondary)]">
                        <strong>{t('syscohadaStatements.formulaLabel')}</strong> {ratio.formuleCalcul}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('syscohadaStatements.sectorAnalysis')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
                  {t('syscohadaStatements.noSectorData')}
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert className="border-l-4 border-l-primary-500">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('syscohadaStatements.ratiosAlertLabel')}</strong>{' '}
              {t('syscohadaStatements.ratiosAlertText', { year: exerciceLabel })}
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* États Annexes */}
        <TabsContent value="etats-annexes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('syscohadaStatements.tafireTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
                  {t('syscohadaStatements.noTafireData')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('syscohadaStatements.cashFlowTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
                  {t('syscohadaStatements.noCashFlowData')}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('syscohadaStatements.notesTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">{t('syscohadaStatements.accountingMethods')}</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Note 1:</strong> {t('syscohadaStatements.note1')}</p>
                    <p><strong>Note 2:</strong> {t('syscohadaStatements.note2')}</p>
                    <p><strong>Note 3:</strong> {t('syscohadaStatements.note3')}</p>
                    <p><strong>Note 4:</strong> {t('syscohadaStatements.note4')}</p>
                    <p><strong>Note 5:</strong> {t('syscohadaStatements.note5')}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">{t('syscohadaStatements.significantEvents')}</h4>
                  <div className="py-4 text-sm text-[var(--color-text-secondary)]">
                    {t('syscohadaStatements.noSignificantEvents')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Obligations */}
        <TabsContent value="obligations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('syscohadaStatements.obligationsCalendar')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documentsReglementaires.map((doc, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{doc.nom}</h4>
                        <p className="text-sm text-[var(--color-text-primary)]">{doc.description}</p>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                          {t('syscohadaStatements.recipientLabel', { name: doc.autoriteDestinataire })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.obligatoire && (
                          <Badge className="bg-[var(--color-error-lighter)] text-red-800">{t('syscohadaStatements.mandatory')}</Badge>
                        )}
                        <Badge className={
                          doc.statut === 'complete' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                          doc.statut === 'en_cours' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                          doc.statut === 'transmis' ? 'bg-primary-100 text-primary-800' :
                          'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                        }>
                          {doc.statut.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.frequency')}</p>
                        <p className="font-medium">{doc.frequence}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.dueDate')}</p>
                        <p className="font-medium">{new Date(doc.dateLimite).toLocaleDateString(dateLocale)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.timeLeft')}</p>
                        <p className={`font-medium ${
                          new Date(doc.dateLimite) < new Date(Date.now() + 30*24*60*60*1000) ?
                          'text-[var(--color-error)]' : 'text-[var(--color-success)]'
                        }`}>
                          {t('syscohadaStatements.daysCount', { count: String(Math.ceil((new Date(doc.dateLimite).getTime() - Date.now()) / (24*60*60*1000))) })}
                        </p>
                      </div>
                    </div>

                    {doc.sanctions && (
                      <div className="mt-3 p-2 bg-[var(--color-error-lightest)] rounded">
                        <p className="text-sm text-red-800">
                          <strong>{t('syscohadaStatements.sanctionsLabel')}</strong> {doc.sanctions}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('syscohadaStatements.closureChecklist')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    t('syscohadaStatements.task1'),
                    t('syscohadaStatements.task2'),
                    t('syscohadaStatements.task3'),
                    t('syscohadaStatements.task4'),
                    t('syscohadaStatements.task5'),
                    t('syscohadaStatements.task6'),
                    t('syscohadaStatements.task7'),
                    t('syscohadaStatements.task8'),
                    t('syscohadaStatements.task9'),
                    t('syscohadaStatements.task10')
                  ].map((tache, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{tache}</span>
                      <span className="text-xs text-[var(--color-text-secondary)]">{t('syscohadaStatements.notFilled')}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary-600" />
                  {t('syscohadaStatements.finalRecommendations')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className={`border-l-4 ${isBalanced ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    {isBalanced ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <AlertDescription>
                      <strong>{t('syscohadaStatements.balanceRecoLabel')}</strong>{' '}
                      {isBalanced
                        ? t('syscohadaStatements.balanceRecoOk', { year: exerciceLabel })
                        : t('syscohadaStatements.balanceRecoKo')}
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-l-4 border-l-blue-500">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{t('syscohadaStatements.dsfDeadlineLabel')}</strong>{' '}
                      {t('syscohadaStatements.dsfDeadlineText', { year: exerciceLabel !== '—' ? String(Number(exerciceLabel) + 1) : 'N+1' })}
                    </AlertDescription>
                  </Alert>

                  <div className="p-3 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2">{t('syscohadaStatements.nextDeadlines')}</h4>
                    {documentsReglementaires.length > 0 ? (
                      <ul className="text-sm space-y-1">
                        {documentsReglementaires.map((doc, i) => (
                          <li key={i}>• {new Date(doc.dateLimite).toLocaleDateString(dateLocale)} : {doc.nom}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[var(--color-text-secondary)]">{t('syscohadaStatements.noDeadline')}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      {/* Generation Modal */}
      {showGenerationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-100 text-primary-600 p-2 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{t('syscohadaStatements.modalTitle')}</h2>
              </div>
              <button
                onClick={() => {
                  setShowGenerationModal(false);
                  resetForm();
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                disabled={isSubmitting}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Info alert */}
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-primary-900 mb-1">{t('syscohadaStatements.modalInfoTitle')}</h4>
                      <p className="text-sm text-primary-800">{t('syscohadaStatements.modalInfoText')}</p>
                    </div>
                  </div>
                </div>

                {/* Statement Selection */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">{t('syscohadaStatements.statementSelection')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="bilan"
                        className="rounded border-[var(--color-border-dark)] text-primary-500"
                        checked={formData.etats_selectionnes.includes('bilan')}
                        onChange={(e) => handleInputChange('etats_selectionnes', 'bilan')}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="bilan" className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.optBalanceSheet')}</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="compte_resultat"
                        className="rounded border-[var(--color-border-dark)] text-primary-500"
                        checked={formData.etats_selectionnes.includes('compte_resultat')}
                        onChange={(e) => handleInputChange('etats_selectionnes', 'compte_resultat')}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="compte_resultat" className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.incomeStatementName')}</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="tafire"
                        className="rounded border-[var(--color-border-dark)] text-primary-500"
                        checked={formData.etats_selectionnes.includes('tafire')}
                        onChange={(e) => handleInputChange('etats_selectionnes', 'tafire')}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="tafire" className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.optTafire')}</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="annexes"
                        className="rounded border-[var(--color-border-dark)] text-primary-500"
                        checked={formData.etats_selectionnes.includes('annexes')}
                        onChange={(e) => handleInputChange('etats_selectionnes', 'annexes')}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="annexes" className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.optNotes')}</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="etats_fiscaux"
                        className="rounded border-[var(--color-border-dark)] text-primary-500"
                        checked={formData.etats_selectionnes.includes('etats_fiscaux')}
                        onChange={(e) => handleInputChange('etats_selectionnes', 'etats_fiscaux')}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="etats_fiscaux" className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.optTaxStatements')}</label>
                    </div>
                      {errors.etats_selectionnes && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.etats_selectionnes}</p>
                      )}
                  </div>
                </div>

                {/* Generation Parameters */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">{t('syscohadaStatements.generationParams')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">{t('syscohadaStatements.period')}</label>
                      <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">{t('syscohadaStatements.selectPeriod')}</option>
                        <option value="mensuelle">{t('syscohadaStatements.periodMonthly')}</option>
                        <option value="trimestrielle">{t('syscohadaStatements.periodQuarterly')}</option>
                        <option value="semestrielle">{t('syscohadaStatements.periodHalfYearly')}</option>
                        <option value="annuelle">{t('syscohadaStatements.periodAnnual')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">{t('syscohadaStatements.fiscalYearLabel')}</label>
                      <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value={exerciceLabel}>{exerciceLabel}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">{t('syscohadaStatements.outputFormat')}</label>
                      <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="pdf">PDF</option>
                        <option value="excel">Excel</option>
                        <option value="xml">XML SYSCOHADA</option>
                        <option value="all">{t('syscohadaStatements.allFormats')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">{t('syscohadaStatements.detailLevel')}</label>
                      <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="synthese">{t('syscohadaStatements.levelSummary')}</option>
                        <option value="detaille">{t('syscohadaStatements.levelDetailed')}</option>
                        <option value="complet">{t('syscohadaStatements.levelFull')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">{t('syscohadaStatements.advancedOptions')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="comparaison" className="rounded border-[var(--color-border-dark)] text-primary-500" />
                      <label htmlFor="comparaison" className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.includeComparison')}</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="signature" className="rounded border-[var(--color-border-dark)] text-primary-500" defaultChecked />
                      <label htmlFor="signature" className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.eSignature')}</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="archivage" className="rounded border-[var(--color-border-dark)] text-primary-500" defaultChecked />
                      <label htmlFor="archivage" className="text-sm text-[var(--color-text-primary)]">{t('syscohadaStatements.autoArchiving')}</label>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">{t('syscohadaStatements.comments')}</label>
                  <textarea className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" rows={3} placeholder={t('syscohadaStatements.commentsPlaceholder')}></textarea>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)] px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowGenerationModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="bg-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--color-border-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('syscohadaStatements.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('syscohadaStatements.generating')}</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>{t('syscohadaStatements.generateStatements')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EtatsSYSCOHADA;