import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { coreService, createExerciceSchema } from '../../../services/modules/core.service';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Settings,
  Users,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  Save,
  X,
  Play,
  Pause,
  Lock,
  Unlock,
  Bell,
  Mail,
  MessageSquare,
  Shield,
  Target,
  Workflow,
  Timer,
  MapPin,
  Globe,
  Flag,
  ChevronDown,
  ChevronRight,
  Info,
  Download,
  Upload,
  Search,
  Filter,
  Eye,
  Activity,
  BarChart3,
  Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/progress';

interface PeriodeComptable {
  id: string;
  code: string;
  nom: string;
  type: 'mensuelle' | 'trimestrielle' | 'annuelle' | 'exceptionnelle';
  dateDebut: string;
  dateFin: string;
  exercice: string;
  statut: 'planifiee' | 'ouverte' | 'en_cours' | 'cloturee' | 'verrouillee';
  delaisCloture: DelaisCloture;
  responsabilites: ResponsabilitePeriode[];
  parametresSpecifiques: ParametresSpecifiques;
  calendrierEtapes: EtapeCalendaire[];
}

interface DelaisCloture {
  dateEcheanceCloture: string;
  delaiTresorerie: number; // jours après fin période
  delaiCycles: number;
  delaiControles: number;
  delaiValidation: number;
  alerteJ1: boolean;
  alerteJ3: boolean;
  alerteJ7: boolean;
  escaladeN1: number; // jours avant escalade niveau 1
  escaladeN2: number; // jours avant escalade niveau 2
}

interface ResponsabilitePeriode {
  id: string;
  etape: string;
  utilisateur: string;
  role: string;
  delaiExecution: number;
  obligatoire: boolean;
  remplacant?: string;
  notifications: NotificationConfig[];
}

interface ParametresSpecifiques {
  id: string;
  deviseDefaut: string;
  tauxChangeFixe: Record<string, number>;
  comptesSpeciaux: string[];
  reglesProvisions: RegleProvision[];
  controlesSupplement: ControleSupplementaire[];
  documentsObligatoires: string[];
  seuilsMaterialite: Record<string, number>;
}

interface EtapeCalendaire {
  id: string;
  nom: string;
  ordre: number;
  dateDebut: string;
  dateFin: string;
  dependances: string[];
  responsable: string;
  statut: 'non_commencee' | 'en_cours' | 'terminee' | 'bloquee';
  dureeEstimee: number; // heures
  dureeReelle?: number;
}

interface RegleProvision {
  id: string;
  type: string;
  conditions: string;
  tauxProvision: number;
  compteComptable: string;
  automatique: boolean;
}

interface ControleSupplementaire {
  id: string;
  nom: string;
  description: string;
  frequence: 'systematique' | 'aleatoire' | 'conditionnel';
  criticite: 'faible' | 'moyenne' | 'elevee' | 'critique';
  automatise: boolean;
}

interface NotificationConfig {
  id: string;
  type: 'email' | 'sms' | 'systeme';
  destinataire: string;
  declencheur: string;
  template: string;
  actif: boolean;
}

interface JourFerie {
  id: string;
  nom: string;
  date: string;
  pays: string;
  type: 'fixe' | 'variable' | 'religieux';
  recurent: boolean;
}

interface CalendrierPays {
  id: string;
  pays: string;
  codeISO: string;
  joursFeries: JourFerie[];
  joursTravail: number[]; // 0=dimanche, 1=lundi, etc.
  heuresTravailJour: number;
}

