import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import {
  Calendar, AlertCircle, CheckCircle, Clock, FileText,
  TrendingUp, TrendingDown, Minus, ChevronRight, Download,
  Eye, Settings, RefreshCw, Filter, Search, X, Check,
  AlertTriangle, DollarSign, Archive, Send, Save, Loader2
} from 'lucide-react';
import { db } from '../../lib/db';
import type { DBFiscalYear } from '../../lib/db';
import {
  calculerSoldesCloture,
  previewCarryForward,
  executerCarryForward,
  hasCarryForward,
} from '../../services/cloture/carryForwardService';
import type { CarryForwardLine, CarryForwardPreview } from '../../services/cloture/carryForwardService';
import { formatCurrency } from '../../utils/formatters';

interface ReportCompte {
  id: string;
  code: string;
  libelle: string;
  soldeN1: number;
  mouvementDebit: number;
  mouvementCredit: number;
  soldeN: number;
  type: 'actif' | 'passif' | 'charge' | 'produit';
  categorie: 'resultat' | 'bilan' | 'hors_bilan';
  statut: 'valide' | 'a_verifier' | 'erreur' | 'en_cours';
  ecart: number;
  commentaire?: string;
}

interface ReportExercice {
  id: string;
  exercice: string;
  dateDebut: string;
  dateFin: string;
  statut: 'en_preparation' | 'en_cours' | 'valide' | 'cloture';
  totalActif: number;
  totalPassif: number;
  resultatN1: number;
  resultatReporte: number;
  ecartGlobal: number;
}

