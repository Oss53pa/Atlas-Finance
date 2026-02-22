import React, { useState } from 'react';
import { Plus, Lock, Download, Settings } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Modal, ModalBody, ModalFooter } from '@/shared/components/ui/Modal';
import { useModal } from '@/shared/hooks';
import { usePeriodicClosures, useClosureSteps, useClosureStats } from '../hooks/usePeriodicClosures';
import { ClosureStats } from '../components/ClosureStats';
import { PeriodsTable } from '../components/PeriodsTable';
import { StepsTimeline } from '../components/StepsTimeline';
import { ClosurePeriod, ClosureFilters, ClosureStep } from '../types/periodic-closures.types';
import { periodicClosuresService } from '../services/periodicClosuresService';

const PeriodicClosuresPage: React.FC = () => {
  const [filters] = useState<ClosureFilters>({});
  const [selectedPeriod, setSelectedPeriod] = useState<ClosurePeriod | null>(null);

  const { periods, loading: periodsLoading, refetch } = usePeriodicClosures(filters);
  const { stats, loading: statsLoading } = useClosureStats();
  const { steps, loading: stepsLoading } = useClosureSteps(selectedPeriod?.id || '');

  const newPeriodModal = useModal();
  const periodDetailModal = useModal();

  const handlePeriodClick = (period: ClosurePeriod) => {
    setSelectedPeriod(period);
    periodDetailModal.open();
  };

  const handleExecuteStep = async (step: ClosureStep) => {
    if (!selectedPeriod) return;
    try {
      await periodicClosuresService.executeStep(selectedPeriod.id, step.id);
      refetch();
    } catch (error) {
      console.error('Erreur exécution étape:', error);
    }
  };

  const handleValidatePeriod = async () => {
    if (!selectedPeriod) return;
    try {
      await periodicClosuresService.validatePeriod(selectedPeriod.id);
      refetch();
      periodDetailModal.close();
    } catch (error) {
      console.error('Erreur validation période:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#171717]">Clôtures Périodiques</h1>
          <p className="text-[#737373] mt-1">
            Gestion des clôtures mensuelles, trimestrielles et annuelles conformes SYSCOHADA
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" icon={Settings}>
            Configuration
          </Button>
          <Button icon={Plus} onClick={newPeriodModal.open}>
            Nouvelle Clôture
          </Button>
        </div>
      </div>

      <ClosureStats stats={stats} loading={statsLoading} />

      <div className="bg-white rounded-lg border border-[#d4d4d4] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#171717]">Périodes de Clôture</h2>
          <Button variant="outline" icon={Download} size="sm">
            Exporter
          </Button>
        </div>
        <PeriodsTable
          periods={periods}
          loading={periodsLoading}
          onPeriodClick={handlePeriodClick}
        />
      </div>

      <Modal
        isOpen={newPeriodModal.isOpen}
        onClose={newPeriodModal.close}
        title="Nouvelle Période de Clôture"
        size="lg"
      >
        <ModalBody>
          <div className="text-center text-[#737373] py-8">
            Formulaire de création de période à implémenter
          </div>
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={newPeriodModal.close}>
              Annuler
            </Button>
            <Button onClick={newPeriodModal.close}>
              Créer
            </Button>
          </div>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={periodDetailModal.isOpen}
        onClose={periodDetailModal.close}
        title={selectedPeriod ? `${selectedPeriod.period} - ${selectedPeriod.type.toUpperCase()}` : 'Détails'}
        size="xl"
      >
        <ModalBody>
          {selectedPeriod && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-[#737373]">Statut</p>
                  <p className="font-semibold text-[#171717]">{selectedPeriod.status}</p>
                </div>
                <div>
                  <p className="text-sm text-[#737373]">Exercice</p>
                  <p className="font-semibold text-[#171717]">{selectedPeriod.fiscal_year}</p>
                </div>
                <div>
                  <p className="text-sm text-[#737373]">Conformité</p>
                  <p className="font-semibold text-[#171717]">
                    {selectedPeriod.syscohada_compliance_score}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#737373]">Validations</p>
                  <p className="font-semibold text-[#171717]">
                    {selectedPeriod.approvals_received.length} / {selectedPeriod.approvals_required.length}
                  </p>
                </div>
              </div>

              <div className="border-t border-[#d4d4d4] pt-4">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">
                  Étapes de Clôture
                </h3>
                {stepsLoading ? (
                  <div className="text-center text-[#737373] py-8">
                    Chargement des étapes...
                  </div>
                ) : (
                  <StepsTimeline steps={steps} onExecuteStep={handleExecuteStep} />
                )}
              </div>

              {selectedPeriod.documents_generated.length > 0 && (
                <div className="border-t border-[#d4d4d4] pt-4">
                  <h3 className="text-lg font-semibold text-[#171717] mb-2">
                    Documents Générés
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPeriod.documents_generated.map((doc, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-[#f5f5f5] text-[#171717] rounded-full text-sm"
                      >
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={periodDetailModal.close}>
              Fermer
            </Button>
            {selectedPeriod?.status === 'approval_pending' && (
              <Button icon={Lock} onClick={handleValidatePeriod}>
                Valider et Clôturer
              </Button>
            )}
          </div>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default PeriodicClosuresPage;