import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';
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
  LoadingSpinner
} from '../../components/ui';
import { exerciceService } from '../../services/exercice.service';
import { formatDate, formatCurrency } from '../../lib/utils';
import { toast } from 'react-hot-toast';

const ExercicePage: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const queryClient = useQueryClient();

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
            <h1 className="text-2xl font-bold text-tuatara flex items-center">
              <Calendar className="mr-3 h-7 w-7" />
              Exercices Comptables
            </h1>
            <p className="mt-2 text-rolling-stone">
              Gestion des périodes comptables et clôtures d'exercice
            </p>
          </div>
          <div className="flex space-x-3">
            <Button 
              className="bg-tuatara hover:bg-rolling-stone text-swirl"
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
                <label className="text-sm font-medium text-tuatara block mb-1">
                  Libellé
                </label>
                <p className="text-lg font-semibold text-tuatara">
                  {currentExercice.libelle}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-tuatara block mb-1">
                  Période
                </label>
                <p className="text-gray-900">
                  {formatDate(currentExercice.date_debut)} - {formatDate(currentExercice.date_fin)}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-tuatara block mb-1">
                  Statut
                </label>
                <Badge className={getStatutColor(currentExercice.statut)}>
                  {currentExercice.statut === 'ouvert' ? 'Ouvert' : 
                   currentExercice.statut === 'cloture' ? 'Clôturé' : 'Provisoire'}
                </Badge>
              </div>
              
              <div>
                <label className="text-sm font-medium text-tuatara block mb-1">
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
                  <TableHead>Libellé</TableHead>
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
                        <span className="font-medium text-tuatara">
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
                        <p className="text-gray-500">écritures</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className={`font-semibold ${
                          (exercice.stats?.resultat_net || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {formatCurrency(exercice.stats?.resultat_net || 0)}
                        </p>
                        <p className="text-gray-500">
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
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun exercice</h3>
              <p className="text-gray-500 mb-6">
                Commencez par créer votre premier exercice comptable.
              </p>
              <Button 
                className="bg-tuatara hover:bg-rolling-stone text-swirl"
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
              <h4 className="font-medium text-tuatara mb-2">Étapes préliminaires</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Valider toutes les écritures de l'exercice</li>
                <li>• Effectuer tous les rapprochements bancaires</li>
                <li>• Saisir les écritures de régularisation</li>
                <li>• Vérifier l'équilibre de la balance</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-tuatara mb-2">Opérations de clôture</h4>
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
    </div>
  );
};

export default ExercicePage;