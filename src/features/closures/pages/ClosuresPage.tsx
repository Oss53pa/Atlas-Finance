import React, { useState } from 'react';
import { Plus, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Select } from '@/shared/components/ui/Form';
import { Modal, ModalBody, ModalFooter } from '@/shared/components/ui/Modal';
import { useModal } from '@/shared/hooks';
import { useClosureSessions, useClosureData } from '../hooks/useClosures';
import { ClotureSessionsTable } from '../components/ClotureSessionsTable';
import { ProvisionsTable } from '../components/ProvisionsTable';
import { ClotureStats } from '../components/ClotureStats';
import { ClotureSession, Provision, ClotureType } from '../types/closures.types';
import { closuresService } from '../services/closuresService';

const ClosuresPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'provisions' | 'amortissements'>('sessions');
  const [selectedSession, setSelectedSession] = useState<ClotureSession | null>(null);

  const newSessionModal = useModal();
  const sessionDetailModal = useModal();

  const { sessions, loading: sessionsLoading, refetch: refetchSessions } = useClosureSessions();
  const {
    provisions,
    amortissements,
    stats,
    loading: dataLoading,
    refetch: refetchData,
  } = useClosureData(selectedSession?.id || '');

  const handleViewSession = (session: ClotureSession) => {
    setSelectedSession(session);
    sessionDetailModal.open();
  };

  const handleValiderProvision = async (provision: Provision) => {
    try {
      await closuresService.validerProvision(provision.id, 'VALIDER');
      refetchData();
    } catch (error) {
      console.error('Erreur validation provision:', error);
    }
  };

  const handleRejeterProvision = async (provision: Provision) => {
    try {
      await closuresService.validerProvision(provision.id, 'REJETER');
      refetchData();
    } catch (error) {
      console.error('Erreur rejet provision:', error);
    }
  };

  const clotureTypes = [
    {
      type: 'MENSUELLE' as ClotureType,
      nom: 'Clôture Mensuelle',
      description: 'Suivi régulier des opérations courantes',
      echeance: 'J+5',
      color: 'bg-[var(--color-primary-lightest)] border-[var(--color-primary-light)] text-[var(--color-primary-darker)]',
    },
    {
      type: 'TRIMESTRIELLE' as ClotureType,
      nom: 'Clôture Trimestrielle',
      description: 'Consolidation et reporting intermédiaire',
      echeance: 'J+15',
      color: 'bg-[var(--color-success-lightest)] border-[var(--color-success-light)] text-[var(--color-success-darker)]',
    },
    {
      type: 'SEMESTRIELLE' as ClotureType,
      nom: 'Clôture Semestrielle',
      description: 'Bilan intermédiaire',
      echeance: 'J+20',
      color: 'bg-[var(--color-warning-lightest)] border-yellow-200 text-yellow-800',
    },
    {
      type: 'ANNUELLE' as ClotureType,
      nom: 'Clôture Annuelle',
      description: 'Opérations de fin d\'exercice',
      echeance: 'J+45',
      color: 'bg-purple-50 border-purple-200 text-purple-800',
    },
    {
      type: 'SPECIALE' as ClotureType,
      nom: 'Clôtures Spéciales',
      description: 'Paramétrables selon besoins',
      echeance: 'Variable',
      color: 'bg-orange-50 border-orange-200 text-orange-800',
    },
  ];

  const tabs = [
    { id: 'sessions', label: 'Sessions de Clôture', icon: Calendar },
    { id: 'provisions', label: 'Provisions', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#171717]">Clôtures Comptables</h1>
          <p className="text-[#737373] mt-1">
            Gestion des clôtures périodiques conformes SYSCOHADA
          </p>
        </div>
        <Button icon={Plus} onClick={newSessionModal.open}>
          Nouvelle Clôture
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-[#d4d4d4] p-6">
        <h2 className="text-lg font-semibold text-[#171717] mb-4">Types de Clôture Supportés</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {clotureTypes.map((cloture) => (
            <div key={cloture.type} className={`border rounded-lg p-4 ${cloture.color}`}>
              <div className="font-medium mb-2">{cloture.nom}</div>
              <div className="text-sm mb-3">{cloture.description}</div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Échéance: {cloture.echeance}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedSession && (
        <ClotureStats stats={stats} loading={dataLoading} />
      )}

      <div className="flex gap-2 border-b border-[#d4d4d4]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#171717] text-[#171717] font-semibold'
                  : 'border-transparent text-[#737373] hover:text-[#171717]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'sessions' && (
        <div className="bg-white rounded-lg border border-[#d4d4d4] p-6">
          <h2 className="text-lg font-semibold text-[#171717] mb-4">
            Sessions de Clôture
          </h2>
          <ClotureSessionsTable
            sessions={sessions}
            loading={sessionsLoading}
            onViewSession={handleViewSession}
          />
        </div>
      )}

      {activeTab === 'provisions' && selectedSession && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Select
              label="Session"
              value={selectedSession.id.toString()}
              onChange={(e) => {
                const session = sessions.find((s) => s.id.toString() === e.target.value);
                if (session) setSelectedSession(session);
              }}
              options={sessions.map((s) => ({
                value: s.id.toString(),
                label: `${s.type} - ${s.periode}`,
              }))}
            />
          </div>

          <div className="bg-white rounded-lg border border-[#d4d4d4] p-6">
            <h2 className="text-lg font-semibold text-[#171717] mb-4">
              Provisions pour Créances Douteuses
            </h2>
            <ProvisionsTable
              provisions={provisions}
              loading={dataLoading}
              onValider={handleValiderProvision}
              onRejeter={handleRejeterProvision}
            />
          </div>
        </div>
      )}

      <Modal
        isOpen={newSessionModal.isOpen}
        onClose={newSessionModal.close}
        title="Nouvelle Session de Clôture"
        size="lg"
      >
        <ModalBody>
          <div className="space-y-4">
            <Select
              label="Type de Clôture"
              options={clotureTypes.map((c) => ({ value: c.type, label: c.nom }))}
              fullWidth
            />
            <p className="text-sm text-[#737373]">
              Sélectionnez le type de clôture à effectuer. Les opérations nécessaires seront
              automatiquement proposées.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={newSessionModal.close}>
              Annuler
            </Button>
            <Button>Créer la Session</Button>
          </div>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={sessionDetailModal.isOpen}
        onClose={sessionDetailModal.close}
        title={`${selectedSession?.type} - ${selectedSession?.periode}`}
        size="xl"
      >
        <ModalBody>
          {selectedSession && (
            <div className="space-y-4">
              <ClotureStats stats={stats} loading={dataLoading} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#737373]">Exercice</p>
                  <p className="font-semibold">{selectedSession.exercice}</p>
                </div>
                <div>
                  <p className="text-sm text-[#737373]">Statut</p>
                  <p className="font-semibold">{selectedSession.statut}</p>
                </div>
                <div>
                  <p className="text-sm text-[#737373]">Créé par</p>
                  <p className="font-semibold">{selectedSession.creePar}</p>
                </div>
                <div>
                  <p className="text-sm text-[#737373]">Progression</p>
                  <p className="font-semibold">{selectedSession.progression}%</p>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={sessionDetailModal.close}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default ClosuresPage;