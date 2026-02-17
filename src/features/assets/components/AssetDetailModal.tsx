import React from 'react';
import { Asset } from '../types/assets.types';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';
import { Badge } from '@/shared/components/ui/Badge';
import {
  Package,
  MapPin,
  User,
  Calendar,
  DollarSign,
  TrendingDown,
  CheckCircle,
  Tag,
  FileText,
} from 'lucide-react';

interface AssetDetailModalProps {
  asset: Asset;
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    disposed: 'neutral',
    under_maintenance: 'warning',
    retired: 'error',
  };

  const labels: Record<string, string> = {
    active: 'Actif',
    disposed: 'Cédé',
    under_maintenance: 'Maintenance',
    retired: 'Retiré',
  };

  return (
    <Badge variant={variants[status] || 'neutral'}>
      {labels[status] || status}
    </Badge>
  );
};

const getConditionBadge = (condition?: string) => {
  if (!condition) return null;

  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    excellent: 'success',
    good: 'success',
    fair: 'warning',
    poor: 'error',
  };

  const labels: Record<string, string> = {
    excellent: 'Excellent',
    good: 'Bon',
    fair: 'Moyen',
    poor: 'Mauvais',
  };

  return (
    <Badge variant={variants[condition] || 'neutral'}>
      {labels[condition] || condition}
    </Badge>
  );
};

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ asset }) => {
  const depreciationRate =
    asset.acquisitionCost > 0
      ? (asset.historicalApc / asset.acquisitionCost) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#191919]">{asset.assetNumber}</h3>
          <p className="text-[#767676] mt-1">{asset.description}</p>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(asset.status)}
          {getConditionBadge(asset.condition)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-[#191919] border-b border-[#D9D9D9] pb-2">
            Informations Générales
          </h4>

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-[#767676] mt-1" />
              <div>
                <p className="text-sm text-[#767676]">Classe</p>
                <p className="font-medium text-[#191919]">{asset.assetClass}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Package className="w-4 h-4 text-[#767676] mt-1" />
              <div>
                <p className="text-sm text-[#767676]">Catégorie</p>
                <p className="font-medium text-[#191919]">{asset.assetCategory}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#767676] mt-1" />
              <div>
                <p className="text-sm text-[#767676]">Localisation</p>
                <p className="font-medium text-[#191919]">{asset.location}</p>
              </div>
            </div>

            {asset.technician && (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-[#767676] mt-1" />
                <div>
                  <p className="text-sm text-[#767676]">Technicien</p>
                  <p className="font-medium text-[#191919]">{asset.technician}</p>
                </div>
              </div>
            )}

            {asset.employee && (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-[#767676] mt-1" />
                <div>
                  <p className="text-sm text-[#767676]">Employé Assigné</p>
                  <p className="font-medium text-[#191919]">{asset.employee}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-[#191919] border-b border-[#D9D9D9] pb-2">
            Informations Financières
          </h4>

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-[#767676] mt-1" />
              <div className="flex-1">
                <p className="text-sm text-[#767676]">Coût d'Acquisition</p>
                <p className="text-lg font-bold text-[#191919]">
                  {formatCurrency(asset.acquisitionCost)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <TrendingDown className="w-4 h-4 text-[#B87333] mt-1" />
              <div className="flex-1">
                <p className="text-sm text-[#767676]">Dépréciation Cumulée</p>
                <p className="text-lg font-semibold text-[#B87333]">
                  {formatCurrency(asset.historicalApc)}
                </p>
                <p className="text-xs text-[#767676]">
                  {depreciationRate.toFixed(1)}% du coût initial
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-[#6A8A82] mt-1" />
              <div className="flex-1">
                <p className="text-sm text-[#767676]">Valeur Nette Comptable</p>
                <p className="text-lg font-semibold text-[#6A8A82]">
                  {formatCurrency(asset.netBookValue)}
                </p>
              </div>
            </div>

            {asset.salvageValue !== undefined && asset.salvageValue > 0 && (
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-[#767676] mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-[#767676]">Valeur de Récupération</p>
                  <p className="font-medium text-[#191919]">
                    {formatCurrency(asset.salvageValue)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#D9D9D9]">
        <div>
          <p className="text-sm text-[#767676] mb-1">
            <Calendar className="w-3 h-3 inline mr-1" />
            Date d'Acquisition
          </p>
          <p className="font-medium text-[#191919]">
            {formatDate(asset.acquisitionDate, 'long')}
          </p>
        </div>

        <div>
          <p className="text-sm text-[#767676] mb-1">
            <Calendar className="w-3 h-3 inline mr-1" />
            Date de Capitalisation
          </p>
          <p className="font-medium text-[#191919]">
            {formatDate(asset.capitalizationDate, 'long')}
          </p>
        </div>

        {asset.lastInventory && (
          <div>
            <p className="text-sm text-[#767676] mb-1">
              <FileText className="w-3 h-3 inline mr-1" />
              Dernier Inventaire
            </p>
            <p className="font-medium text-[#191919]">
              {formatDate(asset.lastInventory, 'long')}
            </p>
          </div>
        )}
      </div>

      {(asset.manufacturer || asset.model || asset.serialNumber) && (
        <div className="pt-4 border-t border-[#D9D9D9]">
          <h4 className="text-sm font-semibold text-[#191919] mb-3">
            Informations Techniques
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {asset.manufacturer && (
              <div>
                <p className="text-sm text-[#767676]">Fabricant</p>
                <p className="font-medium text-[#191919]">{asset.manufacturer}</p>
              </div>
            )}
            {asset.model && (
              <div>
                <p className="text-sm text-[#767676]">Modèle</p>
                <p className="font-medium text-[#191919]">{asset.model}</p>
              </div>
            )}
            {asset.serialNumber && (
              <div>
                <p className="text-sm text-[#767676]">N° de Série</p>
                <p className="font-medium text-[#191919]">{asset.serialNumber}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {asset.notes && (
        <div className="pt-4 border-t border-[#D9D9D9]">
          <h4 className="text-sm font-semibold text-[#191919] mb-2">Notes</h4>
          <p className="text-sm text-[#767676] whitespace-pre-wrap">{asset.notes}</p>
        </div>
      )}
    </div>
  );
};