const ParametragePeriodes: React.FC = () => {
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState('periodes');
  const [selectedPeriode, setSelectedPeriode] = useState<PeriodeComptable | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    libelle: '',
    type: 'mensuelle' as 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle',
    date_debut: '',
    date_fin: '',
    deadline_cloture: '',
    responsable: '',
    controles_obligatoires: [] as string[],
    notifications_auto: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: coreService.createExercice, // Adaptée pour périodes
    onSuccess: () => {
      toast.success('Période de clôture créée avec succès');
      queryClient.invalidateQueries({ queryKey: ['periodes-cloture'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

  const resetForm = () => {
    setFormData({
      libelle: '',
      type: 'mensuelle',
      date_debut: '',
      date_fin: '',
      deadline_cloture: '',
      responsable: '',
      controles_obligatoires: [],
      notifications_auto: true,
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: any) => {
    if (field === 'controles_obligatoires') {
      const controlsArray = typeof value === 'string' ? value.split(',').map(item => item.trim()).filter(item => item) : value;
      setFormData(prev => ({ ...prev, [field]: controlsArray }));
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

      // Validate with Zod (adapted from createExerciceSchema)
      const periodeSchema = z.object({
        libelle: z.string().min(1, 'Le libellé est requis'),
        type: z.enum(['mensuelle', 'trimestrielle', 'semestrielle', 'annuelle']),
        date_debut: z.string().min(1, 'La date de début est requise'),
        date_fin: z.string().min(1, 'La date de fin est requise'),
        deadline_cloture: z.string().min(1, 'La deadline de clôture est requise'),
        responsable: z.string().min(1, 'Le responsable est requis'),
        controles_obligatoires: z.array(z.string()).optional(),
        notifications_auto: z.boolean(),
      });

      const validatedData = periodeSchema.parse(formData);

      // Submit to backend
      await createMutation.mutateAsync(validatedData);
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
        toast.error('Erreur lors de la création de la période');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Données simulées
  const mockPeriodes: PeriodeComptable[] = [
    {
      id: '1',
      code: 'M202412',
      nom: 'Décembre 2024',
      type: 'mensuelle',
      dateDebut: '2024-12-01',
      dateFin: '2024-12-31',
      exercice: '2024',
      statut: 'en_cours',
      delaisCloture: {
        dateEcheanceCloture: '2025-01-10',
        delaiTresorerie: 3,
        delaiCycles: 5,
        delaiControles: 7,
        delaiValidation: 10,
        alerteJ1: true,
        alerteJ3: true,
        alerteJ7: true,
        escaladeN1: 2,
        escaladeN2: 5
      },
      responsabilites: [
        {
          id: '1',
          etape: 'Trésorerie',
          utilisateur: 'Jean OULAI',
          role: 'Comptable',
          delaiExecution: 3,
          obligatoire: true,
          remplacant: 'Marie DIALLO',
          notifications: [
            {
              id: '1',
              type: 'email',
              destinataire: 'jean.oulai@entreprise.ci',
              declencheur: 'debut_periode',
              template: 'notif_debut_tresorerie',
              actif: true
            }
          ]
        }
      ],
      parametresSpecifiques: {
        id: '1',
        deviseDefaut: 'FCFA',
        tauxChangeFixe: { 'EUR': 655.957, 'USD': 590.123 },
        comptesSpeciaux: ['512001', '512002', '531001'],
        reglesProvisions: [
          {
            id: '1',
            type: 'creances_douteuses',
            conditions: 'anciennete > 90 jours',
            tauxProvision: 50,
            compteComptable: '491100',
            automatique: true
          }
        ],
        controlesSupplement: [],
        documentsObligatoires: ['Relevés bancaires', 'Balance générale'],
        seuilsMaterialite: { 'bilan': 50000, 'resultat': 25000 }
      },
      calendrierEtapes: [
        {
          id: '1',
          nom: 'Clôture Trésorerie',
          ordre: 1,
          dateDebut: '2025-01-02',
          dateFin: '2025-01-05',
          dependances: [],
          responsable: 'Jean OULAI',
          statut: 'en_cours',
          dureeEstimee: 8,
          dureeReelle: 6
        },
        {
          id: '2',
          nom: 'Validation Cycles',
          ordre: 2,
          dateDebut: '2025-01-06',
          dateFin: '2025-01-08',
          dependances: ['1'],
          responsable: 'Fatou DIALLO',
          statut: 'non_commencee',
          dureeEstimee: 12
        }
      ]
    },
    {
      id: '2',
      code: 'Q202404',
      nom: 'Q4 2024',
      type: 'trimestrielle',
      dateDebut: '2024-10-01',
      dateFin: '2024-12-31',
      exercice: '2024',
      statut: 'planifiee',
      delaisCloture: {
        dateEcheanceCloture: '2025-01-31',
        delaiTresorerie: 5,
        delaiCycles: 10,
        delaiControles: 15,
        delaiValidation: 21,
        alerteJ1: true,
        alerteJ3: true,
        alerteJ7: true,
        escaladeN1: 3,
        escaladeN2: 7
      },
      responsabilites: [],
      parametresSpecifiques: {
        id: '2',
        deviseDefaut: 'FCFA',
        tauxChangeFixe: {},
        comptesSpeciaux: [],
        reglesProvisions: [],
        controlesSupplement: [],
        documentsObligatoires: [],
        seuilsMaterialite: {}
      },
      calendrierEtapes: []
    }
  ];

  const mockCalendriersPays: CalendrierPays[] = [
    {
      id: '1',
      pays: 'Côte d\'Ivoire',
      codeISO: 'CI',
      joursFeries: [
        {
          id: '1',
          nom: 'Nouvel An',
          date: '2025-01-01',
          pays: 'CI',
          type: 'fixe',
          recurent: true
        },
        {
          id: '2',
          nom: 'Fête du Travail',
          date: '2025-05-01',
          pays: 'CI',
          type: 'fixe',
          recurent: true
        },
        {
          id: '3',
          nom: 'Indépendance',
          date: '2025-08-07',
          pays: 'CI',
          type: 'fixe',
          recurent: true
        }
      ],
      joursTravail: [1, 2, 3, 4, 5], // Lundi à Vendredi
      heuresTravailJour: 8
    }
  ];

  // Calculs des KPIs
  const kpis = useMemo(() => {
    const totalPeriodes = mockPeriodes.length;
    const periodesActives = mockPeriodes.filter(p => p.statut === 'en_cours' || p.statut === 'ouverte').length;
    const periodesEnRetard = mockPeriodes.filter(p => {
      if (p.statut === 'en_cours') {
        const echeance = new Date(p.delaisCloture.dateEcheanceCloture);
        return echeance < new Date();
      }
      return false;
    }).length;
    const prochainEcheance = mockPeriodes
      .filter(p => p.statut === 'en_cours')
      .map(p => new Date(p.delaisCloture.dateEcheanceCloture))
      .reduce((min, date) => date < min ? date : min, new Date('2030-01-01'));

    return {
      totalPeriodes,
      periodesActives,
      periodesEnRetard,
      prochainEcheance: prochainEcheance.toLocaleDateString(),
      joursRestants: Math.ceil((prochainEcheance.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      automatisationTaux: 78
    };
  }, []);

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, string> = {
      'planifiee': 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]',
      'ouverte': 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]',
      'en_cours': 'bg-[var(--color-warning-lighter)] text-yellow-800',
      'cloturee': 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
      'verrouillee': 'bg-purple-100 text-purple-800'
    };
    return variants[statut] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mensuelle': return <Calendar className="w-4 h-4" />;
      case 'trimestrielle': return <BarChart3 className="w-4 h-4" />;
      case 'annuelle': return <Database className="w-4 h-4" />;
      case 'exceptionnelle': return <AlertTriangle className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
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
                <p className="text-sm text-[var(--color-text-primary)]">Périodes Actives</p>
                <p className="text-2xl font-bold">{kpis.periodesActives}</p>
                <p className="text-xs text-[var(--color-primary)]">En cours de traitement</p>
              </div>
              <Activity className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Prochaine Échéance</p>
                <p className="text-2xl font-bold">{kpis.joursRestants}j</p>
                <p className="text-xs text-[var(--color-warning)]">{kpis.prochainEcheance}</p>
              </div>
              <Timer className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">En Retard</p>
                <p className="text-2xl font-bold">{kpis.periodesEnRetard}</p>
                <p className="text-xs text-[var(--color-error)]">Attention requise</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-[var(--color-error)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Automatisation</p>
                <p className="text-2xl font-bold">{kpis.automatisationTaux}%</p>
                <Progress value={kpis.automatisationTaux} className="mt-2" />
              </div>
              <Settings className="w-8 h-8 text-[var(--color-success)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      <Alert className="border-l-4 border-l-blue-500">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Configuration automatique:</strong> Le système génère automatiquement les périodes selon votre calendrier comptable.
          3 périodes sont en attente de paramétrage des responsabilités.
        </AlertDescription>
      </Alert>

      {/* Tabs principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="periodes">Périodes</TabsTrigger>
          <TabsTrigger value="delais">Délais & Échéances</TabsTrigger>
          <TabsTrigger value="responsabilites">Responsabilités</TabsTrigger>
          <TabsTrigger value="calendriers">Calendriers</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="parametres">{t('navigation.settings')}</TabsTrigger>
        </TabsList>

        {/* Périodes */}
        <TabsContent value="periodes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestion des Périodes Comptables</CardTitle>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle Période
                </button>
                <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Générer Auto
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Filtres */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <select className="px-3 py-2 border rounded-lg text-sm">
                      <option value="tous">Tous types</option>
                      <option value="mensuelle">Mensuelle</option>
                      <option value="trimestrielle">Trimestrielle</option>
                      <option value="annuelle">Annuelle</option>
                    </select>
                    <select className="px-3 py-2 border rounded-lg text-sm">
                      <option value="tous">Tous statuts</option>
                      <option value="planifiee">Planifiée</option>
                      <option value="en_cours">{t('status.inProgress')}</option>
                      <option value="cloturee">Clôturée</option>
                    </select>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--color-text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      className="pl-10 pr-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* Liste des périodes */}
                <div className="space-y-3">
                  {mockPeriodes.map(periode => (
                    <div key={periode.id} className="border rounded-lg p-4 hover:bg-[var(--color-background-secondary)]">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[var(--color-primary-lighter)] rounded-lg flex items-center justify-center">
                            {getTypeIcon(periode.type)}
                          </div>
                          <div>
                            <h4 className="font-medium">{periode.nom}</h4>
                            <p className="text-sm text-[var(--color-text-primary)]">
                              {new Date(periode.dateDebut).toLocaleDateString()} - {new Date(periode.dateFin).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              Échéance: {new Date(periode.delaisCloture.dateEcheanceCloture).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatutBadge(periode.statut)}>
                            {periode.statut}
                          </Badge>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setSelectedPeriode(periode)}
                              className="p-2 hover:bg-[var(--color-background-hover)] rounded"
                            >
                              <Eye className="w-4 h-4 text-[var(--color-text-primary)]" />
                            </button>
                            <button className="p-2 hover:bg-[var(--color-background-hover)] rounded">
                              <Edit className="w-4 h-4 text-[var(--color-text-primary)]" />
                            </button>
                            <button className="p-2 hover:bg-[var(--color-background-hover)] rounded" aria-label="Dupliquer">
                              <Copy className="w-4 h-4 text-[var(--color-text-primary)]" />
                            </button>
                            {periode.statut === 'planifiee' && (
                              <button className="p-2 hover:bg-[var(--color-error-lighter)] rounded" aria-label="Supprimer">
                                <Trash2 className="w-4 h-4 text-[var(--color-error)]" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Progress et détails */}
                      {periode.statut === 'en_cours' && (
                        <div className="mt-4 p-3 bg-[var(--color-primary-lightest)] rounded">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Progression</span>
                            <span className="text-sm">
                              {periode.calendrierEtapes.filter(e => e.statut === 'terminee').length}/
                              {periode.calendrierEtapes.length} étapes
                            </span>
                          </div>
                          <Progress
                            value={(periode.calendrierEtapes.filter(e => e.statut === 'terminee').length / periode.calendrierEtapes.length) * 100}
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Délais & Échéances */}
        <TabsContent value="delais" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration des Délais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Délais par Étape (jours)</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>{t('navigation.treasury')}</span>
                        <div className="flex items-center gap-2">
                          <input type="number" defaultValue="3" className="w-16 px-2 py-1 border rounded text-center" />
                          <span className="text-sm text-[var(--color-text-secondary)]">jours</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Cycles Clients/Fournisseurs</span>
                        <div className="flex items-center gap-2">
                          <input type="number" defaultValue="5" className="w-16 px-2 py-1 border rounded text-center" />
                          <span className="text-sm text-[var(--color-text-secondary)]">jours</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Stocks & Immobilisations</span>
                        <div className="flex items-center gap-2">
                          <input type="number" defaultValue="4" className="w-16 px-2 py-1 border rounded text-center" />
                          <span className="text-sm text-[var(--color-text-secondary)]">jours</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Contrôles & Validation</span>
                        <div className="flex items-center gap-2">
                          <input type="number" defaultValue="3" className="w-16 px-2 py-1 border rounded text-center" />
                          <span className="text-sm text-[var(--color-text-secondary)]">jours</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">Alertes & Escalades</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Alertes automatiques</label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked />
                            <span className="text-sm">J-1 avant échéance</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked />
                            <span className="text-sm">J-3 avant échéance</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked />
                            <span className="text-sm">J-7 avant échéance</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Escalades</label>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-2 border rounded">
                            <span className="text-sm">Niveau 1 (N+1)</span>
                            <div className="flex items-center gap-2">
                              <input type="number" defaultValue="2" className="w-16 px-2 py-1 border rounded text-center text-sm" />
                              <span className="text-xs text-[var(--color-text-secondary)]">jours</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-2 border rounded">
                            <span className="text-sm">Niveau 2 (Direction)</span>
                            <div className="flex items-center gap-2">
                              <input type="number" defaultValue="5" className="w-16 px-2 py-1 border rounded text-center text-sm" />
                              <span className="text-xs text-[var(--color-text-secondary)]">jours</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Calendrier de Clôture Type</h4>
                  <div className="bg-[var(--color-background-secondary)] p-4 rounded-lg">
                    <div className="grid grid-cols-7 gap-2 text-center">
                      {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(jour => (
                        <div key={jour} className="font-medium text-sm p-2">{jour}</div>
                      ))}
                      {/* Simulation calendrier janvier 2025 */}
                      {[...Array(31)].map((_, i) => {
                        const date = i + 1;
                        const isWorkDay = [1, 2, 3, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17].includes(date);
                        const isEcheance = date === 10;
                        return (
                          <div
                            key={date}
                            className={`p-2 text-sm rounded ${
                              isEcheance ? 'bg-[var(--color-error)] text-white font-bold' :
                              isWorkDay ? 'bg-[var(--color-primary)] text-white' :
                              'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
                            }`}
                          >
                            {date}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex justify-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[var(--color-primary)] rounded"></div>
                        <span>Jours de travail</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[var(--color-error)] rounded"></div>
                        <span>Échéance clôture</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-[var(--color-border)] rounded"></div>
                        <span>Week-ends/Fériés</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Responsabilités */}
        <TabsContent value="responsabilites" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Attribution des Responsabilités</CardTitle>
              <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Ajouter Rôle
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Rôles par Étape</h4>
                    <div className="space-y-3">
                      {[
                        { etape: 'Trésorerie', responsable: 'Jean OULAI', role: 'Comptable', delai: 3 },
                        { etape: 'Cycle Clients', responsable: 'Fatou DIALLO', role: 'Resp. Crédit', delai: 5 },
                        { etape: 'Cycle Fournisseurs', responsable: 'Aminata KONE', role: 'Resp. Achats', delai: 4 },
                        { etape: 'Stocks', responsable: 'Ibrahim TRAORE', role: 'Gestionnaire Stock', delai: 3 },
                        { etape: 'Validation Finale', responsable: 'Marie KOUASSI', role: 'Dir. Financière', delai: 2 }
                      ].map((item, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium">{item.etape}</h5>
                              <p className="text-sm text-[var(--color-text-primary)]">{item.responsable} - {item.role}</p>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]">
                                {item.delai}j
                              </Badge>
                              <div className="flex gap-1 mt-2">
                                <button className="p-1 hover:bg-[var(--color-background-hover)] rounded">
                                  <Edit className="w-3 h-3 text-[var(--color-text-primary)]" />
                                </button>
                                <button className="p-1 hover:bg-[var(--color-background-hover)] rounded" aria-label="Utilisateur">
                                  <Users className="w-3 h-3 text-[var(--color-text-primary)]" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">Remplaçants & Suppléances</h4>
                    <div className="space-y-3">
                      {[
                        { principal: 'Jean OULAI', remplacant: 'Marie DIALLO', periode: 'Congés été' },
                        { principal: 'Fatou DIALLO', remplacant: 'Aminata KONE', periode: 'Formation' },
                        { principal: 'Marie KOUASSI', remplacant: 'Directeur Général', periode: 'Absence' }
                      ].map((item, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{item.principal}</p>
                              <p className="text-sm text-[var(--color-text-primary)]">→ {item.remplacant}</p>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-[var(--color-warning-lighter)] text-yellow-800 text-xs">
                                {item.periode}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6">
                      <h5 className="font-medium mb-3">Matrice RACI</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border">
                          <thead className="bg-[var(--color-background-secondary)]">
                            <tr>
                              <th className="p-2 text-left">Étape</th>
                              <th className="p-2 text-center">R</th>
                              <th className="p-2 text-center">A</th>
                              <th className="p-2 text-center">C</th>
                              <th className="p-2 text-center">I</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t">
                              <td className="p-2">{t('navigation.treasury')}</td>
                              <td className="p-2 text-center">JO</td>
                              <td className="p-2 text-center">MK</td>
                              <td className="p-2 text-center">FD</td>
                              <td className="p-2 text-center">DG</td>
                            </tr>
                            <tr className="border-t">
                              <td className="p-2">Validation</td>
                              <td className="p-2 text-center">MK</td>
                              <td className="p-2 text-center">DG</td>
                              <td className="p-2 text-center">JO</td>
                              <td className="p-2 text-center">CA</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendriers */}
        <TabsContent value="calendriers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestion des Calendriers</CardTitle>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Synchroniser
                </button>
                <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Ajouter Férié
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Jours Fériés 2025</h4>
                    <div className="space-y-2">
                      {mockCalendriersPays[0].joursFeries.map(ferie => (
                        <div key={ferie.id} className="flex justify-between items-center p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <Flag className="w-4 h-4 text-[var(--color-primary)]" />
                            <div>
                              <p className="font-medium">{ferie.nom}</p>
                              <p className="text-sm text-[var(--color-text-primary)]">{new Date(ferie.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={`text-xs ${
                              ferie.type === 'fixe' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                              ferie.type === 'variable' ? 'bg-[var(--color-warning-lighter)] text-yellow-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {ferie.type}
                            </Badge>
                            <button className="p-1 hover:bg-[var(--color-background-hover)] rounded">
                              <Edit className="w-3 h-3 text-[var(--color-text-primary)]" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">Configuration Pays</h4>
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-medium">Côte d'Ivoire (CI)</h5>
                          <Badge className="bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]">Actif</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Jours de travail:</span>
                            <span>Lun-Ven</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Heures/jour:</span>
                            <span>8h</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Jours fériés:</span>
                            <span>{mockCalendriersPays[0].joursFeries.length}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 border-dashed border-[var(--color-border-dark)]">
                        <div className="text-center">
                          <Globe className="w-8 h-8 text-[var(--color-text-secondary)] mx-auto mb-2" />
                          <p className="text-sm text-[var(--color-text-primary)]">Ajouter un autre pays</p>
                          <button className="mt-2 px-3 py-1 bg-[var(--color-primary)] text-white rounded text-sm hover:bg-[var(--color-primary-dark)]">
                            Configurer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">Règles de Calcul Automatique</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked />
                        <span className="text-sm">Exclure les week-ends des délais</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked />
                        <span className="text-sm">Exclure les jours fériés des délais</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" />
                        <span className="text-sm">Reporter automatiquement si échéance un jour férié</span>
                      </label>
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked />
                        <span className="text-sm">Alertes avant jours fériés</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" />
                        <span className="text-sm">Synchronisation calendrier Google</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" />
                        <span className="text-sm">Synchronisation calendrier Outlook</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration des Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Types de Notifications</h4>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-[var(--color-primary)]" />
                            <span className="font-medium">Email</span>
                          </div>
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="mr-2" />
                          </label>
                        </div>
                        <p className="text-sm text-[var(--color-text-primary)]">Notifications par email</p>
                      </div>

                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-[var(--color-success)]" />
                            <span className="font-medium">SMS</span>
                          </div>
                          <label className="flex items-center">
                            <input type="checkbox" className="mr-2" />
                          </label>
                        </div>
                        <p className="text-sm text-[var(--color-text-primary)]">Notifications SMS</p>
                      </div>

                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-[var(--color-warning)]" />
                            <span className="font-medium">Système</span>
                          </div>
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="mr-2" />
                          </label>
                        </div>
                        <p className="text-sm text-[var(--color-text-primary)]">Notifications dans l'app</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">Déclencheurs</h4>
                    <div className="space-y-2">
                      {[
                        'Début de période',
                        'Échéance approche (J-3)',
                        'Échéance atteinte',
                        'Dépassement échéance',
                        'Étape terminée',
                        'Erreur contrôle',
                        'Approbation requise',
                        'Escalade niveau 1',
                        'Escalade niveau 2',
                        'Validation finale'
                      ].map((declencheur, index) => (
                        <label key={index} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" defaultChecked={index < 6} />
                          <span>{declencheur}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">Templates</h4>
                    <div className="space-y-3">
                      {[
                        { nom: 'Début Période', type: 'email', actif: true },
                        { nom: 'Rappel Échéance', type: 'email', actif: true },
                        { nom: 'Escalade N+1', type: 'email', actif: true },
                        { nom: 'Validation Requise', type: 'sms', actif: false },
                        { nom: 'Clôture Terminée', type: 'email', actif: true }
                      ].map((template, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="text-sm font-medium">{template.nom}</p>
                            <p className="text-xs text-[var(--color-text-secondary)]">{template.type}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={template.actif ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' : 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'}>
                              {template.actif ? 'Actif' : 'Inactif'}
                            </Badge>
                            <button className="p-1 hover:bg-[var(--color-background-hover)] rounded">
                              <Edit className="w-3 h-3 text-[var(--color-text-primary)]" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paramètres */}
        <TabsContent value="parametres" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres Avancés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Génération Automatique</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked />
                        <span className="text-sm">Générer périodes mensuelles automatiquement</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked />
                        <span className="text-sm">Générer périodes trimestrielles</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" />
                        <span className="text-sm">Générer période annuelle</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" />
                        <span className="text-sm">Créer périodes 13ème mois</span>
                      </label>
                    </div>

                    <div className="mt-4">
                      <h5 className="font-medium mb-2">Période de génération</h5>
                      <div className="flex gap-2">
                        <select className="px-3 py-2 border rounded flex-1">
                          <option>3 mois à l'avance</option>
                          <option>6 mois à l'avance</option>
                          <option>12 mois à l'avance</option>
                        </select>
                        <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-dark)]">
                          Appliquer
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">Contrôles Automatiques</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked />
                        <span className="text-sm">Vérification cohérence dates</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked />
                        <span className="text-sm">Contrôle chevauchement périodes</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" />
                        <span className="text-sm">Validation automatique étapes simples</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" />
                        <span className="text-sm">Blocage période si contrôles échouent</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">Sauvegardes & Historique</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-[var(--color-primary-lightest)] rounded-lg text-center">
                      <Database className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-2" />
                      <p className="font-medium">Sauvegarde Auto</p>
                      <p className="text-sm text-[var(--color-text-primary)] mt-1">Quotidienne à 2h00</p>
                      <button className="mt-2 px-3 py-1 bg-[var(--color-primary)] text-white rounded text-sm">
                        Configurer
                      </button>
                    </div>
                    <div className="p-4 bg-[var(--color-success-lightest)] rounded-lg text-center">
                      <Shield className="w-8 h-8 text-[var(--color-success)] mx-auto mb-2" />
                      <p className="font-medium">Archivage</p>
                      <p className="text-sm text-[var(--color-text-primary)] mt-1">Périodes &gt; 2 ans</p>
                      <button className="mt-2 px-3 py-1 bg-[var(--color-success)] text-white rounded text-sm">
                        Voir Archives
                      </button>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <Activity className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className="font-medium">Audit Trail</p>
                      <p className="text-sm text-[var(--color-text-primary)] mt-1">Toutes modifications</p>
                      <button className="mt-2 px-3 py-1 bg-purple-600 text-white rounded text-sm">
                        Consulter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-[var(--color-primary-lighter)] text-[var(--color-primary)] p-2 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Nouvelle Période de Clôture</h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
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
                    <AlertTriangle className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-[var(--color-primary-darker)] mb-1">Configuration de Période</h4>
                      <p className="text-sm text-[var(--color-primary-darker)]">Créez une nouvelle période de clôture avec ses paramètres et échéances.</p>
                    </div>
                  </div>
                </div>

                {/* Period Configuration */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Configuration de Base</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Nom de la Période</label>
                      <input type="text" className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Clôture Septembre 2024" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Type de Clôture</label>
                      <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Sélectionner le type --</option>
                        <option value="mensuelle">Mensuelle</option>
                        <option value="trimestrielle">Trimestrielle</option>
                        <option value="semestrielle">Semestrielle</option>
                        <option value="annuelle">Annuelle</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Date de Début</label>
                      <input type="date" className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Date de Fin</label>
                      <input type="date" className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Deadlines */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Échéances et Délais</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Date Limite Saisie</label>
                      <input type="date" className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Date Limite Validation</label>
                      <input type="date" className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Date Limite Contrôles</label>
                      <input type="date" className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Date de Clôture Définitive</label>
                      <input type="date" className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Responsibilities */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Responsabilités</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Responsable Principal</label>
                      <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Sélectionner responsable --</option>
                        <option value="chef_comptable">Chef Comptable</option>
                        <option value="directeur_financier">Directeur Financier</option>
                        <option value="controleur_gestion">Contrôleur de Gestion</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Validateur Final</label>
                      <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Sélectionner validateur --</option>
                        <option value="directeur_general">Directeur Général</option>
                        <option value="directeur_financier">Directeur Financier</option>
                        <option value="commissaire_comptes">Commissaire aux Comptes</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="notif_email" className="rounded border-[var(--color-border-dark)] text-[var(--color-primary)]" defaultChecked />
                      <label htmlFor="notif_email" className="text-sm text-[var(--color-text-primary)]">Notifications par email</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="rappels_auto" className="rounded border-[var(--color-border-dark)] text-[var(--color-primary)]" defaultChecked />
                      <label htmlFor="rappels_auto" className="text-sm text-[var(--color-text-primary)]">Rappels automatiques</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="alerte_retard" className="rounded border-[var(--color-border-dark)] text-[var(--color-primary)]" />
                      <label htmlFor="alerte_retard" className="text-sm text-[var(--color-text-primary)]">Alertes en cas de retard</label>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Description</label>
                  <textarea className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Description de la période de clôture..."></textarea>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)] px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
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
                className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Valider">
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Créer la Période</span>
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

export default ParametragePeriodes;