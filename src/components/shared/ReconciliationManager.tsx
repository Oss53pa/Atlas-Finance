/**
 * Gestionnaire de Réconciliation et Rapprochement
 * Fonctionnalités transverses Clients/Fournisseurs - Section 4.1
 */
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Eye,
  FileText,
  Download,
  Settings,
  RefreshCw,
  Target,
  TrendingUp,
  Calculator,
  Search
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  LoadingSpinner,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Checkbox,
  Progress
} from '../ui';
import { reconciliationService } from '../../services';
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface ReconciliationManagerProps {
  companyId: string;
  fiscalYearId?: string;
  accountId?: string;
  className?: string;
}

interface ReconciliationFilters {
  accountType: string;
  dateRange: string;
  amountRange: string;
  reconciliationStatus: string;
}

const ReconciliationManager: React.FC<ReconciliationManagerProps> = ({
  companyId,
  fiscalYearId,
  accountId,
  className = ''
}) => {
  // États
  const [filters, setFilters] = useState<ReconciliationFilters>({
    accountType: 'all',
    dateRange: 'current_month',
    amountRange: 'all',
    reconciliationStatus: 'unreconciled'
  });

  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [processingReconciliation, setProcessingReconciliation] = useState(false);

  const queryClient = useQueryClient();

  // Queries principales
  const { data: reconciliationData, isLoading, refetch } = useQuery({
    queryKey: ['reconciliation-data', companyId, fiscalYearId, accountId, filters],
    queryFn: () => reconciliationService.getReconciliationData({
      companyId,
      fiscalYearId,
      accountId,
      filters
    }),
  });

  const { data: autoSuggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['reconciliation-suggestions', companyId, accountId],
    queryFn: () => reconciliationService.getAutoSuggestions({
      companyId,
      accountId
    }),
    enabled: !!accountId,
  });

  const { data: reconciliationStats } = useQuery({
    queryKey: ['reconciliation-stats', companyId, fiscalYearId],
    queryFn: () => reconciliationService.getReconciliationStats({
      companyId,
      fiscalYearId
    }),
  });

  // Mutations
  const autoReconcileMutation = useMutation({
    mutationFn: reconciliationService.processAutomaticReconciliation,
    onSuccess: (result) => {
      toast.success(
        `Lettrage automatique: ${result.statistics.automatic_matches} lignes lettrées ` +
        `(${result.performance.automation_rate.toFixed(1)}% automatisation)`
      );
      refetch();
      queryClient.invalidateQueries({ queryKey: ['reconciliation-stats'] });
    },
    onError: (error) => {
      toast.error(`Erreur lettrage automatique: ${error.message}`);
    }
  });

  const manualReconcileMutation = useMutation({
    mutationFn: reconciliationService.manualReconcile,
    onSuccess: (result) => {
      toast.success(`${result.lines_count} lignes lettrées manuellement`);
      setSelectedLines([]);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erreur lettrage manuel: ${error.message}`);
    }
  });

  // Handlers
  const handleFilterChange = (key: keyof ReconciliationFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleLineSelection = (lineId: string, checked: boolean) => {
    if (checked) {
      setSelectedLines(prev => [...prev, lineId]);
    } else {
      setSelectedLines(prev => prev.filter(id => id !== lineId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLines(reconciliationData?.unreconciled_lines?.map(line => line.id) || []);
    } else {
      setSelectedLines([]);
    }
  };

  const handleAutomaticReconciliation = async () => {
    setProcessingReconciliation(true);
    try {
      await autoReconcileMutation.mutateAsync({
        companyId,
        fiscalYearId,
        accountId,
        algorithm: 'ALL'
      });
    } finally {
      setProcessingReconciliation(false);
    }
  };

  const handleManualReconciliation = () => {
    if (selectedLines.length < 2) {
      toast.error('Sélectionnez au moins 2 lignes pour le lettrage');
      return;
    }

    manualReconcileMutation.mutate({
      lineIds: selectedLines,
      generateDifferenceEntry: true
    });
  };

  const applySuggestion = (suggestion: any) => {
    setSelectedLines(suggestion.lines);
  };

  const calculateSelectedBalance = useCallback(() => {
    if (!reconciliationData?.unreconciled_lines) return 0;
    
    return selectedLines.reduce((total, lineId) => {
      const line = reconciliationData.unreconciled_lines.find(l => l.id === lineId);
      return total + (line ? (line.debit_amount - line.credit_amount) : 0);
    }, 0);
  }, [selectedLines, reconciliationData]);

  const isBalanced = Math.abs(calculateSelectedBalance()) < 1;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header avec statistiques globales */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Gestionnaire de Réconciliation
          </h2>
          <p className="text-gray-600">
            Lettrage automatique et rapprochement factures/paiements
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm text-gray-600">Taux d'automatisation</p>
            <p className="text-lg font-bold text-blue-600">
              {reconciliationStats?.automationRate?.toFixed(1) || 0}%
            </p>
          </div>
          
          <Button
            onClick={handleAutomaticReconciliation}
            disabled={processingReconciliation}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {processingReconciliation ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Lettrage Auto
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Statistiques de performance */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {reconciliationStats?.totalUnreconciled || 0}
            </div>
            <p className="text-sm text-gray-600">Lignes à lettrer</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {reconciliationStats?.todayReconciled || 0}
            </div>
            <p className="text-sm text-gray-600">Lettrées aujourd'hui</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(reconciliationStats?.unreconciledAmount || 0)}
            </div>
            <p className="text-sm text-gray-600">Montant non lettré</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {reconciliationStats?.averageProcessingTime || 0}s
            </div>
            <p className="text-sm text-gray-600">Temps moyen</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Select value={filters.accountType} onValueChange={(value) => handleFilterChange('accountType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Type de compte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous comptes</SelectItem>
                <SelectItem value="customers">Clients (41x)</SelectItem>
                <SelectItem value="suppliers">Fournisseurs (40x)</SelectItem>
                <SelectItem value="bank">Banques (52x)</SelectItem>
                <SelectItem value="other">Autres</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.reconciliationStatus} onValueChange={(value) => handleFilterChange('reconciliationStatus', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Statut lettrage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unreconciled">Non lettré</SelectItem>
                <SelectItem value="reconciled">Lettré</SelectItem>
                <SelectItem value="partial">Partiellement lettré</SelectItem>
                <SelectItem value="disputed">En litige</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Mois en cours</SelectItem>
                <SelectItem value="last_month">Mois dernier</SelectItem>
                <SelectItem value="current_quarter">Trimestre</SelectItem>
                <SelectItem value="current_year">Année</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions automatiques */}
      {autoSuggestions?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Suggestions de Lettrage IA ({autoSuggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {autoSuggestions.slice(0, 5).map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-200">
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-blue-100 text-blue-800">
                      {suggestion.type}
                    </Badge>
                    <div>
                      <p className="font-medium">{suggestion.suggestion}</p>
                      <p className="text-sm text-gray-600">
                        Confiance: {suggestion.confidenceScore}% • 
                        {suggestion.lineDetails?.length || 0} ligne(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {suggestion.difference && (
                      <span className="text-sm font-medium text-red-600">
                        Écart: {formatCurrency(suggestion.difference)}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applySuggestion(suggestion)}
                    >
                      Appliquer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table des lignes non lettrées */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <ArrowLeftRight className="h-5 w-5 mr-2" />
              Lignes à Lettrer ({reconciliationData?.unreconciled_lines?.length || 0})
            </span>
            
            <div className="flex items-center space-x-3">
              {selectedLines.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {selectedLines.length} sélectionnée(s)
                  </Badge>
                  <span className={`text-sm font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    Solde: {formatCurrency(calculateSelectedBalance())}
                  </span>
                  {isBalanced && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
              )}
              
              <Button
                size="sm"
                onClick={handleManualReconciliation}
                disabled={selectedLines.length < 2 || !isBalanced}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Lettrer Sélection
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner text="Chargement des lignes..." />
          ) : (
            <div className="space-y-4">
              {/* Contrôles de sélection */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={
                      selectedLines.length === reconciliationData?.unreconciled_lines?.length &&
                      reconciliationData?.unreconciled_lines?.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-gray-600">
                    Tout sélectionner ({reconciliationData?.unreconciled_lines?.length || 0})
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Calculator className="h-4 w-4" />
                  <span>
                    Algorithmes IA: {reconciliationStats?.algorithmsAvailable || 4} disponibles
                  </span>
                </div>
              </div>

              {/* Table des lignes */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>N° Pièce</TableHead>
                      <TableHead>Compte</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead>Tiers</TableHead>
                      <TableHead className="text-right">Débit</TableHead>
                      <TableHead className="text-right">Crédit</TableHead>
                      <TableHead className="text-right">Solde</TableHead>
                      <TableHead>Ancienneté</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliationData?.unreconciled_lines?.map((line) => {
                      const isSelected = selectedLines.includes(line.id);
                      const daysSinceEntry = Math.floor(
                        (new Date().getTime() - new Date(line.entry_date).getTime()) / (1000 * 60 * 60 * 24)
                      );
                      
                      return (
                        <TableRow 
                          key={line.id} 
                          className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50 border-blue-200' : ''}`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleLineSelection(line.id, checked)}
                            />
                          </TableCell>
                          <TableCell>{formatDate(line.entry_date)}</TableCell>
                          <TableCell className="font-mono text-sm">{line.piece_number}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 px-1 rounded">
                              {line.account_code}
                            </code>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{line.label}</TableCell>
                          <TableCell>
                            {line.third_party_code && (
                              <Badge variant="outline" className="text-xs">
                                {line.third_party_code}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-700">
                            {line.debit_amount > 0 && formatCurrency(line.debit_amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-700">
                            {line.credit_amount > 0 && formatCurrency(line.credit_amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {formatCurrency(line.debit_amount - line.credit_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`
                              ${daysSinceEntry > 90 ? 'bg-red-100 text-red-800' :
                                daysSinceEntry > 60 ? 'bg-orange-100 text-orange-800' :
                                daysSinceEntry > 30 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'}
                            `}>
                              {daysSinceEntry}j
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <FileText className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Info sélection */}
              {selectedLines.length > 0 && (
                <div className={`p-4 rounded-lg border ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {isBalanced ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">
                          {selectedLines.length} ligne(s) sélectionnée(s)
                        </p>
                        <p className="text-sm text-gray-600">
                          Solde: {formatCurrency(calculateSelectedBalance())}
                          {isBalanced ? ' ✓ Équilibré' : ' ✗ Déséquilibré'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLines([])}
                      >
                        Désélectionner
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={handleManualReconciliation}
                        disabled={!isBalanced}
                        className={isBalanced ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                      >
                        {isBalanced ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Lettrer
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Non équilibré
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {!isBalanced && Math.abs(calculateSelectedBalance()) <= 1000 && (
                    <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded">
                      <p className="text-sm text-yellow-800">
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                        Écart minime ({formatCurrency(Math.abs(calculateSelectedBalance()))}) - 
                        Une écriture d'écart sera générée automatiquement
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rapport de réconciliation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Rapport de Réconciliation
            </span>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Rapport
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-gray-800">Taux de Lettrage Global</h4>
              <div className="mt-2">
                <Progress 
                  value={reconciliationStats?.globalReconciliationRate || 0}
                  className="mb-2"
                />
                <p className="text-xl font-bold text-blue-600">
                  {(reconciliationStats?.globalReconciliationRate || 0).toFixed(1)}%
                </p>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-gray-800">Performance IA</h4>
              <div className="mt-2">
                <Progress 
                  value={reconciliationStats?.aiAccuracy || 0}
                  className="mb-2"
                />
                <p className="text-xl font-bold text-green-600">
                  {(reconciliationStats?.aiAccuracy || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">Précision algorithmes</p>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-gray-800">Temps Traitement</h4>
              <div className="mt-2">
                <p className="text-xl font-bold text-purple-600">
                  {reconciliationStats?.averageProcessingTime || 0}ms
                </p>
                <p className="text-xs text-gray-500">
                  Objectif: &lt; 200ms ✓
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReconciliationManager;