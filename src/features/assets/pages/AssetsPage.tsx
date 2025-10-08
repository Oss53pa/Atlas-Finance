import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Plus, Download, Search, Filter as FilterIcon, Wrench } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input, Select } from '@/shared/components/ui/Form';
import { Modal, ModalBody, ModalFooter } from '@/shared/components/ui/Modal';
import { useFilters, usePagination, useDebounce, useModal } from '@/shared/hooks';
import { useAssetsData, useAssetMaintenances, useAssetCategories } from '../hooks/useAssetsData';
import { AssetsStats } from '../components/AssetsStats';
import { AssetsTable } from '../components/AssetsTable';
import { AssetDetailModal } from '../components/AssetDetailModal';
import { MaintenancesTable } from '../components/MaintenancesTable';
import { Asset } from '../types/assets.types';

const AssetsPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'assets' | 'maintenances'>('assets');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const viewAssetModal = useModal();
  const maintenanceModal = useModal();
  const newAssetModal = useModal();

  const { assets, stats, loading, refetch } = useAssetsData({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
  });

  const { categories } = useAssetCategories();
  const { maintenances, loading: maintenancesLoading } = useAssetMaintenances();

  const { filteredData, setFilter, clearFilters } = useFilters({
    data: assets,
  });

  React.useEffect(() => {
    if (debouncedSearch) {
      setFilter('description', debouncedSearch, 'contains');
    } else {
      clearFilters();
    }
  }, [debouncedSearch]);

  const pagination = usePagination({
    initialPageSize: 10,
    totalItems: filteredData.length,
  });

  const handleViewAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    viewAssetModal.open();
  };

  const handleMaintenance = (asset: Asset) => {
    setSelectedAsset(asset);
    maintenanceModal.open();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
    clearFilters();
  };

  const tabs = [
    { id: 'assets', label: t('navigation.assets') },
    { id: 'maintenances', label: 'Maintenances' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#191919]">Gestion des Immobilisations</h1>
          <p className="text-[#767676] mt-1">
            Suivi et gestion des actifs immobilisés
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={Download}>
            Exporter
          </Button>
          <Button icon={Plus} onClick={newAssetModal.open}>
            Nouvel Actif
          </Button>
        </div>
      </div>

      <AssetsStats stats={stats} loading={loading} />

      <div className="flex gap-2 border-b border-[#D9D9D9]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#6A8A82] text-[#6A8A82] font-semibold'
                : 'border-transparent text-[#767676] hover:text-[#191919]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'assets' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-[#D9D9D9] p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Rechercher par description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={Search}
                fullWidth
              />

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Tous les statuts' },
                  { value: 'active', label: 'Actif' },
                  { value: 'under_maintenance', label: 'En maintenance' },
                  { value: 'disposed', label: 'Cédé' },
                  { value: 'retired', label: 'Retiré' },
                ]}
                fullWidth
              />

              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Toutes catégories' },
                  ...categories.map((cat) => ({
                    value: cat.code,
                    label: cat.name,
                  })),
                ]}
                fullWidth
              />

              <Button
                variant="outline"
                icon={FilterIcon}
                onClick={handleClearFilters}
                fullWidth
              >
                Réinitialiser
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#D9D9D9] p-6">
            <AssetsTable
              assets={pagination.paginateData(filteredData)}
              loading={loading}
              onView={handleViewAsset}
              onMaintenance={handleMaintenance}
            />
          </div>
        </div>
      )}

      {activeTab === 'maintenances' && (
        <div className="bg-white rounded-lg border border-[#D9D9D9] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#191919]">
              Maintenances Planifiées
            </h2>
            <Button icon={Plus} size="sm">
              Nouvelle Maintenance
            </Button>
          </div>
          <MaintenancesTable maintenances={maintenances} loading={maintenancesLoading} />
        </div>
      )}

      <Modal
        isOpen={viewAssetModal.isOpen}
        onClose={viewAssetModal.close}
        title="Détails de l'Actif"
        size="xl"
      >
        <ModalBody>
          {selectedAsset && <AssetDetailModal asset={selectedAsset} />}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={viewAssetModal.close}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={maintenanceModal.isOpen}
        onClose={maintenanceModal.close}
        title="Planifier une Maintenance"
        size="lg"
      >
        <ModalBody>
          <p className="text-[#767676]">
            Formulaire de planification de maintenance pour{' '}
            <strong>{selectedAsset?.assetNumber}</strong>
          </p>
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={maintenanceModal.close}>
              Annuler
            </Button>
            <Button icon={Wrench}>Planifier</Button>
          </div>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={newAssetModal.isOpen}
        onClose={newAssetModal.close}
        title="Nouvel Actif Immobilisé"
        size="xl"
      >
        <ModalBody>
          <p className="text-[#767676]">Formulaire de création d'actif à venir...</p>
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={newAssetModal.close}>
              Annuler
            </Button>
            <Button>{t('actions.create')}</Button>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default AssetsPage;