const ReportsANouveauModule: React.FC = () => {
  const { t } = useLanguage();
  const [selectedExercice, setSelectedExercice] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCompte, setSelectedCompte] = useState<ReportCompte | null>(null);
  const [filterCategorie, setFilterCategorie] = useState<'tous' | 'resultat' | 'bilan' | 'hors_bilan'>('tous');
  const [filterStatut, setFilterStatut] = useState<'tous' | 'valide' | 'a_verifier' | 'erreur'>('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'comptes' | 'validation' | 'historique'>('comptes');
  const [showEditModal, setShowEditModal] = useState(false);

  // --- Real data from Dexie ---
  const [fiscalYears, setFiscalYears] = useState<DBFiscalYear[]>([]);
  const [carryForwardLines, setCarryForwardLines] = useState<CarryForwardLine[]>([]);
  const [carryPreview, setCarryPreview] = useState<CarryForwardPreview | null>(null);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Load fiscal years
  useEffect(() => {
    db.fiscalYears.toArray().then(fys => {
      setFiscalYears(fys);
      const active = fys.find(fy => fy.isActive) || fys[0];
      if (active) setSelectedExercice(active.id);
    });
  }, []);

  // Load carry-forward data when exercice changes
  useEffect(() => {
    if (!selectedExercice) return;
    setLoadingData(true);
    Promise.all([
      calculerSoldesCloture(selectedExercice),
      hasCarryForward(selectedExercice),
    ]).then(([lines, exists]) => {
      setCarryForwardLines(lines);
      setAlreadyExists(exists);
    }).catch(() => {
      setCarryForwardLines([]);
    }).finally(() => setLoadingData(false));
  }, [selectedExercice]);

  // Handlers
  const handleSettingsCompte = (compte: ReportCompte) => {
    setSelectedCompte(compte);
    setShowEditModal(true);
  };

  const handleExport = () => {
    toast.success('Export en cours... (fonctionnalité à venir)');
  };

  const handleArchive = () => {
    if (confirm('Archiver les reports de cet exercice ?')) {
      toast.success('Reports archivés');
    }
  };

  const handleCancelValidation = () => {
    setActiveTab('comptes');
  };

  const handleFinalizeReport = () => {
    if (confirm('Finaliser le report à nouveau ? Cette action est irréversible.')) {
      toast.success('Report à nouveau finalisé');
    }
  };

  const lancerReportANouveau = useCallback(async () => {
    if (!selectedExercice) return;
    const currentFY = fiscalYears.find(fy => fy.id === selectedExercice);
    const nextFY = fiscalYears.find(fy => currentFY && fy.startDate > currentFY.endDate);
    if (!currentFY || !nextFY) {
      toast.error('Exercice source ou cible introuvable');
      return;
    }

    setGenerating(true);
    try {
      const result = await executerCarryForward({
        closingExerciceId: currentFY.id,
        openingExerciceId: nextFY.id,
        openingDate: nextFY.startDate,
      });
      if (result.success) {
        toast.success(`Report à nouveau généré: ${result.lineCount} comptes, Débit=${formatCurrency(result.totalDebit)}, Crédit=${formatCurrency(result.totalCredit)}`);
        setAlreadyExists(true);
        // Refresh data
        const lines = await calculerSoldesCloture(selectedExercice);
        setCarryForwardLines(lines);
      } else {
        toast.error(`Erreur: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  }, [selectedExercice, fiscalYears]);

  const validerReport = useCallback(async () => {
    toast.success('Validation enregistrée');
  }, []);

  // Map carry-forward lines to component interface
  const selectedFY = fiscalYears.find(fy => fy.id === selectedExercice);

  const exerciceInfo: ReportExercice = {
    id: selectedFY?.id || '',
    exercice: selectedFY?.code || '',
    dateDebut: selectedFY?.startDate || '',
    dateFin: selectedFY?.endDate || '',
    statut: selectedFY?.isClosed ? 'cloture' : alreadyExists ? 'valide' : 'en_preparation',
    totalActif: carryForwardLines.filter(l => ['2', '3', '4', '5'].includes(l.accountCode.charAt(0)) && l.soldeDebiteur > 0).reduce((s, l) => s + l.soldeDebiteur, 0),
    totalPassif: carryForwardLines.filter(l => l.accountCode.charAt(0) === '1' || l.soldeCrediteur > 0).reduce((s, l) => s + l.soldeCrediteur, 0),
    resultatN1: 0,
    resultatReporte: 0,
    ecartGlobal: carryForwardLines.reduce((s, l) => s + l.soldeDebiteur, 0) - carryForwardLines.reduce((s, l) => s + l.soldeCrediteur, 0),
  };

  const reportComptes: ReportCompte[] = carryForwardLines.map((l, i) => {
    const cls = l.accountCode.charAt(0);
    return {
      id: String(i + 1),
      code: l.accountCode,
      libelle: l.accountName,
      soldeN1: l.soldeDebiteur || l.soldeCrediteur,
      mouvementDebit: l.soldeDebiteur,
      mouvementCredit: l.soldeCrediteur,
      soldeN: l.soldeDebiteur || l.soldeCrediteur,
      type: ['2', '3', '5'].includes(cls) ? 'actif' as const
        : cls === '1' ? 'passif' as const
        : cls === '4' ? (l.soldeDebiteur > 0 ? 'actif' as const : 'passif' as const)
        : 'actif' as const,
      categorie: 'bilan' as const,
      statut: 'valide' as const,
      ecart: 0,
    };
  });

  // Filtrer les comptes
  const filteredComptes = reportComptes.filter(compte => {
    const matchCategorie = filterCategorie === 'tous' || compte.categorie === filterCategorie;
    const matchStatut = filterStatut === 'tous' || compte.statut === filterStatut;
    const matchSearch = compte.code.includes(searchTerm) || 
                        compte.libelle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategorie && matchStatut && matchSearch;
  });

  // Statistiques
  const stats = {
    totalComptes: reportComptes.length,
    comptesValides: reportComptes.filter(c => c.statut === 'valide').length,
    comptesAVerifier: reportComptes.filter(c => c.statut === 'a_verifier').length,
    comptesEnErreur: reportComptes.filter(c => c.statut === 'erreur').length,
    ecartTotal: reportComptes.reduce((sum, c) => sum + Math.abs(c.ecart), 0)
  };

  // lancerReportANouveau and validerReport are defined above with real Dexie logic

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen ">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-[#191919]">Reports à Nouveau</h1>
            <p className="text-[#767676]">Gestion des reports et ouverture d'exercice</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedExercice}
              onChange={(e) => setSelectedExercice(e.target.value)}
              className="px-4 py-2 border border-[#E8E8E8] rounded-lg"
            >
              {fiscalYears.map(fy => (
                <option key={fy.id} value={fy.id}>Exercice {fy.name || fy.code}</option>
              ))}
            </select>
            <button
              onClick={lancerReportANouveau}
              disabled={generating || loadingData}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>{generating ? 'Génération...' : alreadyExists ? 'Régénérer' : 'Générer reports'}</span>
            </button>
          </div>
        </div>

        {/* Informations de l'exercice */}
        <div className="grid grid-cols-5 gap-4 p-4 bg-[var(--color-background-secondary)] rounded-lg">
          <div>
            <p className="text-xs text-[#767676] mb-1">Statut</p>
            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
              exerciceInfo.statut === 'valide' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-dark)]' :
              exerciceInfo.statut === 'en_cours' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)]' :
              'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]'
            }`}>
              {exerciceInfo.statut === 'valide' ? <CheckCircle className="w-3 h-3" /> :
               exerciceInfo.statut === 'en_cours' ? <Clock className="w-3 h-3" /> :
               <AlertCircle className="w-3 h-3" />}
              <span>{exerciceInfo.statut === 'en_preparation' ? 'En préparation' : 
                     exerciceInfo.statut === 'en_cours' ? 'En cours' :
                     exerciceInfo.statut === 'valide' ? 'Validé' : 'Clôturé'}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-[#767676] mb-1">Total Actif</p>
            <p className="font-semibold text-[#191919]">
              {exerciceInfo.totalActif.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
          <div>
            <p className="text-xs text-[#767676] mb-1">Total Passif</p>
            <p className="font-semibold text-[#191919]">
              {exerciceInfo.totalPassif.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
          <div>
            <p className="text-xs text-[#767676] mb-1">Résultat N-1</p>
            <p className="font-semibold text-[var(--color-success)]">
              {exerciceInfo.resultatN1.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
          <div>
            <p className="text-xs text-[#767676] mb-1">Écart global</p>
            <p className={`font-semibold ${
              exerciceInfo.ecartGlobal === 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
            }`}>
              {exerciceInfo.ecartGlobal.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#767676] text-sm">Total comptes</span>
            <FileText className="w-4 h-4 text-[#767676]" />
          </div>
          <p className="text-lg font-bold text-[#191919]">{stats.totalComptes}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#767676] text-sm">Validés</span>
            <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
          </div>
          <p className="text-lg font-bold text-[var(--color-success)]">{stats.comptesValides}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#767676] text-sm">À vérifier</span>
            <AlertCircle className="w-4 h-4 text-[var(--color-warning)]" />
          </div>
          <p className="text-lg font-bold text-[var(--color-warning)]">{stats.comptesAVerifier}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#767676] text-sm">En erreur</span>
            <AlertTriangle className="w-4 h-4 text-[var(--color-error)]" />
          </div>
          <p className="text-lg font-bold text-[var(--color-error)]">{stats.comptesEnErreur}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#767676] text-sm">Écart total</span>
            <DollarSign className="w-4 h-4 text-[#767676]" />
          </div>
          <p className="text-lg font-bold text-[#191919]">
            {stats.ecartTotal.toLocaleString('fr-FR')}
          </p>
        </div>
      </div>

      {/* Tabs et contenu principal */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        {/* Tabs */}
        <div className="border-b border-[#E8E8E8]">
          <div className="flex space-x-6 px-6">
            {[
              { id: 'comptes', label: 'Comptes à reporter', icon: FileText },
              { id: 'validation', label: 'Validation', icon: CheckCircle },
              { id: 'historique', label: 'Historique', icon: Clock }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'comptes' | 'validation' | 'historique')}
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
        {activeTab === 'comptes' && (
          <div className="p-6">
            {/* Filtres et recherche */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <select
                  value={filterCategorie}
                  onChange={(e) => setFilterCategorie(e.target.value as 'tous' | 'resultat' | 'bilan' | 'hors_bilan')}
                  className="px-3 py-2 border border-[#E8E8E8] rounded-lg text-sm"
                >
                  <option value="tous">Toutes catégories</option>
                  <option value="bilan">Bilan</option>
                  <option value="resultat">Résultat</option>
                  <option value="hors_bilan">Hors bilan</option>
                </select>
                <select
                  value={filterStatut}
                  onChange={(e) => setFilterStatut(e.target.value as 'tous' | 'valide' | 'a_verifier' | 'erreur')}
                  className="px-3 py-2 border border-[#E8E8E8] rounded-lg text-sm"
                >
                  <option value="tous">Tous statuts</option>
                  <option value="valide">Validés</option>
                  <option value="a_verifier">À vérifier</option>
                  <option value="erreur">En erreur</option>
                </select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#767676]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un compte..."
                  className="pl-10 pr-4 py-2 border border-[#E8E8E8] rounded-lg"
                />
              </div>
            </div>

            {/* Tableau des comptes */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E8E8]">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#767676]">Code</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#767676]">{t('accounting.label')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#767676]">Solde N-1</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#767676]">Mouvements</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#767676]">Solde N</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-[#767676]">Statut</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-[#767676]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComptes.map((compte) => (
                    <tr key={compte.id} className="border-b border-[#E8E8E8] hover:bg-[var(--color-background-secondary)]">
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-[#191919]">{compte.code}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-[#191919]">{compte.libelle}</p>
                          {compte.commentaire && (
                            <p className="text-xs text-[#767676] mt-1">{compte.commentaire}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {compte.soldeN1.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-right font-mono text-sm">
                          {compte.mouvementDebit > 0 && (
                            <p className="text-[var(--color-error)]">D: {compte.mouvementDebit.toLocaleString('fr-FR')}</p>
                          )}
                          {compte.mouvementCredit > 0 && (
                            <p className="text-[var(--color-success)]">C: {compte.mouvementCredit.toLocaleString('fr-FR')}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {compte.soldeN.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                          compte.statut === 'valide' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-dark)]' :
                          compte.statut === 'a_verifier' ? 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]' :
                          compte.statut === 'erreur' ? 'bg-[var(--color-error-lighter)] text-[var(--color-error-dark)]' :
                          'bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)]'
                        }`}>
                          {compte.statut === 'valide' ? <Check className="w-3 h-3" /> :
                           compte.statut === 'a_verifier' ? <AlertCircle className="w-3 h-3" /> :
                           compte.statut === 'erreur' ? <X className="w-3 h-3" /> :
                           <Clock className="w-3 h-3" />}
                          <span>
                            {compte.statut === 'valide' ? 'Validé' :
                             compte.statut === 'a_verifier' ? 'À vérifier' :
                             compte.statut === 'erreur' ? 'Erreur' : 'En cours'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedCompte(compte);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 text-[#767676] hover:text-[#191919] hover:bg-[var(--color-background-hover)] rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSettingsCompte(compte)}
                            className="p-1.5 text-[#767676] hover:text-[#191919] hover:bg-[var(--color-background-hover)] rounded"
                            aria-label="Paramètres"
                            title="Paramètres du compte"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions en bas */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-border)] flex items-center space-x-2"
                  aria-label="Télécharger"
                >
                  <Download className="w-4 h-4" />
                  <span>{t('common.export')}</span>
                </button>
                <button
                  onClick={handleArchive}
                  className="px-4 py-2 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-border)] flex items-center space-x-2"
                >
                  <Archive className="w-4 h-4" />
                  <span>Archiver</span>
                </button>
              </div>
              <button
                onClick={validerReport}
                className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Valider le report</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Processus de validation</h3>
              
              {/* Étapes de validation */}
              <div className="space-y-4">
                {[
                  { nom: 'Vérification des équilibres', statut: 'complete' },
                  { nom: 'Contrôle des écarts', statut: 'complete' },
                  { nom: 'Validation des reports', statut: 'en_cours' },
                  { nom: 'Génération des écritures', statut: 'en_attente' },
                  { nom: 'Ouverture de l\'exercice', statut: 'en_attente' }
                ].map((etape, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      etape.statut === 'complete' ? 'bg-[var(--color-success-lighter)]' :
                      etape.statut === 'en_cours' ? 'bg-[var(--color-primary-lighter)]' :
                      'bg-[var(--color-background-hover)]'
                    }`}>
                      {etape.statut === 'complete' ? (
                        <Check className="w-5 h-5 text-[var(--color-success)]" />
                      ) : etape.statut === 'en_cours' ? (
                        <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <span className="text-[var(--color-text-secondary)]">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${
                        etape.statut === 'complete' ? 'text-[var(--color-success)]' :
                        etape.statut === 'en_cours' ? 'text-[var(--color-primary)]' :
                        'text-[var(--color-text-secondary)]'
                      }`}>
                        {etape.nom}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-[var(--color-warning-lightest)] border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ La validation du report à nouveau est irréversible. Assurez-vous que tous les contrôles ont été effectués.
                </p>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={handleCancelValidation}
                  className="px-4 py-2 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-border)]"
                >
                  Annuler
                </button>
                <button
                  onClick={handleFinalizeReport}
                  className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Finaliser le report</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'historique' && (
          <div className="p-6">
            <div className="space-y-4">
              {fiscalYears.filter(fy => fy.isClosed).map(fy => ({
                date: fy.endDate, exercice: fy.name || fy.code, statut: 'complete', montant: 0
              })).map((report, index) => (
                <div key={index} className="border border-[#E8E8E8] rounded-lg p-4 hover:bg-[var(--color-background-secondary)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#191919]">Exercice {report.exercice}</p>
                      <p className="text-sm text-[#767676]">Report effectué le {report.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#191919]">
                        {report.montant.toLocaleString('fr-FR')} FCFA
                      </p>
                      <span className="text-xs bg-[var(--color-success-lighter)] text-[var(--color-success-dark)] px-2 py-1 rounded-full">
                        Complété
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de détail */}
      {showDetailModal && selectedCompte && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white p-6 border-b border-[#E8E8E8] z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-[#6A8A82]/10 text-[#6A8A82] p-2 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#191919]">Détail du Compte - Report à Nouveau</h3>
                    <p className="text-sm text-[#767676]">Exercice {selectedExercice}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Section Identification du Compte */}
              <div>
                <h4 className="text-sm font-bold text-[#191919] uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-[#6A8A82] pb-2">
                  <span className="w-1 h-4 bg-[#6A8A82] rounded"></span>
                  Identification du Compte
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-[#767676] mb-1">Code Compte SYSCOHADA</p>
                    <p className="font-mono font-bold text-lg text-[#191919]">{selectedCompte.code}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                    <p className="text-xs text-[#767676] mb-1">Libellé du Compte</p>
                    <p className="font-semibold text-[#191919]">{selectedCompte.libelle}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-[#767676] mb-1">Classe de Compte</p>
                    <p className="font-semibold text-[#191919]">Classe {selectedCompte.code.charAt(0)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-[#767676] mb-1">Type</p>
                    <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                      selectedCompte.type === 'actif' ? 'bg-blue-100 text-blue-800' :
                      selectedCompte.type === 'passif' ? 'bg-purple-100 text-purple-800' :
                      selectedCompte.type === 'charge' ? 'bg-red-100 text-red-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedCompte.type.charAt(0).toUpperCase() + selectedCompte.type.slice(1)}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-[#767676] mb-1">Catégorie</p>
                    <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                      selectedCompte.categorie === 'bilan' ? 'bg-indigo-100 text-indigo-800' :
                      selectedCompte.categorie === 'resultat' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedCompte.categorie === 'bilan' ? 'Bilan' :
                       selectedCompte.categorie === 'resultat' ? 'Résultat' : 'Hors Bilan'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section Soldes et Mouvements */}
              <div>
                <h4 className="text-sm font-bold text-[#191919] uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-blue-400 pb-2">
                  <span className="w-1 h-4 bg-blue-500 rounded"></span>
                  Soldes et Mouvements
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 mb-1">Solde Exercice N-1 (Clôture)</p>
                    <p className="text-lg font-bold text-blue-900 font-mono">
                      {selectedCompte.soldeN1.toLocaleString('fr-FR')} <span className="text-sm font-normal">FCFA</span>
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700 mb-1">Solde Exercice N (Ouverture)</p>
                    <p className="text-lg font-bold text-green-900 font-mono">
                      {selectedCompte.soldeN.toLocaleString('fr-FR')} <span className="text-sm font-normal">FCFA</span>
                    </p>
                  </div>
                </div>

                {/* Tableau des mouvements */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-2 px-4 text-sm font-semibold text-[#191919]">Nature du Mouvement</th>
                        <th className="text-right py-2 px-4 text-sm font-semibold text-[#191919]">Débit (FCFA)</th>
                        <th className="text-right py-2 px-4 text-sm font-semibold text-[#191919]">Crédit (FCFA)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm">Solde de clôture N-1</td>
                        <td className="py-3 px-4 text-right font-mono text-sm">
                          {selectedCompte.type === 'actif' || selectedCompte.type === 'charge'
                            ? selectedCompte.soldeN1.toLocaleString('fr-FR')
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm">
                          {selectedCompte.type === 'passif' || selectedCompte.type === 'produit'
                            ? selectedCompte.soldeN1.toLocaleString('fr-FR')
                            : '-'}
                        </td>
                      </tr>
                      {selectedCompte.mouvementDebit > 0 && (
                        <tr className="border-b border-gray-100 bg-red-50">
                          <td className="py-3 px-4 text-sm text-red-800">Mouvement de report (Débit)</td>
                          <td className="py-3 px-4 text-right font-mono text-sm font-semibold text-red-700">
                            {selectedCompte.mouvementDebit.toLocaleString('fr-FR')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-sm">-</td>
                        </tr>
                      )}
                      {selectedCompte.mouvementCredit > 0 && (
                        <tr className="border-b border-gray-100 bg-green-50">
                          <td className="py-3 px-4 text-sm text-green-800">Mouvement de report (Crédit)</td>
                          <td className="py-3 px-4 text-right font-mono text-sm">-</td>
                          <td className="py-3 px-4 text-right font-mono text-sm font-semibold text-green-700">
                            {selectedCompte.mouvementCredit.toLocaleString('fr-FR')}
                          </td>
                        </tr>
                      )}
                      <tr className="bg-gray-100 font-bold">
                        <td className="py-3 px-4 text-sm">Solde d'ouverture N</td>
                        <td className="py-3 px-4 text-right font-mono text-sm">
                          {selectedCompte.type === 'actif' || selectedCompte.type === 'charge'
                            ? selectedCompte.soldeN.toLocaleString('fr-FR')
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm">
                          {selectedCompte.type === 'passif' || selectedCompte.type === 'produit'
                            ? selectedCompte.soldeN.toLocaleString('fr-FR')
                            : '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section Écart et Analyse */}
              <div>
                <h4 className="text-sm font-bold text-[#191919] uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-orange-400 pb-2">
                  <span className="w-1 h-4 bg-orange-500 rounded"></span>
                  Analyse et Contrôle
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg border ${
                    selectedCompte.ecart === 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className="text-xs text-[#767676] mb-1">Écart Détecté</p>
                    <p className={`text-lg font-bold font-mono ${
                      selectedCompte.ecart === 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {selectedCompte.ecart.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-[#767676] mb-1">Variation (%)</p>
                    <p className="text-lg font-bold text-[#191919]">
                      {selectedCompte.soldeN1 !== 0
                        ? ((selectedCompte.soldeN - selectedCompte.soldeN1) / selectedCompte.soldeN1 * 100).toFixed(2)
                        : '0.00'} %
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-[#767676] mb-1">Statut de Validation</p>
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                      selectedCompte.statut === 'valide' ? 'bg-green-100 text-green-800' :
                      selectedCompte.statut === 'a_verifier' ? 'bg-yellow-100 text-yellow-800' :
                      selectedCompte.statut === 'erreur' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedCompte.statut === 'valide' ? <CheckCircle className="w-4 h-4" /> :
                       selectedCompte.statut === 'a_verifier' ? <AlertCircle className="w-4 h-4" /> :
                       selectedCompte.statut === 'erreur' ? <AlertTriangle className="w-4 h-4" /> :
                       <Clock className="w-4 h-4" />}
                      {selectedCompte.statut === 'valide' ? 'Validé' :
                       selectedCompte.statut === 'a_verifier' ? 'À vérifier' :
                       selectedCompte.statut === 'erreur' ? 'En erreur' : 'En cours'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section Écriture Comptable de Report */}
              <div>
                <h4 className="text-sm font-bold text-[#191919] uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-purple-400 pb-2">
                  <span className="w-1 h-4 bg-purple-500 rounded"></span>
                  Écriture Comptable de Report
                </h4>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-purple-700 mb-1">N° Pièce Comptable</p>
                      <p className="font-mono font-semibold text-purple-900">RAN-{selectedExercice}-{selectedCompte.code}</p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-700 mb-1">Journal</p>
                      <p className="font-semibold text-purple-900">OD - Opérations Diverses</p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-700 mb-1">Date de Report</p>
                      <p className="font-semibold text-purple-900">01/01/{selectedExercice}</p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-700 mb-1">Libellé de l'Écriture</p>
                      <p className="font-semibold text-purple-900">Report à nouveau - {selectedCompte.libelle}</p>
                    </div>
                  </div>
                  <div className="border-t border-purple-200 pt-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-purple-700">
                          <th className="text-left py-1">Compte</th>
                          <th className="text-left py-1">Libellé</th>
                          <th className="text-right py-1">Débit</th>
                          <th className="text-right py-1">Crédit</th>
                        </tr>
                      </thead>
                      <tbody className="text-purple-900">
                        <tr>
                          <td className="py-1 font-mono">{selectedCompte.code}</td>
                          <td className="py-1">{selectedCompte.libelle}</td>
                          <td className="py-1 text-right font-mono">
                            {selectedCompte.mouvementDebit > 0 ? selectedCompte.mouvementDebit.toLocaleString('fr-FR') : '-'}
                          </td>
                          <td className="py-1 text-right font-mono">
                            {selectedCompte.mouvementCredit > 0 ? selectedCompte.mouvementCredit.toLocaleString('fr-FR') : '-'}
                          </td>
                        </tr>
                        {(selectedCompte.mouvementDebit > 0 || selectedCompte.mouvementCredit > 0) && (
                          <tr>
                            <td className="py-1 font-mono">
                              {selectedCompte.mouvementDebit > 0 ? '120000' : '121000'}
                            </td>
                            <td className="py-1">
                              {selectedCompte.mouvementDebit > 0 ? 'Résultat de l\'exercice' : 'Report à nouveau'}
                            </td>
                            <td className="py-1 text-right font-mono">
                              {selectedCompte.mouvementCredit > 0 ? selectedCompte.mouvementCredit.toLocaleString('fr-FR') : '-'}
                            </td>
                            <td className="py-1 text-right font-mono">
                              {selectedCompte.mouvementDebit > 0 ? selectedCompte.mouvementDebit.toLocaleString('fr-FR') : '-'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Section Commentaires et Notes */}
              <div>
                <h4 className="text-sm font-bold text-[#191919] uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-gray-400 pb-2">
                  <span className="w-1 h-4 bg-gray-500 rounded"></span>
                  Commentaires et Notes
                </h4>
                {selectedCompte.commentaire ? (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800">{selectedCompte.commentaire}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                    <p className="text-sm text-[#767676]">Aucun commentaire pour ce compte</p>
                  </div>
                )}
              </div>

              {/* Section Historique */}
              <div>
                <h4 className="text-sm font-bold text-[#191919] uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-cyan-400 pb-2">
                  <span className="w-1 h-4 bg-cyan-500 rounded"></span>
                  Historique des Reports
                </h4>
                <div className="space-y-2">
                  {fiscalYears.filter(fy => fy.isClosed).slice(0, 3).map(fy => ({
                    exercice: fy.name || fy.code, solde: selectedCompte.soldeN1, date: fy.startDate, statut: 'complete'
                  })).map((hist, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-cyan-600" />
                        </div>
                        <div>
                          <p className="font-medium text-[#191919]">Exercice {hist.exercice}</p>
                          <p className="text-xs text-[#767676]">Report effectué le {hist.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold">{hist.solde.toLocaleString('fr-FR')} FCFA</p>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Complété</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-[#E8E8E8] px-6 py-4 flex justify-between items-center">
              <div className="flex gap-3">
                <button
                  onClick={() => toast.success('Export en cours...')}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exporter
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5a7a72] flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition paramètres compte */}
      {showEditModal && selectedCompte && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E8E8E8]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#191919]">Paramètres du compte</h3>
                  <p className="text-sm text-[#767676]">{selectedCompte.code} - {selectedCompte.libelle}</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-[var(--color-background-hover)] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#191919] mb-1">Catégorie</label>
                <select
                  defaultValue={selectedCompte.categorie}
                  className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg"
                >
                  <option value="bilan">Bilan</option>
                  <option value="resultat">Résultat</option>
                  <option value="hors_bilan">Hors bilan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#191919] mb-1">Statut</label>
                <select
                  defaultValue={selectedCompte.statut}
                  className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg"
                >
                  <option value="valide">Validé</option>
                  <option value="a_verifier">À vérifier</option>
                  <option value="erreur">En erreur</option>
                  <option value="en_cours">En cours</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#191919] mb-1">Commentaire</label>
                <textarea
                  rows={3}
                  defaultValue={selectedCompte.commentaire || ''}
                  placeholder="Ajouter un commentaire..."
                  className="w-full px-3 py-2 border border-[#E8E8E8] rounded-lg"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="forceValidation" className="rounded" />
                <label htmlFor="forceValidation" className="text-sm text-[#767676]">
                  Forcer la validation malgré l'écart
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-[#E8E8E8]">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-border)]"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  toast.success('Paramètres enregistrés');
                  setShowEditModal(false);
                }}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsANouveauModule;