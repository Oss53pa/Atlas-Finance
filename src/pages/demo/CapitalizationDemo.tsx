import React, { useState } from 'react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import CapitalizationModal from '../../components/accounting/CapitalizationModal';
import { Play, FileText, Euro, Calendar } from 'lucide-react';

const CapitalizationDemo: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const sampleInvoices = [
    {
      id: "INV-2024-001",
      amount: 2500,
      supplier: "Dell Technologies",
      description: "Serveur HP ProLiant DL380 Gen10 - 32GB RAM, 2x CPU Xeon",
      account: "2183",
      date: "2024-01-15"
    },
    {
      id: "INV-2024-002",
      amount: 1200,
      supplier: "Microsoft France",
      description: "Licences Office 365 Business Premium - 50 utilisateurs",
      account: "2135",
      date: "2024-01-20"
    },
    {
      id: "INV-2024-003",
      amount: 3500,
      supplier: "Renault Business",
      description: "Véhicule utilitaire Kangoo Z.E. électrique",
      account: "2182",
      date: "2024-01-25"
    },
    {
      id: "INV-2024-004",
      amount: 800,
      supplier: "Steelcase",
      description: "Mobilier de bureau - 4 postes de travail ergonomiques",
      account: "2154",
      date: "2024-01-30"
    }
  ];

  const handleShowModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handleSubmitCapitalization = (data: any) => {
    console.log('Demande de capitalisation soumise:', data);
    // Ici on enverrait les données au backend
    alert('Demande de capitalisation soumise avec succès !');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Démonstration - Modal de Capitalisation
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Processus automatisé de capitalisation des immobilisations
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
              Cliquez sur "Capitaliser" pour une facture ci-dessous pour ouvrir la modal de demande de capitalisation.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h3 className="font-medium text-blue-900 mb-2">Processus de capitalisation :</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. <strong>Détection automatique</strong> - Le système identifie les immobilisations potentielles</li>
                <li>2. <strong>Modal de capitalisation</strong> - Formulaire en 4 étapes pour renseigner les détails</li>
                <li>3. <strong>Circuit de validation</strong> - Approbations selon les seuils définis</li>
                <li>4. <strong>Création d'actif</strong> - Transfert automatique vers le module immobilisations</li>
              </ol>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      {/* Sample Invoices */}
      <ModernCard>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Factures d'achat - Candidates à la capitalisation
          </h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
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
                      {invoice.supplier}
                    </h3>

                    <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                      {invoice.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                      <div className="flex items-center gap-1">
                        <Euro className="w-3 h-3" />
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {invoice.amount.toLocaleString()}€
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(invoice.date).toLocaleDateString('fr-FR')}</span>
                      </div>
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

                {/* Asset Detection Indicator */}
                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-secondary)]">
                      Détection automatique:
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-green-600 font-medium">
                        Immobilisation détectée (85% confiance)
                      </span>
                    </div>
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