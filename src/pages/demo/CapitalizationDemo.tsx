// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatters';
import { useData } from '../../contexts/DataContext';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import CapitalizationModal from '../../components/accounting/CapitalizationModal';
import { Play, FileText, Euro, Calendar, Info } from 'lucide-react';

interface SampleInvoice {
  id: string;
  amount: number;
  supplier: string;
  description: string;
  account: string;
  date: string;
}

const CapitalizationDemo: React.FC = () => {
  const { adapter } = useData();
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SampleInvoice | null>(null);
  const [sampleInvoices, setSampleInvoices] = useState<SampleInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        // Try to load journal entries with asset-related accounts (class 2)
        const entries = await adapter.getAll('journalEntries').catch(() => [] as Record<string, unknown>[]);

        const invoices: SampleInvoice[] = [];
        for (const entry of entries) {
          const lines = (entry.lines || []) as Array<{
            accountCode?: string;
            accountName?: string;
            debit?: number;
            credit?: number;
            label?: string;
          }>;
          // Find lines on immobilisation accounts (class 2)
          for (const line of lines) {
            if (line.accountCode?.startsWith('2') && (line.debit || 0) > 0) {
              invoices.push({
                id: (entry.reference || entry.entryNumber || entry.id || '') as string,
                amount: line.debit || 0,
                supplier: (entry.thirdParty || '') as string,
                description: line.label || (entry.label || '') as string,
                account: line.accountCode || '',
                date: (entry.date || '') as string,
              });
            }
          }
        }

        if (mounted) {
          setSampleInvoices(invoices);
        }
      } catch (err) {
        if (mounted) setSampleInvoices([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [adapter]);

  const handleShowModal = (invoice: SampleInvoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handleSubmitCapitalization = (data: Record<string, unknown>) => {
    toast.success('Demande de capitalisation soumise avec succes !');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded">[DEMO]</span>
          Demonstration - Modal de Capitalisation
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Processus automatise de capitalisation des immobilisations
        </p>
      </div>

      {/* Instructions */}
      <ModernCard>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Instructions
          </h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-primary)]">
              Cliquez sur &quot;Capitaliser&quot; pour une facture ci-dessous pour ouvrir la modal de demande de capitalisation.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h3 className="font-medium text-blue-900 mb-2">Processus de capitalisation :</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. <strong>Detection automatique</strong> - Le systeme identifie les immobilisations potentielles</li>
                <li>2. <strong>Modal de capitalisation</strong> - Formulaire en 4 etapes pour renseigner les details</li>
                <li>3. <strong>Circuit de validation</strong> - Approbations selon les seuils definis</li>
                <li>4. <strong>Creation d&apos;actif</strong> - Transfert automatique vers le module immobilisations</li>
              </ol>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      {/* Sample Invoices */}
      <ModernCard>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Factures d&apos;achat - Candidates a la capitalisation
          </h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-sm text-[var(--color-text-secondary)]">
                Chargement des ecritures d&apos;immobilisation...
              </div>
            ) : sampleInvoices.length === 0 ? (
              <div className="text-center py-8">
                <Info className="w-8 h-8 text-[var(--color-text-secondary)] mx-auto mb-2" />
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Aucune ecriture d&apos;immobilisation trouvee.
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Saisissez des ecritures sur les comptes de classe 2 pour voir les candidates a la capitalisation.
                </p>
              </div>
            ) : null}
            {sampleInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="border border-[var(--color-border)] rounded-lg p-4 hover:bg-[var(--color-hover)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      <span className="font-mono text-sm text-[var(--color-text-secondary)]">
                        {invoice.id}
                      </span>
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        Compte: {invoice.account}
                      </span>
                    </div>

                    <h3 className="font-medium text-[var(--color-text-primary)] mb-1">
                      {invoice.supplier || '(Tiers non renseigne)'}
                    </h3>

                    <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                      {invoice.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                      <div className="flex items-center gap-1">
                        <Euro className="w-3 h-3" />
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {formatCurrency(invoice.amount)}
                        </span>
                      </div>
                      {invoice.date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(invoice.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ml-4">
                    <ModernButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleShowModal(invoice)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Capitaliser
                    </ModernButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </ModernCard>

      {/* Modal */}
      {selectedInvoice && (
        <CapitalizationModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          invoiceData={selectedInvoice}
          onSubmit={handleSubmitCapitalization}
        />
      )}
    </div>
  );
};

export default CapitalizationDemo;
