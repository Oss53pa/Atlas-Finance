import React from 'react';
import { Camera, QrCode } from 'lucide-react';
import { AssetMasterData } from '../types/asset-master.types';

interface AssetHeaderProps {
  asset: AssetMasterData;
  onPhotoUpload?: () => void;
  onGenerateQR?: () => void;
}

export const AssetHeader: React.FC<AssetHeaderProps> = ({
  asset,
  onPhotoUpload,
  onGenerateQR
}) => {
  const getStatusColor = (status: string) => {
    const colors = {
      EN_SERVICE: 'bg-green-500',
      HORS_SERVICE: 'bg-red-500',
      EN_MAINTENANCE: 'bg-yellow-500',
      CEDE: 'bg-gray-500',
      REFORME: 'bg-gray-700'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      EN_SERVICE: 'En service',
      HORS_SERVICE: 'Hors service',
      EN_MAINTENANCE: 'En maintenance',
      CEDE: 'Cédé',
      REFORME: 'Réformé'
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="bg-gradient-to-r from-[#e5e5e5]/10 to-[#171717]/10 border-b border-[#d4d4d4] p-6">
      <div className="flex items-start space-x-6">
        <div className="flex-shrink-0">
          {asset.photo_url ? (
            <img
              src={asset.photo_url}
              alt={asset.description}
              className="w-32 h-32 object-cover rounded-lg border-2 border-white shadow-sm"
            />
          ) : (
            <button
              onClick={onPhotoUpload}
              className="w-32 h-32 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-[#171717]/40 transition-colors group"
            >
              <div className="text-center">
                <Camera className="w-8 h-8 text-gray-700 mx-auto mb-2 group-hover:text-[#171717]" />
                <p className="text-xs text-gray-700 group-hover:text-[#171717]">Ajouter photo</p>
              </div>
            </button>
          )}
        </div>

        <div className="flex-1">
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
            <div>
              <label className="text-xs font-medium text-[#737373] uppercase tracking-wide">
                N° CAR
              </label>
              <p className="text-sm font-semibold text-[#171717] mt-0.5">
                {asset.capital_appropriation_number || '-'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-[#737373] uppercase tracking-wide">
                N° Immobilisation
              </label>
              <p className="text-sm font-semibold text-[#171717] mt-0.5">
                {asset.asset_number}
              </p>
            </div>
            <div className="lg:col-span-3 flex items-start gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium text-[#737373] uppercase tracking-wide">
                  Description
                </label>
                <p className="text-sm font-semibold text-[#171717] mt-0.5 leading-tight">
                  {asset.description}
                </p>
              </div>
              <div className="flex items-center">
                <div className={`w-2 h-2 ${getStatusColor(asset.status)} rounded-full mr-2`} />
                <div>
                  <label className="text-xs font-medium text-[#737373] uppercase tracking-wide">
                    Statut
                  </label>
                  <p className="text-sm font-semibold text-[#171717]">
                    {getStatusLabel(asset.status)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0">
          <div className="bg-white border border-[#d4d4d4] rounded-lg p-3 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 border border-[#d4d4d4] rounded flex items-center justify-center mx-auto mb-2">
              {asset.qr_code ? (
                <img src={asset.qr_code} alt="QR Code" className="w-full h-full" />
              ) : (
                <QrCode className="w-8 h-8 text-[#737373]" />
              )}
            </div>
            <p className="text-xs font-medium text-[#171717]">QR Code</p>
            <p className="text-xs text-[#737373] mt-1">{asset.asset_number}</p>
            <button
              onClick={onGenerateQR}
              className="mt-1 text-xs text-[#171717] hover:text-[#262626] font-medium"
            >
              Générer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};