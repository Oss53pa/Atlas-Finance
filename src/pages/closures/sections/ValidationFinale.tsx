import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { previewClosure, canClose } from '../../../services/closureService';
import type { ClosurePreview } from '../../../services/closureService';
import { closureOrchestrator } from '../../../services/cloture/closureOrchestrator';
import type { ClotureMode, ClotureStep as OrchestratorStep } from '../../../services/cloture/closureOrchestrator';
import { db } from '../../../lib/db';
import type { DBFiscalYear } from '../../../lib/db';
import { formatCurrency } from '../../../utils/formatters';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  Users,
  Calendar,
  Lock,
  Unlock,
  Send,
  Download,
  Eye,
  Edit,
  Play,
  Pause,
  RotateCcw,
  CheckSquare,
  AlertCircle,
  TrendingUp,
  Target,
  Award,
  Workflow,
  GitBranch,
  Activity,
  MessageSquare,
  Bell,
  Settings,
  Search,
  Filter,
  ChevronRight,
  Info,
  Star,
  Save,
  RefreshCw,
  Database,
  BarChart3,
  PieChart,
  X,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/Progress';
import { Input } from '../../../components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import { toast } from 'react-hot-toast';

interface EtapeValidation {
  id: string;
  nom: string;
  description: string;
  responsable: string;
  dateEcheance: string;
  statut: 'en_attente' | 'en_cours' | 'complete' | 'bloque' | 'erreur';
  progression: number;
  controles: ControleValidation[];
  dependances: string[];
  commentaires?: string;
  documentsRequis: string[];
  documentsJoints: string[];
}

interface ControleValidation {
  id: string;
  nom: string;
  type: 'automatique' | 'manuel' | 'mixte';
  criticite: 'faible' | 'moyenne' | 'elevee' | 'critique';
  statut: 'non_execute' | 'en_cours' | 'reussi' | 'echec' | 'alerte';
  resultat?: string;
  valeurAttendue?: string;
  valeurObtenue?: string;
  dernierExecution?: string;
  tempsExecution?: number;
}

interface Approbation {
  id: string;
  etapeId: string;
  utilisateur: string;
  role: string;
  dateApprobation: string;
  statut: 'approuve' | 'refuse' | 'en_attente';
  commentaire?: string;
  signature?: string;
}

interface PeriodeCloture {
  id: string;
  periode: string;
  type: 'mensuelle' | 'trimestrielle' | 'annuelle';
  dateDebut: string;
  dateFin: string;
  dateEcheance: string;
  statut: 'ouverte' | 'en_cours' | 'validee' | 'cloturee' | 'bloquee';
  responsableFinal: string;
  progression: number;
  etapes: EtapeValidation[];
  approbations: Approbation[];
}

