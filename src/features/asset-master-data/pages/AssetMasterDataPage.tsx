import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Info, DollarSign, Building, Wrench, FileText, Edit, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Modal, ModalBody, ModalFooter } from '@/shared/components/ui/Modal';
import { useModal } from '@/shared/hooks';
import { useAsset } from '../hooks/useAssetMaster';
import { AssetHeader } from '../components/AssetHeader';
import { AssetFormSection } from '../components/AssetFormSection';
import { AssetMasterData } from '../types/asset-master.types';
import { assetMasterService } from '../services/assetMasterService';

const AssetMasterDataPage: React.FC = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { asset, loading } = useAsset(id || '');

  const [activeTab, setActiveTab] = useState<'general' | 'acquisition' | 'immobilisation' | 'maintenance'>('general');
  const [editMode, setEditMode] = useState(false);
  const [editedAsset, setEditedAsset] = useState<Partial<AssetMasterData>>({});

  const qrModal = useModal();

  const tabs = [
    { id: 'general', label: 'Information générale', icon: Info },
    { id: 'acquisition', label: 'Acquisition', icon: DollarSign },
    { id: 'immobilisation', label: 'Immobilisation', icon: Building },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench }
  ];

  const handleFieldChange = (section: string, field: string, value: string | number | boolean) => {
    setEditedAsset(prev => ({
      ...prev,
      [section]: {
        ...((prev as Record<string, Record<string, unknown>>)[section] || {}),
        [field]: value
      }
    }));
  };

  const handleGenerateQR = async () => {
    if (!asset) return;
    try {
      const qrCode = await assetMasterService.generateQRCode(asset.asset_number);
      qrModal.open();
    } catch (error) {
      console.error('Erreur génération QR:', error);
    }
  };

  const handleSave = async () => {
    if (!asset) return;
    try {
      await assetMasterService.updateAsset(asset.id, editedAsset);
      setEditMode(false);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  };

  if (loading || !asset) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-[#767676]">{t('common.loading')}</div>
      </div>
    );
  }

  const displayAsset = editMode ? { ...asset, ...editedAsset } : asset;

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-[#D9D9D9] bg-white">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={ArrowLeft}
            onClick={() => navigate('/assets')}
          />
          <h1 className="text-lg font-bold text-[#191919]">Fiche Immobilisation</h1>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                Sauvegarder
              </Button>
            </>
          ) : (
            <Button icon={Edit} onClick={() => setEditMode(true)}>
              Modifier
            </Button>
          )}
        </div>
      </div>

      <AssetHeader
        asset={displayAsset}
        onGenerateQR={handleGenerateQR}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-gray-50 border-r border-[#D9D9D9] overflow-y-auto">
          <nav className="p-4 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'general' | 'acquisition' | 'immobilisation' | 'maintenance')}
                  className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#6A8A82]/20 text-[#6A8A82] font-medium'
                      : 'text-[#191919] hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {editMode ? (
            <AssetFormSection
              section={activeTab}
              asset={displayAsset}
              onChange={handleFieldChange}
            />
          ) : (
            <div className="space-y-6">
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#191919]">Information Générale</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-[#767676]">Classe d'actif</label>
                      <p className="font-medium text-[#191919]">{asset.general.asset_class}</p>
                    </div>
                    <div>
                      <label className="text-sm text-[#767676]">Localisation</label>
                      <p className="font-medium text-[#191919]">{asset.general.location}</p>
                    </div>
                    <div>
                      <label className="text-sm text-[#767676]">Département</label>
                      <p className="font-medium text-[#191919]">{asset.general.department || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-[#767676]">Responsable</label>
                      <p className="font-medium text-[#191919]">{asset.general.responsible_person || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'acquisition' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#191919]">Informations d'Acquisition</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-[#767676]">Date d'acquisition</label>
                      <p className="font-medium text-[#191919]">
                        {new Date(asset.acquisition.acquisition_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-[#767676]">Coût d'acquisition</label>
                      <p className="font-medium text-[#191919]">
                        {asset.acquisition.acquisition_cost.toLocaleString()} FCFA
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-[#767676]">Fournisseur</label>
                      <p className="font-medium text-[#191919]">{asset.acquisition.supplier || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'immobilisation' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#191919]">Immobilisation</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-[#767676]">N° de compte</label>
                      <p className="font-medium text-[#191919]">{asset.immobilisation.account_number}</p>
                    </div>
                    <div>
                      <label className="text-sm text-[#767676]">Méthode d'amortissement</label>
                      <p className="font-medium text-[#191919]">{asset.immobilisation.depreciation_method}</p>
                    </div>
                    <div>
                      <label className="text-sm text-[#767676]">Valeur nette comptable</label>
                      <p className="font-medium text-[#191919]">
                        {asset.immobilisation.net_book_value.toLocaleString()} FCFA
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-[#767676]">Amortissement cumulé</label>
                      <p className="font-medium text-[#191919]">
                        {asset.immobilisation.accumulated_depreciation.toLocaleString()} FCFA
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'maintenance' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#191919]">Données de Maintenance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-[#767676]">Dernière maintenance</label>
                      <p className="font-medium text-[#191919]">
                        {asset.maintenance.last_maintenance_date
                          ? new Date(asset.maintenance.last_maintenance_date).toLocaleDateString('fr-FR')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-[#767676]">Prochaine maintenance</label>
                      <p className="font-medium text-[#191919]">
                        {asset.maintenance.next_maintenance_date
                          ? new Date(asset.maintenance.next_maintenance_date).toLocaleDateString('fr-FR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={qrModal.isOpen}
        onClose={qrModal.close}
        title="QR Code généré"
        size="sm"
      >
        <ModalBody>
          <div className="text-center">
            <p className="text-[#767676] mb-4">QR Code pour l'immobilisation {asset.asset_number}</p>
            <div className="flex justify-center">
              <div className="w-48 h-48 bg-gray-100 border border-[#D9D9D9] rounded flex items-center justify-center">
                QR Code Placeholder
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={qrModal.close}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default AssetMasterDataPage;