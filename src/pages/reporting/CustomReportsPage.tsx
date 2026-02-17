import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  LayoutDashboard, Plus, FolderOpen, Calendar, RefreshCw,
  Clock, CheckCircle, Users, Activity,
  FileText, TrendingUp, BarChart3, PieChart, LineChart,
  Download, Upload, Send, Play, Pause, StopCircle,
  Settings, Filter, Search, Eye, Edit, Trash2,
  ChevronRight, MoreVertical, ArrowRight, Timer, History,
  Briefcase, Shield, UserCheck, Archive,
  Zap, Database, Cloud, Cpu, Lock, Unlock, Share2,
  MessageSquare, Star, Flag, Tag, Hash, Link,
  Building2, Target, Award, Bookmark, X,
  ShoppingBag, Calculator
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Alert, AlertDescription } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { Progress } from '../../components/ui/Progress';
import NewReportCreator from '../../components/reporting/NewReportCreator';
import {
  ViewReportModal,
  EditReportModal,
  DownloadReportModal,
  ShareModal,
  ScheduleSettingsModal
} from '../../components/reporting/ReportModals';
import { Button, Input } from '../../components/ui';
import { reportingService, createPlanificationSchema } from '../../services/modules/reporting.service';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

interface Rapport {
  id: string;
  nom: string;
  type: 'financier' | 'comptable' | 'commercial' | 'rh' | 'consolidation' | 'personnalise';
  module: string;
  statut: 'en_cours' | 'termine' | 'planifie' | 'erreur' | 'en_attente';
  progression?: number;
  dateCreation: string;
  dateModification: string;
  responsable: string;
  taille?: string;
  format?: string;
  priorite: 'basse' | 'normale' | 'haute' | 'critique';
  tags: string[];
  partage?: string[];
  prochaineLancement?: string;
}

interface Session {
  id: string;
  rapport: string;
  utilisateur: string;
  module: string;
  debut: string;
  duree: string;
  statut: 'active' | 'suspendue' | 'terminee';
  progression: number;
}


const CustomReportsPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showViewReportModal, setShowViewReportModal] = useState(false);
  const [showEditReportModal, setShowEditReportModal] = useState(false);
  const [showDownloadReportModal, setShowDownloadReportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showScheduleSettingsModal, setShowScheduleSettingsModal] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState<Rapport | null>(null);
  const [selectedScheduleData, setSelectedScheduleData] = useState<any>(null);
  const [shareItem, setShareItem] = useState<any>(null);
  const [shareType, setShareType] = useState<'rapport' | 'template'>('rapport');
  const [filterModule, setFilterModule] = useState('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTemplateTab, setActiveTemplateTab] = useState('predefined');
  const [activePlanningTab, setActivePlanningTab] = useState('executions');
  const [formData, setFormData] = useState({
    rapport_id: '',
    frequence: 'mensuelle' as 'quotidienne' | 'hebdomadaire' | 'mensuelle' | 'trimestrielle' | 'annuelle',
    heure_execution: '09:00',
    fuseau_horaire: 'Africa/Douala',
    destinataires: [] as string[],
    destinataires_input: '', // Pour gérer l'input emails
    format: 'pdf' as 'pdf' | 'excel' | 'csv',
    pieces_jointes: true,
    notification_echec: true,
    actif: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Create mutation
  const createMutation = useMutation({
    mutationFn: reportingService.createPlanification,
    onSuccess: () => {
      toast.success('Planification de rapport créée avec succès');
      queryClient.invalidateQueries({ queryKey: ['planifications'] });
      setShowScheduleModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création de la planification');
    },
  });

  const resetForm = () => {
    setFormData({
      rapport_id: '',
      frequence: 'mensuelle',
      heure_execution: '09:00',
      fuseau_horaire: 'Africa/Douala',
      destinataires: [],
      destinataires_input: '',
      format: 'pdf',
      pieces_jointes: true,
      notification_echec: true,
      actif: true,
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: any) => {
    if (field === 'destinataires_input') {
      setFormData(prev => ({ ...prev, destinataires_input: value }));
      // Parser les emails et mettre à jour destinataires
      const emails = value.split(',').map((email: string) => email.trim()).filter((email: string) => email);
      setFormData(prev => ({ ...prev, destinataires: emails }));
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

      // Validate with Zod
      const validatedData = createPlanificationSchema.parse(formData);

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
        toast.error('Erreur lors de la création de la planification');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewReport = (rapport: Rapport) => {
    setSelectedReportData(rapport);
    setShowViewReportModal(true);
  };

  const handleEditReport = (rapport: Rapport) => {
    setSelectedReportData(rapport);
    setShowEditReportModal(true);
  };

  const handleDownloadReport = (rapport: Rapport) => {
    setSelectedReportData(rapport);
    setShowDownloadReportModal(true);
  };

  const handleShareReport = (item: any, type: 'rapport' | 'template') => {
    setShareItem(item);
    setShareType(type);
    setShowShareModal(true);
  };

  const handleScheduleSettings = (schedule: any) => {
    setSelectedScheduleData(schedule);
    setShowScheduleSettingsModal(true);
  };

  const handleSaveReport = (data: any) => {
    toast.success('Rapport modifié avec succès');
  };

  const handleSaveSchedule = (data: any) => {
    toast.success('Planification modifiée avec succès');
  };

  const handlePlaySchedule = (schedule: any) => {
    toast.success('Planification lancée');
  };

  const handlePauseExecution = (execution: any) => {
    toast.success("Exécution mise en pause");
  };

  // Données simulées
  const stats = {
    enCours: 8,
    enRetard: 3,
    termines: 156,
    terminesCeMois: 42,
    sessionsOuvertes: 3,
    utilisateursActifs: 5,
    planifies: 12,
    prochainDans: '2h',
    derniereMAJ: '21/09/2025 09:24:56'
  };

  const rapportsEnCours: Rapport[] = [
    {
      id: '1',
      nom: 'Rapport Financier Q2',
      type: 'financier',
      module: 'Finance',
      statut: 'en_cours',
      progression: 75,
      dateCreation: '13/06/2025',
      dateModification: '13/06/2025 14:30',
      responsable: 'Marie Dupont',
      priorite: 'haute',
      tags: ['Q2', 'Finance', 'Trimestriel']
    },
    {
      id: '2',
      nom: 'Analyse Marketing Juin',
      type: 'commercial',
      module: 'Marketing',
      statut: 'en_cours',
      progression: 45,
      dateCreation: '13/06/2025',
      dateModification: '13/06/2025 11:15',
      responsable: 'Jean Martin',
      priorite: 'normale',
      tags: ['Marketing', 'Mensuel']
    },
    {
      id: '3',
      nom: 'Bilan RH Mensuel',
      type: 'rh',
      module: 'Human Capital',
      statut: 'termine',
      dateCreation: '12/06/2025',
      dateModification: '12/06/2025 16:45',
      responsable: 'Sophie Bernard',
      taille: '2.3 MB',
      format: 'PDF',
      priorite: 'normale',
      tags: ['RH', 'Mensuel', 'Juin']
    }
  ];

  const sessionsActives: Session[] = [
    {
      id: '1',
      rapport: 'Rapport CRM',
      utilisateur: 'Marie Dupont',
      module: 'CRM',
      debut: '13/06/2025 09:00',
      duree: '2h 15min',
      statut: 'active',
      progression: 65
    },
    {
      id: '2',
      rapport: 'Rapport Finance',
      utilisateur: 'Jean Martin',
      module: 'Finance',
      debut: '13/06/2025 10:30',
      duree: '45min',
      statut: 'active',
      progression: 30
    },
    {
      id: '3',
      rapport: 'Rapport Consolidé',
      utilisateur: 'Sophie Bernard',
      module: 'Consolidation',
      debut: '13/06/2025 08:45',
      duree: '3h 30min',
      statut: 'active',
      progression: 80
    }
  ];

  const rapportsPlanifies: Rapport[] = [
    {
      id: '4',
      nom: 'Rapport Mensuel Finance',
      type: 'financier',
      module: 'Finance',
      statut: 'planifie',
      dateCreation: '01/06/2025',
      dateModification: '01/06/2025',
      responsable: 'Marie Dupont',
      prochaineLancement: '01/07/2025 09:00',
      priorite: 'haute',
      tags: ['Finance', 'Mensuel', 'Automatique']
    },
    {
      id: '5',
      nom: 'Analyse Hebdo Marketing',
      type: 'commercial',
      module: 'Marketing',
      statut: 'planifie',
      dateCreation: '01/06/2025',
      dateModification: '01/06/2025',
      responsable: 'Jean Martin',
      prochaineLancement: '17/06/2025 14:00',
      priorite: 'normale',
      tags: ['Marketing', 'Hebdomadaire']
    },
    {
      id: '6',
      nom: 'Dashboard RH',
      type: 'rh',
      module: 'RH',
      statut: 'planifie',
      dateCreation: '01/06/2025',
      dateModification: '01/06/2025',
      responsable: 'Sophie Bernard',
      prochaineLancement: '30/06/2025 16:00',
      priorite: 'normale',
      tags: ['RH', 'Mensuel', 'Dashboard']
    },
    {
      id: '7',
      nom: 'Rapport Consolidé Q3',
      type: 'consolidation',
      module: 'Direction',
      statut: 'planifie',
      dateCreation: '01/06/2025',
      dateModification: '01/06/2025',
      responsable: 'Direction',
      prochaineLancement: '01/07/2025 10:00',
      priorite: 'critique',
      tags: ['Q3', 'Consolidation', 'Trimestriel']
    }
  ];


  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'en_cours': return 'bg-[var(--color-blue-light)] text-[var(--color-blue-primary)]';
      case 'termine': return 'bg-[var(--color-green-light)] text-[var(--color-green-primary)]';
      case 'planifie': return 'bg-[var(--color-purple-light)] text-[var(--color-purple-primary)]';
      case 'erreur': return 'bg-[var(--color-red-light)] text-[var(--color-red-primary)]';
      case 'en_attente': return 'bg-[var(--color-yellow-light)] text-[var(--color-yellow-primary)]';
      default: return 'bg-[var(--color-gray-light)] text-[var(--color-gray-primary)]';
    }
  };

  const getPrioriteColor = (priorite: string) => {
    switch (priorite) {
      case 'critique': return 'text-[var(--color-red-primary)]';
      case 'haute': return 'text-[var(--color-orange-primary)]';
      case 'normale': return 'text-[var(--color-blue-primary)]';
      case 'basse': return 'text-[var(--color-gray-primary)]';
      default: return 'text-[var(--color-gray-primary)]';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'financier': return <TrendingUp className="w-4 h-4" />;
      case 'comptable': return <Calculator className="w-4 h-4" />;
      case 'commercial': return <ShoppingBag className="w-4 h-4" />;
      case 'rh': return <Users className="w-4 h-4" />;
      case 'consolidation': return <Database className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getFrequenceIcon = (frequence: string) => {
    if (frequence.includes('Mensuel')) return <Calendar className="w-3 h-3" />;
    if (frequence.includes('Hebdo')) return <Clock className="w-3 h-3" />;
    if (frequence.includes('Trimestriel')) return <BarChart3 className="w-3 h-3" />;
    return <Calendar className="w-3 h-3" />;
  };

  const DashboardView = () => (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Tableau de Bord des Rapports</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Gestion et suivi de vos rapports</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowNewReportModal(true)}
              className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>CRÉER UN RAPPORT</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-[var(--color-text-secondary)] mb-4">
          Dernière mise à jour : {stats.derniereMAJ}
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Rapports en cours</span>
                <Activity className="w-4 h-4 text-[var(--color-blue-primary)]" />
              </div>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{stats.enCours}</p>
              <p className="text-xs text-[var(--color-red-primary)] mt-1">{stats.enRetard} en retard</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Rapports terminés</span>
                <CheckCircle className="w-4 h-4 text-[var(--color-green-primary)]" />
              </div>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{stats.termines}</p>
              <p className="text-xs text-[var(--color-green-primary)] mt-1">Ce mois: {stats.terminesCeMois}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Sessions ouvertes</span>
                <Users className="w-4 h-4 text-[var(--color-purple-primary)]" />
              </div>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{stats.sessionsOuvertes}</p>
              <p className="text-xs text-[var(--color-purple-primary)] mt-1">{stats.utilisateursActifs} utilisateurs actifs</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Planifiés</span>
                <Calendar className="w-4 h-4 text-[var(--color-orange-primary)]" />
              </div>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{stats.planifies}</p>
              <p className="text-xs text-[var(--color-orange-primary)] mt-1">Prochaine: dans {stats.prochainDans}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Historique des rapports */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-base">Historique des Rapports</span>
                <button className="text-xs text-[var(--color-primary)] hover:underline">VOIR TOUT</button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rapportsEnCours.map(rapport => (
                <div
                  key={rapport.id}
                  className="p-3 border rounded-lg hover:bg-[var(--color-background-secondary)] cursor-pointer transition-colors"
                  onClick={() => setSelectedReport(rapport.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(rapport.type)}
                      <span className="font-medium text-sm">{rapport.nom}</span>
                    </div>
                    <Flag className={`w-4 h-4 ${getPrioriteColor(rapport.priorite)}`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {rapport.module} • {rapport.dateModification}
                    </span>
                  </div>
                  {rapport.progression && (
                    <Progress value={rapport.progression} className="h-1 mt-2" />
                  )}
                </div>
              ))}

              {/* Rapport de sécurité supplémentaire */}
              <div className="p-3 border rounded-lg hover:bg-[var(--color-background-secondary)] cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium text-sm">Rapport Sécurité</span>
                  </div>
                  <Flag className="w-4 h-4 text-[var(--color-orange-primary)]" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Security • 12/06/2025 09:20
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions actives */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-base">Sessions Actives</span>
                <Badge variant="outline" className="text-xs">
                  {sessionsActives.length} actives
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionsActives.map(session => (
                <div key={session.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{session.utilisateur}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        {session.rapport}
                      </p>
                    </div>
                    <button className="p-1 hover:bg-[var(--color-background-hover)] rounded" aria-label="Voir les détails">
                      <Eye className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    </button>
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    Début: {session.debut} • Durée: {session.duree}
                  </div>
                  <Progress value={session.progression} className="h-1" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Rapports planifiés */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-base">Rapports Planifiés</span>
                <button className="text-xs text-[var(--color-primary)] hover:underline">GÉRER</button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rapportsPlanifies.map(rapport => (
                <div key={rapport.id} className="border-l-4 border-[var(--color-primary)] pl-3">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm">{rapport.nom}</span>
                    {getFrequenceIcon(rapport.nom)}
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {rapport.nom.includes('Mensuel') ? 'Mensuel' :
                       rapport.nom.includes('Hebdo') ? 'Hebdomadaire' :
                       rapport.nom.includes('Trimestriel') ? 'Trimestriel' : 'Personnalisé'}
                    </Badge>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      Par: {rapport.responsable}
                    </span>
                  </div>
                  <div className="bg-[var(--color-background-secondary)] rounded px-2 py-1">
                    <p className="text-xs text-[var(--color-text-secondary)]">Prochaine exécution</p>
                    <p className="text-sm font-medium">{rapport.prochaineLancement}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Tableau de Bord
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="w-4 h-4 mr-2" />
            Mes Rapports
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Archive className="w-4 h-4 mr-2" />
            Modèles
          </TabsTrigger>
          <TabsTrigger value="planning">
            <Calendar className="w-4 h-4 mr-2" />
            Planification
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardView />
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-6">
            {/* Header avec actions */}
            <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Mes Rapports</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">Gérez tous vos rapports existants</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowNewReportModal(true)}
                    className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>NOUVEAU RAPPORT</span>
                  </button>
                  <button className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background-secondary)] flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>IMPORTER</span>
                  </button>
                </div>
              </div>

              {/* Filtres et recherche */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Rechercher un rapport..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-64"
                    />
                  </div>
                  <select
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                    className="px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="tous">Tous les modules</option>
                    <option value="Finance">Finance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="RH">RH</option>
                    <option value="CRM">CRM</option>
                    <option value="Consolidation">Consolidation</option>
                  </select>
                  <button className="px-3 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background-secondary)] flex items-center space-x-2">
                    <Filter className="w-4 h-4" />
                    <span>FILTRES</span>
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-[var(--color-text-secondary)]">Affichage:</span>
                  <button className="p-2 border border-[var(--color-border)] rounded hover:bg-[var(--color-background-secondary)]">
                    <LayoutDashboard className="w-4 h-4" />
                  </button>
                  <button className="p-2 border border-[var(--color-border)] rounded hover:bg-[var(--color-background-secondary)]">
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Liste des rapports */}
            <div className="bg-[var(--color-background-primary)] rounded-lg border border-[var(--color-border)]">
              <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-background-secondary)]">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-[var(--color-text-secondary)]">
                  <div className="col-span-3">Nom du rapport</div>
                  <div className="col-span-2">Type/Module</div>
                  <div className="col-span-1">Statut</div>
                  <div className="col-span-2">Dernière modification</div>
                  <div className="col-span-2">Responsable</div>
                  <div className="col-span-1">Taille</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {rapportsEnCours.concat([
                  {
                    id: '8',
                    nom: 'Analyse Trimestrielle',
                    type: 'financier',
                    module: 'Finance',
                    statut: 'termine',
                    dateCreation: '10/06/2025',
                    dateModification: '15/06/2025 10:30',
                    responsable: 'Marie Dupont',
                    taille: '4.2 MB',
                    format: 'PDF',
                    priorite: 'haute',
                    tags: ['Q2', 'Finance', 'Trimestriel']
                  },
                  {
                    id: '9',
                    nom: 'Dashboard Commercial',
                    type: 'commercial',
                    module: 'CRM',
                    statut: 'en_cours',
                    progression: 90,
                    dateCreation: '08/06/2025',
                    dateModification: '20/06/2025 16:45',
                    responsable: 'Jean Martin',
                    taille: '1.8 MB',
                    priorite: 'normale',
                    tags: ['CRM', 'Commercial', 'Dashboard']
                  },
                  {
                    id: '10',
                    nom: 'Rapport Consolidé Annuel',
                    type: 'consolidation',
                    module: 'Direction',
                    statut: 'erreur',
                    dateCreation: '05/06/2025',
                    dateModification: '18/06/2025 08:15',
                    responsable: 'Sophie Bernard',
                    taille: '12.5 MB',
                    priorite: 'critique',
                    tags: ['Annuel', 'Consolidation', 'Direction']
                  }
                ]).map(rapport => (
                  <div key={rapport.id} className="p-4 hover:bg-[var(--color-background-secondary)] transition-colors">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3">
                        <div className="flex items-center space-x-3">
                          {getTypeIcon(rapport.type)}
                          <div>
                            <p className="font-medium text-sm text-[var(--color-text-primary)]">{rapport.nom}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              {rapport.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-[var(--color-text-primary)] capitalize">{rapport.type}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{rapport.module}</p>
                      </div>
                      <div className="col-span-1">
                        <Badge className={getStatutColor(rapport.statut)}>
                          {rapport.statut === 'en_cours' ? 'En cours' :
                           rapport.statut === 'termine' ? 'Terminé' :
                           rapport.statut === 'erreur' ? 'Erreur' : rapport.statut}
                        </Badge>
                        {rapport.progression && (
                          <Progress value={rapport.progression} className="h-1 mt-1" />
                        )}
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-[var(--color-text-primary)]">{rapport.dateModification}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Créé: {rapport.dateCreation}</p>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-[var(--color-text-inverse)] text-xs">
                            {rapport.responsable.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-sm text-[var(--color-text-primary)]">{rapport.responsable}</span>
                        </div>
                      </div>
                      <div className="col-span-1">
                        <p className="text-sm text-[var(--color-text-primary)]">{rapport.taille || '-'}</p>
                        {rapport.format && (
                          <p className="text-xs text-[var(--color-text-secondary)]">{rapport.format}</p>
                        )}
                      </div>
                      <div className="col-span-1">
                        <div className="flex items-center space-x-1">
                          <button type="button" onClick={() => handleViewReport(rapport)} className="p-1 hover:bg-[var(--color-background-hover)] rounded" title="Voir">
                            <Eye className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          </button>
                          <button type="button" onClick={() => handleEditReport(rapport)} className="p-1 hover:bg-[var(--color-background-hover)] rounded" title={t('common.edit')}>
                            <Edit className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          </button>
                          <button type="button" onClick={() => handleDownloadReport(rapport)} className="p-1 hover:bg-[var(--color-background-hover)] rounded" title={t('actions.download')}>
                            <Download className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          </button>
                          <button type="button" onClick={() => handleShareReport(rapport, 'rapport')} className="p-1 hover:bg-[var(--color-background-hover)] rounded" title="Plus d'actions">
                            <MoreVertical className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            <div className="bg-[var(--color-background-primary)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[var(--color-text-secondary)]">
                  Affichage de 1 à 6 sur 47 rapports
                </div>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 border border-[var(--color-border)] rounded hover:bg-[var(--color-background-secondary)] text-sm">
                    Précédent
                  </button>
                  <button className="px-3 py-1 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded text-sm">1</button>
                  <button className="px-3 py-1 border border-[var(--color-border)] rounded hover:bg-[var(--color-background-secondary)] text-sm">2</button>
                  <button className="px-3 py-1 border border-[var(--color-border)] rounded hover:bg-[var(--color-background-secondary)] text-sm">3</button>
                  <span className="px-2 text-sm text-[var(--color-text-secondary)]">...</span>
                  <button className="px-3 py-1 border border-[var(--color-border)] rounded hover:bg-[var(--color-background-secondary)] text-sm">8</button>
                  <button className="px-3 py-1 border border-[var(--color-border)] rounded hover:bg-[var(--color-background-secondary)] text-sm">
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="space-y-6">
            {/* Header avec actions */}
            <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Modèles de Rapports</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">Bibliothèque de modèles prédéfinis et personnalisés</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowNewReportModal(true)}
                    className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>CRÉER UN MODÈLE</span>
                  </button>
                  <button className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background-secondary)] flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>IMPORTER</span>
                  </button>
                  <button className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background-secondary)] flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>EXPORTER</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-tabs pour les modèles */}
            <div className="bg-[var(--color-background-primary)] rounded-lg border border-[var(--color-border)] mb-6">
              <div className="flex border-b border-[var(--color-border)]">
                <button
                  onClick={() => setActiveTemplateTab('predefined')}
                  className={`flex items-center px-4 py-3 text-sm font-medium ${
                    activeTemplateTab === 'predefined'
                      ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-[var(--color-background-secondary)]'
                      : 'text-gray-700 hover:text-gray-700'
                  }`}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Modèles Prédéfinis
                </button>
                <button
                  onClick={() => setActiveTemplateTab('personal')}
                  className={`flex items-center px-4 py-3 text-sm font-medium ${
                    activeTemplateTab === 'personal'
                      ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-[var(--color-background-secondary)]'
                      : 'text-gray-700 hover:text-gray-700'
                  }`}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Mes Modèles
                </button>
              </div>
            </div>

            {activeTemplateTab === 'predefined' && (
                <div className="space-y-6">
                  {/* Catégories */}
                  <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">Catégories:</span>
                      <div className="flex items-center space-x-2">
                        <button className="px-3 py-1 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-full text-sm">Tous</button>
                        <button className="px-3 py-1 border border-[var(--color-border)] rounded-full text-sm hover:bg-[var(--color-background-secondary)]">Financier</button>
                        <button className="px-3 py-1 border border-[var(--color-border)] rounded-full text-sm hover:bg-[var(--color-background-secondary)]">Commercial</button>
                        <button className="px-3 py-1 border border-[var(--color-border)] rounded-full text-sm hover:bg-[var(--color-background-secondary)]">RH</button>
                        <button className="px-3 py-1 border border-[var(--color-border)] rounded-full text-sm hover:bg-[var(--color-background-secondary)]">Consolidation</button>
                      </div>
                    </div>
                  </div>

                  {/* Modèles prédéfinis */}
                  <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-[var(--color-text-primary)]">Modèles Prédéfinis</h4>
                      <Badge variant="outline">12 modèles</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                      {[
                        {
                          id: 1,
                          nom: 'Rapport Financier Standard',
                          type: 'financier',
                          description: 'Modèle complet pour rapports financiers avec bilan, compte de résultat et tableaux de flux',
                          modules: ['Finance', 'Comptabilité'],
                          utilisations: 156,
                          dateCreation: '01/01/2025',
                          preview: 'https://example.com/preview1.jpg'
                        },
                        {
                          id: 2,
                          nom: 'Dashboard Commercial',
                          type: 'commercial',
                          description: 'Tableau de bord commercial avec indicateurs de vente, pipeline et performance équipes',
                          modules: ['CRM', 'Ventes'],
                          utilisations: 89,
                          dateCreation: '15/01/2025',
                          preview: 'https://example.com/preview2.jpg'
                        },
                        {
                          id: 3,
                          nom: 'Bilan RH Mensuel',
                          type: 'rh',
                          description: 'Rapport RH avec effectifs, recrutements, formations et indicateurs sociaux',
                          modules: ['RH', 'Paie'],
                          utilisations: 67,
                          dateCreation: '20/01/2025',
                          preview: 'https://example.com/preview3.jpg'
                        },
                        {
                          id: 4,
                          nom: 'Analyse Marketing',
                          type: 'commercial',
                          description: 'Rapport marketing avec ROI campagnes, leads générés et conversion',
                          modules: ['Marketing', 'CRM'],
                          utilisations: 43,
                          dateCreation: '05/02/2025',
                          preview: 'https://example.com/preview4.jpg'
                        },
                        {
                          id: 5,
                          nom: 'Consolidation Groupe',
                          type: 'consolidation',
                          description: 'Rapport de consolidation multi-entités avec éliminations et retraitements',
                          modules: ['Consolidation', 'Finance'],
                          utilisations: 28,
                          dateCreation: '10/02/2025',
                          preview: 'https://example.com/preview5.jpg'
                        },
                        {
                          id: 6,
                          nom: 'Tableau de Bord Direction',
                          type: 'consolidation',
                          description: 'Dashboard exécutif avec KPIs stratégiques et analyses de performance',
                          modules: ['Direction', 'Finance', 'Commercial'],
                          utilisations: 91,
                          dateCreation: '25/02/2025',
                          preview: 'https://example.com/preview6.jpg'
                        }
                      ].map(modele => (
                        <div key={modele.id} className="border border-[var(--color-border)] rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                          <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <div className="text-center">
                              {getTypeIcon(modele.type)}
                              <p className="text-xs text-[var(--color-text-secondary)] mt-2">Aperçu</p>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-sm text-[var(--color-text-primary)]">{modele.nom}</h5>
                              <Badge className={getStatutColor('termine')} variant="outline">
                                {modele.type}
                              </Badge>
                            </div>
                            <p className="text-xs text-[var(--color-text-secondary)] mb-3 line-clamp-2">{modele.description}</p>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {modele.modules.map(module => (
                                <Badge key={module} variant="outline" className="text-xs">
                                  {module}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] mb-3">
                              <span>{modele.utilisations} utilisations</span>
                              <span>Créé: {modele.dateCreation}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button className="flex-1 px-3 py-1 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded text-xs hover:bg-[var(--color-primary-dark)]">
                                UTILISER
                              </button>
                              <button type="button" onClick={() => handleViewReport(template as any)} className="px-2 py-1 border border-[var(--color-border)] rounded text-xs hover:bg-[var(--color-background-secondary)]">
                                <Eye className="w-3 h-3" />
                              </button>
                              <button className="px-2 py-1 border border-[var(--color-border)] rounded text-xs hover:bg-[var(--color-background-secondary)]">
                                <Star className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Statistiques d'utilisation */}
                  <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
                    <h4 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Statistiques d'Utilisation</h4>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-[var(--color-primary)]">12</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Modèles prédéfinis</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[var(--color-primary)]">464</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Utilisations totales</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[var(--color-primary)]">89%</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Taux d'adoption</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[var(--color-primary)]">92%</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Satisfaction</p>
                      </div>
                    </div>
                  </div>
                </div>
            )}

            {activeTemplateTab === 'personal' && (
                <div className="space-y-6">
                  {/* Modèles personnalisés */}
                  <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-[var(--color-text-primary)]">Mes Modèles Personnalisés</h4>
                      <Badge variant="outline">3 modèles</Badge>
                    </div>
                    <div className="space-y-4">
                      {[
                        {
                          id: 7,
                          nom: 'Rapport Performance Magasins',
                          type: 'commercial',
                          description: 'Modèle personnalisé pour analyser la performance des points de vente',
                          createur: 'Jean Martin',
                          dateCreation: '15/03/2025',
                          derniereModification: '20/03/2025',
                          utilisations: 12,
                          partage: 'Équipe Commercial'
                        },
                        {
                          id: 8,
                          nom: 'Analyse Coûts Projets',
                          type: 'financier',
                          description: 'Suivi détaillé des coûts et marges par projet avec alertes budgétaires',
                          createur: 'Marie Dupont',
                          dateCreation: '01/03/2025',
                          derniereModification: '18/03/2025',
                          utilisations: 8,
                          partage: 'Direction'
                        },
                        {
                          id: 9,
                          nom: 'Dashboard Formation',
                          type: 'rh',
                          description: 'Tableau de bord formation avec plan, réalisations et évaluations',
                          createur: 'Sophie Bernard',
                          dateCreation: '10/03/2025',
                          derniereModification: '15/03/2025',
                          utilisations: 5,
                          partage: 'Service RH'
                        }
                      ].map(modele => (
                        <div key={modele.id} className="border border-[var(--color-border)] rounded-lg p-4 hover:bg-[var(--color-background-secondary)]">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                {getTypeIcon(modele.type)}
                                <h5 className="font-medium text-sm text-[var(--color-text-primary)]">{modele.nom}</h5>
                                <Badge className={getStatutColor('termine')} variant="outline">
                                  Personnalisé
                                </Badge>
                              </div>
                              <p className="text-xs text-[var(--color-text-secondary)] mb-2">{modele.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-[var(--color-text-secondary)]">
                                <span>Créé par: {modele.createur}</span>
                                <span>Utilisations: {modele.utilisations}</span>
                                <span>Partagé: {modele.partage}</span>
                                <span>Modifié: {modele.derniereModification}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button className="px-3 py-1 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded text-xs hover:bg-[var(--color-primary-dark)]">
                                UTILISER
                              </button>
                              <button type="button" onClick={() => handleEditReport(template as any)} className="px-2 py-1 border border-[var(--color-border)] rounded text-xs hover:bg-[var(--color-background-secondary)]">
                                <Edit className="w-3 h-3" />
                              </button>
                              <button type="button" onClick={() => handleShareReport(template, 'template')} className="px-2 py-1 border border-[var(--color-border)] rounded text-xs hover:bg-[var(--color-background-secondary)]">
                                <Share2 className="w-3 h-3" />
                              </button>
                              <button className="px-2 py-1 border border-[var(--color-border)] rounded text-xs hover:bg-[var(--color-background-secondary)]">
                                <MoreVertical className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Statistiques personnelles */}
                  <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
                    <h4 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Mes Statistiques</h4>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-[var(--color-primary)]">3</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Modèles créés</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[var(--color-primary)]">25</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Utilisations totales</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[var(--color-primary)]">2</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Modèles partagés</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[var(--color-primary)]">85%</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Satisfaction moyenne</p>
                      </div>
                    </div>
                  </div>
                </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="planning">
          <div className="space-y-6">
            {/* Header avec actions */}
            <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Planification des Rapports</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">Gérez vos rapports automatisés et programmés</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>NOUVEAU PLANNING</span>
                  </button>
                  <button className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background-secondary)] flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>CALENDRIER</span>
                  </button>
                  <button type="button" onClick={() => toast.info('Paramètres globaux')} className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background-secondary)] flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>PARAMÈTRES</span>
                  </button>
                </div>
              </div>

              {/* Statistiques rapides */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-[var(--color-blue-light)] rounded-lg p-4 text-center">
                  <p className="text-lg font-bold text-[var(--color-blue-primary)]">12</p>
                  <p className="text-sm text-blue-700">Planifiés</p>
                </div>
                <div className="bg-[var(--color-green-light)] rounded-lg p-4 text-center">
                  <p className="text-lg font-bold text-[var(--color-green-primary)]">8</p>
                  <p className="text-sm text-green-700">Actifs</p>
                </div>
                <div className="bg-[var(--color-orange-light)] rounded-lg p-4 text-center">
                  <p className="text-lg font-bold text-[var(--color-orange-primary)]">3</p>
                  <p className="text-sm text-orange-700">En pause</p>
                </div>
                <div className="bg-[var(--color-purple-light)] rounded-lg p-4 text-center">
                  <p className="text-lg font-bold text-[var(--color-purple-primary)]">1</p>
                  <p className="text-sm text-purple-700">{t('common.error')}</p>
                </div>
              </div>
            </div>

            {/* Sub-tabs pour la planification */}
            <div className="bg-[var(--color-background-primary)] rounded-lg border border-[var(--color-border)] mb-6">
              <div className="flex border-b border-[var(--color-border)]">
                <button
                  onClick={() => setActivePlanningTab('executions')}
                  className={`flex items-center px-4 py-3 text-sm font-medium ${
                    activePlanningTab === 'executions'
                      ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-[var(--color-background-secondary)]'
                      : 'text-gray-700 hover:text-gray-700'
                  }`}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Prochaines Exécutions
                </button>
                <button
                  onClick={() => setActivePlanningTab('scheduled')}
                  className={`flex items-center px-4 py-3 text-sm font-medium ${
                    activePlanningTab === 'scheduled'
                      ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-[var(--color-background-secondary)]'
                      : 'text-gray-700 hover:text-gray-700'
                  }`}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Rapports Planifiés
                </button>
                <button
                  onClick={() => setActivePlanningTab('history')}
                  className={`flex items-center px-4 py-3 text-sm font-medium ${
                    activePlanningTab === 'history'
                      ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-[var(--color-background-secondary)]'
                      : 'text-gray-700 hover:text-gray-700'
                  }`}
                >
                  <History className="w-4 h-4 mr-2" />
                  Historique
                </button>
              </div>
            </div>

            {activePlanningTab === 'executions' && (
                <div className="space-y-6">
                  {/* Vue calendrier */}
                  <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-[var(--color-text-primary)]">Prochaines Exécutions</h4>
                      <div className="flex items-center space-x-2">
                        <button className="px-3 py-1 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded text-sm">{t('common.today')}</button>
                        <button className="px-3 py-1 border border-[var(--color-border)] rounded text-sm hover:bg-[var(--color-background-secondary)]">Cette semaine</button>
                        <button className="px-3 py-1 border border-[var(--color-border)] rounded text-sm hover:bg-[var(--color-background-secondary)]">Ce mois</button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        {
                          heure: '09:00',
                          rapport: 'Rapport Financier Quotidien',
                          type: 'financier',
                          frequence: 'Quotidien',
                          statut: 'En attente',
                          destinataires: ['Marie Dupont', 'Direction']
                        },
                        {
                          heure: '14:00',
                          rapport: 'Dashboard Commercial',
                          type: 'commercial',
                          frequence: 'Quotidien',
                          statut: 'En attente',
                          destinataires: ['Équipe Ventes']
                        },
                        {
                          heure: '18:00',
                          rapport: 'Consolidation Hebdomadaire',
                          type: 'consolidation',
                          frequence: 'Hebdomadaire',
                          statut: 'En attente',
                          destinataires: ['Direction Générale']
                        }
                      ].map((planning, index) => (
                        <div key={index} className="flex items-center p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background-secondary)]">
                          <div className="w-16 text-center">
                            <p className="font-bold text-[var(--color-primary)]">{planning.heure}</p>
                          </div>
                          <div className="flex-1 ml-4">
                            <div className="flex items-center space-x-2 mb-1">
                              {getTypeIcon(planning.type)}
                              <h5 className="font-medium text-sm text-[var(--color-text-primary)]">{planning.rapport}</h5>
                              <Badge variant="outline" className="text-xs">{planning.frequence}</Badge>
                            </div>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              Destinataires: {planning.destinataires.join(', ')}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-yellow-100 text-yellow-700">{planning.statut}</Badge>
                            <button type="button" onClick={() => handlePlaySchedule(planning)} className="p-1 hover:bg-[var(--color-background-hover)] rounded">
                              <Play className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            </button>
                            <button type="button" onClick={() => handleScheduleSettings(planning)} className="p-1 hover:bg-[var(--color-background-hover)] rounded">
                              <Settings className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
            )}

            {activePlanningTab === 'scheduled' && (
                <div className="space-y-6">
                  {/* Rapports planifiés */}
                  <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-[var(--color-text-primary)]">Tous les Rapports Planifiés</h4>
                      <div className="flex items-center space-x-2">
                        <select className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                          <option>Tous les statuts</option>
                          <option>Actifs</option>
                          <option>En pause</option>
                          <option>{t('common.error')}</option>
                        </select>
                        <select className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                          <option>Toutes les fréquences</option>
                          <option>Quotidien</option>
                          <option>Hebdomadaire</option>
                          <option>Mensuel</option>
                          <option>Trimestriel</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {rapportsPlanifies.map(rapport => (
                        <div key={rapport.id} className="border border-[var(--color-border)] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              {getTypeIcon(rapport.type)}
                              <div>
                                <h5 className="font-medium text-sm text-[var(--color-text-primary)]">{rapport.nom}</h5>
                                <p className="text-xs text-[var(--color-text-secondary)]">{rapport.module}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatutColor(rapport.statut)}>
                                {rapport.statut === 'planifie' ? 'Actif' : rapport.statut}
                              </Badge>
                              <div className="flex items-center space-x-1">
                                <button type="button" onClick={() => handlePauseExecution(execution)} className="p-1 hover:bg-[var(--color-background-hover)] rounded" title="Pause">
                                  <Pause className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                </button>
                                <button type="button" onClick={() => handleEditReport(execution as any)} className="p-1 hover:bg-[var(--color-background-hover)] rounded" title={t('common.edit')}>
                                  <Edit className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                </button>
                                <button type="button" className="p-1 hover:bg-[var(--color-background-hover)] rounded" title="Historique">
                                  <History className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                </button>
                                <button type="button" className="p-1 hover:bg-[var(--color-background-hover)] rounded" title="Plus">
                                  <MoreVertical className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-[var(--color-text-secondary)] text-xs">Fréquence</p>
                              <p className="font-medium">
                                {rapport.nom.includes('Mensuel') ? 'Mensuel' :
                                 rapport.nom.includes('Hebdo') ? 'Hebdomadaire' :
                                 rapport.nom.includes('Trimestriel') ? 'Trimestriel' : 'Personnalisé'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[var(--color-text-secondary)] text-xs">Prochaine exécution</p>
                              <p className="font-medium">{rapport.prochaineLancement}</p>
                            </div>
                            <div>
                              <p className="text-[var(--color-text-secondary)] text-xs">Responsable</p>
                              <p className="font-medium">{rapport.responsable}</p>
                            </div>
                            <div>
                              <p className="text-[var(--color-text-secondary)] text-xs">Dernière exécution</p>
                              <p className="font-medium text-[var(--color-green-primary)]">Succès - 20/06/2025</p>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-[var(--color-text-secondary)]">
                                Envoyé par email à: Direction, Finance, Comptabilité
                              </div>
                              <div className="flex items-center space-x-4 text-xs text-[var(--color-text-secondary)]">
                                <span>Créé: {rapport.dateCreation}</span>
                                <span>Modifié: {rapport.dateModification}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
            )}

            {activePlanningTab === 'history' && (
                <div className="space-y-6">
                  {/* Historique d'exécution */}
                  <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-[var(--color-text-primary)]">Historique d'Exécution</h4>
                      <div className="flex items-center space-x-2">
                        <select className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                          <option>Derniers 30 jours</option>
                          <option>Derniers 7 jours</option>
                          <option>Derniers 90 jours</option>
                          <option>Cette année</option>
                        </select>
                        <select className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                          <option>Tous les statuts</option>
                          <option>Succès uniquement</option>
                          <option>Erreurs uniquement</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[
                        {
                          date: '21/09/2025 09:00',
                          rapport: 'Rapport Financier Quotidien',
                          statut: 'Succès',
                          duree: '2min 15s',
                          destinataires: 5,
                          taille: '1.2 MB'
                        },
                        {
                          date: '21/09/2025 08:30',
                          rapport: 'Dashboard RH',
                          statut: 'Succès',
                          duree: '1min 45s',
                          destinataires: 3,
                          taille: '0.8 MB'
                        },
                        {
                          date: '20/09/2025 18:00',
                          rapport: 'Consolidation Hebdomadaire',
                          statut: 'Erreur',
                          duree: '45s',
                          destinataires: 0,
                          erreur: 'Source de données indisponible'
                        },
                        {
                          date: '20/09/2025 14:00',
                          rapport: 'Dashboard Commercial',
                          statut: 'Succès',
                          duree: '3min 20s',
                          destinataires: 8,
                          taille: '2.1 MB'
                        },
                        {
                          date: '20/09/2025 09:00',
                          rapport: 'Rapport Financier Quotidien',
                          statut: 'Succès',
                          duree: '2min 05s',
                          destinataires: 5,
                          taille: '1.1 MB'
                        },
                        {
                          date: '19/09/2025 18:00',
                          rapport: 'Bilan RH Hebdomadaire',
                          statut: 'Succès',
                          duree: '4min 12s',
                          destinataires: 12,
                          taille: '3.2 MB'
                        }
                      ].map((execution, index) => (
                        <div key={index} className="flex items-center p-3 border border-[var(--color-border)] rounded hover:bg-[var(--color-background-secondary)]">
                          <div className="w-32 text-xs text-[var(--color-text-secondary)]">
                            {execution.date}
                          </div>
                          <div className="flex-1 ml-4">
                            <p className="font-medium text-sm text-[var(--color-text-primary)]">{execution.rapport}</p>
                            {execution.erreur && (
                              <p className="text-xs text-[var(--color-red-primary)]">{execution.erreur}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-[var(--color-text-secondary)]">
                            <span>Durée: {execution.duree}</span>
                            <span>Envoyé à {execution.destinataires} destinataires</span>
                            {execution.taille && <span>Taille: {execution.taille}</span>}
                          </div>
                          <Badge className={execution.statut === 'Succès' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {execution.statut}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Statistiques d'historique */}
                  <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
                    <h4 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Statistiques des Exécutions</h4>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-[var(--color-primary)]">247</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Exécutions totales</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[var(--color-green-primary)]">98.2%</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Taux de succès</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[var(--color-blue-primary)]">2.3 min</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Durée moyenne</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[var(--color-purple-primary)]">156</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Destinataires touchés</p>
                      </div>
                    </div>
                  </div>
                </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Header avec actions */}
            <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Analytique des Rapports</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">Analyses et statistiques de performance</p>
                </div>
                <div className="flex items-center space-x-3">
                  <select className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                    <option>Derniers 30 jours</option>
                    <option>Derniers 7 jours</option>
                    <option>Derniers 90 jours</option>
                    <option>Cette année</option>
                  </select>
                  <button className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background-secondary)] flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>EXPORTER</span>
                  </button>
                  <button className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background-secondary)] flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4" />
                    <span>ACTUALISER</span>
                  </button>
                </div>
              </div>

              {/* KPIs principaux */}
              <div className="grid grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-[var(--color-blue-primary)]" />
                    <span className="text-sm text-[var(--color-green-primary)] font-medium">+12%</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">247</p>
                  <p className="text-sm text-blue-700">Rapports générés</p>
                  <p className="text-xs text-[var(--color-blue-primary)] mt-1">ce mois</p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-8 h-8 text-[var(--color-green-primary)]" />
                    <span className="text-sm text-[var(--color-green-primary)] font-medium">-8%</span>
                  </div>
                  <p className="text-lg font-bold text-green-900">2.3 min</p>
                  <p className="text-sm text-green-700">Temps moyen</p>
                  <p className="text-xs text-[var(--color-green-primary)] mt-1">génération</p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-8 h-8 text-[var(--color-purple-primary)]" />
                    <span className="text-sm text-[var(--color-green-primary)] font-medium">+5%</span>
                  </div>
                  <p className="text-lg font-bold text-purple-900">98.2%</p>
                  <p className="text-sm text-purple-700">Taux de réussite</p>
                  <p className="text-xs text-[var(--color-purple-primary)] mt-1">exécutions</p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 text-[var(--color-orange-primary)]" />
                    <span className="text-sm text-[var(--color-green-primary)] font-medium">+18%</span>
                  </div>
                  <p className="text-lg font-bold text-orange-900">24</p>
                  <p className="text-sm text-orange-700">Utilisateurs actifs</p>
                  <p className="text-xs text-[var(--color-orange-primary)] mt-1">ce mois</p>
                </div>
              </div>
            </div>

            {/* Graphiques d'analyse */}
            <div className="grid grid-cols-2 gap-6">
              {/* Volume des rapports */}
              <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-[var(--color-text-primary)]">Volume des Rapports</h4>
                  <select className="px-2 py-1 border border-[var(--color-border)] rounded text-xs">
                    <option>Par jour</option>
                    <option>Par semaine</option>
                    <option>Par mois</option>
                  </select>
                </div>
                <div className="h-64 bg-[var(--color-background-secondary)] rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-[var(--color-primary)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--color-text-secondary)]">Graphique volume des rapports</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">247 rapports générés ce mois</p>
                  </div>
                </div>
              </div>

              {/* Performance par type */}
              <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
                <h4 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Performance par Type</h4>
                <div className="h-64 bg-[var(--color-background-secondary)] rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 text-[var(--color-primary)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--color-text-secondary)]">Répartition par type de rapport</p>
                  </div>
                </div>
              </div>
            </div>


            {/* Tendances et insights */}
            <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
              <h4 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Tendances et Insights</h4>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center mb-3">
                    <LineChart className="w-8 h-8 text-[var(--color-blue-primary)]" />
                  </div>
                  <h5 className="font-medium text-sm text-[var(--color-text-primary)] mb-1">Pic d'activité</h5>
                  <p className="text-xs text-[var(--color-text-secondary)]">Les rapports sont principalement générés entre 9h et 11h</p>
                </div>
                <div className="text-center">
                  <div className="h-32 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center mb-3">
                    <Target className="w-8 h-8 text-[var(--color-green-primary)]" />
                  </div>
                  <h5 className="font-medium text-sm text-[var(--color-text-primary)] mb-1">Optimisation</h5>
                  <p className="text-xs text-[var(--color-text-secondary)]">Temps de génération réduit de 15% ce mois grâce aux optimisations</p>
                </div>
                <div className="text-center">
                  <div className="h-32 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg flex items-center justify-center mb-3">
                    <Award className="w-8 h-8 text-[var(--color-purple-primary)]" />
                  </div>
                  <h5 className="font-medium text-sm text-[var(--color-text-primary)] mb-1">Popularité</h5>
                  <p className="text-xs text-[var(--color-text-secondary)]">Les rapports financiers représentent 45% du volume total</p>
                </div>
              </div>
            </div>

            {/* Alertes et recommandations */}
            <div className="bg-[var(--color-background-primary)] rounded-lg p-6 border border-[var(--color-border)]">
              <h4 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Alertes et Recommandations</h4>
              <div className="space-y-3">
                <Alert className="border-yellow-200 bg-[var(--color-yellow-light)]">
                  <Zap className="w-4 h-4 text-[var(--color-yellow-primary)]" />
                  <AlertDescription className="text-yellow-800">
                    <strong>Performance:</strong> Le rapport "Consolidation Groupe" prend en moyenne 45% plus de temps à générer que les autres rapports.
                  </AlertDescription>
                </Alert>
                <Alert className="border-blue-200 bg-[var(--color-blue-light)]">
                  <TrendingUp className="w-4 h-4 text-[var(--color-blue-primary)]" />
                  <AlertDescription className="text-blue-800">
                    <strong>Tendance:</strong> Augmentation de 23% de l'utilisation des rapports financiers ce mois.
                  </AlertDescription>
                </Alert>
                <Alert className="border-green-200 bg-[var(--color-green-light)]">
                  <CheckCircle className="w-4 h-4 text-[var(--color-green-primary)]" />
                  <AlertDescription className="text-green-800">
                    <strong>Succès:</strong> Taux de réussite des rapports planifiés: 98.2% (objectif: 95%).
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de création de nouveau rapport */}
      <NewReportCreator
        isOpen={showNewReportModal}
        onClose={() => setShowNewReportModal(false)}
      />

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Planifier un Rapport</h2>
              </div>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  resetForm();
                }}
                className="text-gray-700 hover:text-gray-700"
                disabled={isSubmitting}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Info alert */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Timer className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Planification Automatique</h4>
                      <p className="text-sm text-blue-800">Configurez l'exécution automatique de vos rapports selon une fréquence définie. Les rapports seront générés et distribués automatiquement.</p>
                    </div>
                  </div>
                </div>

                {/* Report Selection */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Sélection du Rapport</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rapport à planifier *</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.rapport_id}
                        onChange={(e) => handleInputChange('rapport_id', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="">Sélectionner un rapport existant</option>
                        <option value="financier_q2">Rapport Financier Q2</option>
                        <option value="marketing_mensuel">Analyse Marketing Mensuelle</option>
                        <option value="rh_trimestriel">Rapport RH Trimestriel</option>
                        <option value="consolidation_annuel">Consolidation Annuelle</option>
                        <option value="dashboard_commercial">Dashboard Commercial</option>
                      </select>
                      {errors.rapport_id && (
                        <p className="mt-1 text-sm text-red-600">{errors.rapport_id}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Schedule Configuration */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Configuration de la Planification</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fréquence *</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.frequence}
                        onChange={(e) => handleInputChange('frequence', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="quotidienne">Quotidienne</option>
                        <option value="hebdomadaire">Hebdomadaire</option>
                        <option value="mensuelle">Mensuelle</option>
                        <option value="trimestrielle">Trimestrielle</option>
                        <option value="annuelle">Annuelle</option>
                      </select>
                      {errors.frequence && (
                        <p className="mt-1 text-sm text-red-600">{errors.frequence}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Heure d'exécution *</label>
                      <Input
                        type="time"
                        value={formData.heure_execution}
                        onChange={(e) => handleInputChange('heure_execution', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.heure_execution && (
                        <p className="mt-1 text-sm text-red-600">{errors.heure_execution}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fuseau horaire *</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.fuseau_horaire}
                        onChange={(e) => handleInputChange('fuseau_horaire', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="Africa/Douala">Africa/Douala</option>
                        <option value="UTC">UTC</option>
                        <option value="Europe/Paris">Europe/Paris</option>
                      </select>
                      {errors.fuseau_horaire && (
                        <p className="mt-1 text-sm text-red-600">{errors.fuseau_horaire}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Output Configuration */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Configuration de Sortie</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Format de sortie *</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.format}
                        onChange={(e) => handleInputChange('format', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="pdf">PDF</option>
                        <option value="excel">Excel (XLSX)</option>
                        <option value="csv">CSV</option>
                      </select>
                      {errors.format && (
                        <p className="mt-1 text-sm text-red-600">{errors.format}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Distribution */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Distribution</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Destinataires (emails séparés par des virgules) *</label>
                      <Input
                        placeholder="marie.dupont@exemple.com, jean.martin@exemple.com"
                        value={formData.destinataires_input}
                        onChange={(e) => handleInputChange('destinataires_input', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.destinataires && (
                        <p className="mt-1 text-sm text-red-600">{errors.destinataires}</p>
                      )}
                      {formData.destinataires.length > 0 && (
                        <p className="mt-1 text-sm text-green-600">
                          {formData.destinataires.length} destinataire(s) : {formData.destinataires.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Advanced Options */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Options Avancées</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="pieces_jointes"
                        checked={formData.pieces_jointes}
                        onChange={(e) => handleInputChange('pieces_jointes', e.target.checked)}
                        disabled={isSubmitting}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="pieces_jointes" className="text-sm text-gray-700">
                        Inclure les pièces jointes
                      </label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="notification_echec"
                        checked={formData.notification_echec}
                        onChange={(e) => handleInputChange('notification_echec', e.target.checked)}
                        disabled={isSubmitting}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="notification_echec" className="text-sm text-gray-700">
                        Notifier en cas d'échec
                      </label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="actif"
                        checked={formData.actif}
                        onChange={(e) => handleInputChange('actif', e.target.checked)}
                        disabled={isSubmitting}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="actif" className="text-sm text-gray-700">
                        Planification active
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Valider">
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Créer la planification</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales */}
      <ViewReportModal
        isOpen={showViewReportModal}
        onClose={() => setShowViewReportModal(false)}
        rapport={selectedReportData}
      />

      <EditReportModal
        isOpen={showEditReportModal}
        onClose={() => setShowEditReportModal(false)}
        rapport={selectedReportData}
        onSave={handleSaveReport}
      />

      <DownloadReportModal
        isOpen={showDownloadReportModal}
        onClose={() => setShowDownloadReportModal(false)}
        rapport={selectedReportData}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        item={shareItem}
        type={shareType}
      />

      <ScheduleSettingsModal
        isOpen={showScheduleSettingsModal}
        onClose={() => setShowScheduleSettingsModal(false)}
        schedule={selectedScheduleData}
        onSave={handleSaveSchedule}
      />
    </div>
  );
};

export default CustomReportsPage;