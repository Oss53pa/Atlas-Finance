import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { XMarkIcon, DocumentTextIcon, CalendarIcon, BanknotesIcon } from '@heroicons/react/24/outline';

interface LedgerEntry {
  id: string;
  account_number: string;
  account_label: string;
  account_class: string;
  entry_date: string;
  debit_amount: string;
  credit_amount: string;
  absolute_amount: string;
  journal_code: string;
  document_reference: string;
  sequence_number: number;
  currency_code: string;
  tags: string[];
  access_count: number;
  last_accessed: string | null;
  searchable_text?: string;
}

interface LedgerEntryDetailsProps {
  entry: LedgerEntry;
  onClose: () => void;
}

const LedgerEntryDetails: React.FC<LedgerEntryDetailsProps> = ({ entry, onClose }) => {
  const { t } = useLanguage();
  const formatAmount = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Détails de l'écriture</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Fermer">
            <XMarkIcon className="h-6 w-6 text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Informations principales */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-medium text-gray-700 uppercase">{t('accounting.account')}</label>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {entry.account_number}
              </div>
              <div className="text-sm text-gray-600">{entry.account_label}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 uppercase">{t('common.date')}</label>
              <div className="mt-1 flex items-center text-gray-900">
                <CalendarIcon className="h-5 w-5 mr-2 text-gray-700" />
                {new Date(entry.entry_date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </div>
          </div>

          {/* Montants */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <label className="text-xs font-medium text-green-700 uppercase">{t('accounting.debit')}</label>
              <div className="mt-2 text-2xl font-bold text-green-900">
                {parseFloat(entry.debit_amount) > 0 ? formatAmount(entry.debit_amount) : '-'}
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <label className="text-xs font-medium text-red-700 uppercase">{t('accounting.credit')}</label>
              <div className="mt-2 text-2xl font-bold text-red-900">
                {parseFloat(entry.credit_amount) > 0 ? formatAmount(entry.credit_amount) : '-'}
              </div>
            </div>
          </div>

          {/* Détails de transaction */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Informations de transaction</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700 uppercase">{t('accounting.journal')}</label>
                <div className="mt-1">
                  <span className="inline-flex px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {entry.journal_code}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 uppercase">Référence</label>
                <div className="mt-1 flex items-center text-gray-900">
                  <DocumentTextIcon className="h-4 w-4 mr-2 text-gray-700" />
                  {entry.document_reference}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 uppercase">Séquence</label>
                <div className="mt-1 text-gray-900">#{entry.sequence_number}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 uppercase">Devise</label>
                <div className="mt-1 flex items-center text-gray-900">
                  <BanknotesIcon className="h-4 w-4 mr-2 text-gray-700" />
                  {entry.currency_code}
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {entry.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Statistiques d'accès */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Statistiques</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-700">Nombre de consultations:</span>
                <span className="ml-2 font-medium text-gray-900">{entry.access_count}</span>
              </div>
              <div>
                <span className="text-gray-700">Dernière consultation:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {entry.last_accessed
                    ? new Date(entry.last_accessed).toLocaleDateString('fr-FR')
                    : 'Jamais'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Fermer
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Exporter
          </button>
        </div>
      </div>
    </div>
  );
};

export default LedgerEntryDetails;