import React, { useState } from 'react';
import { AssetsStats } from '../components/AssetsStats';
import { AssetsFilters } from '../components/AssetsFilters';
import { AssetsTable } from '../components/AssetsTable';
import { Button } from '@/shared/components/ui/Button';
import { Download, Plus } from 'lucide-react';
import { useAssetsList, useAssetsStats } from '../hooks/useAssetsList';
import { AssetsFilters as Filters, AssetData } from '../types/assets-list.types';
import { assetsListService } from '../services/assetsListService';

const AssetsListPage: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({});
  const { stats, loading: statsLoading } = useAssetsStats();
  const { assets, loading: assetsLoading, refetch } = useAssetsList(filters);

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    try {
      const blob = await assetsListService.exportAssets(format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `immobilisations.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleRowClick = (asset: AssetData) => {
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Registre des Immobilisations</h1>
          <p className="mt-2 text-gray-600">
            Gestion complète du registre des immobilisations corporelles
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            icon={Download}
            onClick={() => handleExport('xlsx')}
          >
            Exporter Excel
          </Button>
          <Button
            variant="outline"
            icon={Download}
            onClick={() => handleExport('pdf')}
          >
            Exporter PDF
          </Button>
          <Button icon={Plus}>
            Nouvelle Immobilisation
          </Button>
        </div>
      </div>

      <AssetsStats stats={stats} loading={statsLoading} />

      <AssetsFilters
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleResetFilters}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <AssetsTable
          assets={assets}
          loading={assetsLoading}
          onRowClick={handleRowClick}
        />
      </div>
    </div>
  );
};

export default AssetsListPage;