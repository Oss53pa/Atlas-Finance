import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { db } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { History, Filter, Search, Eye, User, Calendar, FileText, X } from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import ExportMenu from '../../components/shared/ExportMenu';

interface ChangeLog {
  id: string;
  date: string;
  time: string;
  user: string;
  module: string;
  action: string;
  description: string;
  details: string;
  status: 'success' | 'warning' | 'error';
}

const TrackChangePage: React.FC = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<ChangeLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetails = (log: ChangeLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLog(null);
  };

  const changeLogs: ChangeLog[] = useLiveQuery(async () => {
    try {
      const logs = await db.auditLogs.orderBy('timestamp').reverse().limit(50).toArray();
      return logs.map(log => {
        const ts = new Date(log.timestamp);
        return {
          id: log.id,
          date: ts.toLocaleDateString('fr-FR'),
          time: ts.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          user: log.userId || 'Système',
          module: log.entityType || '-',
          action: log.action || '-',
          description: log.details || '-',
          details: `${log.entityType} #${log.entityId}`,
          status: 'success' as const,
        };
      });
    } catch {
      return [];
    }
  }, []) || [];

  const filteredLogs = changeLogs.filter(log => {
    const matchesSearch =
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesModule = filterModule === 'all' || log.module === filterModule;
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesUser = filterUser === 'all' || log.user === filterUser;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;

    // Convertir les dates pour comparaison
    const logDate = new Date(log.date.split('/').reverse().join('-'));
    const matchesDateFrom = !filterDateFrom || logDate >= new Date(filterDateFrom);
    const matchesDateTo = !filterDateTo || logDate <= new Date(filterDateTo);

    return matchesSearch && matchesModule && matchesAction && matchesUser && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const modules = ['all', ...Array.from(new Set(changeLogs.map(log => log.module)))];
  const actions = ['all', ...Array.from(new Set(changeLogs.map(log => log.action)))];
  const users = ['all', ...Array.from(new Set(changeLogs.map(log => log.user)))];
  const statuses = ['all', 'success', 'warning', 'error'];

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <History className="w-8 h-8" />
          Suivi des Modifications
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Historique complet de toutes les modifications effectuées dans le système
        </p>
      </div>

      {/* Filtres et recherche */}
      <ModernCard>
        <CardBody>
          <div className="space-y-4">
            {/* Ligne 1: Recherche */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  Rechercher
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--color-text-tertiary)]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher par utilisateur, module, description..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Ligne 2: Filtres principaux */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Filtre par module */}
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Module
                </label>
                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="all">Tous les modules</option>
                  {modules.filter(m => m !== 'all').map(module => (
                    <option key={module} value={module}>{module}</option>
                  ))}
                </select>
              </div>

              {/* Filtre par action */}
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Action
                </label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="all">Toutes les actions</option>
                  {actions.filter(a => a !== 'all').map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              {/* Filtre par utilisateur */}
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Utilisateur
                </label>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="all">Tous les utilisateurs</option>
                  {users.filter(u => u !== 'all').map(user => (
                    <option key={user} value={user}>{user}</option>
                  ))}
                </select>
              </div>

              {/* Filtre par statut */}
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Statut
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="success">{t('common.success')}</option>
                  <option value="warning">Avertissement</option>
                  <option value="error">{t('common.error')}</option>
                </select>
              </div>
            </div>

            {/* Ligne 3: Filtres par date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date de début
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date de fin
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              </div>

              <div className="flex items-end">
                <ModernButton
                  onClick={() => {
                    setSearchTerm('');
                    setFilterModule('all');
                    setFilterAction('all');
                    setFilterUser('all');
                    setFilterStatus('all');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="w-full border border-gray-300 bg-white text-[var(--color-text-primary)] hover:bg-gray-100"
                >
                  Réinitialiser les filtres
                </ModernButton>
              </div>
            </div>

            {/* Bouton Export */}
            <div className="flex justify-end pt-2">
              <ExportMenu
                data={filteredLogs}
                filename="suivi_modifications"
                columns={{
                  date: 'Date',
                  time: 'Heure',
                  user: 'Utilisateur',
                  module: 'Module',
                  action: 'Action',
                  description: 'Description',
                  details: 'Détails',
                  status: 'Statut'
                }}
                buttonText="Exporter"
                buttonVariant="outline"
                className="border-[#171717] text-[#171717] hover:bg-[#171717]/10"
              />
            </div>
          </div>
        </CardBody>
      </ModernCard>

      {/* Table des modifications */}
      <ModernCard>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Historique des actions utilisateurs ({filteredLogs.length})
          </h2>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-4" />
                <p className="text-[var(--color-text-secondary)]">
                  Aucune action trouvée
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Date & Heure
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Détails
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-[var(--color-text-primary)]">{log.date}</div>
                        <div className="text-xs text-[var(--color-text-tertiary)]">{log.time}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-xs font-semibold">
                            {log.user.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-sm text-[var(--color-text-primary)]">{log.user}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {log.module}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.action === 'Ajout' ? 'bg-green-100 text-green-800' :
                          log.action === 'Modification' ? 'bg-orange-100 text-orange-800' :
                          log.action === 'Suppression' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[var(--color-text-primary)] max-w-xs truncate">
                          {log.description}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-[var(--color-text-secondary)] max-w-xs truncate">
                          {log.details}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardBody>
      </ModernCard>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ModernCard>
          <CardBody>
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--color-primary)]">
                {changeLogs.length}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Total modifications
              </div>
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {changeLogs.filter(l => l.action === 'Ajout').length}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Ajouts
              </div>
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {changeLogs.filter(l => l.action === 'Modification').length}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Modifications
              </div>
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {changeLogs.filter(l => l.action === 'Suppression').length}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Suppressions
              </div>
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* Modal de détails */}
      {isModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  selectedLog.status === 'success' ? 'bg-green-100' :
                  selectedLog.status === 'warning' ? 'bg-orange-100' :
                  'bg-red-100'
                }`}>
                  <History className={`w-6 h-6 ${
                    selectedLog.status === 'success' ? 'text-green-600' :
                    selectedLog.status === 'warning' ? 'text-orange-600' :
                    'text-red-600'
                  }`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Détails de l'action</h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">#{selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Fermer">
                <X className="w-6 h-6 text-[var(--color-text-secondary)]" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Informations principales */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">{t('common.date')}</label>
                    <div className="text-sm text-[var(--color-text-primary)] font-medium mt-1">{selectedLog.date}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Heure</label>
                    <div className="text-sm text-[var(--color-text-primary)] font-medium mt-1">{selectedLog.time}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Utilisateur</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-8 h-8 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-xs font-semibold">
                        {selectedLog.user.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm text-[var(--color-text-primary)] font-medium">{selectedLog.user}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Module</label>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {selectedLog.module}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Type d'action</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedLog.action === 'Ajout' ? 'bg-green-100 text-green-800' :
                      selectedLog.action === 'Modification' ? 'bg-orange-100 text-orange-800' :
                      selectedLog.action === 'Suppression' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedLog.action}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Description</label>
                  <div className="mt-1 text-sm text-[var(--color-text-primary)] bg-gray-50 p-3 rounded-lg">
                    {selectedLog.description}
                  </div>
                </div>

                {/* Détails */}
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Détails complets</label>
                  <div className="mt-1 text-sm text-[var(--color-text-primary)] bg-gray-50 p-3 rounded-lg">
                    {selectedLog.details}
                  </div>
                </div>

                {/* Statut */}
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Statut</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedLog.status === 'success' ? 'bg-green-100 text-green-800' :
                      selectedLog.status === 'warning' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedLog.status === 'success' ? t('common.success') :
                       selectedLog.status === 'warning' ? 'Avertissement' : t('common.error')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <ModernButton
                onClick={handleCloseModal}
                className="border border-gray-300 bg-white text-[var(--color-text-primary)] hover:bg-gray-100"
              >
                Fermer
              </ModernButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackChangePage;