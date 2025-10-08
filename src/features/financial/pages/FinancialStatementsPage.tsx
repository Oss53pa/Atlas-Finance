import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Download, Printer, FileText, BarChart3, Calculator } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Select, Checkbox } from '@/shared/components/ui/Form';
import { Modal, ModalBody, ModalFooter } from '@/shared/components/ui/Modal';
import { useModal } from '@/shared/hooks';
import { useFinancialStatements } from '../hooks/useFinancialStatements';
import { BilanTable } from '../components/BilanTable';
import { CompteResultatTable } from '../components/CompteResultatTable';
import { RatiosCard } from '../components/RatiosCard';

const FinancialStatementsPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'bilan' | 'compte-resultat' | 'ratios'>('bilan');
  const [selectedExercice, setSelectedExercice] = useState('2024');
  const [compareExercice, setCompareExercice] = useState('2023');
  const [showComparison, setShowComparison] = useState(true);

  const exportModal = useModal();

  const { data: currentData, loading: currentLoading } = useFinancialStatements(selectedExercice);
  const { data: previousData, loading: previousLoading } = useFinancialStatements(
    showComparison ? compareExercice : ''
  );

  const loading = currentLoading || previousLoading;

  const tabs = [
    { id: 'bilan', label: 'Bilan', icon: FileText },
    { id: 'compte-resultat', label: 'Compte de Résultat', icon: BarChart3 },
    { id: 'ratios', label: 'Ratios Financiers', icon: Calculator },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#191919]">États Financiers SYSCOHADA</h1>
          <p className="text-[#767676] mt-1">
            Bilan, Compte de Résultat et Ratios Financiers
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={Printer}>
            Imprimer
          </Button>
          <Button variant="outline" icon={Download} onClick={exportModal.open}>
            Exporter
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#D9D9D9] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select
              label="Exercice"
              value={selectedExercice}
              onChange={(e) => setSelectedExercice(e.target.value)}
              options={[
                { value: '2024', label: '2024' },
                { value: '2023', label: '2023' },
                { value: '2022', label: '2022' },
              ]}
            />

            {showComparison && (
              <Select
                label="Comparer avec"
                value={compareExercice}
                onChange={(e) => setCompareExercice(e.target.value)}
                options={[
                  { value: '2023', label: '2023' },
                  { value: '2022', label: '2022' },
                  { value: '2021', label: '2021' },
                ]}
              />
            )}
          </div>

          <Checkbox
            label="Afficher la comparaison"
            checked={showComparison}
            onChange={(e) => setShowComparison(e.target.checked)}
          />
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#D9D9D9]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#6A8A82] text-[#6A8A82] font-semibold'
                  : 'border-transparent text-[#767676] hover:text-[#191919]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'bilan' && currentData && (
        <BilanTable
          bilan={currentData.bilan}
          loading={loading}
          previousBilan={previousData?.bilan}
          showComparison={showComparison}
        />
      )}

      {activeTab === 'compte-resultat' && currentData && (
        <CompteResultatTable
          compteResultat={currentData.compteResultat}
          loading={loading}
          previousCR={previousData?.compteResultat}
          showComparison={showComparison}
        />
      )}

      {activeTab === 'ratios' && currentData && (
        <div className="space-y-6">
          <RatiosCard ratios={currentData.ratios} loading={loading} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-[#D9D9D9] p-6">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Structure Financière</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#767676]">Autonomie Financière</span>
                  <span className="font-semibold">{currentData.ratios.autonomieFinanciere.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#767676]">Taux d'Endettement</span>
                  <span className="font-semibold">{currentData.ratios.endettement.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#767676]">Couverture des Emplois</span>
                  <span className="font-semibold">{currentData.ratios.couvertureEmplois.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#D9D9D9] p-6">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Liquidité</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#767676]">Liquidité Générale</span>
                  <span className="font-semibold">{currentData.ratios.liquiditeGenerale.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#767676]">Liquidité Réduite</span>
                  <span className="font-semibold">{currentData.ratios.liquiditeReduite.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#767676]">Liquidité Immédiate</span>
                  <span className="font-semibold">{currentData.ratios.liquiditeImmediate.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#D9D9D9] p-6">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Rentabilité</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#767676]">Rentabilité Commerciale</span>
                  <span className="font-semibold">{currentData.ratios.rentabiliteCommerciale.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#767676]">ROE</span>
                  <span className="font-semibold">{currentData.ratios.roe.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#767676]">ROA</span>
                  <span className="font-semibold">{currentData.ratios.roa.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={exportModal.isOpen}
        onClose={exportModal.close}
        title="Exporter les États Financiers"
        size="md"
      >
        <ModalBody>
          <div className="space-y-4">
            <Select
              label="Format d'Export"
              options={[
                { value: 'excel', label: 'Excel (.xlsx)' },
                { value: 'pdf', label: 'PDF' },
              ]}
              fullWidth
            />
            <Checkbox label="Inclure le bilan" checked />
            <Checkbox label="Inclure le compte de résultat" checked />
            <Checkbox label="Inclure les ratios" checked />
            <Checkbox label="Inclure la comparaison" checked={showComparison} />
          </div>
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportModal.close}>
              Annuler
            </Button>
            <Button icon={Download}>{t('common.export')}</Button>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default FinancialStatementsPage;