const ValidationFinale: React.FC = () => {
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState('progression');
  const [selectedPeriode, setSelectedPeriode] = useState<PeriodeCloture | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedEtape, setSelectedEtape] = useState<EtapeValidation | null>(null);
  const [formData, setFormData] = useState({
    periode_id: '',
    niveau: 'comptable' as 'comptable' | 'chef_comptable' | 'directeur_financier' | 'cac',
    commentaire: '',
    checklist_complete: false,
    signature_electronique: '',
    verrouillage_definitif: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Orchestrator mode & steps ---
  const [clotureMode, setClotureMode] = useState<ClotureMode>('manual');
  const [orchSteps, setOrchSteps] = useState<OrchestratorStep[]>(() => closureOrchestrator.getSteps());

  // --- Fiscal years + closure preview from Dexie ---
  const [fiscalYears, setFiscalYears] = useState<DBFiscalYear[]>([]);
  const [preview, setPreview] = useState<ClosurePreview | null>(null);
  const [canCloseResult, setCanCloseResult] = useState<{ canClose: boolean; reasons: string[] } | null>(null);

  useEffect(() => {
    db.fiscalYears.toArray().then(fys => {
      setFiscalYears(fys);
      const active = fys.find(fy => fy.isActive) || fys[0];
      if (active) {
        previewClosure(active.id).then(setPreview).catch(() => {});
        canClose(active.id).then(setCanCloseResult).catch(() => {});
      }
    });
  }, []);

  const resetForm = () => {
    setFormData({
      periode_id: '',
      niveau: 'comptable',
      commentaire: '',
      checklist_complete: false,
      signature_electronique: '',
      verrouillage_definitif: false,
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // --- Execute ALL steps via orchestrator (full workflow) ---
  const handleSubmit = async () => {
    const activeFY = fiscalYears.find(fy => fy.isActive) || fiscalYears[0];
    if (!activeFY) {
      toast.error('Aucun exercice fiscal sélectionné');
      return;
    }

    if (!formData.verrouillage_definitif) {
      toast.error('Vous devez confirmer le verrouillage définitif');
      return;
    }

    setIsSubmitting(true);
    setOrchSteps(closureOrchestrator.getSteps());

    try {
      const nextFY = fiscalYears.find(fy => fy.startDate > activeFY.endDate);

      const results = await closureOrchestrator.executeAll({
        exerciceId: activeFY.id,
        mode: clotureMode,
        userId: 'current-user',
        openingExerciceId: nextFY?.id,
        onProgress: (step) => {
          setOrchSteps(prev => prev.map(s => s.id === step.id ? { ...step } : s));
        },
        onError: (step, error) => {
          toast.error(`Étape "${step.label}" : ${error.message}`);
        },
      });

      const allDone = results.every(s => s.status === 'done');
      const errors = results.filter(s => s.status === 'error');

      if (allDone) {
        toast.success('Clôture complète — toutes les étapes réussies');
        setShowValidationModal(false);
        resetForm();
        const fys = await db.fiscalYears.toArray();
        setFiscalYears(fys);
        setOrchSteps(closureOrchestrator.getSteps());
      } else if (errors.length > 0) {
        toast.error(`${errors.length} étape(s) en erreur — vérifiez le détail`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la clôture');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Execute ONE step (manual step-by-step mode) ---
  const handleExecuteStep = async (stepId: string) => {
    const activeFY = fiscalYears.find(fy => fy.isActive) || fiscalYears[0];
    if (!activeFY) {
      toast.error('Aucun exercice fiscal sélectionné');
      return;
    }

    setOrchSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'running' } : s));

    try {
      const nextFY = fiscalYears.find(fy => fy.startDate > activeFY.endDate);

      const result = await closureOrchestrator.executeStep(stepId, {
        exerciceId: activeFY.id,
        mode: 'manual',
        userId: 'current-user',
        openingExerciceId: nextFY?.id,
      });

      setOrchSteps(prev => prev.map(s => s.id === stepId ? { ...result } : s));

      if (result.status === 'done') {
        toast.success(`${result.label} : ${result.message}`);
        // Refresh preview after each step
        previewClosure(activeFY.id).then(setPreview).catch(() => {});
        canClose(activeFY.id).then(setCanCloseResult).catch(() => {});
      } else {
        toast.error(`${result.label} : ${result.message}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
      setOrchSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'error', message: String(err) } : s));
    }
  };

  // Build periodes from real fiscal years
  const mockPeriodes: PeriodeCloture[] = fiscalYears.map(fy => ({
    id: fy.id,
    periode: fy.code,
    type: 'annuelle' as const,
    dateDebut: fy.startDate,
    dateFin: fy.endDate,
    dateEcheance: fy.endDate,
    statut: fy.isClosed ? 'cloturee' as const : fy.isActive ? 'en_cours' as const : 'ouverte' as const,
    responsableFinal: 'Directeur Financier',
    progression: fy.isClosed ? 100 : (preview && fy.isActive ? 50 : 0),
    etapes: fy.isActive && preview ? [
      {
        id: 'e1',
        nom: 'Vérification des pré-requis',
        description: `${preview.totalEntries} écritures, ${preview.entriesToLock} à verrouiller`,
        responsable: 'Système',
        dateEcheance: fy.endDate,
        statut: preview.warnings.length === 0 ? 'complete' as const : 'en_cours' as const,
        progression: preview.warnings.length === 0 ? 100 : 50,
        controles: [{
          id: 'c1', nom: 'Équilibre écritures', type: 'automatique' as const,
          criticite: 'critique' as const,
          statut: preview.warnings.length === 0 ? 'reussi' as const : 'alerte' as const,
          resultat: preview.warnings.length === 0 ? 'OK' : preview.warnings.join(', '),
        }],
        dependances: [],
        documentsRequis: [],
        documentsJoints: [],
      },
      {
        id: 'e2',
        nom: 'Calcul du résultat',
        description: `Produits: ${formatCurrency(preview.totalProduits)} — Charges: ${formatCurrency(preview.totalCharges)}`,
        responsable: 'Système',
        dateEcheance: fy.endDate,
        statut: 'en_attente' as const,
        progression: 0,
        controles: [{
          id: 'c2', nom: 'Résultat net', type: 'automatique' as const,
          criticite: 'elevee' as const, statut: 'non_execute' as const,
          resultat: `Résultat prévisionnel: ${formatCurrency(preview.resultatNet)}`,
        }],
        dependances: ['e1'],
        documentsRequis: ['Bilan', 'Compte de résultat'],
        documentsJoints: [],
      },
    ] : [],
    approbations: [],
  }));

  // Calculs des KPIs
  const kpis = useMemo(() => {
    const periodeEnCours = mockPeriodes.find(p => p.statut === 'en_cours');
    const totalEtapes = periodeEnCours?.etapes.length || 0;
    const etapesCompletes = periodeEnCours?.etapes.filter(e => e.statut === 'complete').length || 0;
    const controlesEchoues = periodeEnCours?.etapes.reduce((total, etape) =>
      total + etape.controles.filter(c => c.statut === 'echec').length, 0) || 0;
    const approbationsPendantes = periodeEnCours?.etapes.filter(e =>
      e.statut === 'complete' && !periodeEnCours.approbations.some(a => a.etapeId === e.id)).length || 0;

    return {
      totalEtapes,
      etapesCompletes,
      controlesEchoues,
      approbationsPendantes,
      progressionGlobale: periodeEnCours?.progression || 0,
      tempsRestant: canCloseResult?.canClose ? 0 : canCloseResult?.reasons.length || 0,
      alertesCritiques: preview?.warnings.length || 0,
    };
  }, [fiscalYears, preview, canCloseResult]);

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, string> = {
      'en_attente': 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]',
      'en_cours': 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]',
      'complete': 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
      'bloque': 'bg-[var(--color-error-lighter)] text-red-800',
      'erreur': 'bg-[var(--color-error-lighter)] text-red-800'
    };
    return variants[statut] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
  };

  const getCriticiteColor = (criticite: string) => {
    const colors: Record<string, string> = {
      'faible': 'text-[var(--color-success)]',
      'moyenne': 'text-[var(--color-warning)]',
      'elevee': 'text-[var(--color-warning)]',
      'critique': 'text-[var(--color-error)]'
    };
    return colors[criticite] || 'text-[var(--color-text-primary)]';
  };

  const getControleIcon = (statut: string) => {
    switch (statut) {
      case 'reussi': return <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />;
      case 'echec': return <XCircle className="w-4 h-4 text-[var(--color-error)]" />;
      case 'alerte': return <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />;
      case 'en_cours': return <Clock className="w-4 h-4 text-[var(--color-primary)]" />;
      default: return <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />;
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
                <p className="text-sm text-[var(--color-text-primary)]">Progression Globale</p>
                <p className="text-lg font-bold">{kpis.progressionGlobale}%</p>
                <Progress value={kpis.progressionGlobale} className="mt-2" />
              </div>
              <Target className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Étapes Complètes</p>
                <p className="text-lg font-bold">{kpis.etapesCompletes}/{kpis.totalEtapes}</p>
                <p className="text-xs text-[var(--color-success)]">{Math.round((kpis.etapesCompletes / kpis.totalEtapes) * 100)}% terminées</p>
              </div>
              <CheckSquare className="w-8 h-8 text-[var(--color-success)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Approbations Pendantes</p>
                <p className="text-lg font-bold">{kpis.approbationsPendantes}</p>
                <p className="text-xs text-[var(--color-warning)]">En attente validation</p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Temps Restant</p>
                <p className="text-lg font-bold">{kpis.tempsRestant}j</p>
                <p className="text-xs text-[var(--color-error)]">Échéance proche</p>
              </div>
              <Clock className="w-8 h-8 text-[var(--color-error)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes critiques */}
      {kpis.alertesCritiques > 0 && (
        <Alert className="border-l-4 border-l-red-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Attention:</strong> {kpis.alertesCritiques} alertes critiques nécessitent votre attention immédiate.
            Vérifiez les contrôles en échec avant la validation finale.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="progression">Progression</TabsTrigger>
          <TabsTrigger value="etapes">Étapes de Validation</TabsTrigger>
          <TabsTrigger value="controles">Contrôles</TabsTrigger>
          <TabsTrigger value="approbations">Approbations</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        {/* Progression — Orchestrator Steps */}
        <TabsContent value="progression" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tableau de Bord de Validation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Période + Mode Toggle */}
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Période: {mockPeriodes[0]?.periode || '—'}
                    </h3>
                    {preview && (
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {preview.totalEntries} écritures — Résultat: {formatCurrency(preview.resultatNet)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Mode toggle */}
                    <div className="flex items-center gap-2 bg-[var(--color-background-secondary)] rounded-lg p-1">
                      <button
                        onClick={() => setClotureMode('manual')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          clotureMode === 'manual'
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                        }`}
                      >
                        Manuel
                      </button>
                      <button
                        onClick={() => setClotureMode('proph3t')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          clotureMode === 'proph3t'
                            ? 'bg-purple-600 text-white'
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                        }`}
                      >
                        Proph3t IA
                      </button>
                    </div>
                    <button
                      onClick={() => setShowValidationModal(true)}
                      disabled={isSubmitting || !canCloseResult?.canClose}
                      className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center gap-2 disabled:opacity-50"
                    >
                      <Shield className="w-4 h-4" />
                      Tout Exécuter
                    </button>
                  </div>
                </div>

                {/* Pre-check warnings */}
                {canCloseResult && !canCloseResult.canClose && (
                  <Alert className="border-l-4 border-l-orange-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Pré-requis non satisfaits :</strong>
                      <ul className="list-disc ml-4 mt-1 text-sm">
                        {canCloseResult.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Orchestrator Steps Workflow */}
                <div className="space-y-4">
                  <h4 className="font-medium">
                    Workflow de Clôture — Mode {clotureMode === 'manual' ? 'Manuel' : 'Proph3t IA'}
                  </h4>
                  <div className="space-y-3">
                    {orchSteps.map((step, index) => (
                      <div key={step.id} className="relative">
                        <div className={`flex items-center p-4 border rounded-lg ${
                          step.status === 'done' ? 'bg-[var(--color-success-lightest)] border-[var(--color-success-light)]' :
                          step.status === 'running' ? 'bg-[var(--color-primary-lightest)] border-[var(--color-primary-light)]' :
                          step.status === 'error' ? 'bg-[var(--color-error-lightest)] border-[var(--color-error-light)]' :
                          'bg-[var(--color-background-secondary)] border-[var(--color-border)]'
                        }`}>
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              step.status === 'done' ? 'bg-[var(--color-success)]' :
                              step.status === 'running' ? 'bg-[var(--color-primary)]' :
                              step.status === 'error' ? 'bg-[var(--color-error)]' :
                              'bg-gray-400'
                            }`}>
                              {step.status === 'done' ? (
                                <CheckCircle className="w-5 h-5 text-white" />
                              ) : step.status === 'running' ? (
                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                              ) : step.status === 'error' ? (
                                <XCircle className="w-5 h-5 text-white" />
                              ) : (
                                <span className="text-white font-bold">{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium">{step.label}</h5>
                              {step.message && (
                                <p className={`text-sm ${step.status === 'error' ? 'text-[var(--color-error)]' : 'text-[var(--color-text-secondary)]'}`}>
                                  {step.message}
                                </p>
                              )}
                              {step.timestamp && (
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                  {new Date(step.timestamp).toLocaleTimeString()}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={
                                step.status === 'done' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                                step.status === 'running' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                                step.status === 'error' ? 'bg-[var(--color-error-lighter)] text-red-800' :
                                'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                              }>
                                {step.status === 'done' ? 'Terminé' :
                                 step.status === 'running' ? 'En cours...' :
                                 step.status === 'error' ? 'Erreur' :
                                 'En attente'}
                              </Badge>
                              {/* Manual mode: execute single step */}
                              {clotureMode === 'manual' && step.status === 'pending' && !isSubmitting && (
                                <button
                                  onClick={() => handleExecuteStep(step.id)}
                                  className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded text-sm hover:bg-[var(--color-primary-dark)] flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3" />
                                  Exécuter
                                </button>
                              )}
                              {/* Retry on error */}
                              {step.status === 'error' && !isSubmitting && (
                                <button
                                  onClick={() => handleExecuteStep(step.id)}
                                  className="px-3 py-1.5 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Réessayer
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        {index < orchSteps.length - 1 && (
                          <div className="absolute left-5 top-16 w-0.5 h-4 bg-[var(--color-border-dark)]"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary bar */}
                <div className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded-lg">
                  <div className="flex gap-4 text-sm">
                    <span className="text-[var(--color-success)]">
                      {orchSteps.filter(s => s.status === 'done').length} terminée(s)
                    </span>
                    <span className="text-[var(--color-error)]">
                      {orchSteps.filter(s => s.status === 'error').length} erreur(s)
                    </span>
                    <span className="text-[var(--color-text-secondary)]">
                      {orchSteps.filter(s => s.status === 'pending').length} en attente
                    </span>
                  </div>
                  <Progress
                    value={(orchSteps.filter(s => s.status === 'done').length / orchSteps.length) * 100}
                    className="w-48 h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Étapes de Validation */}
        <TabsContent value="etapes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Détail des Étapes</CardTitle>
              <div className="flex gap-2">
                <select className="px-3 py-2 border rounded-lg text-sm">
                  <option value="tous">Tous les statuts</option>
                  <option value="en_attente">{t('status.pending')}</option>
                  <option value="en_cours">{t('status.inProgress')}</option>
                  <option value="complete">Complète</option>
                  <option value="bloque">Bloquée</option>
                </select>
                <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] text-sm">
                  Actualiser
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockPeriodes[0].etapes.map(etape => (
                  <div key={etape.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{etape.nom}</h4>
                        <p className="text-sm text-[var(--color-text-primary)] mt-1">{etape.description}</p>
                      </div>
                      <Badge className={getStatutBadge(etape.statut)}>
                        {etape.statut}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Responsable</p>
                        <p className="text-sm font-medium">{etape.responsable}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Échéance</p>
                        <p className="text-sm">{new Date(etape.dateEcheance).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Progression</p>
                        <div className="flex items-center gap-2">
                          <Progress value={etape.progression} className="flex-1 h-2" />
                          <span className="text-sm font-medium">{etape.progression}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-[var(--color-text-secondary)] mb-2">Contrôles ({etape.controles.length})</p>
                      <div className="space-y-2">
                        {etape.controles.map(controle => (
                          <div key={controle.id} className="flex items-center justify-between p-2 bg-[var(--color-background-secondary)] rounded">
                            <div className="flex items-center gap-2">
                              {getControleIcon(controle.statut)}
                              <span className="text-sm">{controle.nom}</span>
                              <Badge className={`text-xs ${getCriticiteColor(controle.criticite)}`}>
                                {controle.criticite}
                              </Badge>
                            </div>
                            {controle.resultat && (
                              <span className="text-xs text-[var(--color-text-primary)]">{controle.resultat}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <span className="text-xs bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] px-2 py-1 rounded">
                          {etape.documentsJoints.length}/{etape.documentsRequis.length} documents
                        </span>
                        {etape.dependances.length > 0 && (
                          <span className="text-xs bg-[var(--color-background-hover)] text-[var(--color-text-primary)] px-2 py-1 rounded">
                            {etape.dependances.length} dépendances
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-[var(--color-background-hover)] rounded">
                          <FileText className="w-4 h-4 text-[var(--color-text-primary)]" />
                        </button>
                        <button className="p-2 hover:bg-[var(--color-background-hover)] rounded">
                          <Edit className="w-4 h-4 text-[var(--color-text-primary)]" />
                        </button>
                        {etape.statut === 'complete' && (
                          <button className="p-2 hover:bg-[var(--color-success-lighter)] rounded">
                            <Shield className="w-4 h-4 text-[var(--color-success)]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contrôles */}
        <TabsContent value="controles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Matrice des Contrôles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-[var(--color-success-lightest)] rounded-lg">
                    <p className="text-lg font-bold text-[var(--color-success)]">12</p>
                    <p className="text-sm text-[var(--color-text-primary)]">Réussis</p>
                  </div>
                  <div className="p-3 bg-[var(--color-error-lightest)] rounded-lg">
                    <p className="text-lg font-bold text-[var(--color-error)]">2</p>
                    <p className="text-sm text-[var(--color-text-primary)]">Échecs</p>
                  </div>
                  <div className="p-3 bg-[var(--color-warning-lightest)] rounded-lg">
                    <p className="text-lg font-bold text-[var(--color-warning)]">3</p>
                    <p className="text-sm text-[var(--color-text-primary)]">Alertes</p>
                  </div>
                  <div className="p-3 bg-[var(--color-primary-lightest)] rounded-lg">
                    <p className="text-lg font-bold text-[var(--color-primary)]">5</p>
                    <p className="text-sm text-[var(--color-text-primary)]">{t('status.inProgress')}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {mockPeriodes[0].etapes.flatMap(etape =>
                    etape.controles.map(controle => (
                      <div key={`${etape.id}-${controle.id}`} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getControleIcon(controle.statut)}
                              <h5 className="font-medium">{controle.nom}</h5>
                              <Badge className={`text-xs ${getCriticiteColor(controle.criticite)}`}>
                                {controle.criticite}
                              </Badge>
                              <Badge className="text-xs bg-[var(--color-background-hover)] text-[var(--color-text-primary)]">
                                {controle.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-[var(--color-text-primary)] mb-2">Étape: {etape.nom}</p>
                            {controle.resultat && (
                              <p className="text-sm text-[var(--color-text-primary)]">{controle.resultat}</p>
                            )}
                            {controle.valeurAttendue && controle.valeurObtenue && (
                              <div className="mt-2 text-xs">
                                <span className="text-[var(--color-text-secondary)]">Attendu: </span>
                                <span>{controle.valeurAttendue}</span>
                                <span className="text-[var(--color-text-secondary)] ml-4">Obtenu: </span>
                                <span className={controle.statut === 'echec' ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}>
                                  {controle.valeurObtenue}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {controle.dernierExecution && (
                              <p className="text-xs text-[var(--color-text-secondary)]">
                                {new Date(controle.dernierExecution).toLocaleDateString()}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <button className="p-1 hover:bg-[var(--color-background-hover)] rounded" aria-label="Actualiser">
                                <RefreshCw className="w-4 h-4 text-[var(--color-text-primary)]" />
                              </button>
                              <button className="p-1 hover:bg-[var(--color-background-hover)] rounded" aria-label="Information">
                                <Info className="w-4 h-4 text-[var(--color-text-primary)]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approbations */}
        <TabsContent value="approbations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Circuit d'Approbation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-[var(--color-success-lightest)] rounded-lg text-center">
                    <p className="text-lg font-bold text-[var(--color-success)]">1</p>
                    <p className="text-sm text-[var(--color-text-primary)]">Approuvées</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <p className="text-lg font-bold text-[var(--color-warning)]">2</p>
                    <p className="text-sm text-[var(--color-text-primary)]">{t('status.pending')}</p>
                  </div>
                  <div className="p-4 bg-[var(--color-error-lightest)] rounded-lg text-center">
                    <p className="text-lg font-bold text-[var(--color-error)]">0</p>
                    <p className="text-sm text-[var(--color-text-primary)]">Refusées</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Approbations requises</h4>
                  {mockPeriodes[0].etapes
                    .filter(etape => etape.statut === 'complete')
                    .map(etape => {
                      const approbation = mockPeriodes[0].approbations.find(a => a.etapeId === etape.id);
                      return (
                        <div key={etape.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium">{etape.nom}</h5>
                              <p className="text-sm text-[var(--color-text-primary)]">Responsable: {etape.responsable}</p>
                            </div>
                            <div className="text-right">
                              {approbation ? (
                                <div>
                                  <Badge className="bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]">
                                    Approuvé
                                  </Badge>
                                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                    {approbation.utilisateur} - {new Date(approbation.dateApprobation).toLocaleDateString()}
                                  </p>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button className="px-3 py-1 bg-[var(--color-success)] text-white rounded text-sm hover:bg-[var(--color-success-dark)]">
                                    Approuver
                                  </button>
                                  <button className="px-3 py-1 bg-[var(--color-error)] text-white rounded text-sm hover:bg-[var(--color-error-dark)]">
                                    Refuser
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {approbation?.commentaire && (
                            <div className="mt-3 p-3 bg-[var(--color-background-secondary)] rounded">
                              <p className="text-sm">"{approbation.commentaire}"</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  }
                </div>

                <div className="border-t pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Validation Finale</h4>
                      <p className="text-sm text-[var(--color-text-primary)]">
                        Toutes les étapes doivent être approuvées avant la validation finale
                      </p>
                    </div>
                    <button
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                      disabled={mockPeriodes[0].etapes.some(e => e.statut !== 'complete')}
                      onClick={() => setShowValidationModal(true)}
                    >
                      <Shield className="w-5 h-5" />
                      Valider Définitivement
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historique */}
        <TabsContent value="historique" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Validations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <select className="px-3 py-2 border rounded-lg text-sm">
                      <option value="tous">Toutes les périodes</option>
                      <option value="mensuelle">Mensuelles</option>
                      <option value="trimestrielle">Trimestrielles</option>
                      <option value="annuelle">Annuelles</option>
                    </select>
                    <select className="px-3 py-2 border rounded-lg text-sm">
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                    </select>
                  </div>
                  <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Exporter
                  </button>
                </div>

                <div className="space-y-3">
                  {[
                    { periode: '2024-11', statut: 'cloturee', dateValidation: '2024-12-15', delai: 'Dans les temps' },
                    { periode: '2024-10', statut: 'cloturee', dateValidation: '2024-11-12', delai: 'Dans les temps' },
                    { periode: '2024-09', statut: 'cloturee', dateValidation: '2024-10-18', delai: 'Retard 3j' },
                    { periode: '2024-Q3', statut: 'cloturee', dateValidation: '2024-10-25', delai: 'Dans les temps' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-[var(--color-background-secondary)]">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[var(--color-success-lighter)] rounded-full flex items-center justify-center">
                          <Award className="w-5 h-5 text-[var(--color-success)]" />
                        </div>
                        <div>
                          <p className="font-medium">Période {item.periode}</p>
                          <p className="text-sm text-[var(--color-text-primary)]">
                            Validée le {new Date(item.dateValidation).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]">
                          {item.statut}
                        </Badge>
                        <p className={`text-xs mt-1 ${
                          item.delai.includes('Retard') ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'
                        }`}>
                          {item.delai}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-[var(--color-success-lighter)] text-[var(--color-success)] p-2 rounded-lg">
                  <Shield className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Validation Finale de Clôture</h2>
              </div>
              <button
                onClick={() => {
                  setShowValidationModal(false);
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
                <div className="bg-[var(--color-success-lightest)] border border-[var(--color-success-light)] rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-green-900 mb-1">Validation Définitive</h4>
                      <p className="text-sm text-[var(--color-success-darker)]">Validez définitivement la clôture comptable après vérification de tous les contrôles.</p>
                    </div>
                  </div>
                </div>

                {/* Validation Details */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Détails de Validation</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Période ID *</label>
                      <Input
                        placeholder="Ex: per-2024-12"
                        value={formData.periode_id}
                        onChange={(e) => handleInputChange('periode_id', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.periode_id && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.periode_id}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Niveau de validation *</label>
                      <Select
                        value={formData.niveau}
                        onValueChange={(value) => handleInputChange('niveau', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le niveau" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comptable">Comptable</SelectItem>
                          <SelectItem value="chef_comptable">Chef Comptable</SelectItem>
                          <SelectItem value="directeur_financier">Directeur Financier</SelectItem>
                          <SelectItem value="cac">Commissaire aux Comptes</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.niveau && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.niveau}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Signature électronique</label>
                      <Input
                        placeholder="Signature ou code"
                        value={formData.signature_electronique}
                        onChange={(e) => handleInputChange('signature_electronique', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                {/* Validation Checklist */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Validation Obligatoire *</h3>
                  <div className="p-4 border border-[var(--color-border)] rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="checklist_complete"
                        className="rounded border-[var(--color-border-dark)] text-[var(--color-success)]"
                        checked={formData.checklist_complete}
                        onChange={(e) => handleInputChange('checklist_complete', e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="checklist_complete" className="text-sm text-[var(--color-text-primary)] font-medium">
                        Je certifie que tous les contrôles ont été effectués et que la clôture est complète
                      </label>
                    </div>
                    {errors.checklist_complete && (
                      <p className="mt-1 text-sm text-[var(--color-error)]">{errors.checklist_complete}</p>
                    )}
                  </div>
                </div>

                {/* Advanced Options */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Options Avancées</h3>
                  <div className="p-4 border border-[var(--color-error-light)] rounded-lg bg-[var(--color-error-lightest)]">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="verrouillage_definitif"
                        className="rounded border-[var(--color-border-dark)] text-[var(--color-error)]"
                        checked={formData.verrouillage_definitif}
                        onChange={(e) => handleInputChange('verrouillage_definitif', e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="verrouillage_definitif" className="text-sm text-[var(--color-error-dark)] font-medium">
                        Verrouillage définitif (irréversible)
                      </label>
                    </div>
                    <p className="text-xs text-[var(--color-error)] mt-1">
                      Attention: Cette option empêche toute modification ultérieure de la période.
                    </p>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Commentaires</label>
                  <textarea
                    className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={4}
                    placeholder="Commentaires et observations sur la validation finale..."
                    value={formData.commentaire}
                    onChange={(e) => handleInputChange('commentaire', e.target.value)}
                    disabled={isSubmitting}
                  ></textarea>
                  {errors.commentaire && (
                    <p className="mt-1 text-sm text-[var(--color-error)]">{errors.commentaire}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)] px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowValidationModal(false);
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
                className="bg-[var(--color-success)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-success-dark)] transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Traitement...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Valider Définitivement</span>
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

export default ValidationFinale;