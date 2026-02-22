import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, DollarSign, BarChart3 } from 'lucide-react';
import { useClientDetail, useClientFactures, useClientPaiements } from '../hooks/useClient';
import { ClientHeader } from '../components/ClientHeader';
import { ClientInfoCard } from '../components/ClientInfoCard';
import { ClientFinancialStats } from '../components/ClientFinancialStats';
import { ClientFacturesTable } from '../components/ClientFacturesTable';
import { formatCurrency } from '@/utils/formatters';

const ClientDetailPage: React.FC = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'factures' | 'analytics'>('info');

  const { client, loading: clientLoading } = useClientDetail(id || '');
  const { factures, loading: facturesLoading } = useClientFactures(id || '');
  const { paiements } = useClientPaiements(id || '');

  const tabs = [
    { id: 'info', label: 'Informations', icon: FileText },
    { id: 'factures', label: 'Factures & Paiements', icon: DollarSign },
    { id: 'analytics', label: 'Analyses', icon: BarChart3 }
  ];

  if (clientLoading || !client) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-[#737373]">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <ClientHeader
        client={client}
        onBack={() => navigate('/clients')}
        onEdit={() => {}}
        onExport={() => {}}
        onPrint={() => window.print()}
      />

      <ClientFinancialStats financier={client.financier} />

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

      {activeTab === 'info' && (
        <div className="space-y-6">
          <ClientInfoCard client={client} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-[#d4d4d4] p-6">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">
                Paramètres Comptables
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#737373]">Compte collectif</span>
                  <span className="font-medium font-mono">{client.comptabilite.compteCollectif}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Régime TVA</span>
                  <span className="font-medium">{client.comptabilite.regimeTVA}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Mode règlement</span>
                  <span className="font-medium">{client.comptabilite.modeReglement}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Délai paiement</span>
                  <span className="font-medium">{client.comptabilite.delaiPaiement} jours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Plafond encours</span>
                  <span className="font-medium">{formatCurrency(client.comptabilite.plafondEncours)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#d4d4d4] p-6">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">
                Classification
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#737373]">Catégorie</span>
                  <span className="font-medium">{client.classification.categorie}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Zone géographique</span>
                  <span className="font-medium">{client.classification.zoneGeographique}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Commercial</span>
                  <span className="font-medium">{client.classification.responsableCommercial}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Notation interne</span>
                  <span className="font-medium font-mono text-lg">{client.classification.notationInterne}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'factures' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-[#d4d4d4] p-6">
            <h3 className="text-lg font-semibold text-[#171717] mb-4">Factures</h3>
            <ClientFacturesTable factures={factures} loading={facturesLoading} />
          </div>

          <div className="bg-white rounded-lg border border-[#d4d4d4] p-6">
            <h3 className="text-lg font-semibold text-[#171717] mb-4">
              Historique des Paiements
            </h3>
            <div className="space-y-3">
              {paiements.map((paiement) => (
                <div
                  key={paiement.id}
                  className="flex items-center justify-between p-3 bg-[#f5f5f5] rounded-lg"
                >
                  <div>
                    <div className="font-medium">{paiement.reference}</div>
                    <div className="text-sm text-[#737373]">
                      {new Date(paiement.date).toLocaleDateString('fr-FR')} - {paiement.mode}
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(paiement.montant)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="bg-white rounded-lg border border-[#d4d4d4] p-6">
          <h3 className="text-lg font-semibold text-[#171717] mb-4">
            Analyses et Graphiques
          </h3>
          <div className="text-center text-[#737373] py-8">
            Graphiques d'analyse à implémenter
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetailPage;