import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Modal, ModalBody, ModalFooter } from '@/shared/components/ui/Modal';
import { useFilters, usePagination, useDebounce, useModal } from '@/shared/hooks';
import { useRecoveryData } from '../hooks/useRecoveryData';
import { RecoveryStats } from '../components/RecoveryStats';
import { RecoveryFilters } from '../components/RecoveryFilters';
import { DossiersTable } from '../components/DossiersTable';
import { DossierDetailModal } from '../components/DossierDetailModal';
import { DossierEditForm } from '../components/DossierEditForm';
import { ReminderForm, ReminderFormData } from '../components/ReminderForm';
import { DossierRecouvrement } from '../types/recovery.types';
import { recoveryService } from '../services/recoveryService';

const RecoveryPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { dossiers, stats, loading, refetch } = useRecoveryData();

  // États locaux
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [riskFilter, setRiskFilter] = useState('tous');
  const [selectedDossier, setSelectedDossier] = useState<DossierRecouvrement | null>(null);

  // Hooks réutilisables
  const debouncedSearch = useDebounce(searchTerm, 300);
  const viewModal = useModal();
  const editModal = useModal();
  const reminderModal = useModal();

  // Filtrage
  const { filteredData, setFilter, clearFilters } = useFilters({
    data: dossiers,
  });

  // Appliquer les filtres
  React.useEffect(() => {
    if (debouncedSearch) {
      setFilter('client', debouncedSearch, 'contains');
    } else {
      clearFilters();
    }
  }, [debouncedSearch]);

  React.useEffect(() => {
    if (statusFilter !== 'tous') {
      setFilter('statut', statusFilter, 'equals');
    }
  }, [statusFilter]);

  // Pagination
  const pagination = usePagination({
    initialPageSize: 10,
    totalItems: filteredData.length,
  });

  // Handlers
  const handleView = (dossier: DossierRecouvrement) => {
    setSelectedDossier(dossier);
    viewModal.open();
  };

  const handleEdit = (dossier: DossierRecouvrement) => {
    setSelectedDossier(dossier);
    editModal.open();
  };

  const handleSendReminder = (dossier: DossierRecouvrement) => {
    setSelectedDossier(dossier);
    reminderModal.open();
  };

  const handleEditSubmit = async (updatedData: Partial<DossierRecouvrement>) => {
    if (!selectedDossier) return;
    try {
      await recoveryService.updateDossier(selectedDossier.id, updatedData);
      await refetch();
      editModal.close();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const handleReminderSubmit = async (data: ReminderFormData) => {
    if (!selectedDossier) return;
    try {
      if (data.type === 'email' || data.type === 'both') {
        await recoveryService.sendEmail(selectedDossier.id, {
          destinataire: selectedDossier.client,
          objet: 'Relance de paiement',
          corps: data.customMessage || '',
        });
      }
      if (data.type === 'sms' || data.type === 'both') {
        await recoveryService.sendSMS(selectedDossier.id, {
          destinataire: selectedDossier.client,
          message: data.customMessage || '',
        });
      }
      await refetch();
      reminderModal.close();
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la relance:', error);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('tous');
    setRiskFilter('tous');
    clearFilters();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#191919]">{t('thirdParty.collection')}</h1>
          <p className="text-[#767676] mt-1">
            Gestion des créances et dossiers de recouvrement
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={Download}>
            Exporter
          </Button>
          <Button icon={Plus}>
            Nouveau Dossier
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <RecoveryStats stats={stats} loading={loading} />

      {/* Filtres */}
      <RecoveryFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        riskFilter={riskFilter}
        onRiskChange={setRiskFilter}
        onClearFilters={handleClearFilters}
      />

      {/* Tableau */}
      <DossiersTable
        dossiers={pagination.paginateData(filteredData)}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onSendReminder={handleSendReminder}
      />

      {/* Modal de visualisation */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={viewModal.close}
        title="Détails du Dossier"
        size="xl"
      >
        <ModalBody>
          {selectedDossier && <DossierDetailModal dossier={selectedDossier} />}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={viewModal.close}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal d'édition */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        title="Modifier le Dossier"
        size="lg"
      >
        <ModalBody>
          {selectedDossier && (
            <DossierEditForm
              dossier={selectedDossier}
              onSubmit={handleEditSubmit}
              onCancel={editModal.close}
            />
          )}
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={editModal.close}>
              Annuler
            </Button>
            <Button onClick={() => {
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }}>
              Enregistrer
            </Button>
          </div>
        </ModalFooter>
      </Modal>

      {/* Modal de relance */}
      <Modal
        isOpen={reminderModal.isOpen}
        onClose={reminderModal.close}
        title="Envoyer une Relance"
        size="lg"
      >
        <ModalBody>
          {selectedDossier && (
            <ReminderForm
              dossier={selectedDossier}
              onSubmit={handleReminderSubmit}
              onCancel={reminderModal.close}
            />
          )}
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reminderModal.close}>
              Annuler
            </Button>
            <Button
              icon={Send}
              onClick={() => {
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
              }}
            >
              Envoyer
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default RecoveryPage;