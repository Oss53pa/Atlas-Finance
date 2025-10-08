import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { reportingService, generateRapportSchema } from '../../../services/modules/reporting.service';
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
import { Progress } from '../../../components/ui/progress';

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

interface IndicateurSectoriel {
  nom: string;
  valeurEntreprise: number;
  moyenneSectorielle: number;
  quartileSup: number;
  quartileInf: number;
  position: 'excellent' | 'bon' | 'moyen' | 'faible';
  secteurReference: string;
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
  const { t } = useLanguage();
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

  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: reportingService.generateRapport,
    onSuccess: () => {
      toast.success('Génération des états SYSCOHADA lancée');
      queryClient.invalidateQueries({ queryKey: ['etats-syscohada'] });
      setShowGenerationModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la génération');
    },
  });

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

  const handleInputChange = (field: string, value: any) => {
    if (field === 'etats_selectionnes') {
      const currentArray = Array.isArray(formData.etats_selectionnes) ? formData.etats_selectionnes : [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
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
    try {
      setIsSubmitting(true);
      setErrors({});

      // Validation des états sélectionnés
      if (!formData.etats_selectionnes.length) {
        setErrors({ etats_selectionnes: 'Veuillez sélectionner au moins un état' });
        toast.error('Veuillez sélectionner au moins un état');
        return;
      }

      // Validate with Zod
      const validatedData = generateRapportSchema.parse(formData);

      // Submit to backend
      await generateMutation.mutateAsync(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Map Zod errors to form fields
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        toast.error('Veuillez corriger les erreurs du formulaire');
      } else {
        toast.error('Erreur lors de la génération des états');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Données simulées - États financiers
  const mockEtatsFinanciers: EtatFinancier[] = [
    {
      id: '1',
      nom: 'Bilan SYSCOHADA',
      codeSYSCOHADA: 'BILAN-SYS',
      description: 'État de situation financière conforme au référentiel SYSCOHADA',
      typeEtat: 'bilan',
      obligatoire: true,
      periodicite: 'annuel',
      statutGeneration: 'definitif',
      dateGeneration: '2024-12-20',
      dateValidation: '2024-12-20',
      validateur: 'Expert-Comptable',
      conformiteSYSCOHADA: true,
      controlesCritiques: [
        { nom: 'Équilibre Actif/Passif', statut: 'conforme', message: 'Bilan équilibré' },
        { nom: 'Cohérence temporelle', statut: 'conforme', message: 'Dates cohérentes' },
        { nom: 'Présentation SYSCOHADA', statut: 'conforme', message: 'Format conforme' }
      ]
    },
    {
      id: '2',
      nom: 'Compte de Résultat',
      codeSYSCOHADA: 'CRESULT-SYS',
      description: 'Compte de résultat par nature conforme SYSCOHADA',
      typeEtat: 'compte_resultat',
      obligatoire: true,
      periodicite: 'annuel',
      statutGeneration: 'definitif',
      dateGeneration: '2024-12-20',
      dateValidation: '2024-12-20',
      validateur: 'Expert-Comptable',
      conformiteSYSCOHADA: true,
      controlesCritiques: [
        { nom: 'Cohérence résultat', statut: 'conforme', message: 'Résultat cohérent avec bilan' },
        { nom: 'Classification charges', statut: 'conforme', message: 'Classification correcte' }
      ]
    },
    {
      id: '3',
      nom: 'TAFIRE',
      codeSYSCOHADA: 'TAFIRE-SYS',
      description: 'Tableau Financier des Ressources et Emplois',
      typeEtat: 'tafire',
      obligatoire: true,
      periodicite: 'annuel',
      statutGeneration: 'provisoire',
      dateGeneration: '2024-12-20',
      conformiteSYSCOHADA: true,
      controlesCritiques: [
        { nom: 'Équilibre emplois/ressources', statut: 'conforme', message: 'Équilibré' },
        { nom: 'Cohérence avec bilan', statut: 'attention', message: 'Vérifier variations stock' }
      ]
    }
  ];

  // Données du Bilan
  const mockPostesActif: PosteBilan[] = [
    // ACTIF IMMOBILISE
    { code: 'AD', libelle: 'CHARGES IMMOBILISEES', noteBilan: '3', exerciceActuel: 0, exercicePrecedent: 0, variation: 0, variationPourcentage: 0, niveau: 1 },
    { code: 'AE', libelle: 'IMMOBILISATIONS INCORPORELLES', noteBilan: '4', exerciceActuel: 56666667, exercicePrecedent: 0, variation: 56666667, variationPourcentage: 100, niveau: 1 },
    { code: 'AF', libelle: 'IMMOBILISATIONS CORPORELLES', noteBilan: '5', exerciceActuel: 386500000, exercicePrecedent: 250000000, variation: 136500000, variationPourcentage: 54.6, niveau: 1 },
    { code: 'AG', libelle: 'IMMOBILISATIONS FINANCIERES', noteBilan: '6', exerciceActuel: 0, exercicePrecedent: 0, variation: 0, variationPourcentage: 0, niveau: 1 },
    { code: 'AI', libelle: 'TOTAL ACTIF IMMOBILISE', exerciceActuel: 443166667, exercicePrecedent: 250000000, variation: 193166667, variationPourcentage: 77.3, niveau: 0, total: true },

    // ACTIF CIRCULANT
    { code: 'AJ', libelle: 'ACTIF CIRCULANT HAO', noteBilan: '7', exerciceActuel: 0, exercicePrecedent: 0, variation: 0, variationPourcentage: 0, niveau: 1 },
    { code: 'AK', libelle: 'STOCKS ET ENCOURS', noteBilan: '8', exerciceActuel: 25500000, exercicePrecedent: 22000000, variation: 3500000, variationPourcentage: 15.9, niveau: 1 },
    { code: 'AL', libelle: 'CREANCES ET EMPLOIS ASSIMILES', noteBilan: '9', exerciceActuel: 120000000, exercicePrecedent: 95000000, variation: 25000000, variationPourcentage: 26.3, niveau: 1 },
    { code: 'AN', libelle: 'TRESORERIE-ACTIF', noteBilan: '10', exerciceActuel: 85000000, exercicePrecedent: 62000000, variation: 23000000, variationPourcentage: 37.1, niveau: 1 },
    { code: 'AO', libelle: 'TOTAL ACTIF CIRCULANT', exerciceActuel: 230500000, exercicePrecedent: 179000000, variation: 51500000, variationPourcentage: 28.8, niveau: 0, total: true },

    // TOTAL ACTIF
    { code: 'AQ', libelle: 'ECART DE CONVERSION ACTIF', noteBilan: '11', exerciceActuel: 0, exercicePrecedent: 0, variation: 0, variationPourcentage: 0, niveau: 1 },
    { code: 'AR', libelle: 'TOTAL GENERAL ACTIF', exerciceActuel: 673666667, exercicePrecedent: 429000000, variation: 244666667, variationPourcentage: 57.0, niveau: 0, total: true }
  ];

  const mockPostesPassif: PosteBilan[] = [
    // CAPITAUX PROPRES
    { code: 'CA', libelle: 'CAPITAL', noteBilan: '12', exerciceActuel: 100000000, exercicePrecedent: 100000000, variation: 0, variationPourcentage: 0, niveau: 1 },
    { code: 'CB', libelle: 'PRIMES ET RESERVES', noteBilan: '13', exerciceActuel: 125000000, exercicePrecedent: 89000000, variation: 36000000, variationPourcentage: 40.4, niveau: 1 },
    { code: 'CD', libelle: 'RESULTAT NET', noteBilan: '14', exerciceActuel: 48500000, exercicePrecedent: 36000000, variation: 12500000, variationPourcentage: 34.7, niveau: 1 },
    { code: 'CF', libelle: 'TOTAL CAPITAUX PROPRES', exerciceActuel: 273500000, exercicePrecedent: 225000000, variation: 48500000, variationPourcentage: 21.6, niveau: 0, total: true },

    // DETTES FINANCIERES
    { code: 'CG', libelle: 'SUBVENTIONS D\'INVESTISSEMENT', noteBilan: '15', exerciceActuel: 15000000, exercicePrecedent: 10000000, variation: 5000000, variationPourcentage: 50.0, niveau: 1 },
    { code: 'CH', libelle: 'PROVISIONS REGLEMENTEES', noteBilan: '16', exerciceActuel: 0, exercicePrecedent: 0, variation: 0, variationPourcentage: 0, niveau: 1 },
    { code: 'CI', libelle: 'TOTAL CAPITAUX PROPRES ET RESSOURCES ASSIMILEES', exerciceActuel: 288500000, exercicePrecedent: 235000000, variation: 53500000, variationPourcentage: 22.8, niveau: 0, total: true },

    // DETTES
    { code: 'CJ', libelle: 'PROVISIONS POUR RISQUES ET CHARGES', noteBilan: '17', exerciceActuel: 27500000, exercicePrecedent: 13000000, variation: 14500000, variationPourcentage: 111.5, niveau: 1 },
    { code: 'CK', libelle: 'DETTES FINANCIERES', noteBilan: '18', exerciceActuel: 180000000, exercicePrecedent: 120000000, variation: 60000000, variationPourcentage: 50.0, niveau: 1 },
    { code: 'CL', libelle: 'DETTES CIRCULANTES HAO', noteBilan: '19', exerciceActuel: 0, exercicePrecedent: 0, variation: 0, variationPourcentage: 0, niveau: 1 },
    { code: 'CM', libelle: 'DETTES CIRCULANTES', noteBilan: '20', exerciceActuel: 140166667, exercicePrecedent: 95000000, variation: 45166667, variationPourcentage: 47.5, niveau: 1 },
    { code: 'CN', libelle: 'TRESORERIE-PASSIF', noteBilan: '21', exerciceActuel: 37500000, exercicePrecedent: 26000000, variation: 11500000, variationPourcentage: 44.2, niveau: 1 },
    { code: 'CO', libelle: 'TOTAL DETTES', exerciceActuel: 385166667, exercicePrecedent: 194000000, variation: 191166667, variationPourcentage: 98.5, niveau: 0, total: true },

    // TOTAL PASSIF
    { code: 'CP', libelle: 'ECART DE CONVERSION PASSIF', noteBilan: '22', exerciceActuel: 0, exercicePrecedent: 0, variation: 0, variationPourcentage: 0, niveau: 1 },
    { code: 'CQ', libelle: 'TOTAL GENERAL PASSIF', exerciceActuel: 673666667, exercicePrecedent: 429000000, variation: 244666667, variationPourcentage: 57.0, niveau: 0, total: true }
  ];

  // Données du Compte de Résultat
  const mockPostesResultat: PosteCompteResultat[] = [
    // ACTIVITE D'EXPLOITATION
    { code: 'TA', libelle: 'VENTES DE MARCHANDISES', noteCompte: '23', exerciceActuel: 450000000, exercicePrecedent: 380000000, variation: 70000000, variationPourcentage: 18.4, niveau: 1 },
    { code: 'TB', libelle: 'ACHATS DE MARCHANDISES', noteCompte: '24', exerciceActuel: -270000000, exercicePrecedent: -228000000, variation: -42000000, variationPourcentage: 18.4, niveau: 1 },
    { code: 'TC', libelle: 'VARIATION DE STOCKS', noteCompte: '25', exerciceActuel: -3500000, exercicePrecedent: 2000000, variation: -5500000, variationPourcentage: -275.0, niveau: 1 },
    { code: 'TD', libelle: 'MARGE COMMERCIALE', exerciceActuel: 176500000, exercicePrecedent: 154000000, variation: 22500000, variationPourcentage: 14.6, niveau: 0, sousTotal: true },

    { code: 'TE', libelle: 'PRODUCTION VENDUE', noteCompte: '26', exerciceActuel: 0, exercicePrecedent: 0, variation: 0, variationPourcentage: 0, niveau: 1 },
    { code: 'TF', libelle: 'PRODUCTION STOCKEE', noteCompte: '27', exerciceActuel: 0, exercicePrecedent: 0, variation: 0, variationPourcentage: 0, niveau: 1 },
    { code: 'TG', libelle: 'PRODUCTION IMMOBILISEE', noteCompte: '28', exerciceActuel: 0, exercicePrecedent: 0, variation: 0, variationPourcentage: 0, niveau: 1 },
    { code: 'TH', libelle: 'PRODUCTION DE L\'EXERCICE', exerciceActuel: 0, exercicePrecedent: 0, variation: 0, variationPourcentage: 0, niveau: 0, sousTotal: true },

    { code: 'TI', libelle: 'CHIFFRE D\'AFFAIRES', exerciceActuel: 450000000, exercicePrecedent: 380000000, variation: 70000000, variationPourcentage: 18.4, niveau: 0, sousTotal: true },

    { code: 'TJ', libelle: 'AUTRES ACHATS', noteCompte: '29', exerciceActuel: -45000000, exercicePrecedent: -38000000, variation: -7000000, variationPourcentage: 18.4, niveau: 1 },
    { code: 'TK', libelle: 'TRANSPORTS', noteCompte: '30', exerciceActuel: -8500000, exercicePrecedent: -7200000, variation: -1300000, variationPourcentage: 18.1, niveau: 1 },
    { code: 'TL', libelle: 'SERVICES EXTERIEURS', noteCompte: '31', exerciceActuel: -25000000, exercicePrecedent: -21000000, variation: -4000000, variationPourcentage: 19.0, niveau: 1 },
    { code: 'TM', libelle: 'IMPOTS ET TAXES', noteCompte: '32', exerciceActuel: -5500000, exercicePrecedent: -4800000, variation: -700000, variationPourcentage: 14.6, niveau: 1 },
    { code: 'TN', libelle: 'AUTRES CHARGES', noteCompte: '33', exerciceActuel: -2000000, exercicePrecedent: -1500000, variation: -500000, variationPourcentage: 33.3, niveau: 1 },

    { code: 'TO', libelle: 'VALEUR AJOUTEE', exerciceActuel: 90500000, exercicePrecedent: 81500000, variation: 9000000, variationPourcentage: 11.0, niveau: 0, sousTotal: true },

    { code: 'TP', libelle: 'CHARGES DE PERSONNEL', noteCompte: '34', exerciceActuel: -35000000, exercicePrecedent: -30000000, variation: -5000000, variationPourcentage: 16.7, niveau: 1 },

    { code: 'TQ', libelle: 'EXCEDENT BRUT D\'EXPLOITATION', exerciceActuel: 55500000, exercicePrecedent: 51500000, variation: 4000000, variationPourcentage: 7.8, niveau: 0, sousTotal: true },

    { code: 'TR', libelle: 'DOTATIONS AUX AMORTISSEMENTS', noteCompte: '35', exerciceActuel: -60500000, exercicePrecedent: -45000000, variation: -15500000, variationPourcentage: 34.4, niveau: 1 },
    { code: 'TS', libelle: 'DOTATIONS AUX PROVISIONS', noteCompte: '36', exerciceActuel: -14500000, exercicePrecedent: -8000000, variation: -6500000, variationPourcentage: 81.3, niveau: 1 },

    { code: 'TT', libelle: 'RESULTAT D\'EXPLOITATION', exerciceActuel: -19500000, exercicePrecedent: -1500000, variation: -18000000, variationPourcentage: 1200.0, niveau: 0, sousTotal: true },

    // ACTIVITE FINANCIERE
    { code: 'TU', libelle: 'REVENUS FINANCIERS', noteCompte: '37', exerciceActuel: 4500000, exercicePrecedent: 3500000, variation: 1000000, variationPourcentage: 28.6, niveau: 1 },
    { code: 'TV', libelle: 'CHARGES FINANCIERES', noteCompte: '38', exerciceActuel: -12000000, exercicePrecedent: -8000000, variation: -4000000, variationPourcentage: 50.0, niveau: 1 },

    { code: 'TW', libelle: 'RESULTAT FINANCIER', exerciceActuel: -7500000, exercicePrecedent: -4500000, variation: -3000000, variationPourcentage: 66.7, niveau: 0, sousTotal: true },

    { code: 'TX', libelle: 'RESULTAT DES ACTIVITES ORDINAIRES', exerciceActuel: -27000000, exercicePrecedent: -6000000, variation: -21000000, variationPourcentage: 350.0, niveau: 0, sousTotal: true },

    // HAO
    { code: 'TY', libelle: 'PRODUITS HAO', noteCompte: '39', exerciceActuel: 85000000, exercicePrecedent: 50000000, variation: 35000000, variationPourcentage: 70.0, niveau: 1 },
    { code: 'TZ', libelle: 'CHARGES HAO', noteCompte: '40', exerciceActuel: -2000000, exercicePrecedent: -1500000, variation: -500000, variationPourcentage: 33.3, niveau: 1 },

    { code: 'UA', libelle: 'RESULTAT HAO', exerciceActuel: 83000000, exercicePrecedent: 48500000, variation: 34500000, variationPourcentage: 71.1, niveau: 0, sousTotal: true },

    // RESULTAT NET
    { code: 'UB', libelle: 'PARTICIPATION DES TRAVAILLEURS', noteCompte: '41', exerciceActuel: -2800000, exercicePrecedent: -2100000, variation: -700000, variationPourcentage: 33.3, niveau: 1 },
    { code: 'UC', libelle: 'IMPOTS SUR LE RESULTAT', noteCompte: '42', exerciceActuel: -4700000, exercicePrecedent: -4400000, variation: -300000, variationPourcentage: 6.8, niveau: 1 },

    { code: 'UD', libelle: 'RESULTAT NET DE L\'EXERCICE', exerciceActuel: 48500000, exercicePrecedent: 36000000, variation: 12500000, variationPourcentage: 34.7, niveau: 0, total: true }
  ];

  // Ratios financiers
  const mockRatios: RatioFinancier[] = [
    {
      nom: 'Ratio de liquidité générale',
      valeur: 1.64,
      valeurPrecedente: 1.84,
      unite: '',
      interpretation: 'Capacité à honorer les dettes à court terme',
      seuil: 1.5,
      statut: 'bon',
      evolution: 'deterioration',
      formuleCalcul: 'Actif Circulant / Dettes Circulantes'
    },
    {
      nom: 'Ratio d\'endettement',
      valeur: 0.59,
      valeurPrecedente: 0.45,
      unite: '',
      interpretation: 'Niveau d\'endettement par rapport aux capitaux propres',
      seuil: 0.7,
      statut: 'moyen',
      evolution: 'deterioration',
      formuleCalcul: 'Total Dettes / Capitaux Propres'
    },
    {
      nom: 'Rentabilité économique (ROA)',
      valeur: 7.2,
      valeurPrecedente: 8.4,
      unite: '%',
      interpretation: 'Rentabilité des actifs',
      seuil: 5.0,
      statut: 'bon',
      evolution: 'deterioration',
      formuleCalcul: '(Résultat Net / Total Actif) × 100'
    },
    {
      nom: 'Rentabilité financière (ROE)',
      valeur: 17.7,
      valeurPrecedente: 16.0,
      unite: '%',
      interpretation: 'Rentabilité des capitaux propres',
      seuil: 10.0,
      statut: 'bon',
      evolution: 'amelioration',
      formuleCalcul: '(Résultat Net / Capitaux Propres) × 100'
    },
    {
      nom: 'Rotation des stocks',
      valeur: 10.6,
      valeurPrecedente: 10.4,
      unite: 'fois',
      interpretation: 'Efficacité de gestion des stocks',
      seuil: 8.0,
      statut: 'bon',
      evolution: 'amelioration',
      formuleCalcul: 'Coût d\'achat vendu / Stock moyen'
    }
  ];

  // Indicateurs sectoriels
  const mockIndicateursSectoriels: IndicateurSectoriel[] = [
    {
      nom: 'Marge commerciale',
      valeurEntreprise: 39.2,
      moyenneSectorielle: 35.8,
      quartileSup: 42.1,
      quartileInf: 28.5,
      position: 'bon',
      secteurReference: 'Commerce de gros'
    },
    {
      nom: 'Rotation créances clients',
      valeurEntreprise: 45,
      moyenneSectorielle: 38,
      quartileSup: 30,
      quartileInf: 50,
      position: 'moyen',
      secteurReference: 'Commerce de gros'
    }
  ];

  // Documents réglementaires
  const mockDocumentsReglementaires: DocumentReglementaire[] = [
    {
      nom: 'Déclaration statistique et fiscale (DSF)',
      description: 'Déclaration annuelle obligatoire pour toutes les entreprises',
      obligatoire: true,
      frequence: 'Annuelle',
      dateLimite: '2025-04-30',
      statut: 'en_cours',
      autoriteDestinataire: 'Direction Générale des Impôts',
      sanctions: 'Amende de 50,000 à 500,000 FCFA'
    },
    {
      nom: 'États financiers OHADA',
      description: 'Transmission des états financiers certifiés',
      obligatoire: true,
      frequence: 'Annuelle',
      dateLimite: '2025-06-30',
      statut: 'complete',
      autoriteDestinataire: 'Greffe du Tribunal de Commerce'
    },
    {
      nom: 'Rapport de gestion',
      description: 'Rapport du conseil d\'administration',
      obligatoire: true,
      frequence: 'Annuelle',
      dateLimite: '2025-06-30',
      statut: 'en_cours',
      autoriteDestinataire: 'Assemblée Générale des Actionnaires'
    }
  ];

  // Calculs des KPIs
  const kpis = useMemo(() => {
    const totalActif = mockPostesActif.find(p => p.code === 'AR')?.exerciceActuel || 0;
    const capitauxPropres = mockPostesPassif.find(p => p.code === 'CF')?.exerciceActuel || 0;
    const chiffreAffaires = mockPostesResultat.find(p => p.code === 'TI')?.exerciceActuel || 0;
    const resultatNet = mockPostesResultat.find(p => p.code === 'UD')?.exerciceActuel || 0;

    const etatsGeneres = mockEtatsFinanciers.filter(e => e.statutGeneration !== 'non_commence').length;
    const etatsConformes = mockEtatsFinanciers.filter(e => e.conformiteSYSCOHADA).length;
    const documentsCompletes = mockDocumentsReglementaires.filter(d => d.statut === 'complete').length;

    return {
      totalActif,
      capitauxPropres,
      chiffreAffaires,
      resultatNet,
      etatsGeneres,
      etatsConformes,
      documentsCompletes,
      tauxConformite: (etatsConformes / mockEtatsFinanciers.length) * 100,
      tauxCompletude: (documentsCompletes / mockDocumentsReglementaires.length) * 100
    };
  }, []);

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
    return num.toLocaleString();
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
                <p className="text-2xl font-bold">{(kpis.totalActif / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-primary)] mt-1">+57% vs N-1</p>
              </div>
              <Building className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Résultat Net</p>
                <p className="text-2xl font-bold text-[var(--color-success)]">{(kpis.resultatNet / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-success)] mt-1">+34.7% vs N-1</p>
              </div>
              <TrendingUp className="w-8 h-8 text-[var(--color-success)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">États Générés</p>
                <p className="text-2xl font-bold">{kpis.etatsGeneres}</p>
                <p className="text-xs text-[var(--color-primary)] mt-1">{kpis.etatsConformes} conformes SYSCOHADA</p>
              </div>
              <FileText className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Conformité</p>
                <p className="text-2xl font-bold">{kpis.tauxConformite.toFixed(0)}%</p>
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
            <strong>Conformité SYSCOHADA:</strong> Tous les états financiers respectent le référentiel comptable.
            Format et présentation conformes aux exigences réglementaires.
          </AlertDescription>
        </Alert>

        <Alert className="border-l-4 border-l-blue-500">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Échéances:</strong> DSF à transmettre avant le 30 avril 2025.
            Rapport de gestion en cours de finalisation.
          </AlertDescription>
        </Alert>
      </div>

      {/* Tabs principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="vue-ensemble">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="bilan">Bilan</TabsTrigger>
          <TabsTrigger value="compte-resultat">Compte de Résultat</TabsTrigger>
          <TabsTrigger value="ratios">Ratios & Analyse</TabsTrigger>
          <TabsTrigger value="etats-annexes">États Annexes</TabsTrigger>
          <TabsTrigger value="obligations">Obligations</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="vue-ensemble" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>États Financiers - Statut de Génération</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockEtatsFinanciers.map(etat => (
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
                <CardTitle>Indicateurs Clés de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-[var(--color-primary-lightest)] rounded">
                      <p className="text-sm text-[var(--color-text-primary)]">CA 2024</p>
                      <p className="text-2xl font-bold text-[var(--color-primary)]">450M</p>
                      <p className="text-xs text-[var(--color-success)]">+18.4%</p>
                    </div>
                    <div className="text-center p-3 bg-[var(--color-success-lightest)] rounded">
                      <p className="text-sm text-[var(--color-text-primary)]">Résultat Net</p>
                      <p className="text-2xl font-bold text-[var(--color-success)]">48.5M</p>
                      <p className="text-xs text-[var(--color-success)]">+34.7%</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-purple-50 rounded">
                      <p className="text-sm text-[var(--color-text-primary)]">ROE</p>
                      <p className="text-2xl font-bold text-purple-600">17.7%</p>
                      <p className="text-xs text-[var(--color-success)]">+1.7pt</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded">
                      <p className="text-sm text-[var(--color-text-primary)]">Endettement</p>
                      <p className="text-2xl font-bold text-[var(--color-warning)]">59%</p>
                      <p className="text-xs text-[var(--color-error)]">+14pt</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Évolution des Grands Équilibres</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center">
                  <h4 className="font-medium mb-2">Actif Immobilisé</h4>
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="w-24 h-24 rounded-full border-8 border-[var(--color-primary-light)] border-t-blue-600 border-r-blue-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold">66%</span>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--color-text-primary)] mt-2">443M FCFA</p>
                </div>
                <div className="text-center">
                  <h4 className="font-medium mb-2">Actif Circulant</h4>
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="w-24 h-24 rounded-full border-8 border-[var(--color-success-light)] border-t-green-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold">34%</span>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--color-text-primary)] mt-2">231M FCFA</p>
                </div>
                <div className="text-center">
                  <h4 className="font-medium mb-2">Capitaux Propres</h4>
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="w-24 h-24 rounded-full border-8 border-purple-200 border-t-purple-600 border-r-purple-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold">41%</span>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--color-text-primary)] mt-2">274M FCFA</p>
                </div>
                <div className="text-center">
                  <h4 className="font-medium mb-2">Total Dettes</h4>
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="w-24 h-24 rounded-full border-8 border-[var(--color-error-light)] border-t-red-600 border-r-red-600 border-b-red-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold">59%</span>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--color-text-primary)] mt-2">385M FCFA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bilan */}
        <TabsContent value="bilan" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Bilan SYSCOHADA au 31 décembre 2024</h3>
            <div className="flex gap-2">
              <select
                className="px-4 py-2 border rounded-lg"
                value={periodeComparaison}
                onChange={(e) => setPeriodeComparaison(e.target.value)}
              >
                <option value="N-1">Comparaison N-1</option>
                <option value="N-2">Comparaison N-2</option>
                <option value="budget">Comparaison Budget</option>
              </select>
              <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exporter PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ACTIF */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center bg-[var(--color-primary-lightest)] py-2">ACTIF</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-background-secondary)]">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">{t('accounting.label')}</th>
                      <th className="px-3 py-2 text-right font-medium">Note</th>
                      <th className="px-3 py-2 text-right font-medium">2024</th>
                      <th className="px-3 py-2 text-right font-medium">2023</th>
                      <th className="px-3 py-2 text-right font-medium">Var %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockPostesActif.map(poste => (
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
                        <td className="px-3 py-2 text-right">
                          {formatNumber(poste.exercicePrecedent)}
                        </td>
                        <td className={`px-3 py-2 text-right ${
                          poste.variationPourcentage > 0 ? 'text-[var(--color-success)]' :
                          poste.variationPourcentage < 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-primary)]'
                        }`}>
                          {poste.variationPourcentage !== 0 && (
                            poste.variationPourcentage > 0 ? '+' : ''
                          )}
                          {poste.variationPourcentage.toFixed(1)}%
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
                <CardTitle className="text-center bg-[var(--color-success-lightest)] py-2">PASSIF</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-background-secondary)]">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">{t('accounting.label')}</th>
                      <th className="px-3 py-2 text-right font-medium">Note</th>
                      <th className="px-3 py-2 text-right font-medium">2024</th>
                      <th className="px-3 py-2 text-right font-medium">2023</th>
                      <th className="px-3 py-2 text-right font-medium">Var %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockPostesPassif.map(poste => (
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
                        <td className="px-3 py-2 text-right">
                          {formatNumber(poste.exercicePrecedent)}
                        </td>
                        <td className={`px-3 py-2 text-right ${
                          poste.variationPourcentage > 0 ? 'text-[var(--color-success)]' :
                          poste.variationPourcentage < 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-primary)]'
                        }`}>
                          {poste.variationPourcentage !== 0 && (
                            poste.variationPourcentage > 0 ? '+' : ''
                          )}
                          {poste.variationPourcentage.toFixed(1)}%
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
              <strong>Analyse:</strong> Croissance significative de l'actif (+57%) portée par les investissements
              en immobilisations incorporelles et corporelles. Financement équilibré entre capitaux propres
              et endettement.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Compte de Résultat */}
        <TabsContent value="compte-resultat" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Compte de Résultat - Exercice 2024</h3>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Graphiques
              </button>
              <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exporter
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t('accounting.label')}</th>
                    <th className="px-4 py-3 text-right font-medium">Note</th>
                    <th className="px-4 py-3 text-right font-medium">2024</th>
                    <th className="px-4 py-3 text-right font-medium">2023</th>
                    <th className="px-4 py-3 text-right font-medium">Variation</th>
                    <th className="px-4 py-3 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {mockPostesResultat.map(poste => (
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
                      <td className={`px-4 py-3 text-right ${
                        poste.exercicePrecedent > 0 ? 'text-black' : 'text-[var(--color-error)]'
                      }`}>
                        {formatNumber(poste.exercicePrecedent)}
                      </td>
                      <td className={`px-4 py-3 text-right ${
                        poste.variation > 0 ? 'text-[var(--color-success)]' :
                        poste.variation < 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-primary)]'
                      }`}>
                        {poste.variation !== 0 && (
                          poste.variation > 0 ? '+' : ''
                        )}
                        {formatNumber(poste.variation)}
                      </td>
                      <td className={`px-4 py-3 text-right ${
                        poste.variationPourcentage > 0 ? 'text-[var(--color-success)]' :
                        poste.variationPourcentage < 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-primary)]'
                      }`}>
                        {Math.abs(poste.variationPourcentage) !== Infinity &&
                         !isNaN(poste.variationPourcentage) && (
                          <>
                            {poste.variationPourcentage > 0 ? '+' : ''}
                            {poste.variationPourcentage.toFixed(1)}%
                          </>
                        )}
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
                <CardTitle className="text-center text-sm">Soldes Intermédiaires de Gestion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2 bg-[var(--color-primary-lightest)] rounded">
                    <span>Marge Commerciale</span>
                    <span className="font-bold">176.5M</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                    <span>Valeur Ajoutée</span>
                    <span className="font-bold">90.5M</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-[var(--color-success-lightest)] rounded">
                    <span>EBE</span>
                    <span className="font-bold">55.5M</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-[var(--color-error-lightest)] rounded">
                    <span>Résultat d'Exploitation</span>
                    <span className="font-bold text-[var(--color-error)]">-19.5M</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-[var(--color-background-secondary)] rounded">
                    <span>Résultat HAO</span>
                    <span className="font-bold text-[var(--color-success)]">83.0M</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center text-sm">Ratios d'Activité</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span>Taux de Marge Commerciale</span>
                    <span className="font-bold">39.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Taux de Valeur Ajoutée</span>
                    <span className="font-bold">20.1%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Taux d'EBE</span>
                    <span className="font-bold">12.3%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Charges Personnel/VA</span>
                    <span className="font-bold">38.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Taux de Résultat Net</span>
                    <span className="font-bold text-[var(--color-success)]">10.8%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center text-sm">Évolution Annuelle</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span>Chiffre d'Affaires</span>
                    <span className="font-bold text-[var(--color-success)]">+18.4%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Charges d'Exploitation</span>
                    <span className="font-bold text-[var(--color-error)]">+28.1%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Charges Financières</span>
                    <span className="font-bold text-[var(--color-error)]">+50.0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Produits HAO</span>
                    <span className="font-bold text-[var(--color-success)]">+70.0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Résultat Net</span>
                    <span className="font-bold text-[var(--color-success)]">+34.7%</span>
                  </div>
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
                <CardTitle>Ratios Financiers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockRatios.map((ratio, index) => (
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
                          <p className="text-sm text-[var(--color-text-primary)]">Valeur Actuelle</p>
                          <p className={`text-xl font-bold ${getRatioStatutColor(ratio.statut)}`}>
                            {ratio.valeur.toFixed(ratio.unite === '%' ? 1 : 2)}{ratio.unite}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-[var(--color-text-primary)]">Valeur N-1</p>
                          <p className="text-xl font-bold text-[var(--color-text-primary)]">
                            {ratio.valeurPrecedente.toFixed(ratio.unite === '%' ? 1 : 2)}{ratio.unite}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-[var(--color-text-primary)]">Seuil</p>
                          <p className="text-xl font-bold text-[var(--color-primary)]">
                            {ratio.seuil?.toFixed(ratio.unite === '%' ? 1 : 2)}{ratio.unite}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-[var(--color-text-secondary)]">
                        <strong>Formule:</strong> {ratio.formuleCalcul}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analyse Sectorielle</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockIndicateursSectoriels.map((indicateur, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{indicateur.nom}</h4>
                          <p className="text-sm text-[var(--color-text-primary)]">Secteur: {indicateur.secteurReference}</p>
                        </div>
                        <Badge className={
                          indicateur.position === 'excellent' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                          indicateur.position === 'bon' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                          indicateur.position === 'moyen' ? 'bg-[var(--color-warning-lighter)] text-yellow-800' :
                          'bg-[var(--color-error-lighter)] text-red-800'
                        }>
                          {indicateur.position}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Notre valeur</span>
                          <span className="font-bold">{indicateur.valeurEntreprise}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Moyenne sectorielle</span>
                          <span>{indicateur.moyenneSectorielle}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Quartile supérieur</span>
                          <span className="text-[var(--color-success)]">{indicateur.quartileSup}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Quartile inférieur</span>
                          <span className="text-[var(--color-error)]">{indicateur.quartileInf}</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="relative h-2 bg-[var(--color-border)] rounded">
                          <div
                            className="absolute h-2 bg-[var(--color-primary)] rounded"
                            style={{
                              left: `${Math.max(0, Math.min(100, ((indicateur.valeurEntreprise - indicateur.quartileInf) / (indicateur.quartileSup - indicateur.quartileInf)) * 100))}%`,
                              width: '4px'
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mt-1">
                          <span>Q3</span>
                          <span>Moyenne</span>
                          <span>Q1</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert className="border-l-4 border-l-purple-500">
            <Brain className="h-4 w-4" />
            <AlertDescription>
              <strong>Analyse IA:</strong> Performance financière solide avec une rentabilité supérieure
              à la moyenne sectorielle. Attention à l'évolution du ratio d'endettement qui s'approche
              du seuil d'alerte. Optimiser la gestion du BFR pour améliorer la liquidité.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* États Annexes */}
        <TabsContent value="etats-annexes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>TAFIRE - Tableau de Financement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-[var(--color-primary-lightest)] rounded">
                    <h4 className="font-medium mb-2">I. RESSOURCES DURABLES</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Autofinancement</span>
                        <span className="font-medium">109M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cessions d'immobilisations</span>
                        <span className="font-medium">0M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Augmentation capitaux propres</span>
                        <span className="font-medium">0M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Emprunts nouveaux</span>
                        <span className="font-medium">60M</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1">
                        <span>Total Ressources</span>
                        <span>169M</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[var(--color-error-lightest)] rounded">
                    <h4 className="font-medium mb-2">II. EMPLOIS DURABLES</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Investissements</span>
                        <span className="font-medium">193M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remboursements emprunts</span>
                        <span className="font-medium">0M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dividendes versés</span>
                        <span className="font-medium">0M</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1">
                        <span>Total Emplois</span>
                        <span>193M</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[var(--color-background-secondary)] rounded">
                    <div className="flex justify-between font-bold">
                      <span>Variation du FDR</span>
                      <span className="text-[var(--color-error)]">-24M</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>État des Flux de Trésorerie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-[var(--color-success-lightest)] rounded">
                    <h4 className="font-medium mb-2">Flux de Trésorerie d'Exploitation</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Résultat net</span>
                        <span className="font-medium">48.5M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amortissements</span>
                        <span className="font-medium">60.5M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Provisions</span>
                        <span className="font-medium">14.5M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Variation BFR</span>
                        <span className="font-medium text-[var(--color-error)]">-25M</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1">
                        <span>Flux Exploitation</span>
                        <span className="text-[var(--color-success)]">98.5M</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[var(--color-primary-lightest)] rounded">
                    <h4 className="font-medium mb-2">Flux d'Investissement</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Acquisitions immobilisations</span>
                        <span className="font-medium text-[var(--color-error)]">-193M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cessions d'actifs</span>
                        <span className="font-medium">0M</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1">
                        <span>Flux Investissement</span>
                        <span className="text-[var(--color-error)]">-193M</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 rounded">
                    <h4 className="font-medium mb-2">Flux de Financement</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Nouveaux emprunts</span>
                        <span className="font-medium">60M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remboursements</span>
                        <span className="font-medium">0M</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1">
                        <span>Flux Financement</span>
                        <span className="text-[var(--color-primary)]">60M</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[var(--color-background-hover)] rounded">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Variation Trésorerie</span>
                      <span className="text-[var(--color-error)]">-34.5M</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Notes aux États Financiers - Principales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Méthodes Comptables</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Note 1:</strong> Référentiel SYSCOHADA appliqué intégralement</p>
                    <p><strong>Note 2:</strong> Immobilisations évaluées au coût historique</p>
                    <p><strong>Note 3:</strong> Amortissements linéaires et dégressifs</p>
                    <p><strong>Note 4:</strong> Stocks évalués au coût moyen pondéré</p>
                    <p><strong>Note 5:</strong> Provisions évaluées selon risques identifiés</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Événements Significatifs</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Investissements:</strong> Acquisition ERP WiseBook (85M FCFA)</p>
                    <p><strong>Financement:</strong> Emprunt bancaire SGBCI (60M FCFA)</p>
                    <p><strong>Provisionnement:</strong> Provision litige commercial (8M FCFA)</p>
                    <p><strong>HAO:</strong> Subvention FDFP comptabilisée (15M FCFA)</p>
                    <p><strong>Perspectives:</strong> Croissance CA prévue +20% en 2025</p>
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
              <CardTitle>Calendrier des Obligations Réglementaires</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockDocumentsReglementaires.map((doc, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{doc.nom}</h4>
                        <p className="text-sm text-[var(--color-text-primary)]">{doc.description}</p>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                          Destinataire: {doc.autoriteDestinataire}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.obligatoire && (
                          <Badge className="bg-[var(--color-error-lighter)] text-red-800">Obligatoire</Badge>
                        )}
                        <Badge className={
                          doc.statut === 'complete' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                          doc.statut === 'en_cours' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                          doc.statut === 'transmis' ? 'bg-purple-100 text-purple-800' :
                          'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                        }>
                          {doc.statut.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-[var(--color-text-primary)]">Fréquence</p>
                        <p className="font-medium">{doc.frequence}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--color-text-primary)]">Date limite</p>
                        <p className="font-medium">{new Date(doc.dateLimite).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--color-text-primary)]">Délai restant</p>
                        <p className={`font-medium ${
                          new Date(doc.dateLimite) < new Date(Date.now() + 30*24*60*60*1000) ?
                          'text-[var(--color-error)]' : 'text-[var(--color-success)]'
                        }`}>
                          {Math.ceil((new Date(doc.dateLimite).getTime() - Date.now()) / (24*60*60*1000))} jours
                        </p>
                      </div>
                    </div>

                    {doc.sanctions && (
                      <div className="mt-3 p-2 bg-[var(--color-error-lightest)] rounded">
                        <p className="text-sm text-red-800">
                          <strong>Sanctions:</strong> {doc.sanctions}
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
                <CardTitle>Checklist de Clôture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { tache: 'Inventaire physique des stocks', statut: 'complete' },
                    { tache: 'Rapprochements bancaires', statut: 'complete' },
                    { tache: 'Contrôle des créances clients', statut: 'complete' },
                    { tache: 'Calcul des amortissements', statut: 'complete' },
                    { tache: 'Provisions pour risques', statut: 'complete' },
                    { tache: 'Charges et produits à payer/recevoir', statut: 'complete' },
                    { tache: 'Génération des états SYSCOHADA', statut: 'complete' },
                    { tache: 'Contrôles de cohérence', statut: 'complete' },
                    { tache: 'Validation expert-comptable', statut: 'complete' },
                    { tache: 'Préparation rapport de gestion', statut: 'en_cours' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{item.tache}</span>
                      {item.statut === 'complete' ? (
                        <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                      ) : (
                        <Clock className="w-5 h-5 text-[var(--color-warning)]" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Recommandations Finales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-l-4 border-l-green-500">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Conformité:</strong> Tous les états financiers sont conformes au référentiel
                      SYSCOHADA. Aucune anomalie critique détectée.
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-l-4 border-l-blue-500">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Actions:</strong> Finaliser le rapport de gestion et planifier
                      la transmission de la DSF avant le 30 avril 2025.
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-l-4 border-l-orange-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Vigilance:</strong> Surveiller l'évolution du ratio d'endettement
                      et optimiser la gestion du besoin en fonds de roulement.
                    </AlertDescription>
                  </Alert>

                  <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2">Prochaines Échéances</h4>
                    <ul className="text-sm space-y-1">
                      <li>• 30 janvier: Assemblée générale ordinaire</li>
                      <li>• 30 avril: Transmission DSF</li>
                      <li>• 30 juin: Dépôt états financiers certifiés</li>
                    </ul>
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
                <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Génération États SYSCOHADA</h2>
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
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-emerald-900 mb-1">Génération d&apos;États</h4>
                      <p className="text-sm text-emerald-800">Générez automatiquement les états financiers conformes au référentiel SYSCOHADA.</p>
                    </div>
                  </div>
                </div>

                {/* Statement Selection */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Sélection des États</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="bilan"
                        className="rounded border-[var(--color-border-dark)] text-emerald-500"
                        checked={formData.etats_selectionnes.includes('bilan')}
                        onChange={(e) => handleInputChange('etats_selectionnes', 'bilan')}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="bilan" className="text-sm text-[var(--color-text-primary)]">Bilan (Actif/Passif)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="compte_resultat"
                        className="rounded border-[var(--color-border-dark)] text-emerald-500"
                        checked={formData.etats_selectionnes.includes('compte_resultat')}
                        onChange={(e) => handleInputChange('etats_selectionnes', 'compte_resultat')}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="compte_resultat" className="text-sm text-[var(--color-text-primary)]">Compte de Résultat</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="tafire"
                        className="rounded border-[var(--color-border-dark)] text-emerald-500"
                        checked={formData.etats_selectionnes.includes('tafire')}
                        onChange={(e) => handleInputChange('etats_selectionnes', 'tafire')}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="tafire" className="text-sm text-[var(--color-text-primary)]">TAFIRE (Flux de Trésorerie)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="annexes"
                        className="rounded border-[var(--color-border-dark)] text-emerald-500"
                        checked={formData.etats_selectionnes.includes('annexes')}
                        onChange={(e) => handleInputChange('etats_selectionnes', 'annexes')}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="annexes" className="text-sm text-[var(--color-text-primary)]">Notes Annexes</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="etats_fiscaux"
                        className="rounded border-[var(--color-border-dark)] text-emerald-500"
                        checked={formData.etats_selectionnes.includes('etats_fiscaux')}
                        onChange={(e) => handleInputChange('etats_selectionnes', 'etats_fiscaux')}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="etats_fiscaux" className="text-sm text-[var(--color-text-primary)]">États Fiscaux</label>
                    </div>
                      {errors.etats_selectionnes && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.etats_selectionnes}</p>
                      )}
                  </div>
                </div>

                {/* Generation Parameters */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Paramètres de Génération</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Période</label>
                      <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="">-- Sélectionner période --</option>
                        <option value="mensuelle">Mensuelle</option>
                        <option value="trimestrielle">Trimestrielle</option>
                        <option value="semestrielle">Semestrielle</option>
                        <option value="annuelle">Annuelle</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Exercice</label>
                      <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Format de Sortie</label>
                      <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="pdf">PDF</option>
                        <option value="excel">Excel</option>
                        <option value="xml">XML SYSCOHADA</option>
                        <option value="all">Tous les formats</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Niveau de Détail</label>
                      <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="synthese">Synthèse</option>
                        <option value="detaille">Détaillé</option>
                        <option value="complet">Complet avec notes</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Options Avancées</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="comparaison" className="rounded border-[var(--color-border-dark)] text-emerald-500" />
                      <label htmlFor="comparaison" className="text-sm text-[var(--color-text-primary)]">Inclure comparaison N-1</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="signature" className="rounded border-[var(--color-border-dark)] text-emerald-500" defaultChecked />
                      <label htmlFor="signature" className="text-sm text-[var(--color-text-primary)]">Signature électronique</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="archivage" className="rounded border-[var(--color-border-dark)] text-emerald-500" defaultChecked />
                      <label htmlFor="archivage" className="text-sm text-[var(--color-text-primary)]">Archivage automatique</label>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Commentaires</label>
                  <textarea className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={3} placeholder="Notes sur la génération d'états..."></textarea>
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
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Génération...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Générer les États</span>
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