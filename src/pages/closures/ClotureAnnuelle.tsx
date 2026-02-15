import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, CheckCircle, AlertTriangle, Clock, Play, Pause,
  FileText, Download, Eye, ChevronRight, X, Save, Send,
  AlertCircle, Check, RefreshCw, Lock, Archive, TrendingUp,
  Calculator, PieChart, BarChart3, Activity, Shield, Award
} from 'lucide-react';

interface EtapeClotureAnnuelle {
  id: string;
  categorie: string;
  nom: string;
  description: string;
  statut: 'en_attente' | 'en_cours' | 'complete' | 'erreur' | 'bloque';
  obligatoire: boolean;
  dateEcheance?: string;
  responsable?: string;
  documents?: string[];
}

const ClotureAnnuelle: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedExercise, setSelectedExercise] = useState('2025');
  const [cloturePhase, setCloturePhase] = useState('preparation');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEtape, setSelectedEtape] = useState<EtapeClotureAnnuelle | null>(null);

  // Phases de la clôture annuelle
  const phases = [
    { id: 'preparation', nom: 'Préparation', icon: FileText },
    { id: 'inventaire', nom: 'Inventaire', icon: Archive },
    { id: 'regularisation', nom: 'Régularisation', icon: Calculator },
    { id: 'provisionnement', nom: 'Provisions', icon: PieChart },
    { id: 'amortissement', nom: 'Amortissements', icon: TrendingUp },
    { id: 'controle', nom: 'Contrôles', icon: Shield },
    { id: 'validation', nom: 'Validation', icon: CheckCircle },
    { id: 'generation', nom: 'États financiers', icon: BarChart3 },
    { id: 'finalisation', nom: 'Finalisation', icon: Award }
  ];

  // Étapes détaillées par catégorie
  const [etapes] = useState<EtapeClotureAnnuelle[]>([
    // Préparation
    {
      id: 'verif_clotures_mensuelles',
      categorie: 'preparation',
      nom: 'Vérification des clôtures mensuelles',
      description: 'S\'assurer que toutes les clôtures mensuelles sont terminées',
      statut: 'complete',
      obligatoire: true,
      responsable: 'Chef Comptable'
    },
    {
      id: 'backup_donnees',
      categorie: 'preparation',
      nom: 'Sauvegarde des données',
      description: 'Effectuer une sauvegarde complète avant de commencer',
      statut: 'complete',
      obligatoire: true,
      responsable: 'Service IT'
    },

    // Inventaire
    {
      id: 'inventaire_physique',
      categorie: 'inventaire',
      nom: 'Inventaire physique',
      description: 'Comptage physique des stocks et immobilisations',
      statut: 'en_cours',
      obligatoire: true,
      dateEcheance: '2025-12-31',
      responsable: 'Responsable Stock',
      documents: ['PV_inventaire.pdf']
    },
    {
      id: 'valorisation_stocks',
      categorie: 'inventaire',
      nom: 'Valorisation des stocks',
      description: 'Calculer la valeur des stocks selon méthode FIFO/LIFO',
      statut: 'en_attente',
      obligatoire: true,
      responsable: 'Contrôleur de gestion'
    },

    // Régularisation
    {
      id: 'charges_constatees',
      categorie: 'regularisation',
      nom: 'Charges constatées d\'avance',
      description: 'Identifier et comptabiliser les CCA',
      statut: 'en_attente',
      obligatoire: true,
      responsable: 'Comptable'
    },
    {
      id: 'produits_constates',
      categorie: 'regularisation',
      nom: 'Produits constatés d\'avance',
      description: 'Identifier et comptabiliser les PCA',
      statut: 'en_attente',
      obligatoire: true,
      responsable: 'Comptable'
    },
    {
      id: 'charges_payer',
      categorie: 'regularisation',
      nom: 'Charges à payer',
      description: 'Recenser les factures non parvenues',
      statut: 'en_attente',
      obligatoire: true,
      responsable: 'Comptable Fournisseurs'
    },

    // Provisionnement
    {
      id: 'provisions_conges',
      categorie: 'provisionnement',
      nom: 'Provisions congés payés',
      description: 'Calculer et comptabiliser les provisions CP',
      statut: 'en_attente',
      obligatoire: true,
      responsable: 'Service RH'
    },
    {
      id: 'provisions_creances',
      categorie: 'provisionnement',
      nom: 'Provisions créances douteuses',
      description: 'Évaluer et provisionner les créances à risque',
      statut: 'en_attente',
      obligatoire: true,
      responsable: 'Credit Manager'
    },
    {
      id: 'provisions_risques',
      categorie: 'provisionnement',
      nom: 'Provisions pour risques',
      description: 'Identifier et provisionner les risques et litiges',
      statut: 'en_attente',
      obligatoire: false,
      responsable: 'Direction Juridique'
    },

    // Amortissements
    {
      id: 'dotations_amortissements',
      categorie: 'amortissement',
      nom: 'Dotations aux amortissements',
      description: 'Calculer les dotations annuelles',
      statut: 'en_attente',
      obligatoire: true,
      responsable: 'Comptable Immobilisations'
    },
    {
      id: 'cessions_immo',
      categorie: 'amortissement',
      nom: 'Cessions d\'immobilisations',
      description: 'Traiter les sorties d\'actifs de l\'exercice',
      statut: 'en_attente',
      obligatoire: false,
      responsable: 'Comptable Immobilisations'
    },

    // Contrôles
    {
      id: 'balance_generale',
      categorie: 'controle',
      nom: 'Balance générale',
      description: 'Vérifier l\'équilibre de la balance',
      statut: 'en_attente',
      obligatoire: true,
      responsable: 'Chef Comptable'
    },
    {
      id: 'conformite_syscohada',
      categorie: 'controle',
      nom: 'Conformité SYSCOHADA',
      description: 'Contrôler la conformité aux normes SYSCOHADA',
      statut: 'en_attente',
      obligatoire: true,
      responsable: 'Expert Comptable'
    },
    {
      id: 'controle_coherence',
      categorie: 'controle',
      nom: 'Contrôle de cohérence',
      description: 'Vérifier la cohérence des comptes',
      statut: 'en_attente',
      obligatoire: true,
      responsable: 'Contrôleur de gestion'
    },

    // États financiers
    {
      id: 'bilan_syscohada',
      categorie: 'generation',
      nom: 'Bilan SYSCOHADA',
      description: 'Générer le bilan selon format SYSCOHADA',
      statut: 'en_attente',
      obligatoire: true,
      responsable: 'Chef Comptable'
    },
    {
      id: 'compte_resultat',
      categorie: 'generation',
      nom: 'Compte de résultat',
      description: 'Générer le compte de résultat',
      statut: 'en_attente',
      obligatoire: true,
      responsable: 'Chef Comptable'
    },
    {
      id: 'tafire',
      categorie: 'generation',
      nom: 'TAFIRE',
      description: 'Générer le tableau de flux de trésorerie',
      statut: 'en_attente',
      obligatoire: true,
      responsable: 'Chef Comptable'
    },
    {
      id: 'annexes',
      categorie: 'generation',
      nom: 'Annexes',
      description: 'Rédiger les notes annexes aux états financiers',
      statut: 'en_attente',
      obligatoire: true,
      responsable: 'Expert Comptable'
    }
  ]);

  // Obtenir les étapes par phase
  const getEtapesByPhase = (phaseId: string) => {
    return etapes.filter(e => e.categorie === phaseId);
  };

  // Calculer la progression par phase
  const getPhaseProgress = (phaseId: string) => {
    const phaseEtapes = getEtapesByPhase(phaseId);
    if (phaseEtapes.length === 0) return 0;

    const completed = phaseEtapes.filter(e => e.statut === 'complete').length;
    return Math.round((completed / phaseEtapes.length) * 100);
  };

  // Calculer la progression globale
  const getGlobalProgress = () => {
    const totalEtapes = etapes.filter(e => e.obligatoire).length;
    const completedEtapes = etapes.filter(e => e.obligatoire && e.statut === 'complete').length;
    return Math.round((completedEtapes / totalEtapes) * 100);
  };

  // Ouvrir le modal de détails
  const openDetailsModal = (etape: EtapeClotureAnnuelle) => {
    setSelectedEtape(etape);
    setShowDetailsModal(true);
  };

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen ">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-[#191919]">Clôture Annuelle</h1>
            <p className="text-[#767676]">Exercice comptable {selectedExercise}</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="px-4 py-2 border border-[#E8E8E8] rounded-lg"
            >
              <option value="2024">Exercice 2024</option>
              <option value="2025">Exercice 2025</option>
              <option value="2026">Exercice 2026</option>
            </select>
          </div>
        </div>

        {/* Progression globale */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#767676]">Progression globale</span>
            <span className="font-bold text-[#191919]">{getGlobalProgress()}%</span>
          </div>
          <div className="w-full bg-[var(--color-border)] rounded-full h-4">
            <div
              className="h-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
              style={{width: `${getGlobalProgress()}%`}}
            ></div>
          </div>
        </div>

        {/* Phases de clôture */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {phases.map((phase, index) => {
            const Icon = phase.icon;
            const progress = getPhaseProgress(phase.id);
            const isActive = phase.id === cloturePhase;
            const isComplete = progress === 100;

            return (
              <div key={phase.id} className="flex items-center">
                <button
                  onClick={() => setCloturePhase(phase.id)}
                  className={`flex flex-col items-center p-3 rounded-lg min-w-[100px] transition-all ${
                    isActive ? 'bg-[var(--color-primary-lighter)] border-2 border-[var(--color-primary)]' :
                    isComplete ? 'bg-[var(--color-success-lighter)] border border-green-300' :
                    'bg-white border border-[var(--color-border)] hover:bg-[var(--color-background-secondary)]'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    isComplete ? 'bg-[var(--color-success)] text-white' :
                    isActive ? 'bg-[var(--color-primary)] text-white' :
                    'bg-[var(--color-border)] text-[var(--color-text-primary)]'
                  }`}>
                    {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-medium text-[#191919]">{phase.nom}</span>
                  <span className={`text-xs ${
                    isComplete ? 'text-[var(--color-success)]' :
                    progress > 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                  }`}>
                    {progress}%
                  </span>
                </button>
                {index < phases.length - 1 && (
                  <ChevronRight className={`w-4 h-4 mx-1 ${
                    getPhaseProgress(phases[index + 1].id) > 0 ? 'text-[var(--color-primary)]' : 'text-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contenu de la phase sélectionnée */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#191919] mb-2">
            {phases.find(p => p.id === cloturePhase)?.nom || ''}
          </h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#767676]">
              {getEtapesByPhase(cloturePhase).filter(e => e.statut === 'complete').length} / {getEtapesByPhase(cloturePhase).length} étapes complétées
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-[var(--color-success-lighter)] text-[var(--color-success-dark)] px-2 py-1 rounded-full">
                {getEtapesByPhase(cloturePhase).filter(e => e.statut === 'complete').length} Terminées
              </span>
              <span className="text-xs bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)] px-2 py-1 rounded-full">
                {getEtapesByPhase(cloturePhase).filter(e => e.statut === 'en_cours').length} En cours
              </span>
              <span className="text-xs bg-[var(--color-background-hover)] text-[var(--color-text-primary)] px-2 py-1 rounded-full">
                {getEtapesByPhase(cloturePhase).filter(e => e.statut === 'en_attente').length} En attente
              </span>
            </div>
          </div>
        </div>

        {/* Liste des étapes de la phase */}
        <div className="space-y-3">
          {getEtapesByPhase(cloturePhase).map((etape) => (
            <div
              key={etape.id}
              className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-md ${
                etape.statut === 'complete' ? 'border-green-300 bg-[var(--color-success-lightest)]' :
                etape.statut === 'en_cours' ? 'border-blue-300 bg-[var(--color-primary-lightest)]' :
                etape.statut === 'erreur' ? 'border-red-300 bg-[var(--color-error-lightest)]' :
                etape.statut === 'bloque' ? 'border-orange-300 bg-orange-50' :
                'border-[var(--color-border)] bg-white'
              }`}
              onClick={() => openDetailsModal(etape)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="mt-1">
                    {etape.statut === 'complete' ? (
                      <CheckCircle className="w-6 h-6 text-[var(--color-success)]" />
                    ) : etape.statut === 'en_cours' ? (
                      <Clock className="w-6 h-6 text-[var(--color-primary)] animate-pulse" />
                    ) : etape.statut === 'erreur' ? (
                      <AlertCircle className="w-6 h-6 text-[var(--color-error)]" />
                    ) : etape.statut === 'bloque' ? (
                      <AlertTriangle className="w-6 h-6 text-[var(--color-warning)]" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-[var(--color-border-dark)]"></div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-[#191919]">{etape.nom}</h3>
                      {etape.obligatoire && (
                        <span className="text-xs bg-[var(--color-error-lighter)] text-[var(--color-error-dark)] px-2 py-0.5 rounded-full">
                          Obligatoire
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#767676] mb-2">{etape.description}</p>

                    <div className="flex items-center space-x-4 text-xs text-[#767676]">
                      {etape.responsable && (
                        <span className="flex items-center space-x-1">
                          <span>👤</span>
                          <span>{etape.responsable}</span>
                        </span>
                      )}
                      {etape.dateEcheance && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(etape.dateEcheance).toLocaleDateString('fr-FR')}</span>
                        </span>
                      )}
                      {etape.documents && etape.documents.length > 0 && (
                        <span className="flex items-center space-x-1">
                          <FileText className="w-3 h-3" />
                          <span>{etape.documents.length} document(s)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)] ml-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Actions de phase */}
        <div className="mt-6 pt-6 border-t border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-border)] flex items-center space-x-2" aria-label="Actualiser">
              <RefreshCw className="w-4 h-4" />
              <span>{t('common.refresh')}</span>
            </button>
            <button className="px-4 py-2 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-border)] flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Exporter checklist</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {cloturePhase === 'generation' && (
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Générer tous les états</span>
              </button>
            )}
            {getPhaseProgress(cloturePhase) === 100 && (
              <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center space-x-2">
                <Check className="w-4 h-4" />
                <span>Valider la phase</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de détails */}
      {showDetailsModal && selectedEtape && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#191919]">{selectedEtape.nom}</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-hover)] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <p className="text-[#767676] mb-4">{selectedEtape.description}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--color-background-secondary)] rounded-lg p-4">
                    <span className="text-xs text-[#767676]">Statut</span>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedEtape.statut === 'complete' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                        selectedEtape.statut === 'en_cours' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                        selectedEtape.statut === 'erreur' ? 'bg-[var(--color-error-lighter)] text-red-800' :
                        'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                      }`}>
                        {selectedEtape.statut === 'complete' ? 'Terminé' :
                         selectedEtape.statut === 'en_cours' ? 'En cours' :
                         selectedEtape.statut === 'erreur' ? 'Erreur' : 'En attente'}
                      </span>
                    </div>
                  </div>

                  {selectedEtape.responsable && (
                    <div className="bg-[var(--color-background-secondary)] rounded-lg p-4">
                      <span className="text-xs text-[#767676]">Responsable</span>
                      <p className="mt-1 font-medium text-[#191919]">{selectedEtape.responsable}</p>
                    </div>
                  )}

                  {selectedEtape.dateEcheance && (
                    <div className="bg-[var(--color-background-secondary)] rounded-lg p-4">
                      <span className="text-xs text-[#767676]">Échéance</span>
                      <p className="mt-1 font-medium text-[#191919]">
                        {new Date(selectedEtape.dateEcheance).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}

                  <div className="bg-[var(--color-background-secondary)] rounded-lg p-4">
                    <span className="text-xs text-[#767676]">Type</span>
                    <p className="mt-1 font-medium text-[#191919]">
                      {selectedEtape.obligatoire ? 'Obligatoire' : 'Optionnel'}
                    </p>
                  </div>
                </div>
              </div>

              {selectedEtape.documents && selectedEtape.documents.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-[#191919] mb-3">Documents associés</h4>
                  <div className="space-y-2">
                    {selectedEtape.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background-secondary)]">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-[var(--color-text-secondary)]" />
                          <span className="text-sm text-[#191919]">{doc}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]" aria-label="Voir les détails">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]" aria-label="Télécharger">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                {selectedEtape.statut === 'en_attente' && (
                  <>
                    <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2">
                      <Play className="w-4 h-4" />
                      <span>Démarrer</span>
                    </button>
                  </>
                )}
                {selectedEtape.statut === 'en_cours' && (
                  <>
                    <button className="px-4 py-2 bg-[var(--color-warning)] text-white rounded-lg hover:bg-orange-700 flex items-center space-x-2">
                      <Pause className="w-4 h-4" />
                      <span>Mettre en pause</span>
                    </button>
                    <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center space-x-2">
                      <Check className="w-4 h-4" />
                      <span>Marquer comme terminé</span>
                    </button>
                  </>
                )}
                {selectedEtape.statut === 'complete' && (
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4" />
                    <span>Rouvrir</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClotureAnnuelle;