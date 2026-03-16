import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { useData } from '../../contexts/DataContext';
import {
  PresentationChartLineIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface FinancialRatio {
  id: string;
  category: 'structure' | 'liquidite' | 'rentabilite' | 'activite' | 'solvabilite';
  typeRatio: string;
  libelle: string;
  valeur: number;
  unite: 'pourcentage' | 'ratio' | 'fois' | 'jours' | 'montant';
  numerateur: number;
  denominateur: number;
  formule: string;

  // Références et comparaisons
  valeurReference?: number;
  ecartReference?: number;
  valeurN1?: number;
  variationAbsolue?: number;
  variationRelative?: number;

  // Benchmark sectoriel
  benchmarkSectorValue?: number;
  sectorPercentile?: number;

  // Interprétation et alertes
  interpretation: string;
  alerte: boolean;
  niveauAlerte: 'info' | 'attention' | 'danger' | 'critique' | '';

  calculationDate: string;
}

interface RatioCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: React.ElementType;
}

const RatiosView: React.FC = () => {
  const { adapter } = useData();
  const [ratios, setRatios] = useState<FinancialRatio[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'current' | 'evolution' | 'benchmark' | 'calculate'>('current');
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);

  const categories: RatioCategory[] = [
    {
      id: 'structure',
      name: 'Structure Financière',
      description: 'Autonomie, endettement, couverture',
      color: 'bg-blue-500',
      icon: ChartBarIcon
    },
    {
      id: 'liquidite',
      name: 'Liquidité',
      description: 'Capacité à honorer les échéances',
      color: 'bg-green-500',
      icon: PresentationChartLineIcon
    },
    {
      id: 'rentabilite',
      name: 'Rentabilité',
      description: 'ROA, ROE, marges',
      color: 'bg-primary-500',
      icon: ChartBarIcon
    },
    {
      id: 'activite',
      name: 'Activité',
      description: 'Rotation des actifs, délais',
      color: 'bg-yellow-500',
      icon: PresentationChartLineIcon
    },
    {
      id: 'solvabilite',
      name: 'Solvabilité',
      description: 'Capacité remboursement LT',
      color: 'bg-red-500',
      icon: ChartBarIcon
    }
  ];

  // Données réelles depuis les écritures comptables
  useEffect(() => {
    const load = async () => {
      try {
        const entries = await adapter.getAll<any>('journalEntries');
        const net = (...pfx: string[]) => { let t = 0; for (const e of entries) for (const l of e.lines || []) if (pfx.some(p => l.accountCode.startsWith(p))) t += l.debit - l.credit; return t; };
        const creditN = (...pfx: string[]) => { let t = 0; for (const e of entries) for (const l of e.lines || []) if (pfx.some(p => l.accountCode.startsWith(p))) t += l.credit - l.debit; return t; };
        const safe = (n: number, d: number) => d !== 0 ? n / d : 0;

        const capitauxPropres = creditN('10', '11', '12', '13');
        const totalActif = Math.max(1, Math.abs(net('2', '3', '4', '5')));
        const actifCirculant = Math.max(0, net('3', '41', '46', '5'));
        const passifCirculant = Math.max(1, creditN('40', '42', '43', '44'));
        const ca = creditN('70', '71', '72');
        const stocks = Math.max(0, net('3'));
        const re = creditN('7') - net('6') - (creditN('77') - net('67'));
        const va = creditN('70', '71', '72', '73') - net('60', '61', '62', '63');
        const ebe = va + creditN('74') - net('66') - net('64');
        const chargesFin = net('67');
        const today = new Date().toISOString().split('T')[0];

        const mk = (id: string, cat: FinancialRatio['category'], typeR: string, lib: string, val: number, unit: FinancialRatio['unite'], num: number, den: number, form: string, ref: number, interp: string, alerte: boolean, niv: string): FinancialRatio => ({
          id, category: cat, typeRatio: typeR, libelle: lib, valeur: Math.round(val * 10) / 10, unite: unit, numerateur: Math.round(num), denominateur: Math.round(den), formule: form, valeurReference: ref, ecartReference: Math.round((val - ref) * 10) / 10, interpretation: interp, alerte, niveauAlerte: niv, calculationDate: today
        });

        setRatios([
          mk('1', 'structure', 'AUTONOMIE_FINANCIERE', 'Autonomie financière', safe(capitauxPropres, totalActif) * 100, 'pourcentage', capitauxPropres, totalActif, 'Capitaux propres / Total actif', 40, capitauxPropres > 0 ? 'Bonne autonomie financière' : 'Capitaux propres insuffisants', safe(capitauxPropres, totalActif) * 100 < 30, safe(capitauxPropres, totalActif) * 100 < 30 ? 'attention' : ''),
          mk('2', 'liquidite', 'LIQUIDITE_GENERALE', 'Liquidité générale', safe(actifCirculant, passifCirculant), 'ratio', actifCirculant, passifCirculant, 'Actif circulant / Passif circulant', 1.5, safe(actifCirculant, passifCirculant) >= 1.5 ? 'Liquidité satisfaisante' : 'Liquidité insuffisante', safe(actifCirculant, passifCirculant) < 1, safe(actifCirculant, passifCirculant) < 1 ? 'danger' : ''),
          mk('3', 'rentabilite', 'RENTABILITE_ECONOMIQUE', 'Rentabilité économique (ROA)', safe(re, totalActif) * 100, 'pourcentage', re, totalActif, 'Résultat d\'exploitation / Total actif', 10, re > 0 ? 'Rentabilité positive' : 'Rentabilité négative', re < 0, re < 0 ? 'danger' : ''),
          mk('4', 'activite', 'ROTATION_STOCKS', 'Rotation des stocks', ca > 0 ? safe(stocks, ca) * 365 : 0, 'jours', stocks, ca, 'Stock moyen × 365 / CA', 90, ca > 0 && safe(stocks, ca) * 365 > 90 ? 'Rotation lente, risque de sur-stockage' : 'Rotation correcte', ca > 0 && safe(stocks, ca) * 365 > 120, ca > 0 && safe(stocks, ca) * 365 > 120 ? 'attention' : ''),
          mk('5', 'solvabilite', 'COUVERTURE_CHARGES_FINANCIERES', 'Couverture des charges financières', chargesFin > 0 ? safe(ebe, chargesFin) : 0, 'fois', ebe, chargesFin, 'EBE / Charges financières', 3, chargesFin > 0 && safe(ebe, chargesFin) < 3 ? 'Couverture faible, attention à l\'endettement' : 'Couverture suffisante', chargesFin > 0 && safe(ebe, chargesFin) < 2, chargesFin > 0 && safe(ebe, chargesFin) < 2 ? 'attention' : ''),
        ]);
      } catch { /* empty */ }
    };
    load();
  }, [adapter]);

  const getAlertIcon = (niveau: string) => {
    switch (niveau) {
      case 'critique':
        return <XMarkIcon className="h-5 w-5 text-red-500" />;
      case 'danger':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'attention':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
  };

  const getAlertBadge = (niveau: string) => {
    switch (niveau) {
      case 'critique':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Critique</span>;
      case 'danger':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Danger</span>;
      case 'attention':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Attention</span>;
      case 'info':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Info</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Normal</span>;
    }
  };

  const formatValue = (value: number, unit: string) => {
    switch (unit) {
      case 'pourcentage':
        return `${value.toFixed(1)}%`;
      case 'ratio':
        return value.toFixed(2);
      case 'fois':
        return `${value.toFixed(1)}x`;
      case 'jours':
        return `${Math.round(value)} jours`;
      case 'montant':
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'XAF',
          minimumFractionDigits: 0
        }).format(value);
      default:
        return value.toString();
    }
  };

  const filteredRatios = ratios.filter(ratio => {
    if (selectedCategory !== 'all' && ratio.category !== selectedCategory) return false;
    if (showAlertsOnly && !ratio.alerte) return false;
    return true;
  });

  const renderRatioCard = (ratio: FinancialRatio) => (
    <div key={ratio.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{ratio.libelle}</h3>
            {getAlertIcon(ratio.niveauAlerte)}
          </div>
          <p className="text-sm text-gray-600 mb-1">{ratio.formule}</p>
          <div className="flex items-center space-x-4">
            <span className="text-lg font-bold text-blue-600">
              {formatValue(ratio.valeur, ratio.unite)}
            </span>
            {getAlertBadge(ratio.niveauAlerte)}
          </div>
        </div>
      </div>

      {/* Détails du calcul */}
      <div className="bg-gray-50 p-3 rounded-lg mb-4">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Calcul:</span> {formatCurrency(ratio.numerateur)} ÷ {formatCurrency(ratio.denominateur)}
        </div>
      </div>

      {/* Comparaisons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {ratio.valeurReference && (
          <div className="text-center">
            <p className="text-xs text-gray-700">Référence</p>
            <p className="font-medium">{formatValue(ratio.valeurReference, ratio.unite)}</p>
            <p className={`text-xs ${ratio.ecartReference && ratio.ecartReference > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {ratio.ecartReference && ratio.ecartReference > 0 ? '+' : ''}{ratio.ecartReference?.toFixed(1)}
            </p>
          </div>
        )}

        {ratio.valeurN1 && (
          <div className="text-center">
            <p className="text-xs text-gray-700">N-1</p>
            <p className="font-medium">{formatValue(ratio.valeurN1, ratio.unite)}</p>
            <p className={`text-xs ${ratio.variationRelative && ratio.variationRelative > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {ratio.variationRelative && ratio.variationRelative > 0 ? '+' : ''}{ratio.variationRelative?.toFixed(1)}%
            </p>
          </div>
        )}

        {ratio.benchmarkSectorValue && (
          <div className="text-center">
            <p className="text-xs text-gray-700">Secteur</p>
            <p className="font-medium">{formatValue(ratio.benchmarkSectorValue, ratio.unite)}</p>
            <p className="text-xs text-blue-600">P{ratio.sectorPercentile}</p>
          </div>
        )}
      </div>

      {/* Interprétation */}
      <div className="mb-4">
        <p className="text-sm text-gray-700">{ratio.interpretation}</p>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <p className="text-xs text-gray-700">
          Calculé le {new Date(ratio.calculationDate).toLocaleDateString('fr-FR')}
        </p>
        <div className="flex space-x-2">
          <button className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
            <EyeIcon className="h-4 w-4" />
            <span>Détails</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderCurrentRatios = () => (
    <div className="space-y-6">
      {/* Filtres et actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tous ({ratios.length})
          </button>
          {categories.map(category => {
            const count = ratios.filter(r => r.category === category.id).length;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showAlertsOnly}
              onChange={(e) => setShowAlertsOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Alertes uniquement</span>
          </label>
          <button
            onClick={() => setActiveTab('calculate')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>Recalculer</span>
          </button>
        </div>
      </div>

      {/* Résumé des alertes */}
      {ratios.some(r => r.alerte) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
            <h3 className="font-medium text-yellow-900">Alertes Détectées</h3>
          </div>
          <ul className="space-y-1 text-sm text-yellow-800">
            {ratios.filter(r => r.alerte).map(ratio => (
              <li key={ratio.id}>• {ratio.libelle}: {ratio.interpretation}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Grille des ratios */}
      {filteredRatios.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <PresentationChartLineIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun ratio trouvé</h3>
          <p className="text-gray-700 mb-4">
            {showAlertsOnly
              ? "Aucune alerte détectée dans les ratios calculés."
              : "Aucun ratio correspondant aux filtres sélectionnés."
            }
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setShowAlertsOnly(false);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRatios.map(renderRatioCard)}
        </div>
      )}
    </div>
  );

  const renderBenchmark = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Analyse Comparative Sectorielle
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ratios.filter(r => r.benchmarkSectorValue).map(ratio => (
            <div key={ratio.id} className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">{ratio.libelle}</h4>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Votre entreprise</span>
                  <span className="font-medium">{formatValue(ratio.valeur, ratio.unite)}</span>
                </div>

                <div className="flex justify-between text-sm text-gray-600">
                  <span>Moyenne sectorielle</span>
                  <span>{formatValue(ratio.benchmarkSectorValue!, ratio.unite)}</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full ${
                      ratio.valeur > ratio.benchmarkSectorValue! ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (ratio.valeur / (ratio.benchmarkSectorValue! * 2)) * 100)}%`
                    }}
                  ></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-700">Percentile {ratio.sectorPercentile}</span>
                  <span className={`text-xs font-medium ${
                    ratio.sectorPercentile! > 50 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {ratio.sectorPercentile! > 50 ? 'Au-dessus' : 'En-dessous'} de la moyenne
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCalculateForm = () => (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Calculer les Ratios Financiers
      </h3>

      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exercice Fiscal
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source des Données
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="statements">États Financiers Validés</option>
              <option value="trial_balance">Balance Générale</option>
              <option value="manual">Saisie Manuelle</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Catégories de Ratios à Calculer
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(category => (
              <label key={category.id} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  defaultChecked={true}
                />
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded ${category.color}`}></div>
                  <span className="text-sm font-medium text-gray-700">{category.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Options Avancées</h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
              <span className="ml-2 text-sm text-blue-800">Inclure les benchmarks sectoriels</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
              <span className="ml-2 text-sm text-blue-800">Comparer avec l'exercice précédent</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="ml-2 text-sm text-blue-800">Générer les alertes automatiques</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="ml-2 text-sm text-blue-800">Export vers tableau de bord</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Calculer les Ratios
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Ratios Financiers</h1>
          <p className="mt-1 text-gray-600">
            Analyse de la structure, liquidité, rentabilité et solvabilité
          </p>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('current')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'current'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Ratios Actuels
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'benchmark'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analyse Sectorielle
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'current' && renderCurrentRatios()}
      {activeTab === 'benchmark' && renderBenchmark()}
      {activeTab === 'calculate' && renderCalculateForm()}
    </div>
  );
};

export default RatiosView;