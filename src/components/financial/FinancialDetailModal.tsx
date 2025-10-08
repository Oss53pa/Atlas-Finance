import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { X, Eye, Download, Filter, ChevronRight, ArrowUpRight } from 'lucide-react';

interface FinancialItem {
  code: string;
  libelle: string;
  montant: number;
  details?: FinancialItem[];
}

interface Transaction {
  date: string;
  piece: string;
  tiers?: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  code: string;
  type: 'sous-comptes' | 'exerciceN' | 'exerciceN-1' | 'ecarts' | 'transactions' | 'details';
  data: {
    montant?: number;
    sousComptes?: FinancialItem[];
    transactions?: Transaction[];
    comparaison?: {
      exerciceN: number;
      exerciceN1: number;
      variation: number;
      variationPourcent: number;
    };
    details?: FinancialItem[];
  };
}

const FinancialDetailModal: React.FC<ModalProps> = ({
  const { t } = useLanguage();
  isOpen,
  onClose,
  title,
  code,
  type,
  data
}) => {
  if (!isOpen) return null;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (percent: number): string => {
    return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  const getVariationColor = (variation: number): string => {
    if (variation > 0) return 'text-green-600 bg-green-50';
    if (variation < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const renderSousComptes = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-700">Sous-comptes détaillés</h4>
        <div className="flex space-x-2">
          <button className="p-2 text-gray-700 hover:text-gray-700 hover:bg-gray-100 rounded" aria-label="Filtrer">
            <Filter className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-700 hover:text-gray-700 hover:bg-gray-100 rounded" aria-label="Télécharger">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {data.sousComptes && data.sousComptes.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-3 font-semibold text-gray-700">Code</th>
                <th className="text-left p-3 font-semibold text-gray-700">{t('accounting.label')}</th>
                <th className="text-right p-3 font-semibold text-gray-700">Montant</th>
                <th className="text-center p-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.sousComptes.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-mono text-sm text-gray-600">{item.code}</td>
                  <td className="p-3 text-gray-800">{item.libelle}</td>
                  <td className="p-3 text-right font-mono font-semibold text-gray-900">
                    {formatCurrency(item.montant)}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      title="Voir les détails" aria-label="Voir les détails">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-700">
          <p>Aucun sous-compte disponible pour {code}</p>
        </div>
      )}
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-700">Transactions détaillées</h4>
        <div className="flex space-x-2">
          <button className="p-2 text-gray-700 hover:text-gray-700 hover:bg-gray-100 rounded" aria-label="Filtrer">
            <Filter className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-700 hover:text-gray-700 hover:bg-gray-100 rounded" aria-label="Télécharger">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {data.transactions && data.transactions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-3 font-semibold text-gray-700">{t('common.date')}</th>
                <th className="text-left p-3 font-semibold text-gray-700">{t('accounting.piece')}</th>
                <th className="text-left p-3 font-semibold text-gray-700">Tiers</th>
                <th className="text-left p-3 font-semibold text-gray-700">{t('accounting.label')}</th>
                <th className="text-right p-3 font-semibold text-gray-700">{t('accounting.debit')}</th>
                <th className="text-right p-3 font-semibold text-gray-700">{t('accounting.credit')}</th>
                <th className="text-right p-3 font-semibold text-gray-700">{t('accounting.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((transaction, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 text-gray-600">{new Date(transaction.date).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3 font-mono text-sm text-gray-600">{transaction.piece}</td>
                  <td className="p-3 text-gray-600">{transaction.tiers || '-'}</td>
                  <td className="p-3 text-gray-800">{transaction.libelle}</td>
                  <td className="p-3 text-right font-mono text-gray-900">
                    {transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}
                  </td>
                  <td className="p-3 text-right font-mono text-gray-900">
                    {transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-gray-900">
                    {formatCurrency(transaction.solde)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-700">
          <p>Aucune transaction disponible pour {code}</p>
        </div>
      )}
    </div>
  );

  const renderComparaison = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-700">Analyse comparative</h4>
        <button className="p-2 text-gray-700 hover:text-gray-700 hover:bg-gray-100 rounded" aria-label="Télécharger">
          <Download className="w-4 h-4" />
        </button>
      </div>

      {data.comparaison && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 mb-1">Exercice N</p>
            <p className="text-lg font-bold text-blue-900">
              {formatCurrency(data.comparaison.exerciceN)}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Exercice N-1</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(data.comparaison.exerciceN1)}
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${getVariationColor(data.comparaison.variation)}`}>
            <p className="text-sm mb-1">Variation €</p>
            <p className="text-lg font-bold">
              {data.comparaison.variation >= 0 ? '+' : ''}{formatCurrency(data.comparaison.variation)}
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${getVariationColor(data.comparaison.variationPourcent)}`}>
            <p className="text-sm mb-1">Variation %</p>
            <p className="text-lg font-bold">
              {formatPercent(data.comparaison.variationPourcent)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h5 className="font-semibold text-yellow-800 mb-2">💡 Analyse</h5>
        <div className="text-sm text-yellow-700 space-y-1">
          {data.comparaison?.variationPourcent && Math.abs(data.comparaison.variationPourcent) > 20 && (
            <p>• Variation significative de {formatPercent(data.comparaison.variationPourcent)} par rapport à l'exercice précédent</p>
          )}
          {data.comparaison?.variation && data.comparaison.variation > 0 && (
            <p>• Augmentation de {formatCurrency(data.comparaison.variation)} - tendance positive</p>
          )}
          {data.comparaison?.variation && data.comparaison.variation < 0 && (
            <p>• Diminution de {formatCurrency(Math.abs(data.comparaison.variation))} - attention requise</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-700">Détails de composition</h4>
        <div className="flex space-x-2">
          <button className="p-2 text-gray-700 hover:text-gray-700 hover:bg-gray-100 rounded" aria-label="Filtrer">
            <Filter className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-700 hover:text-gray-700 hover:bg-gray-100 rounded" aria-label="Télécharger">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {data.details && data.details.length > 0 ? (
        <div className="space-y-3">
          {data.details.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono text-gray-700 bg-white px-2 py-1 rounded">
                  {item.code}
                </span>
                <span className="text-sm text-gray-700">{item.libelle}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(item.montant)}
                </span>
                <button className="p-1 text-gray-700 hover:text-gray-600 hover:bg-white rounded" aria-label="Suivant">
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-700">
          <p>Aucun détail disponible pour {code}</p>
        </div>
      )}
    </div>
  );

  const getModalContent = () => {
    switch (type) {
      case 'sous-comptes':
        return renderSousComptes();
      case 'transactions':
      case 'exerciceN':
        return renderTransactions();
      case 'exerciceN-1':
      case 'ecarts':
        return renderComparaison();
      case 'details':
        return renderDetails();
      default:
        return <div>Type de vue non supporté</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm text-gray-600">
                Code: <span className="font-mono font-semibold">{code}</span>
              </span>
              {data.montant && (
                <span className="text-sm text-gray-600">
                  Montant: <span className="font-semibold">{formatCurrency(data.montant)}</span>
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-700 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {getModalContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-700">
            Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Fermer
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2">
              <ArrowUpRight className="w-4 h-4" />
              <span>Analyse approfondie</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialDetailModal;