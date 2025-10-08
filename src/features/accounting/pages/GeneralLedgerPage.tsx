import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Download, Printer, Search, Eye, Filter as FilterIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input, Select } from '@/shared/components/ui/Form';
import { Modal, ModalBody, ModalFooter } from '@/shared/components/ui/Modal';
import { useModal, useDebounce } from '@/shared/hooks';
import { useGeneralLedger, useAccountLedger, useLedgerSearch } from '../hooks/useGeneralLedger';
import { GeneralLedgerStats } from '../components/GeneralLedgerStats';
import { LedgerAccountsTable } from '../components/LedgerAccountsTable';
import { LedgerEntriesTable } from '../components/LedgerEntriesTable';
import { AccountLedger, GeneralLedgerFilters } from '../types/generalLedger.types';

const GeneralLedgerPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'accounts' | 'search'>('accounts');
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountLedger | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [filters, setFilters] = useState<GeneralLedgerFilters>({
    dateDebut: '2025-01-01',
    dateFin: '2025-12-31',
    compteDebut: '',
    compteFin: '',
    journal: '',
  });

  const debouncedSearch = useDebounce(searchQuery, 500);
  const accountModal = useModal();
  const exportModal = useModal();

  const { accounts, stats, loading, refetch } = useGeneralLedger(filters);
  const { results: searchResults, loading: searchLoading, search } = useLedgerSearch();

  React.useEffect(() => {
    if (debouncedSearch && activeTab === 'search') {
      search(debouncedSearch, filters);
    }
  }, [debouncedSearch, activeTab]);

  const handleViewAccount = (account: AccountLedger) => {
    setSelectedAccount(account);
    accountModal.open();
  };

  const handleToggleExpand = (accountNumber: string) => {
    setExpandedAccounts((prev) =>
      prev.includes(accountNumber)
        ? prev.filter((a) => a !== accountNumber)
        : [...prev, accountNumber]
    );
  };

  const handleFilterChange = (field: keyof GeneralLedgerFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const tabs = [
    { id: 'accounts', label: 'Comptes' },
    { id: 'search', label: 'Recherche Avancée' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#191919]">Grand Livre</h1>
          <p className="text-[#767676] mt-1">
            Consultation du grand livre général et auxiliaires
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

      <GeneralLedgerStats stats={stats} loading={loading} />

      <div className="bg-white rounded-lg border border-[#D9D9D9] p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input
            label="Date Début"
            type="date"
            value={filters.dateDebut}
            onChange={(e) => handleFilterChange('dateDebut', e.target.value)}
            fullWidth
          />

          <Input
            label="Date Fin"
            type="date"
            value={filters.dateFin}
            onChange={(e) => handleFilterChange('dateFin', e.target.value)}
            fullWidth
          />

          <Input
            label="Compte Début"
            placeholder="Ex: 101000"
            value={filters.compteDebut || ''}
            onChange={(e) => handleFilterChange('compteDebut', e.target.value)}
            fullWidth
          />

          <Input
            label="Compte Fin"
            placeholder="Ex: 999999"
            value={filters.compteFin || ''}
            onChange={(e) => handleFilterChange('compteFin', e.target.value)}
            fullWidth
          />

          <Select
            label="Journal"
            value={filters.journal || 'all'}
            onChange={(e) =>
              handleFilterChange('journal', e.target.value === 'all' ? '' : e.target.value)
            }
            options={[
              { value: 'all', label: 'Tous les journaux' },
              { value: 'AC', label: 'Achats' },
              { value: 'VE', label: 'Ventes' },
              { value: 'BA', label: 'Banque' },
              { value: 'CA', label: 'Caisse' },
              { value: 'OD', label: "Opérations Diverses" },
            ]}
            fullWidth
          />
        </div>
      </div>

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

      {activeTab === 'accounts' && (
        <div className="bg-white rounded-lg border border-[#D9D9D9] p-6">
          <h2 className="text-xl font-semibold text-[#191919] mb-4">
            Comptes Mouvementés
          </h2>
          <LedgerAccountsTable
            accounts={accounts}
            loading={loading}
            onViewAccount={handleViewAccount}
            expandable={true}
            expandedAccounts={expandedAccounts}
            onToggleExpand={handleToggleExpand}
          />
        </div>
      )}

      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-[#D9D9D9] p-4">
            <Input
              placeholder="Rechercher par libellé, pièce, montant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
              fullWidth
            />
          </div>

          {searchResults && (
            <div className="bg-white rounded-lg border border-[#D9D9D9] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#191919]">
                  Résultats ({searchResults.totalResults})
                </h2>
                <p className="text-sm text-[#767676]">
                  Recherche effectuée en {searchResults.searchTime}ms
                </p>
              </div>

              {searchResults.entries.length > 0 ? (
                <LedgerEntriesTable entries={searchResults.entries} loading={searchLoading} />
              ) : (
                <p className="text-center text-[#767676] py-8">
                  Aucun résultat pour cette recherche
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={accountModal.isOpen}
        onClose={accountModal.close}
        title={`Grand Livre - ${selectedAccount?.compte} ${selectedAccount?.libelle}`}
        size="xl"
      >
        <ModalBody>
          {selectedAccount && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-[#F5F5F5] rounded-lg">
                <div>
                  <p className="text-sm text-[#767676]">Solde Ouverture</p>
                  <p className="text-lg font-semibold text-[#191919]">
                    {selectedAccount.soldeOuverture.toLocaleString()} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#767676]">Mouvements</p>
                  <p className="text-lg font-semibold text-[#191919]">
                    {selectedAccount.nombreEcritures} écritures
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#767676]">Solde Clôture</p>
                  <p className="text-lg font-semibold text-[#6A8A82]">
                    {selectedAccount.soldeFermeture.toLocaleString()} FCFA
                  </p>
                </div>
              </div>

              <LedgerEntriesTable entries={selectedAccount.entries} showSolde={true} />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={accountModal.close}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={exportModal.isOpen}
        onClose={exportModal.close}
        title="Exporter le Grand Livre"
        size="md"
      >
        <ModalBody>
          <div className="space-y-4">
            <Select
              label="Format d'Export"
              options={[
                { value: 'excel', label: 'Excel (.xlsx)' },
                { value: 'pdf', label: 'PDF' },
                { value: 'csv', label: 'CSV' },
              ]}
              fullWidth
            />
            <p className="text-sm text-[#767676]">
              L'export utilisera les filtres actuellement appliqués.
            </p>
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

export default GeneralLedgerPage;