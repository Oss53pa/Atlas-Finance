import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3,
  PieChart,
  LineChart,
  AlertCircle,
  CheckCircle,
  Eye,
  RefreshCw
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Input, 
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui';
import { useBankAccounts } from '../../hooks';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface CashFlowFilters {
  periode_debut: string;
  periode_fin: string;
  compte: string;
  devise: string;
  granularite: 'jour' | 'semaine' | 'mois' | 'trimestre';
  type_analyse: 'global' | 'par_compte' | 'par_categorie';
}

const CashFlowPage: React.FC = () => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<CashFlowFilters>({
    periode_debut: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    periode_fin: new Date().toISOString().split('T')[0],
    compte: '',
    devise: 'XOF',
    granularite: 'mois',
    type_analyse: 'global'
  });
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('chart');

  // États pour le modal de sélection de période
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: filters.periode_debut,
    end: filters.periode_fin
  });

  const { data: bankAccounts } = useBankAccounts({
    page: 1,
    page_size: 100,
  });

  const cashFlowData = {
    solde_initial: 15750000,
    total_entrees: 28500000,
    total_sorties: 22300000,
    flux_net: 6200000,
    solde_final: 21950000,
    trend: 'up' as 'up' | 'down' | 'stable',
    evolution_percentage: 12.5,
    rotation_moyenne: 45,
    jours_couverture: 65,
  };

  const isLoading = false;

  const handleFilterChange = (key: keyof CashFlowFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      periode_debut: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      periode_fin: new Date().toISOString().split('T')[0],
      compte: '',
      devise: 'XOF',
      granularite: 'mois',
      type_analyse: 'global'
    });
  };


  const getCategoryColor = (categorie: string) => {
    const colors: Record<string, string> = {
      'ventes': 'bg-green-100 text-green-800',
      'achats': 'bg-[#6A8A82]/10 text-[#6A8A82]',
      'salaires': 'bg-[#B87333]/10 text-[#B87333]',
      'charges': 'bg-red-100 text-red-800',
      'investissements': 'bg-orange-100 text-orange-800',
      'financement': 'bg-yellow-100 text-yellow-800',
      'taxes': 'bg-gray-100 text-gray-800',
      'autres': 'bg-indigo-100 text-indigo-800'
    };
    return colors[categorie] || 'bg-gray-100 text-gray-800';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const renderPeriodAnalysis = () => {
    if (!cashFlowData?.periods) return null;

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Période</TableHead>
              <TableHead className="text-right">Solde Initial</TableHead>
              <TableHead className="text-right">Entrées</TableHead>
              <TableHead className="text-right">Sorties</TableHead>
              <TableHead className="text-right">Flux Net</TableHead>
              <TableHead className="text-right">Solde Final</TableHead>
              <TableHead className="text-center">Évolution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashFlowData.periods.map((period, index) => (
              <TableRow key={index} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-700" />
                    <span className="font-medium">
                      {formatDate(period.debut)} - {formatDate(period.fin)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold text-gray-700">
                    {formatCurrency(period.solde_initial, filters.devise)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold text-green-700">
                    {formatCurrency(period.total_entrees, filters.devise)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold text-red-700">
                    {formatCurrency(period.total_sorties, filters.devise)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-bold ${
                    period.flux_net >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {formatCurrency(period.flux_net, filters.devise)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-bold ${
                    period.solde_final >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {formatCurrency(period.solde_final, filters.devise)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    {getTrendIcon(period.trend)}
                    <span className={`text-sm ${
                      period.trend === 'up' ? 'text-green-600' : 
                      period.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {formatPercentage(period.evolution_percentage)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderCategoryAnalysis = () => {
    if (!cashFlowData?.categories) return null;

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {/* Entrées par catégorie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-green-700">
              <ArrowUpRight className="mr-2 h-5 w-5" />
              Entrées par Catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cashFlowData.categories.entrees?.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge className={getCategoryColor(category.code)}>
                      {category.nom}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-700">
                      {formatCurrency(category.montant, filters.devise)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatPercentage(category.pourcentage)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sorties par catégorie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-700">
              <ArrowDownLeft className="mr-2 h-5 w-5" />
              Sorties par Catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cashFlowData.categories.sorties?.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge className={getCategoryColor(category.code)}>
                      {category.nom}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-700">
                      {formatCurrency(category.montant, filters.devise)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatPercentage(category.pourcentage)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAccountAnalysis = () => {
    if (!cashFlowData?.accounts) return null;

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('accounting.account')}</TableHead>
              <TableHead>Banque</TableHead>
              <TableHead className="text-right">Solde Initial</TableHead>
              <TableHead className="text-right">Entrées</TableHead>
              <TableHead className="text-right">Sorties</TableHead>
              <TableHead className="text-right">Flux Net</TableHead>
              <TableHead className="text-right">Solde Final</TableHead>
              <TableHead className="text-center">Contribution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashFlowData.accounts.map((account) => (
              <TableRow key={account.id} className="hover:bg-gray-50">
                <TableCell>
                  <div>
                    <p className="font-mono font-semibold">{account.numero_compte}</p>
                    <p className="text-sm text-gray-600">{account.libelle_compte}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{account.nom_banque}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold text-gray-700">
                    {formatCurrency(account.solde_initial, filters.devise)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold text-green-700">
                    {formatCurrency(account.total_entrees, filters.devise)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold text-red-700">
                    {formatCurrency(account.total_sorties, filters.devise)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-bold ${
                    account.flux_net >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {formatCurrency(account.flux_net, filters.devise)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-bold ${
                    account.solde_final >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {formatCurrency(account.solde_final, filters.devise)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">
                    {formatPercentage(account.contribution_pourcentage)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center">
              <TrendingUp className="mr-3 h-7 w-7" />
              Tableau de Flux de Trésorerie
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              Analyse des flux de trésorerie et suivi de la liquidité
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === 'table' ? 'chart' : 'table')}
            >
              {viewMode === 'table' ? (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Graphiques
                </>
              ) : (
                <>
                  <Table className="mr-2 h-4 w-4" />
                  Tableaux
                </>
              )}
            </Button>
            <ExportMenu
              data={[{
                solde_initial: cashFlowData?.solde_initial || 0,
                total_entrees: cashFlowData?.total_entrees || 0,
                total_sorties: cashFlowData?.total_sorties || 0,
                flux_net: cashFlowData?.flux_net || 0,
                solde_final: cashFlowData?.solde_final || 0,
                rotation_moyenne: cashFlowData?.rotation_moyenne || 0,
                jours_couverture: cashFlowData?.jours_couverture || 0,
                evolution_percentage: cashFlowData?.evolution_percentage || 0
              }]}
              filename="flux_tresorerie"
              columns={{
                solde_initial: 'Solde Initial',
                total_entrees: 'Total Entrées',
                total_sorties: 'Total Sorties',
                flux_net: 'Flux Net',
                solde_final: 'Solde Final',
                rotation_moyenne: 'Rotation Moyenne (jours)',
                jours_couverture: 'Jours de Couverture',
                evolution_percentage: 'Évolution (%)'
              }}
              buttonText="Exporter"
              buttonVariant="outline"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-[#6A8A82]/10 rounded-full">
                <DollarSign className="h-6 w-6 text-[#6A8A82]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Solde Initial</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(cashFlowData?.solde_initial || 0, filters.devise)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Entrées</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(cashFlowData?.total_entrees || 0, filters.devise)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-100 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sorties</p>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(cashFlowData?.total_sorties || 0, filters.devise)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-[#B87333]/10 rounded-full">
                <ArrowUpRight className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Solde Final</p>
                <p className={`text-2xl font-bold ${
                  (cashFlowData?.solde_final || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {formatCurrency(cashFlowData?.solde_final || 0, filters.devise)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Indicators */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Flux Net</p>
                <p className={`text-2xl font-bold ${
                  (cashFlowData?.flux_net || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {formatCurrency(cashFlowData?.flux_net || 0, filters.devise)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {getTrendIcon(cashFlowData?.trend || 'stable')}
                <span className="text-sm text-gray-600">
                  {formatPercentage(cashFlowData?.evolution_percentage || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rotation Moyenne</p>
                <p className="text-2xl font-bold text-blue-700">
                  {cashFlowData?.rotation_moyenne || 0} jours
                </p>
              </div>
              <div className="p-2 bg-[#6A8A82]/10 rounded-full">
                <RefreshCw className="h-6 w-6 text-[#6A8A82]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Couverture</p>
                <p className="text-2xl font-bold text-purple-700">
                  {cashFlowData?.jours_couverture || 0} jours
                </p>
              </div>
              <div className="p-2 bg-[#B87333]/10 rounded-full">
                {(cashFlowData?.jours_couverture || 0) > 30 ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Paramètres d'Analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="md:col-span-2">
              <Button
                variant="outline"
                onClick={() => setShowPeriodModal(true)}
                className="w-full justify-start"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange.start && dateRange.end
                  ? `Du ${new Date(dateRange.start).toLocaleDateString('fr-FR')} au ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                  : 'Sélectionner une période'
                }
              </Button>
            </div>

            <Select value={filters.compte} onValueChange={(value) => handleFilterChange('compte', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les comptes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les comptes</SelectItem>
                {bankAccounts?.results?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.numero_compte} - {account.libelle_compte}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.devise} onValueChange={(value) => handleFilterChange('devise', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XOF">XOF (Franc CFA)</SelectItem>
                <SelectItem value="EUR">EUR (Euro)</SelectItem>
                <SelectItem value="USD">USD (Dollar)</SelectItem>
                <SelectItem value="GBP">GBP (Livre Sterling)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.granularite} onValueChange={(value) => handleFilterChange('granularite', value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jour">Journalière</SelectItem>
                <SelectItem value="semaine">Hebdomadaire</SelectItem>
                <SelectItem value="mois">Mensuelle</SelectItem>
                <SelectItem value="trimestre">Trimestrielle</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.type_analyse} onValueChange={(value) => handleFilterChange('type_analyse', value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Vue globale</SelectItem>
                <SelectItem value="par_compte">Par compte</SelectItem>
                <SelectItem value="par_categorie">Par catégorie</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Content */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" text="Génération de l'analyse en cours..." />
          </div>
        ) : (
          <>
            {filters.type_analyse === 'global' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <LineChart className="mr-2 h-5 w-5" />
                    Analyse par Période
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderPeriodAnalysis()}
                </CardContent>
              </Card>
            )}

            {filters.type_analyse === 'par_categorie' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="mr-2 h-5 w-5" />
                    Analyse par Catégorie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderCategoryAnalysis()}
                </CardContent>
              </Card>
            )}

            {filters.type_analyse === 'par_compte' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Analyse par Compte
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderAccountAnalysis()}
                </CardContent>
              </Card>
            )}

            {(!cashFlowData || Object.keys(cashFlowData).length === 0) && (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée disponible</h3>
                <p className="text-gray-700 mb-6">
                  Aucun mouvement de trésorerie trouvé pour la période sélectionnée.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => {
          setDateRange(newDateRange);
          // Mettre à jour les filtres avec les nouvelles dates
          setFilters(prev => ({
            ...prev,
            periode_debut: newDateRange.start,
            periode_fin: newDateRange.end
          }));
        }}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default CashFlowPage;