import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Plus,
  Edit,
  Lock,
  Unlock,
  Play,
  Square,
  AlertTriangle,
  CheckCircle,
  FileText,
  X,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  LoadingSpinner,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui';
import { exerciceService } from '../../services/exercice.service';
import { z } from 'zod';
import { formatDate, formatCurrency } from '../../lib/utils';
import { toast } from 'react-hot-toast';

const createExerciceSchema = z.object({
  libelle: z.string().min(1, 'Le libellé est requis'),
  date_debut: z.string().min(1, 'La date de début est requise'),
  date_fin: z.string().min(1, 'La date de fin est requise'),
  type: z.enum(['normal', 'court', 'long', 'exceptionnel']),
  plan_comptable: z.enum(['syscohada', 'pcg', 'ifrs']).optional(),
  devise: z.string().optional(),
  cloture_anticipee: z.boolean().optional(),
  reouverture_auto: z.boolean().optional(),
});

const ExercicePage: React.FC = () => {
  const { t } = useLanguage();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [formData, setFormData] = useState({
    libelle: '',
    date_debut: '',
    date_fin: '',
    type: 'normal' as 'normal' | 'court' | 'long' | 'exceptionnel',
    plan_comptable: 'syscohada' as 'syscohada' | 'pcg' | 'ifrs',
    devise: 'XAF',
    cloture_anticipee: false,
    reouverture_auto: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Create exercice mutation
  const createExerciceMutation = useMutation({
    mutationFn: exerciceService.createExercice,
    onSuccess: () => {
      toast.success('Exercice créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['exercices'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création de l\'exercice');
    },
  });

  // Fetch exercices list
  const { data: exercices, isLoading } = useQuery({
    queryKey: ['exercices', 'list'],
    queryFn: exerciceService.getExercices,
  });

  // Fetch current exercice
  const { data: currentExercice } = useQuery({
    queryKey: ['exercices', 'current'],
    queryFn: exerciceService.getCurrentExercice,
  });

  // Close exercice mutation
  const closeExerciceMutation = useMutation({
    mutationFn: exerciceService.closeExercice,
    onSuccess: () => {
      toast.success('Exercice clôturé avec succès');
      queryClient.invalidateQueries({ queryKey: ['exercices'] });
    },
    onError: () => {
      toast.error('Erreur lors de la clôture');
    }
  });

  // Reopen exercice mutation
  const reopenExerciceMutation = useMutation({
    mutationFn: exerciceService.reopenExercice,
    onSuccess: () => {
      toast.success('Exercice réouvert avec succès');
      queryClient.invalidateQueries({ queryKey: ['exercices'] });
    },
    onError: () => {
      toast.error('Erreur lors de la réouverture');
    }
  });

  const handleCloseExercice = (exerciceId: string) => {
    if (confirm('Êtes-vous sûr de vouloir clôturer cet exercice ? Cette action nécessite une validation.')) {
      closeExerciceMutation.mutate(exerciceId);
    }
  };

  const handleReopenExercice = (exerciceId: string) => {
    if (confirm('Êtes-vous sûr de vouloir réouvrir cet exercice ?')) {
      reopenExerciceMutation.mutate(exerciceId);
    }
  };

  const handleExportExercices = (format: 'csv' | 'excel' | 'pdf') => {
    if (!exercices || exercices.length === 0) {
      toast.error('Aucun exercice à exporter');
      return;
    }

    // Préparer les données pour l'export
    const exportData = exercices.map(exercice => ({
      'Libellé': exercice.libelle,
      'Date de début': formatDate(exercice.date_debut),
      'Date de fin': formatDate(exercice.date_fin),
      'Durée (mois)': exercice.duree_mois,
      'Statut': exercice.statut === 'ouvert' ? 'Ouvert' : exercice.statut === 'cloture' ? 'Clôturé' : 'Provisoire',
      'Nombre d\'écritures': exercice.stats?.total_ecritures || 0,
      'Résultat net': formatCurrency(exercice.stats?.resultat_net || 0),
      'Type résultat': (exercice.stats?.resultat_net || 0) >= 0 ? 'Bénéfice' : 'Perte',
      'Plan comptable': exercice.plan_comptable?.toUpperCase() || 'SYSCOHADA',
      'Devise': exercice.devise || 'XAF'
    }));

    if (format === 'csv') {
      // Export CSV
      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(';'),
        ...exportData.map(row => headers.map(header => row[header]).join(';'))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `exercices_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Export CSV réussi !');
    } else if (format === 'excel') {
      // Export Excel (format tabulé pour compatibilité)
      const headers = Object.keys(exportData[0]);
      const excelContent = [
        headers.join('\t'),
        ...exportData.map(row => headers.map(header => row[header]).join('\t'))
      ].join('\n');

      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `exercices_${new Date().toISOString().split('T')[0]}.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Export Excel réussi !');
    } else if (format === 'pdf') {
      // Pour PDF, on pourrait utiliser une librairie comme jsPDF
      toast.info('Export PDF en cours de développement');
    }

    setShowExportMenu(false);
  };

  const resetForm = () => {
    setFormData({
      libelle: '',
      date_debut: '',
      date_fin: '',
      type: 'normal',
      plan_comptable: 'syscohada',
      devise: 'XAF',
      cloture_anticipee: false,
      reouverture_auto: false,
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      const validatedData = createExerciceSchema.parse(formData);

      // Submit to backend
      await createExerciceMutation.mutateAsync(validatedData);
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
        toast.error('Erreur lors de la création de l\'exercice');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatutColor = (statut: string) => {
    const colors: Record<string, string> = {
      'ouvert': 'bg-green-100 text-green-800',
      'cloture': 'bg-red-100 text-red-800',
      'provisoire': 'bg-yellow-100 text-yellow-800'
    };
    return colors[statut] || 'bg-gray-100 text-gray-800';
  };

  const getStatutIcon = (statut: string) => {
    const icons: Record<string, React.ReactNode> = {
      'ouvert': <Play className="h-4 w-4" />,
      'cloture': <Square className="h-4 w-4" />,
      'provisoire': <AlertTriangle className="h-4 w-4" />
    };
    return icons[statut] || <Calendar className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des exercices..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <Calendar className="mr-3 h-7 w-7" />
              Exercices Comptables
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              Gestion des périodes comptables et clôtures d'exercice
            </p>
          </div>
          <div className="flex space-x-3">
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="border-[#171717] text-[#171717] hover:bg-[#171717]/10"
              >
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <button
                    onClick={() => handleExportExercices('csv')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <FileText className="w-4 h-4 text-[#171717]" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={() => handleExportExercices('excel')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#737373]" />
                    <span>Export Excel</span>
                  </button>
                  <button
                    onClick={() => handleExportExercices('pdf')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 text-gray-700"
                    disabled
                  >
                    <FileText className="w-4 h-4" />
                    <span>Export PDF (bientôt)</span>
                  </button>
                </div>
              )}
            </div>
            <Button
              className="bg-[#171717] hover:bg-[#737373] text-white"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvel Exercice
            </Button>
          </div>
        </div>
      </div>

      {/* Current Exercice Summary */}
      {currentExercice && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
              Exercice Courant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
                  Libellé
                </label>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {currentExercice.libelle}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
                  Période
                </label>
                <p className="text-gray-900">
                  {formatDate(currentExercice.date_debut)} - {formatDate(currentExercice.date_fin)}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
                  Statut
                </label>
                <Badge className={getStatutColor(currentExercice.statut)}>
                  {currentExercice.statut === 'ouvert' ? 'Ouvert' : 
                   currentExercice.statut === 'cloture' ? 'Clôturé' : 'Provisoire'}
                </Badge>
              </div>
              
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
                  Durée (mois)
                </label>
                <p className="text-gray-900 font-semibold">
                  {currentExercice.duree_mois} mois
                </p>
              </div>
            </div>
            
            {currentExercice.statut === 'ouvert' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-800">
                      Écritures de l'exercice: {currentExercice.stats?.total_ecritures || 0}
                    </span>
                  </div>
                  <div className="text-sm text-blue-700">
                    Montant total: {formatCurrency(currentExercice.stats?.montant_total || 0)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Exercices List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Historique des Exercices</span>
            <Badge variant="outline">
              {exercices?.length || 0} exercice(s)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accounting.label')}</TableHead>
                  <TableHead>Date de début</TableHead>
                  <TableHead>Date de fin</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Écritures</TableHead>
                  <TableHead>Résultat</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exercices?.map((exercice) => (
                  <TableRow key={exercice.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center">
                        {currentExercice?.id === exercice.id && (
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        )}
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {exercice.libelle}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(exercice.date_debut)}
                    </TableCell>
                    <TableCell>
                      {formatDate(exercice.date_fin)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {exercice.duree_mois} mois
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatutColor(exercice.statut)}>
                        <div className="flex items-center">
                          {getStatutIcon(exercice.statut)}
                          <span className="ml-1">
                            {exercice.statut === 'ouvert' ? 'Ouvert' : 
                             exercice.statut === 'cloture' ? 'Clôturé' : 'Provisoire'}
                          </span>
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{exercice.stats?.total_ecritures || 0}</p>
                        <p className="text-gray-700">écritures</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className={`font-semibold ${
                          (exercice.stats?.resultat_net || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {formatCurrency(exercice.stats?.resultat_net || 0)}
                        </p>
                        <p className="text-gray-700">
                          {(exercice.stats?.resultat_net || 0) >= 0 ? 'Bénéfice' : 'Perte'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Voir les détails"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        
                        {exercice.statut === 'ouvert' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCloseExercice(exercice.id)}
                            className="text-red-600 hover:text-red-700"
                            aria-label="Clôturer l'exercice"
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        ) : exercice.statut === 'cloture' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReopenExercice(exercice.id)}
                            className="text-green-600 hover:text-green-700"
                            aria-label="Réouvrir l'exercice"
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        ) : null}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {(!exercices || exercices.length === 0) && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun exercice</h3>
              <p className="text-gray-700 mb-6">
                Commencez par créer votre premier exercice comptable.
              </p>
              <Button 
                className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer un exercice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clôture Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-orange-600" />
            Procédure de Clôture d'Exercice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)] mb-2">Étapes préliminaires</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Valider toutes les écritures de l'exercice</li>
                <li>• Effectuer tous les rapprochements bancaires</li>
                <li>• Saisir les écritures de régularisation</li>
                <li>• Vérifier l'équilibre de la balance</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)] mb-2">Opérations de clôture</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Calcul automatique du résultat</li>
                <li>• Génération des écritures de clôture</li>
                <li>• Report des soldes (à nouveau)</li>
                <li>• Édition des documents légaux</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Important</p>
                <p>
                  La clôture d'un exercice est une opération définitive qui ne peut être annulée facilement. 
                  Assurez-vous que tous les contrôles ont été effectués avant de procéder.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Exercice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Nouvel Exercice Comptable</h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
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
                    <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Nouvel Exercice</h4>
                      <p className="text-sm text-blue-800">Créez un nouvel exercice comptable pour une nouvelle période. Assurez-vous que les dates ne se chevauchent pas avec un exercice existant.</p>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Informations Générales</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Libellé de l'exercice *</label>
                      <Input
                        placeholder="Exercice 2024"
                        value={formData.libelle}
                        onChange={(e) => handleInputChange('libelle', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.libelle && (
                        <p className="mt-1 text-sm text-red-600">{errors.libelle}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnelle)</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        placeholder="Description de l'exercice..."
                      />
                    </div>
                  </div>
                </div>

                {/* Period Configuration */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Période de l'Exercice</h3>
                  <div className="space-y-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPeriodModal(true)}
                      className="w-full justify-start text-left border-gray-300 hover:bg-[#171717]/5 hover:border-[#171717]"
                      disabled={isSubmitting}
                    >
                      <Calendar className="w-4 h-4 mr-2 text-[#171717]" />
                      <span className="flex-1">
                        {formData.date_debut && formData.date_fin
                          ? `Du ${new Date(formData.date_debut).toLocaleDateString('fr-FR')} au ${new Date(formData.date_fin).toLocaleDateString('fr-FR')}`
                          : 'Sélectionner la période de l\'exercice'
                        }
                      </span>
                    </Button>
                    {(errors.date_debut || errors.date_fin) && (
                      <p className="text-sm text-red-600">
                        {errors.date_debut || errors.date_fin}
                      </p>
                    )}
                    {formData.date_debut && formData.date_fin && (
                      <div className="bg-[#171717]/5 border border-[#171717]/20 rounded-lg p-3">
                        <p className="text-sm text-gray-600">Durée de l'exercice :</p>
                        <p className="text-sm font-medium text-[#171717]">
                          {Math.round((new Date(formData.date_fin).getTime() - new Date(formData.date_debut).getTime()) / (1000 * 60 * 60 * 24 * 30))} mois
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Configuration Options */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type d'exercice *</label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => handleInputChange('type', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Exercice normal (12 mois)</SelectItem>
                          <SelectItem value="court">Exercice court (&lt; 12 mois)</SelectItem>
                          <SelectItem value="long">Exercice long (&gt; 12 mois)</SelectItem>
                          <SelectItem value="exceptionnel">Exercice exceptionnel</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.type && (
                        <p className="mt-1 text-sm text-red-600">{errors.type}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Statut initial</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ouvert">Ouvert</SelectItem>
                          <SelectItem value="provisoire">Provisoire</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Plan Comptable */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Plan Comptable</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Référentiel comptable *</label>
                      <Select
                        value={formData.plan_comptable}
                        onValueChange={(value) => handleInputChange('plan_comptable', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le référentiel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="syscohada">SYSCOHADA</SelectItem>
                          <SelectItem value="pcg">Plan Comptable Général</SelectItem>
                          <SelectItem value="ifrs">IFRS</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.plan_comptable && (
                        <p className="mt-1 text-sm text-red-600">{errors.plan_comptable}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Settings */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Paramètres Avancés</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="reouverture_auto"
                        checked={formData.reouverture_auto}
                        onChange={(e) => handleInputChange('reouverture_auto', e.target.checked)}
                        disabled={isSubmitting}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="reouverture_auto" className="text-sm text-gray-700">
                        Réouverture automatique à l'exercice suivant
                      </label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="validation_requise"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        defaultChecked
                      />
                      <label htmlFor="validation_requise" className="text-sm text-gray-700">
                        Validation requise pour les écritures
                      </label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="auto_numerotation"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        defaultChecked
                      />
                      <label htmlFor="auto_numerotation" className="text-sm text-gray-700">
                        Numérotation automatique des pièces
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
                  setShowCreateModal(false);
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
                    <LoadingSpinner size="sm" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Créer l'exercice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Period Selector Modal */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => {
          setFormData(prev => ({
            ...prev,
            date_debut: newDateRange.start,
            date_fin: newDateRange.end
          }));
          setDateRange(newDateRange);
        }}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default ExercicePage;