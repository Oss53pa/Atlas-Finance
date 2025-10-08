import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { motion } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Brain,
  Zap,
  Activity,
  BarChart3,
  Calculator,
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  RefreshCw,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  Settings,
  BookOpen,
  Award,
  Scale,
  Users,
  DollarSign,
  Building,
  Archive,
  CreditCard,
  Truck,
  Factory,
  PieChart,
  BarChart,
  LineChart,
  Info,
  HelpCircle,
  Lightbulb,
  Flag,
  CheckSquare,
  AlertOctagon,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/progress';
import { closuresService, executeControleSchema } from '../../../services/modules/closures.service';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { LoadingSpinner, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui';

interface ControleCoherence {
  id: string;
  nom: string;
  description: string;
  categorie: 'balance' | 'flux' | 'coherence_temporelle' | 'conformite_syscohada' | 'validation_croisee';
  priorite: 'critique' | 'elevee' | 'moyenne' | 'faible';
  statut: 'conforme' | 'non_conforme' | 'attention' | 'en_attente';
  valeurAttendue?: number;
  valeurReelle?: number;
  ecart?: number;
  ecartPourcentage?: number;
  tolerance?: number;
  dateExecution: string;
  tempsExecution: number;
  messageResultat: string;
  recommandations: string[];
  reglesMetier: string[];
  comptesConcernes?: string[];
  modulesConcernes: string[];
  automatique: boolean;
  utilisateurExecution: string;
}

interface RapportAnomalies {
  id: string;
  typeAnomalie: 'ecart_balance' | 'solde_negatif' | 'incoherence_temporelle' | 'violation_regle' | 'donnee_manquante';
  severite: 'critique' | 'majeure' | 'mineure' | 'information';
  module: string;
  description: string;
  valeurDetectee: string;
  valeurAttendue?: string;
  compteImpacte?: string;
  montantImpact?: number;
  dateDetection: string;
  statut: 'nouveau' | 'en_cours' | 'resolu' | 'ignore';
  actionsCorrectives: string[];
  responsableCorrection?: string;
  dateResolution?: string;
  commentaires?: string;
}

interface IndicateurPerformance {
  nom: string;
  valeur: number;
  objectif: number;
  unite: string;
  tendance: 'hausse' | 'baisse' | 'stable';
  categorie: 'financier' | 'operationnel' | 'qualite';
  description: string;
  formuleCalcul: string;
}

interface ValidationCroisee {
  id: string;
  nom: string;
  module1: string;
  module2: string;
  typeValidation: 'equilibre_comptable' | 'coherence_montants' | 'concordance_dates' | 'existence_contrepartie';
  description: string;
  resultats: {
    conforme: boolean;
    details: string;
    ecartDetecte?: number;
    recommandation?: string;
  };
  derniereMiseAJour: string;
}

interface RegleMetier {
  id: string;
  nom: string;
  description: string;
  domaine: string;
  typeRegle: 'validation' | 'calcul' | 'contrainte' | 'format';
  expression: string;
  messageErreur: string;
  actif: boolean;
  dateCreation: string;
  derniereMiseAJour: string;
}

const ControlesCoherence: React.FC = () => {
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState('vue-ensemble');
  const [filterCategorie, setFilterCategorie] = useState<string>('toutes');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [formData, setFormData] = useState({
    controle_ids: [] as string[],
    arret_sur_erreur: false,
    generer_rapport: true,
    periode_reference: new Date().toISOString().substring(0, 7), // Format YYYY-MM
    responsable: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  const executeMutation = useMutation({
    mutationFn: closuresService.executeControles,
    onSuccess: () => {
      toast.success('Exécution des contrôles lancée avec succès');
      queryClient.invalidateQueries({ queryKey: ['controles-execution'] });
      setShowExecutionModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'exécution des contrôles');
    },
  });

  const resetForm = () => {
    setFormData({
      controle_ids: [],
      arret_sur_erreur: false,
      generer_rapport: true,
      periode_reference: new Date().toISOString().substring(0, 7),
      responsable: '',
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleControleToggle = (controleId: string) => {
    const updatedIds = formData.controle_ids.includes(controleId)
      ? formData.controle_ids.filter(id => id !== controleId)
      : [...formData.controle_ids, controleId];
    handleInputChange('controle_ids', updatedIds);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrors({});

      const validatedData = executeControleSchema.parse(formData);
      await executeMutation.mutateAsync(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        toast.error('Veuillez corriger les erreurs du formulaire');
      } else {
        toast.error('Erreur lors de la création');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Données simulées
  const mockControles: ControleCoherence[] = [
    {
      id: '1',
      nom: 'Équilibre Balance Générale',
      description: 'Vérification que le total des débits égale le total des crédits',
      categorie: 'balance',
      priorite: 'critique',
      statut: 'conforme',
      valeurAttendue: 0,
      valeurReelle: 0,
      ecart: 0,
      ecartPourcentage: 0,
      tolerance: 1000,
      dateExecution: '2024-12-20T10:30:00',
      tempsExecution: 2.5,
      messageResultat: 'Balance parfaitement équilibrée',
      recommandations: [],
      reglesMetier: ['Total Débits = Total Crédits', 'Écart toléré < 1000 FCFA'],
      comptesConcernes: ['TOUS'],
      modulesConcernes: ['Comptabilité Générale'],
      automatique: true,
      utilisateurExecution: 'Système'
    },
    {
      id: '2',
      nom: 'Cohérence Stocks - Comptabilité',
      description: 'Validation entre valeur stock physique et comptable',
      categorie: 'validation_croisee',
      priorite: 'elevee',
      statut: 'attention',
      valeurAttendue: 25500000,
      valeurReelle: 25450000,
      ecart: -50000,
      ecartPourcentage: -0.2,
      tolerance: 100000,
      dateExecution: '2024-12-20T11:15:00',
      tempsExecution: 5.8,
      messageResultat: 'Écart mineur détecté entre stock physique et comptable',
      recommandations: [
        'Vérifier les derniers mouvements de stock',
        'Contrôler les évaluations en cours'
      ],
      reglesMetier: ['Écart < 0.5% acceptable', 'Justification requise pour écarts > 100K'],
      comptesConcernes: ['31', '37'],
      modulesConcernes: ['Gestion Stocks', 'Comptabilité'],
      automatique: true,
      utilisateurExecution: 'Système'
    },
    {
      id: '3',
      nom: 'Validation Créances - Encaissements',
      description: 'Cohérence entre soldes clients et encaissements',
      categorie: 'validation_croisee',
      priorite: 'elevee',
      statut: 'conforme',
      valeurAttendue: 120000000,
      valeurReelle: 120000000,
      ecart: 0,
      ecartPourcentage: 0,
      tolerance: 50000,
      dateExecution: '2024-12-20T09:45:00',
      tempsExecution: 3.2,
      messageResultat: 'Parfaite cohérence entre créances et encaissements',
      recommandations: [],
      reglesMetier: ['Solde client = Factures - Encaissements', 'Lettrage obligatoire'],
      comptesConcernes: ['411', '512'],
      modulesConcernes: ['Cycle Clients', 'Trésorerie'],
      automatique: true,
      utilisateurExecution: 'Système'
    },
    {
      id: '4',
      nom: 'Contrôle Amortissements SYSCOHADA',
      description: 'Vérification conformité calculs amortissements',
      categorie: 'conformite_syscohada',
      priorite: 'elevee',
      statut: 'conforme',
      valeurAttendue: 60500000,
      valeurReelle: 60500000,
      ecart: 0,
      ecartPourcentage: 0,
      tolerance: 10000,
      dateExecution: '2024-12-20T14:20:00',
      tempsExecution: 8.5,
      messageResultat: 'Tous les amortissements conformes aux règles SYSCOHADA',
      recommandations: [],
      reglesMetier: [
        'Méthodes autorisées: linéaire, dégressive, unité d\'œuvre',
        'Durées conformes aux minima/maxima',
        'Calculs mathématiquement corrects'
      ],
      comptesConcernes: ['2', '681'],
      modulesConcernes: ['Immobilisations'],
      automatique: true,
      utilisateurExecution: 'Système'
    },
    {
      id: '5',
      nom: 'Cohérence Temporelle Écritures',
      description: 'Vérification chronologie et dates cohérentes',
      categorie: 'coherence_temporelle',
      priorite: 'moyenne',
      statut: 'non_conforme',
      dateExecution: '2024-12-20T13:10:00',
      tempsExecution: 1.8,
      messageResultat: '3 écritures avec dates incohérentes détectées',
      recommandations: [
        'Corriger les dates d\'écriture postérieures aux dates de pièce',
        'Vérifier les paramètres de saisie automatique'
      ],
      reglesMetier: [
        'Date écriture >= Date pièce',
        'Date écriture <= Date du jour',
        'Exercice comptable cohérent'
      ],
      modulesConcernes: ['Saisie Comptable'],
      automatique: true,
      utilisateurExecution: 'Système'
    }
  ];

  const mockAnomalies: RapportAnomalies[] = [
    {
      id: '1',
      typeAnomalie: 'ecart_balance',
      severite: 'mineure',
      module: 'Gestion Stocks',
      description: 'Écart de valorisation entre stock physique et comptable',
      valeurDetectee: '25,450,000 FCFA',
      valeurAttendue: '25,500,000 FCFA',
      compteImpacte: '31000',
      montantImpact: 50000,
      dateDetection: '2024-12-20T11:15:00',
      statut: 'nouveau',
      actionsCorrectives: [
        'Vérifier les derniers mouvements de stock du jour',
        'Contrôler les méthodes de valorisation appliquées'
      ]
    },
    {
      id: '2',
      typeAnomalie: 'incoherence_temporelle',
      severite: 'majeure',
      module: 'Saisie Comptable',
      description: 'Écritures saisies avec date antérieure à la date de pièce',
      valeurDetectee: '3 écritures concernées',
      dateDetection: '2024-12-20T13:10:00',
      statut: 'en_cours',
      actionsCorrectives: [
        'Corriger les dates des écritures concernées',
        'Réviser les paramètres de contrôle de saisie'
      ],
      responsableCorrection: 'Marie KOUAME'
    },
    {
      id: '3',
      typeAnomalie: 'violation_regle',
      severite: 'critique',
      module: 'Provisions',
      description: 'Provision créée sans justification documentée',
      valeurDetectee: 'PROV-2024-004',
      montantImpact: 2500000,
      dateDetection: '2024-12-19T16:30:00',
      statut: 'resolu',
      actionsCorrectives: [
        'Compléter la documentation de la provision',
        'Valider par le responsable juridique'
      ],
      responsableCorrection: 'Paul KONE',
      dateResolution: '2024-12-20T09:00:00',
      commentaires: 'Documentation complétée et validée'
    }
  ];

  const mockIndicateurs: IndicateurPerformance[] = [
    {
      nom: 'Taux de Conformité Contrôles',
      valeur: 87.5,
      objectif: 95,
      unite: '%',
      tendance: 'hausse',
      categorie: 'qualite',
      description: 'Pourcentage de contrôles conformes sur le total des contrôles exécutés',
      formuleCalcul: '(Contrôles Conformes / Total Contrôles) × 100'
    },
    {
      nom: 'Temps Moyen Exécution',
      valeur: 4.2,
      objectif: 3.0,
      unite: 'sec',
      tendance: 'baisse',
      categorie: 'operationnel',
      description: 'Temps moyen d\'exécution des contrôles automatiques',
      formuleCalcul: 'Moyenne(Temps Exécution Contrôles)'
    },
    {
      nom: 'Anomalies Critiques',
      valeur: 1,
      objectif: 0,
      unite: 'nb',
      tendance: 'baisse',
      categorie: 'qualite',
      description: 'Nombre d\'anomalies de sévérité critique non résolues',
      formuleCalcul: 'Count(Anomalies WHERE Sévérité = Critique AND Statut ≠ Résolu)'
    }
  ];

  const mockValidationsCroisees: ValidationCroisee[] = [
    {
      id: '1',
      nom: 'Équilibre Clients-Encaissements',
      module1: 'Cycle Clients',
      module2: 'Trésorerie',
      typeValidation: 'coherence_montants',
      description: 'Validation entre total factures clients et encaissements comptabilisés',
      resultats: {
        conforme: true,
        details: 'Parfaite cohérence entre les deux modules',
        recommandation: 'Maintenir la fréquence de contrôle actuelle'
      },
      derniereMiseAJour: '2024-12-20T09:45:00'
    },
    {
      id: '2',
      nom: 'Stocks Physique-Comptable',
      module1: 'Gestion Stocks',
      module2: 'Comptabilité',
      typeValidation: 'equilibre_comptable',
      description: 'Comparaison valeur stock physique vs valorisation comptable',
      resultats: {
        conforme: false,
        details: 'Écart mineur de 50,000 FCFA détecté',
        ecartDetecte: 50000,
        recommandation: 'Analyser les derniers mouvements et ajuster si nécessaire'
      },
      derniereMiseAJour: '2024-12-20T11:15:00'
    }
  ];

  const mockReglesMetier: RegleMetier[] = [
    {
      id: '1',
      nom: 'Équilibre Balance',
      description: 'Le total des débits doit égaler le total des crédits',
      domaine: 'Comptabilité Générale',
      typeRegle: 'validation',
      expression: 'SUM(Débits) = SUM(Crédits)',
      messageErreur: 'Balance déséquilibrée: écart de {ecart} FCFA',
      actif: true,
      dateCreation: '2024-01-01',
      derniereMiseAJour: '2024-06-15'
    },
    {
      id: '2',
      nom: 'Cohérence Dates',
      description: 'Date d\'écriture postérieure ou égale à date de pièce',
      domaine: 'Saisie Comptable',
      typeRegle: 'contrainte',
      expression: 'DateEcriture >= DatePiece',
      messageErreur: 'Date d\'écriture antérieure à la date de pièce',
      actif: true,
      dateCreation: '2024-01-01',
      derniereMiseAJour: '2024-12-01'
    }
  ];

  // Calculs des KPIs
  const kpis = useMemo(() => {
    const totalControles = mockControles.length;
    const controlesConformes = mockControles.filter(c => c.statut === 'conforme').length;
    const controlesNonConformes = mockControles.filter(c => c.statut === 'non_conforme').length;
    const controlesAttention = mockControles.filter(c => c.statut === 'attention').length;
    const tauxConformite = (controlesConformes / totalControles) * 100;

    const anomaliesNonResolues = mockAnomalies.filter(a => a.statut !== 'resolu').length;
    const anomaliesCritiques = mockAnomalies.filter(a => a.severite === 'critique' && a.statut !== 'resolu').length;

    const tempsExecutionMoyen = mockControles.reduce((sum, c) => sum + c.tempsExecution, 0) / mockControles.length;

    return {
      totalControles,
      controlesConformes,
      controlesNonConformes,
      controlesAttention,
      tauxConformite,
      anomaliesNonResolues,
      anomaliesCritiques,
      tempsExecutionMoyen
    };
  }, []);

  // Filtrage des contrôles
  const controlesFiltres = useMemo(() => {
    return mockControles.filter(controle => {
      const matchCategorie = filterCategorie === 'toutes' || controle.categorie === filterCategorie;
      const matchStatut = filterStatut === 'tous' || controle.statut === filterStatut;
      const matchSearch = searchTerm === '' ||
        controle.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        controle.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategorie && matchStatut && matchSearch;
    });
  }, [filterCategorie, filterStatut, searchTerm]);

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'conforme': return <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />;
      case 'non_conforme': return <XCircle className="w-5 h-5 text-[var(--color-error)]" />;
      case 'attention': return <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />;
      case 'en_attente': return <Clock className="w-5 h-5 text-[var(--color-text-primary)]" />;
      default: return <AlertCircle className="w-5 h-5 text-[var(--color-text-primary)]" />;
    }
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, string> = {
      'conforme': 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
      'non_conforme': 'bg-[var(--color-error-lighter)] text-red-800',
      'attention': 'bg-[var(--color-warning-lighter)] text-yellow-800',
      'en_attente': 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
    };
    return variants[statut] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
  };

  const getPrioriteIcon = (priorite: string) => {
    switch (priorite) {
      case 'critique': return <AlertOctagon className="w-4 h-4 text-[var(--color-error)]" />;
      case 'elevee': return <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />;
      case 'moyenne': return <AlertCircle className="w-4 h-4 text-[var(--color-warning)]" />;
      case 'faible': return <Info className="w-4 h-4 text-[var(--color-primary)]" />;
      default: return <Info className="w-4 h-4 text-[var(--color-text-primary)]" />;
    }
  };

  const getSeveriteIcon = (severite: string) => {
    switch (severite) {
      case 'critique': return <AlertOctagon className="w-4 h-4 text-[var(--color-error)]" />;
      case 'majeure': return <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />;
      case 'mineure': return <AlertCircle className="w-4 h-4 text-[var(--color-warning)]" />;
      case 'information': return <Info className="w-4 h-4 text-[var(--color-primary)]" />;
      default: return <Info className="w-4 h-4 text-[var(--color-text-primary)]" />;
    }
  };

  const getCategorieIcon = (categorie: string) => {
    switch (categorie) {
      case 'balance': return <Scale className="w-5 h-5 text-[var(--color-primary)]" />;
      case 'flux': return <Activity className="w-5 h-5 text-[var(--color-success)]" />;
      case 'coherence_temporelle': return <Clock className="w-5 h-5 text-purple-600" />;
      case 'conformite_syscohada': return <BookOpen className="w-5 h-5 text-[var(--color-error)]" />;
      case 'validation_croisee': return <CheckSquare className="w-5 h-5 text-[var(--color-warning)]" />;
      default: return <Shield className="w-5 h-5 text-[var(--color-text-primary)]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Taux de Conformité</p>
                <p className="text-2xl font-bold text-[var(--color-success)]">{kpis.tauxConformite.toFixed(1)}%</p>
                <Progress value={kpis.tauxConformite} className="mt-2" />
              </div>
              <CheckCircle className="w-8 h-8 text-[var(--color-success)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Contrôles Exécutés</p>
                <p className="text-2xl font-bold">{kpis.totalControles}</p>
                <p className="text-xs text-[var(--color-primary)] mt-1">{kpis.controlesConformes} conformes</p>
              </div>
              <Shield className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Anomalies Ouvertes</p>
                <p className="text-2xl font-bold text-[var(--color-error)]">{kpis.anomaliesNonResolues}</p>
                <p className="text-xs text-[var(--color-error)] mt-1">{kpis.anomaliesCritiques} critiques</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-[var(--color-error)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Temps Moyen</p>
                <p className="text-2xl font-bold">{kpis.tempsExecutionMoyen.toFixed(1)}s</p>
                <p className="text-xs text-[var(--color-success)] mt-1">Performance optimale</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes et Recommandations */}
      <div className="space-y-4">
        {kpis.anomaliesCritiques > 0 && (
          <Alert className="border-l-4 border-l-red-500">
            <AlertOctagon className="h-4 w-4" />
            <AlertDescription>
              <strong>Attention:</strong> {kpis.anomaliesCritiques} anomalie(s) critique(s) détectée(s).
              Traitement prioritaire requis.
            </AlertDescription>
          </Alert>
        )}

        {kpis.tauxConformite >= 95 ? (
          <Alert className="border-l-4 border-l-green-500">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Excellent:</strong> Taux de conformité optimal atteint ({kpis.tauxConformite.toFixed(1)}%).
              Tous les contrôles critiques sont conformes.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-l-4 border-l-orange-500">
            <Brain className="h-4 w-4" />
            <AlertDescription>
              <strong>Recommandation IA:</strong> Analyser les {kpis.controlesNonConformes} contrôles non conformes.
              Objectif: atteindre 95% de conformité.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Tabs principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="vue-ensemble">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="controles">Contrôles</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="validations-croisees">Validations Croisées</TabsTrigger>
          <TabsTrigger value="regles-metier">Règles Métier</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="vue-ensemble" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Statut des Contrôles par Catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['balance', 'validation_croisee', 'conformite_syscohada', 'coherence_temporelle'].map(categorie => {
                    const controlesCategorie = mockControles.filter(c => c.categorie === categorie);
                    const conformes = controlesCategorie.filter(c => c.statut === 'conforme').length;
                    const total = controlesCategorie.length;
                    const pourcentage = total > 0 ? (conformes / total) * 100 : 0;

                    return (
                      <div key={categorie} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded">
                        <div className="flex items-center gap-3">
                          {getCategorieIcon(categorie)}
                          <div>
                            <p className="font-medium capitalize">{categorie.replace('_', ' ')}</p>
                            <p className="text-sm text-[var(--color-text-primary)]">{total} contrôle(s)</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32">
                            <Progress value={pourcentage} className="h-2" />
                          </div>
                          <span className="font-medium text-sm">{pourcentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition des Anomalies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['critique', 'majeure', 'mineure', 'information'].map(severite => {
                    const anomaliesSeverite = mockAnomalies.filter(a => a.severite === severite);
                    const ouvertes = anomaliesSeverite.filter(a => a.statut !== 'resolu').length;
                    const total = anomaliesSeverite.length;

                    return (
                      <div key={severite} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          {getSeveriteIcon(severite)}
                          <div>
                            <p className="font-medium capitalize">{severite}</p>
                            <p className="text-sm text-[var(--color-text-primary)]">{total} anomalie(s)</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{ouvertes}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">ouvertes</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Évolution des Indicateurs de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                {mockIndicateurs.map((indicateur, index) => (
                  <div key={index} className="text-center p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{indicateur.nom}</h4>
                      {indicateur.tendance === 'hausse' ? (
                        <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />
                      ) : indicateur.tendance === 'baisse' ? (
                        <TrendingDown className="w-4 h-4 text-[var(--color-error)]" />
                      ) : (
                        <Activity className="w-4 h-4 text-[var(--color-primary)]" />
                      )}
                    </div>
                    <p className="text-2xl font-bold mb-1">
                      {indicateur.valeur} {indicateur.unite}
                    </p>
                    <p className="text-sm text-[var(--color-text-primary)] mb-2">
                      Objectif: {indicateur.objectif} {indicateur.unite}
                    </p>
                    <Progress
                      value={(indicateur.valeur / indicateur.objectif) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contrôles */}
        <TabsContent value="controles" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  placeholder="Rechercher un contrôle..."
                  className="pl-10 pr-4 py-2 border rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border rounded-lg"
                value={filterCategorie}
                onChange={(e) => setFilterCategorie(e.target.value)}
              >
                <option value="toutes">Toutes catégories</option>
                <option value="balance">Équilibre Balance</option>
                <option value="validation_croisee">Validation Croisée</option>
                <option value="conformite_syscohada">Conformité SYSCOHADA</option>
                <option value="coherence_temporelle">Cohérence Temporelle</option>
              </select>
              <select
                className="px-4 py-2 border rounded-lg"
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
              >
                <option value="tous">Tous statuts</option>
                <option value="conforme">Conforme</option>
                <option value="non_conforme">Non conforme</option>
                <option value="attention">Attention</option>
                <option value="en_attente">{t('status.pending')}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2"
                onClick={() => setShowExecutionModal(true)}
              >
                <RefreshCw className="w-4 h-4" />
                Exécuter Tous
              </button>
              <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center gap-2">
                <Download className="w-4 h-4" />
                Rapport
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Contrôle</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Catégorie</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Priorité</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Statut</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Écart</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Temps</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {controlesFiltres.map(controle => (
                    <tr key={controle.id} className="border-t hover:bg-[var(--color-background-secondary)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getCategorieIcon(controle.categorie)}
                          <div>
                            <p className="font-medium">{controle.nom}</p>
                            <p className="text-sm text-[var(--color-text-secondary)]">{controle.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] capitalize">
                          {controle.categorie.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getPrioriteIcon(controle.priorite)}
                          <span className="text-sm capitalize">{controle.priorite}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatutIcon(controle.statut)}
                          <Badge className={getStatutBadge(controle.statut)}>
                            {controle.statut.replace('_', ' ')}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {controle.ecart !== undefined ? (
                          <span className={controle.ecart === 0 ? 'text-[var(--color-success)] font-medium' :
                                         Math.abs(controle.ecart) <= (controle.tolerance || 0) ? 'text-[var(--color-warning)]' : 'text-[var(--color-error)] font-medium'}>
                            {controle.ecart.toLocaleString()} FCFA
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-secondary)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm">{controle.tempsExecution}s</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button className="p-1 hover:bg-[var(--color-background-hover)] rounded" aria-label="Voir les détails">
                            <Eye className="w-4 h-4 text-[var(--color-text-primary)]" />
                          </button>
                          <button className="p-1 hover:bg-[var(--color-background-hover)] rounded" aria-label="Actualiser">
                            <RefreshCw className="w-4 h-4 text-[var(--color-primary)]" />
                          </button>
                          <button className="p-1 hover:bg-[var(--color-background-hover)] rounded" aria-label="Paramètres">
                            <Settings className="w-4 h-4 text-[var(--color-text-primary)]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anomalies */}
        <TabsContent value="anomalies" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Critiques</p>
                    <p className="text-2xl font-bold text-[var(--color-error)]">{mockAnomalies.filter(a => a.severite === 'critique' && a.statut !== 'resolu').length}</p>
                  </div>
                  <AlertOctagon className="w-6 h-6 text-[var(--color-error)]" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Majeures</p>
                    <p className="text-2xl font-bold text-[var(--color-warning)]">{mockAnomalies.filter(a => a.severite === 'majeure' && a.statut !== 'resolu').length}</p>
                  </div>
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Mineures</p>
                    <p className="text-2xl font-bold text-[var(--color-warning)]">{mockAnomalies.filter(a => a.severite === 'mineure' && a.statut !== 'resolu').length}</p>
                  </div>
                  <AlertCircle className="w-6 h-6 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Résolues</p>
                    <p className="text-2xl font-bold text-[var(--color-success)]">{mockAnomalies.filter(a => a.statut === 'resolu').length}</p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-[var(--color-success)]" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Liste des Anomalies</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Anomalie</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Sévérité</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Module</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Impact</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Statut</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Responsable</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockAnomalies.map(anomalie => (
                    <tr key={anomalie.id} className="border-t hover:bg-[var(--color-background-secondary)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getSeveriteIcon(anomalie.severite)}
                          <div>
                            <p className="font-medium">{anomalie.description}</p>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              Détectée le {new Date(anomalie.dateDetection).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={
                          anomalie.severite === 'critique' ? 'bg-[var(--color-error-lighter)] text-red-800' :
                          anomalie.severite === 'majeure' ? 'bg-[var(--color-warning-lighter)] text-orange-800' :
                          anomalie.severite === 'mineure' ? 'bg-[var(--color-warning-lighter)] text-yellow-800' :
                          'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]'
                        }>
                          {anomalie.severite}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{anomalie.module}</td>
                      <td className="px-4 py-3 text-right">
                        {anomalie.montantImpact ? (
                          <span className="font-medium">
                            {(anomalie.montantImpact / 1000000).toFixed(1)}M FCFA
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-secondary)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={
                          anomalie.statut === 'resolu' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                          anomalie.statut === 'en_cours' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                          anomalie.statut === 'ignore' ? 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]' :
                          'bg-[var(--color-warning-lighter)] text-yellow-800'
                        }>
                          {anomalie.statut}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {anomalie.responsableCorrection || <span className="text-[var(--color-text-secondary)]">Non assigné</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button className="p-1 hover:bg-[var(--color-background-hover)] rounded" aria-label="Voir les détails">
                            <Eye className="w-4 h-4 text-[var(--color-text-primary)]" />
                          </button>
                          <button className="p-1 hover:bg-[var(--color-background-hover)] rounded">
                            <Edit className="w-4 h-4 text-[var(--color-primary)]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validations Croisées */}
        <TabsContent value="validations-croisees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validations Inter-Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockValidationsCroisees.map(validation => (
                  <div key={validation.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-lg">{validation.nom}</h4>
                        <p className="text-[var(--color-text-primary)]">{validation.description}</p>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                          {validation.module1} ↔ {validation.module2}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {validation.resultats.conforme ? (
                          <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                        ) : (
                          <XCircle className="w-5 h-5 text-[var(--color-error)]" />
                        )}
                        <Badge className={validation.resultats.conforme ?
                          'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' : 'bg-[var(--color-error-lighter)] text-red-800'}>
                          {validation.resultats.conforme ? 'Conforme' : 'Non conforme'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium mb-2">Résultats</h5>
                        <p className="text-sm text-[var(--color-text-primary)]">{validation.resultats.details}</p>
                        {validation.resultats.ecartDetecte && (
                          <p className="text-sm mt-1">
                            <span className="font-medium">Écart:</span> {validation.resultats.ecartDetecte.toLocaleString()} FCFA
                          </p>
                        )}
                      </div>

                      <div>
                        <h5 className="font-medium mb-2">Recommandation</h5>
                        <p className="text-sm text-[var(--color-text-primary)]">{validation.resultats.recommandation}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                          Dernière mise à jour: {new Date(validation.derniereMiseAJour).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Règles Métier */}
        <TabsContent value="regles-metier" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration des Règles Métier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockReglesMetier.map(regle => (
                  <div key={regle.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-lg">{regle.nom}</h4>
                        <p className="text-[var(--color-text-primary)]">{regle.description}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Domaine: {regle.domaine}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={regle.actif ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' : 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'}>
                          {regle.actif ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge className="bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] capitalize">
                          {regle.typeRegle.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium mb-2">Expression</h5>
                        <code className="text-sm bg-[var(--color-background-hover)] p-2 rounded block">{regle.expression}</code>
                      </div>

                      <div>
                        <h5 className="font-medium mb-2">Message d'Erreur</h5>
                        <p className="text-sm text-[var(--color-error)] bg-[var(--color-error-lightest)] p-2 rounded">{regle.messageErreur}</p>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-[var(--color-text-secondary)]">
                      Créée le {new Date(regle.dateCreation).toLocaleDateString()} •
                      Mise à jour le {new Date(regle.derniereMiseAJour).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Indicateurs de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockIndicateurs.map((indicateur, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{indicateur.nom}</h4>
                          <p className="text-sm text-[var(--color-text-primary)]">{indicateur.description}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {indicateur.tendance === 'hausse' ? (
                            <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />
                          ) : indicateur.tendance === 'baisse' ? (
                            <TrendingDown className="w-4 h-4 text-[var(--color-error)]" />
                          ) : (
                            <Activity className="w-4 h-4 text-[var(--color-primary)]" />
                          )}
                          <Badge className={
                            indicateur.categorie === 'financier' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                            indicateur.categorie === 'operationnel' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                            'bg-purple-100 text-purple-800'
                          }>
                            {indicateur.categorie}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-[var(--color-text-primary)]">Valeur Actuelle</p>
                          <p className="text-2xl font-bold">
                            {indicateur.valeur} {indicateur.unite}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[var(--color-text-primary)]">Objectif</p>
                          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                            {indicateur.objectif} {indicateur.unite}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progression</span>
                          <span>{((indicateur.valeur / indicateur.objectif) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={(indicateur.valeur / indicateur.objectif) * 100} className="h-2" />
                      </div>

                      <div className="mt-3">
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          <strong>Formule:</strong> {indicateur.formuleCalcul}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Recommandations d'Amélioration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-l-4 border-l-blue-500">
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Optimisation Automatique:</strong> Activer l'exécution automatique des contrôles
                      toutes les heures pour détecter plus rapidement les anomalies.
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-l-4 border-l-green-500">
                    <Target className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Amélioration Performance:</strong> Optimiser les requêtes de validation croisée
                      pour réduire le temps d'exécution de 30%.
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-l-4 border-l-orange-500">
                    <Flag className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Nouvelle Règle:</strong> Ajouter un contrôle automatique de cohérence
                      entre les provisions et leurs justifications documentaires.
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      Actions Prioritaires
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckSquare className="w-3 h-3 text-[var(--color-success)] mt-1" />
                        <span>Résoudre l'anomalie critique de provision non documentée</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckSquare className="w-3 h-3 text-[var(--color-success)] mt-1" />
                        <span>Corriger les 3 écritures avec dates incohérentes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckSquare className="w-3 h-3 text-[var(--color-success)] mt-1" />
                        <span>Analyser l'écart de 50K FCFA sur les stocks</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Execution Modal */}
      {showExecutionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-[var(--color-primary-lighter)] text-[var(--color-primary)] p-2 rounded-lg">
                  <Activity className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Exécution des Contrôles</h2>
              </div>
              <button
                onClick={() => {
                  setShowExecutionModal(false);
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
                <div className="bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Info className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-[var(--color-primary-darker)] mb-1">Exécution des Contrôles de Cohérence</h4>
                      <p className="text-sm text-[var(--color-primary-darker)]">Lancez l&apos;exécution automatique des contrôles de cohérence comptable pour détecter les anomalies.</p>
                    </div>
                  </div>
                </div>

                {/* Control Selection */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Sélection des Contrôles *</h3>
                  <div className="space-y-3">
                    {[
                      { id: 'balance_generale', label: 'Balance Générale - Équilibre débit/crédit', defaultChecked: true },
                      { id: 'journaux_auxiliaires', label: 'Journaux Auxiliaires - Concordance avec le grand livre', defaultChecked: true },
                      { id: 'comptes_tiers', label: 'Comptes de Tiers - Lettrage et cohérence', defaultChecked: true },
                      { id: 'immobilisations', label: 'Immobilisations - Amortissements et valeurs', defaultChecked: false },
                      { id: 'stocks', label: 'Stocks - Valorisation et mouvements', defaultChecked: false },
                      { id: 'tresorerie', label: 'Trésorerie - Rapprochements bancaires', defaultChecked: true }
                    ].map((controle) => (
                      <div key={controle.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={controle.id}
                          className="rounded border-[var(--color-border-dark)] text-[var(--color-primary)]"
                          checked={formData.controle_ids.includes(controle.id)}
                          onChange={() => handleControleToggle(controle.id)}
                          disabled={isSubmitting}
                        />
                        <label htmlFor={controle.id} className="text-sm text-[var(--color-text-primary)]">{controle.label}</label>
                      </div>
                    ))}
                  </div>
                  {errors.controle_ids && (
                    <p className="mt-1 text-sm text-[var(--color-error)]">{errors.controle_ids}</p>
                  )}
                </div>

                {/* Execution Parameters */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Paramètres d&apos;Exécution</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Période de référence *</label>
                      <Input
                        type="month"
                        value={formData.periode_reference}
                        onChange={(e) => handleInputChange('periode_reference', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.periode_reference && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.periode_reference}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Responsable</label>
                      <Input
                        placeholder="Ex: Chef Comptable"
                        value={formData.responsable}
                        onChange={(e) => handleInputChange('responsable', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Options d&apos;Exécution</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="arret_sur_erreur"
                        className="rounded border-[var(--color-border-dark)] text-[var(--color-primary)]"
                        checked={formData.arret_sur_erreur}
                        onChange={(e) => handleInputChange('arret_sur_erreur', e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="arret_sur_erreur" className="text-sm text-[var(--color-text-primary)]">Arrêter sur erreur</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="generer_rapport"
                        className="rounded border-[var(--color-border-dark)] text-[var(--color-primary)]"
                        checked={formData.generer_rapport}
                        onChange={(e) => handleInputChange('generer_rapport', e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="generer_rapport" className="text-sm text-[var(--color-text-primary)]">Générer un rapport</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)] px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowExecutionModal(false);
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
                className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Traitement...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    <span>Lancer les Contrôles</span>
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

export default ControlesCoherence;