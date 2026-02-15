import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Activity, User, Calendar, Clock, FileText,
  Search, Filter, Download, Eye, ChevronRight,
  Database, Edit, Trash2, Plus, Shield, AlertCircle,
  CheckCircle, XCircle, RefreshCw, Archive, Lock,
  Settings, TrendingUp, BarChart, History, AlertTriangle,
  Save
} from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  utilisateur: string;
  action: 'creation' | 'modification' | 'suppression' | 'validation' | 'consultation';
  entite: 'ecriture' | 'compte' | 'journal' | 'exercice' | 'utilisateur' | 'parametre';
  entiteId: string;
  entiteNom: string;
  details: string;
  ipAddress: string;
  navigateur: string;
  impact: 'faible' | 'moyen' | 'eleve' | 'critique';
  ancienneValeur?: any;
  nouvelleValeur?: any;
}

interface AuditStats {
  totalActions: number;
  actionsAujourdhui: number;
  utilisateursActifs: number;
  anomaliesDetectees: number;
}

const PisteAuditModule: React.FC = () => {
  const { t } = useLanguage();
  const [selectedPeriode, setSelectedPeriode] = useState<'jour' | 'semaine' | 'mois' | 'annee'>('jour');
  const [filterAction, setFilterAction] = useState<'tous' | AuditEntry['action']>('tous');
  const [filterEntite, setFilterEntite] = useState<'tous' | AuditEntry['entite']>('tous');
  const [filterUtilisateur, setFilterUtilisateur] = useState('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'journal' | 'statistiques' | 'configuration'>('journal');

  // Données d'exemple pour la piste d'audit
  const [auditEntries] = useState<AuditEntry[]>([
    {
      id: '1',
      timestamp: new Date().toISOString(),
      utilisateur: 'Jean Dupont',
      action: 'creation',
      entite: 'ecriture',
      entiteId: 'ECR-2025-001',
      entiteNom: 'Écriture de vente #001',
      details: 'Création d\'une écriture de vente pour le client ABC',
      ipAddress: '192.168.1.100',
      navigateur: 'Chrome 120.0',
      impact: 'moyen',
      nouvelleValeur: { montant: 150000, compte: '701000' }
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      utilisateur: 'Marie Martin',
      action: 'modification',
      entite: 'compte',
      entiteId: '401000',
      entiteNom: 'Compte Fournisseurs',
      details: 'Modification du libellé du compte',
      ipAddress: '192.168.1.101',
      navigateur: 'Firefox 121.0',
      impact: 'faible',
      ancienneValeur: { libelle: 'Fournisseurs' },
      nouvelleValeur: { libelle: 'Fournisseurs d\'exploitation' }
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      utilisateur: 'Admin Système',
      action: 'suppression',
      entite: 'ecriture',
      entiteId: 'ECR-2025-002',
      entiteNom: 'Écriture erronée',
      details: 'Suppression d\'une écriture erronée après validation',
      ipAddress: '192.168.1.1',
      navigateur: 'Edge 120.0',
      impact: 'eleve',
      ancienneValeur: { montant: 500000, statut: 'valide' }
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      utilisateur: 'Pierre Durand',
      action: 'validation',
      entite: 'journal',
      entiteId: 'JRN-VTE-202501',
      entiteNom: 'Journal des ventes Janvier 2025',
      details: 'Validation du journal des ventes',
      ipAddress: '192.168.1.102',
      navigateur: 'Safari 17.0',
      impact: 'eleve'
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 14400000).toISOString(),
      utilisateur: 'Sophie Lambert',
      action: 'consultation',
      entite: 'exercice',
      entiteId: '2024',
      entiteNom: 'Exercice 2024',
      details: 'Consultation du bilan de l\'exercice 2024',
      ipAddress: '192.168.1.103',
      navigateur: 'Chrome 120.0',
      impact: 'faible'
    },
    {
      id: '6',
      timestamp: new Date(Date.now() - 18000000).toISOString(),
      utilisateur: 'Admin Système',
      action: 'modification',
      entite: 'utilisateur',
      entiteId: 'USR-005',
      entiteNom: 'Utilisateur Thomas Blanc',
      details: 'Modification des droits d\'accès',
      ipAddress: '192.168.1.1',
      navigateur: 'Chrome 120.0',
      impact: 'critique',
      ancienneValeur: { role: 'comptable' },
      nouvelleValeur: { role: 'administrateur' }
    },
    {
      id: '7',
      timestamp: new Date(Date.now() - 21600000).toISOString(),
      utilisateur: 'Jean Dupont',
      action: 'creation',
      entite: 'parametre',
      entiteId: 'PARAM-TVA',
      entiteNom: 'Taux de TVA',
      details: 'Ajout d\'un nouveau taux de TVA',
      ipAddress: '192.168.1.100',
      navigateur: 'Chrome 120.0',
      impact: 'eleve',
      nouvelleValeur: { taux: 18, libelle: 'TVA normale' }
    }
  ]);

  // Statistiques
  const stats: AuditStats = {
    totalActions: auditEntries.length,
    actionsAujourdhui: auditEntries.filter(e => {
      const today = new Date();
      const entryDate = new Date(e.timestamp);
      return entryDate.toDateString() === today.toDateString();
    }).length,
    utilisateursActifs: new Set(auditEntries.map(e => e.utilisateur)).size,
    anomaliesDetectees: auditEntries.filter(e => e.impact === 'critique' || e.action === 'suppression').length
  };

  // Filtrer les entrées
  const filteredEntries = auditEntries.filter(entry => {
    const matchAction = filterAction === 'tous' || entry.action === filterAction;
    const matchEntite = filterEntite === 'tous' || entry.entite === filterEntite;
    const matchUtilisateur = filterUtilisateur === 'tous' || entry.utilisateur === filterUtilisateur;
    const matchSearch = searchTerm === '' ||
      entry.entiteNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchAction && matchEntite && matchUtilisateur && matchSearch;
  });

  // Utilisateurs uniques pour le filtre
  const uniqueUsers = Array.from(new Set(auditEntries.map(e => e.utilisateur)));

  const getActionIcon = (action: AuditEntry['action']) => {
    switch (action) {
      case 'creation': return <Plus className="w-4 h-4 text-[var(--color-success)]" />;
      case 'modification': return <Edit className="w-4 h-4 text-[var(--color-primary)]" />;
      case 'suppression': return <Trash2 className="w-4 h-4 text-[var(--color-error)]" />;
      case 'validation': return <CheckCircle className="w-4 h-4 text-purple-600" />;
      case 'consultation': return <Eye className="w-4 h-4 text-[var(--color-text-primary)]" />;
    }
  };

  const getActionLabel = (action: AuditEntry['action']) => {
    switch (action) {
      case 'creation': return 'Création';
      case 'modification': return 'Modification';
      case 'suppression': return 'Suppression';
      case 'validation': return 'Validation';
      case 'consultation': return 'Consultation';
    }
  };

  const getImpactBadge = (impact: AuditEntry['impact']) => {
    const colors = {
      faible: 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]',
      moyen: 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]',
      eleve: 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]',
      critique: 'bg-[var(--color-error-lighter)] text-[var(--color-error-dark)]'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[impact]}`}>
        {impact.charAt(0).toUpperCase() + impact.slice(1)}
      </span>
    );
  };

  const exporterAudit = () => {
    alert('Export de la piste d\'audit en cours...');
    // Logique d'export
  };

  const handleCancelConfig = () => {
    alert('Modifications annulées');
  };

  const handleSaveConfig = () => {
    alert('Configuration de la piste d\'audit enregistrée avec succès');
  };

  const handleExportEntry = () => {
    if (selectedEntry) {
      alert(`Export de l'entrée ${selectedEntry.id} en cours...`);
    }
  };

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen ">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-[#191919]">Piste d'Audit</h1>
            <p className="text-[#767676]">Traçabilité complète des actions et modifications</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedPeriode}
              onChange={(e) => setSelectedPeriode(e.target.value as any)}
              className="px-4 py-2 border border-[#E8E8E8] rounded-lg"
            >
              <option value="jour">{t('common.today')}</option>
              <option value="semaine">Cette semaine</option>
              <option value="mois">Ce mois</option>
              <option value="annee">Cette année</option>
            </select>
            <button
              onClick={exporterAudit}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2" aria-label="Télécharger">
              <Download className="w-4 h-4" />
              <span>{t('common.export')}</span>
            </button>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-[var(--color-background-secondary)] rounded-lg">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#767676]">Total actions</span>
              <Activity className="w-4 h-4 text-[#767676]" />
            </div>
            <p className="text-lg font-bold text-[#191919]">{stats.totalActions}</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#767676]">{t('common.today')}</span>
              <Clock className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <p className="text-lg font-bold text-[var(--color-primary)]">{stats.actionsAujourdhui}</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#767676]">Utilisateurs actifs</span>
              <User className="w-4 h-4 text-[var(--color-success)]" />
            </div>
            <p className="text-lg font-bold text-[var(--color-success)]">{stats.utilisateursActifs}</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#767676]">Anomalies</span>
              <AlertCircle className="w-4 h-4 text-[var(--color-error)]" />
            </div>
            <p className="text-lg font-bold text-[var(--color-error)]">{stats.anomaliesDetectees}</p>
          </div>
        </div>
      </div>

      {/* Tabs et contenu */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        {/* Tabs */}
        <div className="border-b border-[#E8E8E8]">
          <div className="flex space-x-6 px-6">
            {[
              { id: 'journal', label: 'Journal d\'audit', icon: History },
              { id: 'statistiques', label: 'Statistiques', icon: BarChart },
              { id: 'configuration', label: 'Configuration', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#6A8A82] text-[#191919]'
                    : 'border-transparent text-[#767676] hover:text-[#191919]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenu */}
        {activeTab === 'journal' && (
          <div className="p-6">
            {/* Filtres */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value as any)}
                  className="px-3 py-2 border border-[#E8E8E8] rounded-lg text-sm"
                >
                  <option value="tous">Toutes actions</option>
                  <option value="creation">Création</option>
                  <option value="modification">Modification</option>
                  <option value="suppression">Suppression</option>
                  <option value="validation">Validation</option>
                  <option value="consultation">Consultation</option>
                </select>
                <select
                  value={filterEntite}
                  onChange={(e) => setFilterEntite(e.target.value as any)}
                  className="px-3 py-2 border border-[#E8E8E8] rounded-lg text-sm"
                >
                  <option value="tous">Toutes entités</option>
                  <option value="ecriture">{t('accounting.entry')}</option>
                  <option value="compte">{t('accounting.account')}</option>
                  <option value="journal">{t('accounting.journal')}</option>
                  <option value="exercice">Exercice</option>
                  <option value="utilisateur">Utilisateur</option>
                  <option value="parametre">Paramètre</option>
                </select>
                <select
                  value={filterUtilisateur}
                  onChange={(e) => setFilterUtilisateur(e.target.value)}
                  className="px-3 py-2 border border-[#E8E8E8] rounded-lg text-sm"
                >
                  <option value="tous">Tous utilisateurs</option>
                  {uniqueUsers.map(user => (
                    <option key={user} value={user}>{user}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#767676]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-10 pr-4 py-2 border border-[#E8E8E8] rounded-lg"
                />
              </div>
            </div>

            {/* Liste des entrées */}
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-[#E8E8E8] rounded-lg p-4 hover:bg-[var(--color-background-secondary)] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* Icône d'action */}
                      <div className="mt-1">
                        {getActionIcon(entry.action)}
                      </div>
                      
                      {/* Détails */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-[#191919]">
                            {getActionLabel(entry.action)}
                          </span>
                          <span className="text-[#767676]">-</span>
                          <span className="text-[#191919]">{entry.entiteNom}</span>
                          {getImpactBadge(entry.impact)}
                        </div>
                        <p className="text-sm text-[#767676] mb-2">{entry.details}</p>
                        <div className="flex items-center space-x-4 text-xs text-[#767676]">
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{entry.utilisateur}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(entry.timestamp).toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Database className="w-3 h-3" />
                            <span>{entry.ipAddress}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <button
                      onClick={() => {
                        setSelectedEntry(entry);
                        setShowDetailModal(true);
                      }}
                      className="p-2 hover:bg-[var(--color-background-hover)] rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-[#767676]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredEntries.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-[#767676]">Aucune entrée trouvée</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'statistiques' && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Graphique des actions par type */}
              <div className="border border-[#E8E8E8] rounded-lg p-4">
                <h3 className="font-semibold text-[#191919] mb-4">Répartition par action</h3>
                <div className="space-y-3">
                  {Object.entries(
                    auditEntries.reduce((acc, entry) => {
                      acc[entry.action] = (acc[entry.action] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([action, count]) => (
                    <div key={action} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(action as AuditEntry['action'])}
                        <span className="text-sm">{getActionLabel(action as AuditEntry['action'])}</span>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphique des actions par utilisateur */}
              <div className="border border-[#E8E8E8] rounded-lg p-4">
                <h3 className="font-semibold text-[#191919] mb-4">Activité par utilisateur</h3>
                <div className="space-y-3">
                  {Object.entries(
                    auditEntries.reduce((acc, entry) => {
                      acc[entry.utilisateur] = (acc[entry.utilisateur] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([user, count]) => (
                      <div key={user} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-[#767676]" />
                          <span className="text-sm">{user}</span>
                        </div>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Timeline d'activité */}
              <div className="border border-[#E8E8E8] rounded-lg p-4">
                <h3 className="font-semibold text-[#191919] mb-4">Activité récente</h3>
                <div className="space-y-2">
                  {['Dernière heure', 'Aujourd\'hui', 'Cette semaine', 'Ce mois'].map((period) => (
                    <div key={period} className="flex justify-between items-center">
                      <span className="text-sm text-[#767676]">{period}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-[var(--color-border)] rounded-full h-2">
                          <div
                            className="h-2 bg-gradient-to-r from-[#6A8A82] to-[#B87333] rounded-full"
                            style={{width: `${Math.random() * 100}%`}}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold">~{Math.floor(Math.random() * 50)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alertes et anomalies */}
              <div className="border border-[#E8E8E8] rounded-lg p-4">
                <h3 className="font-semibold text-[#191919] mb-4">Alertes récentes</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2 p-2 bg-[var(--color-error-lightest)] rounded-lg">
                    <AlertCircle className="w-4 h-4 text-[var(--color-error)] mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">Suppression détectée</p>
                      <p className="text-xs text-[var(--color-error-dark)]">3 écritures supprimées aujourd'hui</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2 p-2 bg-[var(--color-warning-lightest)] rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900">Modification critique</p>
                      <p className="text-xs text-[var(--color-warning-dark)]">Changement de rôle détecté</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'configuration' && (
          <div className="p-6">
            <div className="max-w-2xl">
              <h3 className="font-semibold text-[#191919] mb-4">Paramètres d'audit</h3>
              
              <div className="space-y-4">
                {/* Durée de conservation */}
                <div className="border border-[#E8E8E8] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-[#191919]">Durée de conservation</p>
                      <p className="text-sm text-[#767676]">Période de rétention des logs d'audit</p>
                    </div>
                    <select className="px-3 py-2 border border-[#E8E8E8] rounded-lg" defaultValue="1 an">
                      <option value="3 mois">3 mois</option>
                      <option value="6 mois">6 mois</option>
                      <option value="1 an">1 an</option>
                      <option value="2 ans">2 ans</option>
                      <option value="Illimité">Illimité</option>
                    </select>
                  </div>
                </div>

                {/* Niveau de traçabilité */}
                <div className="border border-[#E8E8E8] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-[#191919]">Niveau de traçabilité</p>
                      <p className="text-sm text-[#767676]">Détail des informations enregistrées</p>
                    </div>
                    <select className="px-3 py-2 border border-[#E8E8E8] rounded-lg" defaultValue="Standard">
                      <option value="Minimal">Minimal</option>
                      <option value="Standard">Standard</option>
                      <option value="Détaillé">Détaillé</option>
                      <option value="Complet">Complet</option>
                    </select>
                  </div>
                </div>

                {/* Actions auditées */}
                <div className="border border-[#E8E8E8] rounded-lg p-4">
                  <p className="font-medium text-[#191919] mb-3">Actions auditées</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Créations', checked: true },
                      { label: 'Modifications', checked: true },
                      { label: 'Suppressions', checked: true },
                      { label: 'Validations', checked: true },
                      { label: 'Consultations', checked: false },
                      { label: 'Exports', checked: true },
                      { label: 'Connexions/Déconnexions', checked: true }
                    ].map((item) => (
                      <label key={item.label} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          defaultChecked={item.checked}
                          className="rounded border-[#E8E8E8]"
                        />
                        <span className="text-sm">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Alertes automatiques */}
                <div className="border border-[#E8E8E8] rounded-lg p-4">
                  <p className="font-medium text-[#191919] mb-3">Alertes automatiques</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Suppressions d\'écritures validées', checked: true },
                      { label: 'Modifications de montants importants (>100K)', checked: true },
                      { label: 'Changements de droits utilisateurs', checked: true },
                      { label: 'Connexions hors heures de bureau', checked: false },
                      { label: 'Tentatives d\'accès non autorisés', checked: true }
                    ].map((item) => (
                      <label key={item.label} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          defaultChecked={item.checked}
                          className="rounded border-[#E8E8E8]"
                        />
                        <span className="text-sm">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={handleCancelConfig}
                    className="px-4 py-2 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-border)]"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2"
                    aria-label="Enregistrer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{t('actions.save')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de détail */}
      {showDetailModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E8E8E8]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#191919]">Détails de l'action</h3>
                  <p className="text-sm text-[#767676]">{selectedEntry.entiteNom}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-[var(--color-background-hover)] rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Informations générales */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-[#767676] mb-1">Action</p>
                  <div className="flex items-center space-x-2">
                    {getActionIcon(selectedEntry.action)}
                    <span className="font-semibold">{getActionLabel(selectedEntry.action)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[#767676] mb-1">Impact</p>
                  {getImpactBadge(selectedEntry.impact)}
                </div>
                <div>
                  <p className="text-sm text-[#767676] mb-1">Utilisateur</p>
                  <p className="font-semibold">{selectedEntry.utilisateur}</p>
                </div>
                <div>
                  <p className="text-sm text-[#767676] mb-1">Date et heure</p>
                  <p className="font-semibold">
                    {new Date(selectedEntry.timestamp).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>

              {/* Détails techniques */}
              <div className="bg-[var(--color-background-secondary)] rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-[#191919] mb-3">Informations techniques</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#767676]">Adresse IP</p>
                    <p className="font-mono">{selectedEntry.ipAddress}</p>
                  </div>
                  <div>
                    <p className="text-[#767676]">Navigateur</p>
                    <p className="font-mono">{selectedEntry.navigateur}</p>
                  </div>
                  <div>
                    <p className="text-[#767676]">ID Entité</p>
                    <p className="font-mono">{selectedEntry.entiteId}</p>
                  </div>
                  <div>
                    <p className="text-[#767676]">Type d'entité</p>
                    <p className="font-mono">{selectedEntry.entite}</p>
                  </div>
                </div>
              </div>

              {/* Changements */}
              {(selectedEntry.ancienneValeur || selectedEntry.nouvelleValeur) && (
                <div className="mb-6">
                  <h4 className="font-semibold text-[#191919] mb-3">Changements effectués</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedEntry.ancienneValeur && (
                      <div className="border border-[var(--color-error-light)] rounded-lg p-3 bg-[var(--color-error-lightest)]">
                        <p className="text-sm font-medium text-red-900 mb-2">Ancienne valeur</p>
                        <pre className="text-xs font-mono text-[var(--color-error-dark)]">
                          {JSON.stringify(selectedEntry.ancienneValeur, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedEntry.nouvelleValeur && (
                      <div className="border border-[var(--color-success-light)] rounded-lg p-3 bg-[var(--color-success-lightest)]">
                        <p className="text-sm font-medium text-green-900 mb-2">Nouvelle valeur</p>
                        <pre className="text-xs font-mono text-[var(--color-success-dark)]">
                          {JSON.stringify(selectedEntry.nouvelleValeur, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <h4 className="font-semibold text-[#191919] mb-2">Description</h4>
                <p className="text-[#767676]">{selectedEntry.details}</p>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-border)]"
                >
                  Fermer
                </button>
                <button
                  onClick={handleExportEntry}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2"
                  aria-label="Télécharger"
                >
                  <Download className="w-4 h-4" />
                  <span>{t('common.export')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PisteAuditModule;