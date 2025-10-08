import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Building2, Settings, Edit, Eye, Plus, Search, Filter,
  Clock, Percent, FileText, Save, RefreshCw, BookOpen,
  TrendingDown, Calculator, ChevronRight, Info
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import { AssetClassificationService, AssetClassification } from '../../data/assetClassification';

const AssetsClassificationSettings: React.FC = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [classifications, setClassifications] = useState<AssetClassification[]>(
    AssetClassificationService.getAllClassifications()
  );

  const assetClasses = AssetClassificationService.getAssetClasses();

  const filteredClassifications = classifications.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.assetCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.examples.some(ex => ex.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesClass = selectedClass === 'all' || item.assetClass === selectedClass;

    return matchesSearch && matchesClass;
  });

  const getDepreciationRangeText = (item: AssetClassification) => {
    if (item.depreciationRate.min === 0 && item.depreciationRate.max === 0) {
      return 'Non amortissable';
    }
    if (item.depreciationRate.min === item.depreciationRate.max) {
      return `${item.depreciationRate.min}%`;
    }
    return `${item.depreciationRate.min}% à ${item.depreciationRate.max}%`;
  };

  const getUsefulLifeText = (item: AssetClassification) => {
    if (item.usefulLifeYears.min === 0 && item.usefulLifeYears.max === 0) {
      return 'Illimitée';
    }
    if (item.usefulLifeYears.min === item.usefulLifeYears.max) {
      return `${item.usefulLifeYears.min} ans`;
    }
    return `${item.usefulLifeYears.min} à ${item.usefulLifeYears.max} ans`;
  };

  const getCategoryColor = (assetClass: string) => {
    const colors: { [key: string]: string } = {
      '21-Immobilisations incorporelles': 'bg-purple-100 text-purple-800 border-purple-200',
      '22-Terrains': 'bg-green-100 text-green-800 border-green-200',
      '23-Bâtiments, installations techniques et agencements': 'bg-blue-100 text-blue-800 border-blue-200',
      '24 - Matériel, mobilier': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[assetClass] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Paramètres de Comptabilité - Immobilisations
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Tableau de Classification des Actifs - Norme SYSCOHADA
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Réinitialiser
          </ModernButton>
          <ModernButton variant="primary" size="sm">
            <Save className="w-4 h-4 mr-1" />
            Sauvegarder
          </ModernButton>
        </div>
      </div>

      {/* Info Banner */}
      <ModernCard>
        <CardBody>
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                Classification des Actifs selon SYSCOHADA
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                Cette classification détermine automatiquement les durées de vie, taux d'amortissement
                et comptes comptables lors de la capitalisation des immobilisations.
              </p>
              <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                <span>📊 {classifications.length} catégories configurées</span>
                <span>🔗 Connexion automatique avec modules Comptabilité et Immobilisations</span>
              </div>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      {/* Filters */}
      <ModernCard>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  placeholder="Rechercher par catégorie, contenu ou exemples..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Toutes les classes</option>
              {assetClasses.map(assetClass => (
                <option key={assetClass} value={assetClass}>
                  {assetClass}
                </option>
              ))}
            </select>
          </div>
        </CardBody>
      </ModernCard>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Total catégories</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                  {classifications.length}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Classes d'actifs</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                  {assetClasses.length}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Taux moyen</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                  {Math.round(
                    classifications
                      .filter(c => c.defaultDepreciationRate > 0)
                      .reduce((sum, c) => sum + c.defaultDepreciationRate, 0) /
                    classifications.filter(c => c.defaultDepreciationRate > 0).length
                  )}%
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Durée moyenne</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                  {Math.round(
                    classifications
                      .filter(c => c.defaultUsefulLife > 0)
                      .reduce((sum, c) => sum + c.defaultUsefulLife, 0) /
                    classifications.filter(c => c.defaultUsefulLife > 0).length
                  )} ans
                </p>
              </div>
              <Clock className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* Classification Table */}
      <ModernCard>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Tableau de Classification des Actifs
          </h2>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left p-3 text-sm font-medium text-[var(--color-text-primary)]">
                    Classe d'Actif
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-[var(--color-text-primary)]">
                    Catégorie
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-[var(--color-text-primary)]">
                    Contenu
                  </th>
                  <th className="text-center p-3 text-sm font-medium text-[var(--color-text-primary)]">
                    Durée de vie
                  </th>
                  <th className="text-center p-3 text-sm font-medium text-[var(--color-text-primary)]">
                    Taux d'amortissement
                  </th>
                  <th className="text-center p-3 text-sm font-medium text-[var(--color-text-primary)]">
                    Comptes SYSCOHADA
                  </th>
                  <th className="text-center p-3 text-sm font-medium text-[var(--color-text-primary)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClassifications.map((item) => (
                  <tr
                    key={item.categoryCode}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-hover)] transition-colors"
                  >
                    <td className="p-3">
                      <div className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(item.assetClass)}`}>
                        {item.assetClass}
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-semibold text-sm text-[var(--color-text-primary)]">
                          {item.assetCategory}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                          Code: {item.categoryCode}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-[var(--color-text-primary)] mb-2">
                        {item.content.substring(0, 150)}
                        {item.content.length > 150 && '...'}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.examples.slice(0, 3).map((example, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {example}
                          </span>
                        ))}
                        {item.examples.length > 3 && (
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            +{item.examples.length - 3} autres
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">
                        {getUsefulLifeText(item)}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                        Défaut: {item.defaultUsefulLife || 'N/A'} {item.defaultUsefulLife > 0 ? 'ans' : ''}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">
                        {getDepreciationRangeText(item)}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                        Défaut: {item.defaultDepreciationRate || 'N/A'}{item.defaultDepreciationRate > 0 ? '%' : ''}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="text-xs space-y-1">
                        <div className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          {item.syscohadaAccount}
                        </div>
                        {item.depreciationAccount && (
                          <div className="font-mono bg-orange-50 text-orange-700 px-2 py-0.5 rounded">
                            {item.depreciationAccount}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingId(item.categoryCode)}
                          className="p-1.5 text-[var(--color-text-secondary)] hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-[var(--color-text-secondary)] hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Voir détails" aria-label="Voir les détails">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredClassifications.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-3 opacity-50" />
              <p className="text-[var(--color-text-secondary)]">
                Aucune classification trouvée pour les critères sélectionnés.
              </p>
            </div>
          )}
        </CardBody>
      </ModernCard>

      {/* Integration Info */}
      <ModernCard>
        <CardHeader>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Intégration avec les Modules
          </h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-[var(--color-text-primary)] flex items-center">
                <Calculator className="w-4 h-4 mr-2" />
                Module Comptabilité
              </h4>
              <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                <li className="flex items-center">
                  <ChevronRight className="w-3 h-3 mr-2 text-green-500" />
                  Détection automatique lors de la saisie des factures
                </li>
                <li className="flex items-center">
                  <ChevronRight className="w-3 h-3 mr-2 text-green-500" />
                  Suggestion des comptes SYSCOHADA appropriés
                </li>
                <li className="flex items-center">
                  <ChevronRight className="w-3 h-3 mr-2 text-green-500" />
                  Calcul automatique des taux d'amortissement
                </li>
                <li className="flex items-center">
                  <ChevronRight className="w-3 h-3 mr-2 text-green-500" />
                  Validation des durées de vie saisies
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-[var(--color-text-primary)] flex items-center">
                <Building2 className="w-4 h-4 mr-2" />
                Module Immobilisations
              </h4>
              <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                <li className="flex items-center">
                  <ChevronRight className="w-3 h-3 mr-2 text-green-500" />
                  Création automatique des fiches d'immobilisations
                </li>
                <li className="flex items-center">
                  <ChevronRight className="w-3 h-3 mr-2 text-green-500" />
                  Planification des amortissements automatique
                </li>
                <li className="flex items-center">
                  <ChevronRight className="w-3 h-3 mr-2 text-green-500" />
                  Catégorisation selon la classification
                </li>
                <li className="flex items-center">
                  <ChevronRight className="w-3 h-3 mr-2 text-green-500" />
                  Rapports et analyses par classe d'actifs
                </li>
              </ul>
            </div>
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );
};

export default AssetsClassificationSettings;