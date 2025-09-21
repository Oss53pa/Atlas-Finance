import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  User,
  Calendar,
  BarChart,
  ArrowRight,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import {
  Alert,
  AlertDescription
} from '../../components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../../components/ui/dialog';

interface ClosureProcedure {
  id: string;
  numeroAloture: string;
  libelle: string;
  typeCloture: {
    nom: string;
    frequence: string;
    niveauCloture: string;
  };
  exercice: {
    name: string;
    startDate: string;
    endDate: string;
  };
  dateDebutPeriode: string;
  dateFinPeriode: string;
  statut: 'PLANIFIEE' | 'EN_COURS' | 'EN_ATTENTE_APPROBATION' | 'CLOTUE' | 'REJETEE';
  pourcentageAvancement: number;
  responsableCloture: {
    firstName: string;
    lastName: string;
  };
  nombreAnomalies: number;
  nombreAnomaliesCritiques: number;
  ecartBalance: number;
  dateDebutCloture?: string;
  dateFinCloture?: string;
  etapes: ClosureStep[];
}

interface ClosureStep {
  id: string;
  numeroEtape: string;
  nomEtape: string;
  typeEtape: string;
  description: string;
  obligatoire: boolean;
  automatique: boolean;
  statut: 'EN_ATTENTE' | 'EN_COURS' | 'COMPLETEE' | 'ERREUR' | 'IGNOREE';
  dateDebut?: string;
  dateFin?: string;
  dureePrevueHeures: number;
  messagesErreur?: string;
  controles: ClosureControl[];
}

interface ClosureControl {
  id: string;
  nomControle: string;
  typeControle: string;
  niveauCriticite: 'INFO' | 'AVERTISSEMENT' | 'BLOQUANT';
  execute: boolean;
  resultatConforme?: boolean;
  valeurConstatee?: number;
  nombreAnomalies: number;
  messageResultat?: string;
}

const ClosurePage: React.FC = () => {
  const [selectedProcedure, setSelectedProcedure] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'monitoring'>('list');

  const queryClient = useQueryClient();

  const { data: procedures, isLoading } = useQuery({
    queryKey: ['closure-procedures', selectedPeriod],
    queryFn: async (): Promise<ClosureProcedure[]> => {
      // Mock data - remplacer par vraie API
      return [
        {
          id: '1',
          numeroAloture: 'CLO-202408-MENS-251430',
          libelle: 'Clôture Mensuelle Août 2024',
          typeCloture: {
            nom: 'Clôture Mensuelle Standard',
            frequence: 'MENSUELLE',
            niveauCloture: 'PROVISOIRE'
          },
          exercice: {
            name: '2024',
            startDate: '2024-01-01',
            endDate: '2024-12-31'
          },
          dateDebutPeriode: '2024-08-01',
          dateFinPeriode: '2024-08-31',
          statut: 'EN_COURS',
          pourcentageAvancement: 65,
          responsableCloture: {
            firstName: 'Marie',
            lastName: 'Dubois'
          },
          nombreAnomalies: 3,
          nombreAnomaliesCritiques: 0,
          ecartBalance: 0.00,
          dateDebutCloture: '2024-09-01T08:00:00Z',
          etapes: [
            {
              id: '1',
              numeroEtape: '1.0',
              nomEtape: 'Contrôles préalables',
              typeEtape: 'CONTROLE',
              description: 'Vérifications avant clôture',
              obligatoire: true,
              automatique: true,
              statut: 'COMPLETEE',
              dateDebut: '2024-09-01T08:00:00Z',
              dateFin: '2024-09-01T08:15:00Z',
              dureePrevueHeures: 0.25,
              controles: [
                {
                  id: '1',
                  nomControle: 'Équilibre de la balance',
                  typeControle: 'BALANCE',
                  niveauCriticite: 'BLOQUANT',
                  execute: true,
                  resultatConforme: true,
                  valeurConstatee: 0.00,
                  nombreAnomalies: 0,
                  messageResultat: 'Balance équilibrée'
                }
              ]
            },
            {
              id: '2',
              numeroEtape: '2.0',
              nomEtape: 'Amortissements',
              typeEtape: 'CALCUL',
              description: 'Calcul et comptabilisation des amortissements',
              obligatoire: true,
              automatique: true,
              statut: 'COMPLETEE',
              dateDebut: '2024-09-01T08:15:00Z',
              dateFin: '2024-09-01T08:45:00Z',
              dureePrevueHeures: 0.5,
              controles: []
            },
            {
              id: '3',
              numeroEtape: '3.0',
              nomEtape: 'Provisions',
              typeEtape: 'CALCUL',
              description: 'Calcul et comptabilisation des provisions',
              obligatoire: true,
              automatique: false,
              statut: 'EN_COURS',
              dateDebut: '2024-09-01T08:45:00Z',
              dureePrevueHeures: 1.0,
              controles: [
                {
                  id: '2',
                  nomControle: 'Provisions clients douteux',
                  typeControle: 'PROVISIONS',
                  niveauCriticite: 'AVERTISSEMENT',
                  execute: true,
                  resultatConforme: false,
                  nombreAnomalies: 2,
                  messageResultat: '2 créances nécessitent une provision'
                }
              ]
            },
            {
              id: '4',
              numeroEtape: '4.0',
              nomEtape: 'Régularisations',
              typeEtape: 'ECRITURE',
              description: 'Écritures de régularisation',
              obligatoire: true,
              automatique: false,
              statut: 'EN_ATTENTE',
              dureePrevueHeures: 2.0,
              controles: []
            }
          ]
        }
      ];
    }
  });

  const startClosureMutation = useMutation({
    mutationFn: async (procedureId: string) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return procedureId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closure-procedures'] });
    }
  });

  const approveClosureMutation = useMutation({
    mutationFn: async (procedureId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return procedureId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closure-procedures'] });
    }
  });

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'PLANIFIEE': return 'bg-gray-100 text-gray-800';
      case 'EN_COURS': return 'bg-blue-100 text-blue-800';
      case 'EN_ATTENTE_APPROBATION': return 'bg-yellow-100 text-yellow-800';
      case 'CLOTUE': return 'bg-green-100 text-green-800';
      case 'REJETEE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStepStatusIcon = (statut: string) => {
    switch (statut) {
      case 'COMPLETEE': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'EN_COURS': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'ERREUR': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'EN_ATTENTE': return <Clock className="h-5 w-5 text-gray-400" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const formatDuration = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    }
    return `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clôtures Périodiques</h1>
            <p className="text-gray-600">Orchestration des processus de clôture SYSCOHADA</p>
          </div>
          <div className="flex space-x-4">
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">Vue Liste</SelectItem>
                <SelectItem value="details">Détails</SelectItem>
                <SelectItem value="monitoring">Monitoring</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Play className="h-4 w-4 mr-2" />
              Nouvelle Clôture
            </Button>
          </div>
        </div>
      </div>

      {/* Vue Liste */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 gap-6">
          {procedures?.map((procedure) => (
            <Card key={procedure.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{procedure.libelle}</CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {procedure.dateDebutPeriode} → {procedure.dateFinPeriode}
                      </span>
                      <span className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {procedure.responsableCloture.firstName} {procedure.responsableCloture.lastName}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(procedure.statut)}>
                      {procedure.statut === 'PLANIFIEE' ? 'Planifiée' :
                       procedure.statut === 'EN_COURS' ? 'En Cours' :
                       procedure.statut === 'EN_ATTENTE_APPROBATION' ? 'En Attente' :
                       procedure.statut === 'CLOTUE' ? 'Clôturée' : 'Rejetée'}
                    </Badge>
                    {procedure.nombreAnomaliesCritiques > 0 && (
                      <Badge className="bg-red-100 text-red-800">
                        {procedure.nombreAnomaliesCritiques} critique(s)
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progression */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Avancement</span>
                      <span className="text-sm text-gray-600">{procedure.pourcentageAvancement}%</span>
                    </div>
                    <Progress value={procedure.pourcentageAvancement} className="h-2" />
                  </div>

                  {/* Informations clés */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Type de clôture</p>
                      <p className="font-medium">{procedure.typeCloture.nom}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Étapes</p>
                      <p className="font-medium">
                        {procedure.etapes.filter(e => e.statut === 'COMPLETEE').length} / {procedure.etapes.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Anomalies</p>
                      <p className="font-medium">
                        {procedure.nombreAnomalies} 
                        {procedure.nombreAnomaliesCritiques > 0 && (
                          <span className="text-red-600"> ({procedure.nombreAnomaliesCritiques} critiques)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Étapes en cours */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Étapes</p>
                    <div className="space-y-2">
                      {procedure.etapes.slice(0, 3).map((etape) => (
                        <div key={etape.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            {getStepStatusIcon(etape.statut)}
                            <span className="text-sm">{etape.nomEtape}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {etape.controles.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {etape.controles.filter(c => c.resultatConforme).length}/{etape.controles.length} contrôles
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">{formatDuration(etape.dureePrevueHeures)}</span>
                          </div>
                        </div>
                      ))}
                      {procedure.etapes.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{procedure.etapes.length - 3} autres étapes
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setSelectedProcedure(procedure.id)}
                        variant="outline"
                        size="sm"
                      >
                        <BarChart className="h-4 w-4 mr-1" />
                        Détails
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        Journal
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      {procedure.statut === 'PLANIFIEE' && (
                        <Button 
                          onClick={() => startClosureMutation.mutate(procedure.id)}
                          size="sm"
                          disabled={startClosureMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Démarrer
                        </Button>
                      )}
                      {procedure.statut === 'EN_ATTENTE_APPROBATION' && (
                        <Button 
                          onClick={() => approveClosureMutation.mutate(procedure.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={approveClosureMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approuver
                        </Button>
                      )}
                      {procedure.statut === 'EN_COURS' && (
                        <Button variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Actualiser
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) || []}
        </div>
      )}

      {/* Vue Détails */}
      {viewMode === 'details' && selectedProcedure && (
        <div className="space-y-6">
          {(() => {
            const procedure = procedures?.find(p => p.id === selectedProcedure);
            if (!procedure) return null;

            return (
              <>
                {/* En-tête de la procédure */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{procedure.libelle}</CardTitle>
                        <p className="text-gray-600">{procedure.numeroAloture}</p>
                      </div>
                      <Badge className={`${getStatusColor(procedure.statut)} text-lg px-4 py-2`}>
                        {procedure.statut === 'EN_COURS' ? 'En Cours' : procedure.statut}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-sm text-gray-600">Avancement Global</p>
                        <div className="mt-2">
                          <Progress value={procedure.pourcentageAvancement} className="h-3" />
                          <p className="text-lg font-bold text-center mt-1">{procedure.pourcentageAvancement}%</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Étapes Complétées</p>
                        <p className="text-2xl font-bold text-green-600">
                          {procedure.etapes.filter(e => e.statut === 'COMPLETEE').length}
                        </p>
                        <p className="text-sm text-gray-500">sur {procedure.etapes.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Anomalies</p>
                        <p className="text-2xl font-bold text-yellow-600">{procedure.nombreAnomalies}</p>
                        <p className="text-sm text-gray-500">
                          {procedure.nombreAnomaliesCritiques} critique(s)
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Équilibre Balance</p>
                        <p className={`text-2xl font-bold ${procedure.ecartBalance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {procedure.ecartBalance.toFixed(2)} XAF
                        </p>
                        <p className="text-sm text-gray-500">Écart</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline des étapes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Progression des Étapes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {procedure.etapes.map((etape, index) => (
                        <div key={etape.id} className="relative">
                          {/* Ligne de connexion */}
                          {index < procedure.etapes.length - 1 && (
                            <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
                          )}
                          
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              {getStepStatusIcon(etape.statut)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {etape.numeroEtape} - {etape.nomEtape}
                                  </h4>
                                  <p className="text-sm text-gray-600">{etape.description}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className={
                                    etape.automatique ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'
                                  }>
                                    {etape.automatique ? 'Auto' : 'Manuel'}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {formatDuration(etape.dureePrevueHeures)}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Contrôles de l'étape */}
                              {etape.controles.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {etape.controles.map((controle) => (
                                    <div key={controle.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                      <div className="flex items-center space-x-2">
                                        {controle.resultatConforme ? 
                                          <CheckCircle className="h-4 w-4 text-green-500" /> :
                                          <AlertTriangle className="h-4 w-4 text-red-500" />
                                        }
                                        <span>{controle.nomControle}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Badge className={
                                          controle.niveauCriticite === 'BLOQUANT' ? 'bg-red-100 text-red-800' :
                                          controle.niveauCriticite === 'AVERTISSEMENT' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-blue-100 text-blue-800'
                                        }>
                                          {controle.niveauCriticite}
                                        </Badge>
                                        {controle.nombreAnomalies > 0 && (
                                          <span className="text-red-600 font-medium">
                                            {controle.nombreAnomalies} anomalie(s)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Messages d'erreur */}
                              {etape.messagesErreur && (
                                <Alert className="mt-3">
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription>{etape.messagesErreur}</AlertDescription>
                                </Alert>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </div>
      )}

      {/* Vue Monitoring */}
      {viewMode === 'monitoring' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Statistiques temps réel */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques Temps Réel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {procedures?.map((procedure) => (
                  <div key={procedure.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{procedure.libelle}</span>
                      <Badge className={getStatusColor(procedure.statut)}>
                        {procedure.pourcentageAvancement}%
                      </Badge>
                    </div>
                    <Progress value={procedure.pourcentageAvancement} className="h-2" />
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                      <span>
                        {procedure.etapes.filter(e => e.statut === 'COMPLETEE').length} / {procedure.etapes.length} étapes
                      </span>
                      <span>
                        {procedure.nombreAnomalies} anomalie(s)
                      </span>
                    </div>
                  </div>
                )) || []}
              </div>
            </CardContent>
          </Card>

          {/* Alertes et Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Alertes et Actions Requises</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {procedures?.flatMap(p => 
                  p.etapes
                    .filter(e => e.statut === 'ERREUR' || e.controles.some(c => !c.resultatConforme))
                    .map(etape => (
                      <Alert key={`${p.id}-${etape.id}`}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{p.libelle}</span>
                              <span className="text-sm text-gray-600"> - {etape.nomEtape}</span>
                              {etape.messagesErreur && (
                                <p className="text-sm mt-1">{etape.messagesErreur}</p>
                              )}
                            </div>
                            <Button size="sm" variant="outline">
                              Résoudre
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))
                ) || []}
                
                {procedures?.every(p => p.nombreAnomaliesCritiques === 0) && (
                  <div className="text-center text-gray-500 py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Aucune alerte critique</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClosurePage;