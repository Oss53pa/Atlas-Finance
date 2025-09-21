import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  DownloadIcon,
  RefreshCwIcon,
  ClockIcon,
  BarChart3Icon,
  TrendingDownIcon
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Progress,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui';

interface CarryForwardBalance {
  id: string;
  account: {
    code: string;
    name: string;
    accountClass: string;
  };
  thirdParty?: {
    name: string;
    type: string;
  };
  closingBalanceDebit: number;
  closingBalanceCredit: number;
  netBalance: number;
  balanceSide: 'DEBIT' | 'CREDIT' | 'ZERO';
  isValidated: boolean;
  validationErrors: string[];
  processedDate: string;
}

interface ResultAllocation {
  id: string;
  fiscalYear: string;
  assemblyDate: string;
  netResult: number;
  legalReservesAmount: number;
  statutoryReservesAmount: number;
  optionalReservesAmount: number;
  dividendsAmount: number;
  carriedForwardAmount: number;
  totalAllocated: number;
  allocationBalance: number;
  isApproved: boolean;
  isRecorded: boolean;
}

interface ContinuityControl {
  id: string;
  controlType: string;
  controlName: string;
  metricName: string;
  currentValue: number;
  thresholdValue: number;
  criticalThreshold: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isCompliant: boolean;
  deviationPercentage: number;
  recommendations: string[];
}

const CarryForwardManager: React.FC = () => {
  const [selectedView, setSelectedView] = useState<'balances' | 'allocation' | 'controls'>('balances');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('2024');

  const queryClient = useQueryClient();

  const { data: carryForwards, isLoading: carryForwardsLoading } = useQuery({
    queryKey: ['carry-forward-balances', selectedFiscalYear],
    queryFn: async (): Promise<CarryForwardBalance[]> => {
      // Mock data
      return [
        {
          id: '1',
          account: { code: '101', name: 'Capital social', accountClass: '1' },
          closingBalanceDebit: 0,
          closingBalanceCredit: 3000000,
          netBalance: 3000000,
          balanceSide: 'CREDIT',
          isValidated: true,
          validationErrors: [],
          processedDate: '2024-12-31T23:59:59Z'
        },
        {
          id: '2',
          account: { code: '411001', name: 'Client ABC SARL', accountClass: '4' },
          thirdParty: { name: 'ABC SARL', type: 'CUSTOMER' },
          closingBalanceDebit: 850000,
          closingBalanceCredit: 0,
          netBalance: 850000,
          balanceSide: 'DEBIT',
          isValidated: true,
          validationErrors: [],
          processedDate: '2024-12-31T23:59:59Z'
        },
        {
          id: '3',
          account: { code: '521', name: 'Banque SGBC', accountClass: '5' },
          closingBalanceDebit: 1250000,
          closingBalanceCredit: 0,
          netBalance: 1250000,
          balanceSide: 'DEBIT',
          isValidated: false,
          validationErrors: ['Rapprochement bancaire incomplet'],
          processedDate: '2024-12-31T23:59:59Z'
        }
      ];
    }
  });

  const { data: resultAllocation } = useQuery({
    queryKey: ['result-allocation', selectedFiscalYear],
    queryFn: async (): Promise<ResultAllocation> => {
      return {
        id: '1',
        fiscalYear: '2024',
        assemblyDate: '2025-04-30',
        netResult: 1450000,
        legalReservesAmount: 72500,
        statutoryReservesAmount: 100000,
        optionalReservesAmount: 200000,
        dividendsAmount: 500000,
        carriedForwardAmount: 577500,
        totalAllocated: 872500,
        allocationBalance: 0,
        isApproved: false,
        isRecorded: false
      };
    }
  });

  const { data: continuityControls } = useQuery({
    queryKey: ['continuity-controls', selectedFiscalYear],
    queryFn: async (): Promise<ContinuityControl[]> => {
      return [
        {
          id: '1',
          controlType: 'LIQUIDITY',
          controlName: 'Ratio de liquidité générale',
          metricName: 'CURRENT_RATIO',
          currentValue: 1.8,
          thresholdValue: 1.2,
          criticalThreshold: 1.0,
          riskLevel: 'LOW',
          isCompliant: true,
          deviationPercentage: 50,
          recommendations: ['Maintenir le niveau de liquidité', 'Optimiser la gestion du BFR']
        },
        {
          id: '2',
          controlType: 'SOLVENCY',
          controlName: 'Ratio d\'autonomie financière',
          metricName: 'EQUITY_RATIO',
          currentValue: 45.2,
          thresholdValue: 30,
          criticalThreshold: 20,
          riskLevel: 'LOW',
          isCompliant: true,
          deviationPercentage: 50.7,
          recommendations: ['Structure financière saine', 'Continuer à renforcer les fonds propres']
        },
        {
          id: '3',
          controlType: 'CASH_FLOW',
          controlName: 'Flux de trésorerie d\'exploitation',
          metricName: 'OPERATING_CASH_FLOW',
          currentValue: 2100000,
          thresholdValue: 0,
          criticalThreshold: -500000,
          riskLevel: 'LOW',
          isCompliant: true,
          deviationPercentage: 0,
          recommendations: ['Excellente génération de cash', 'Maintenir l\'efficacité opérationnelle']
        }
      ];
    }
  });

  const generateCarryForwardMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return 'success';
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carry-forward-balances'] });
    }
  });

  const validateAllMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return 'validated';
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carry-forward-balances'] });
    }
  });

  const processAllocationMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return 'processed';
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['result-allocation'] });
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Report à-Nouveaux & Ouverture N+1</h2>
          <p className="text-gray-600">Gestion du passage d'exercice et continuité</p>
        </div>
        <div className="flex space-x-4">
          <Select value={selectedView} onValueChange={setSelectedView}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balances">Reports à-Nouveaux</SelectItem>
              <SelectItem value="allocation">Affectation Résultat</SelectItem>
              <SelectItem value="controls">Contrôles Continuité</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedFiscalYear} onValueChange={setSelectedFiscalYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Vue Reports à-Nouveaux */}
      {selectedView === 'balances' && (
        <div className="space-y-6">
          {/* Actions principales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Reports à-Nouveaux Exercice {selectedFiscalYear}
                <div className="flex space-x-2">
                  <Button
                    onClick={() => generateCarryForwardMutation.mutate()}
                    disabled={generateCarryForwardMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <RefreshCwIcon className="h-4 w-4 mr-2" />
                    Générer RAN
                  </Button>
                  <Button
                    onClick={() => validateAllMutation.mutate()}
                    disabled={validateAllMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Valider Tout
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Total Comptes</p>
                  <p className="text-2xl font-bold text-blue-700">{carryForwards?.length || 0}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Validés</p>
                  <p className="text-2xl font-bold text-green-700">
                    {carryForwards?.filter(cf => cf.isValidated).length || 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600">En Attente</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {carryForwards?.filter(cf => !cf.isValidated).length || 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600">Avec Erreurs</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {carryForwards?.filter(cf => cf.validationErrors.length > 0).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des reports */}
          <Card>
            <CardHeader>
              <CardTitle>Détail des Reports à-Nouveaux</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Compte
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tiers
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Solde Débiteur
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Solde Créditeur
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Solde Net
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {carryForwards?.map((carryForward) => (
                      <tr key={carryForward.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {carryForward.account.code}
                            </div>
                            <div className="text-sm text-gray-500">
                              {carryForward.account.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {carryForward.thirdParty ? carryForward.thirdParty.name : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {carryForward.closingBalanceDebit > 0 ? formatCurrency(carryForward.closingBalanceDebit) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {carryForward.closingBalanceCredit > 0 ? formatCurrency(carryForward.closingBalanceCredit) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {carryForward.balanceSide === 'DEBIT' && (
                              <BarChart3Icon className="h-4 w-4 text-green-500" />
                            )}
                            {carryForward.balanceSide === 'CREDIT' && (
                              <TrendingDownIcon className="h-4 w-4 text-blue-500" />
                            )}
                            <span className={`font-medium ${
                              carryForward.balanceSide === 'DEBIT' ? 'text-green-700' : 'text-blue-700'
                            }`}>
                              {formatCurrency(carryForward.netBalance)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {carryForward.isValidated ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Validé
                            </Badge>
                          ) : carryForward.validationErrors.length > 0 ? (
                            <Badge className="bg-red-100 text-red-800">
                              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                              Erreur
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <ClockIcon className="h-3 w-3 mr-1" />
                              En attente
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex space-x-2 justify-center">
                            <Button variant="outline" size="sm">
                              Détails
                            </Button>
                            {!carryForward.isValidated && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                Valider
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) || []}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vue Affectation Résultat */}
      {selectedView === 'allocation' && resultAllocation && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Affectation du Résultat {resultAllocation.fiscalYear}
                <div className="flex space-x-2">
                  <Button
                    onClick={() => processAllocationMutation.mutate()}
                    disabled={processAllocationMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Comptabiliser
                  </Button>
                  <Button variant="outline">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Résultat à affecter */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Résultat à Affecter</h3>
                  <div className="p-6 bg-green-50 rounded-lg text-center">
                    <p className="text-sm text-green-600">Résultat Net de l'Exercice</p>
                    <p className="text-3xl font-bold text-green-700">
                      {formatCurrency(resultAllocation.netResult)}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      AG du {new Date(resultAllocation.assemblyDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                {/* Affectations détaillées */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Répartition Proposée</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Réserves légales (5%)</span>
                      <span className="font-bold">{formatCurrency(resultAllocation.legalReservesAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Réserves statutaires</span>
                      <span className="font-bold">{formatCurrency(resultAllocation.statutoryReservesAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Réserves facultatives</span>
                      <span className="font-bold">{formatCurrency(resultAllocation.optionalReservesAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Dividendes</span>
                      <span className="font-bold">{formatCurrency(resultAllocation.dividendsAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded border-2 border-blue-200">
                      <span className="text-sm font-medium text-blue-900">Report à nouveau</span>
                      <span className="font-bold text-blue-700">{formatCurrency(resultAllocation.carriedForwardAmount)}</span>
                    </div>
                  </div>

                  {/* Vérification équilibre */}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total affecté</span>
                      <span className="font-bold">{formatCurrency(resultAllocation.totalAllocated + resultAllocation.carriedForwardAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-medium">Résultat disponible</span>
                      <span className="font-bold">{formatCurrency(resultAllocation.netResult)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                      <span className="font-medium">Écart</span>
                      <span className={`font-bold ${resultAllocation.allocationBalance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(resultAllocation.allocationBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Statut */}
                  <div className="flex items-center space-x-4 pt-4">
                    <Badge className={resultAllocation.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {resultAllocation.isApproved ? 'Approuvée' : 'En attente'}
                    </Badge>
                    <Badge className={resultAllocation.isRecorded ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                      {resultAllocation.isRecorded ? 'Comptabilisée' : 'Non comptabilisée'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vue Contrôles de Continuité */}
      {selectedView === 'controls' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contrôles de Continuité d'Exploitation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {continuityControls?.map((control) => (
                  <Card key={control.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{control.controlName}</CardTitle>
                          <p className="text-sm text-gray-600">{control.metricName}</p>
                        </div>
                        <Badge className={getRiskLevelColor(control.riskLevel)}>
                          {control.riskLevel}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Valeur actuelle */}
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Valeur Actuelle</p>
                          <p className="text-xl font-bold text-gray-900">
                            {control.currentValue.toLocaleString('fr-FR', { 
                              minimumFractionDigits: control.metricName.includes('RATIO') ? 1 : 0,
                              maximumFractionDigits: control.metricName.includes('RATIO') ? 2 : 0
                            })}
                            {control.metricName.includes('RATIO') && control.metricName.includes('RATIO') ? '' : ''}
                          </p>
                        </div>

                        {/* Seuils */}
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Seuil d'alerte:</span>
                            <span className="font-medium">{control.thresholdValue}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Seuil critique:</span>
                            <span className="font-medium text-red-600">{control.criticalThreshold}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Écart:</span>
                            <span className={`font-medium ${control.deviationPercentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {control.deviationPercentage > 0 ? '+' : ''}{control.deviationPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Indicateur de conformité */}
                        <div className={`p-3 rounded-lg text-center ${
                          control.isCompliant ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                        }`}>
                          {control.isCompliant ? (
                            <div className="flex items-center justify-center">
                              <CheckCircleIcon className="h-4 w-4 mr-2" />
                              Conforme
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                              Non conforme
                            </div>
                          )}
                        </div>

                        {/* Recommandations */}
                        {control.recommendations.length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs font-medium text-gray-700 mb-2">Recommandations:</p>
                            <div className="space-y-1">
                              {control.recommendations.slice(0, 2).map((rec, index) => (
                                <p key={index} className="text-xs text-gray-600">• {rec}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )) || []}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CarryForwardManager;