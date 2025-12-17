import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, CheckCircle, AlertTriangle, Clock, Play, Pause,
  FileText, Download, Eye, ChevronRight, X, Save, Send,
  AlertCircle, Check, RefreshCw, Lock, Unlock
} from 'lucide-react';
import axios from 'axios';

interface EtapeCloture {
  id: string;
  nom: string;
  description: string;
  statut: 'en_attente' | 'en_cours' | 'complete' | 'erreur';
  obligatoire: boolean;
  progression: number;
}

const ClotureMensuelle: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [clotureStatus, setClotureStatus] = useState('en_attente');
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [currentEtape, setCurrentEtape] = useState('');

  // Étapes de clôture mensuelle
  const [etapes, setEtapes] = useState<EtapeCloture[]>([
    {
      id: 'saisie_complete',
      nom: 'Saisie des écritures',
      description: 'Vérifier que toutes les écritures du mois sont saisies',
      statut: 'complete',
      obligatoire: true,
      progression: 100
    },
    {
      id: 'ecritures_validees',
      nom: 'Validation des écritures',
      description: 'Valider toutes les écritures en attente',
      statut: 'en_cours',
      obligatoire: true,
      progression: 75
    },
    {
      id: 'comptes_lettres',
      nom: 'Lettrage des comptes',
      description: 'Lettrer les comptes clients et fournisseurs',
      statut: 'en_attente',
      obligatoire: true,
      progression: 0
    },
    {
      id: 'rapprochements_bancaires',
      nom: 'Rapprochements bancaires',
      description: 'Effectuer les rapprochements bancaires',
      statut: 'en_attente',
      obligatoire: true,
      progression: 0
    },
    {
      id: 'provisions_calculees',
      nom: 'Calcul des provisions',
      description: 'Calculer les provisions mensuelles',
      statut: 'en_attente',
      obligatoire: false,
      progression: 0
    },
    {
      id: 'amortissements_calcules',
      nom: 'Calcul des amortissements',
      description: 'Calculer les dotations aux amortissements',
      statut: 'en_attente',
      obligatoire: false,
      progression: 0
    },
    {
      id: 'balance_equilibree',
      nom: 'Équilibrage de la balance',
      description: 'Vérifier l\'équilibre de la balance',
      statut: 'en_attente',
      obligatoire: true,
      progression: 0
    },
    {
      id: 'etats_generes',
      nom: 'Génération des états',
      description: 'Générer les états financiers mensuels',
      statut: 'en_attente',
      obligatoire: true,
      progression: 0
    }
  ]);

  const moisNoms = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  // Calcul de la progression globale
  const progressionGlobale = () => {
    const etapesObligatoires = etapes.filter(e => e.obligatoire);
    const total = etapesObligatoires.reduce((sum, e) => sum + e.progression, 0);
    return Math.round(total / etapesObligatoires.length);
  };

  // Démarrer une étape
  const demarrerEtape = async (etapeId: string) => {
    setEtapes(prev => prev.map(e =>
      e.id === etapeId ? { ...e, statut: 'en_cours' as const, progression: 10 } : e
    ));

    // Simuler la progression
    let progress = 10;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setEtapes(prev => prev.map(e =>
          e.id === etapeId ? { ...e, statut: 'complete' as const, progression: 100 } : e
        ));
      } else {
        setEtapes(prev => prev.map(e =>
          e.id === etapeId ? { ...e, progression: Math.round(progress) } : e
        ));
      }
    }, 1000);
  };

  // Valider la clôture
  const validerCloture = () => {
    const toutesComplete = etapes.filter(e => e.obligatoire).every(e => e.statut === 'complete');
    if (toutesComplete) {
      setShowValidationModal(true);
    }
  };

  // Confirmer la validation
  const confirmerValidation = async () => {
    try {
      // Appel API pour valider la clôture
      // await axios.post('/api/closures/mensuelles/valider', { mois: selectedMonth, annee: selectedYear });
      setClotureStatus('validee');
      setShowValidationModal(false);
      alert('Clôture mensuelle validée avec succès !');
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      alert('Erreur lors de la validation de la clôture');
    }
  };

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen ">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#191919]">Clôture Mensuelle</h1>
            <p className="text-[#767676]">Processus de clôture pour {moisNoms[selectedMonth]} {selectedYear}</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Sélection du mois */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-[#E8E8E8] rounded-lg"
            >
              {moisNoms.slice(1).map((mois, index) => (
                <option key={index + 1} value={index + 1}>{mois}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-[#E8E8E8] rounded-lg"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Barre de progression globale */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#767676]">Progression globale</span>
            <span className="font-semibold text-[#191919]">{progressionGlobale()}%</span>
          </div>
          <div className="w-full bg-[var(--color-border)] rounded-full h-3">
            <div
              className="h-3 bg-gradient-to-r from-[#6A8A82] to-[#B87333] rounded-full transition-all duration-500"
              style={{width: `${progressionGlobale()}%`}}
            ></div>
          </div>
        </div>

        {/* Statut de la clôture */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              clotureStatus === 'validee' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-dark)]' :
              clotureStatus === 'en_cours' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)]' :
              'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
            }`}>
              {clotureStatus === 'validee' ? 'Validée' :
               clotureStatus === 'en_cours' ? 'En cours' : 'En attente'}
            </div>
            <span className="text-sm text-[#767676]">
              Dernière modification: {new Date().toLocaleDateString('fr-FR')}
            </span>
          </div>
          <button
            onClick={validerCloture}
            disabled={progressionGlobale() < 100}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              progressionGlobale() >= 100
                ? 'bg-[var(--color-success)] text-white hover:bg-[var(--color-success-dark)]'
                : 'bg-[var(--color-border-dark)] text-[var(--color-text-secondary)] cursor-not-allowed'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Valider la clôture</span>
          </button>
        </div>
      </div>

      {/* Liste des étapes */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
        <h2 className="text-lg font-bold text-[#191919] mb-6">Étapes de clôture</h2>

        <div className="space-y-4">
          {etapes.map((etape, index) => (
            <div
              key={etape.id}
              className={`border rounded-lg p-4 transition-all ${
                etape.statut === 'complete' ? 'border-green-300 bg-[var(--color-success-lightest)]' :
                etape.statut === 'en_cours' ? 'border-blue-300 bg-[var(--color-primary-lightest)]' :
                etape.statut === 'erreur' ? 'border-red-300 bg-[var(--color-error-lightest)]' :
                'border-[var(--color-border)] bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Icône de statut */}
                  <div className="mt-1">
                    {etape.statut === 'complete' ? (
                      <CheckCircle className="w-6 h-6 text-[var(--color-success)]" />
                    ) : etape.statut === 'en_cours' ? (
                      <Clock className="w-6 h-6 text-[var(--color-primary)] animate-pulse" />
                    ) : etape.statut === 'erreur' ? (
                      <AlertCircle className="w-6 h-6 text-[var(--color-error)]" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-[var(--color-border-dark)]"></div>
                    )}
                  </div>

                  {/* Informations de l'étape */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-[#191919]">{etape.nom}</h3>
                      {etape.obligatoire && (
                        <span className="text-xs bg-[var(--color-error-lighter)] text-[var(--color-error-dark)] px-2 py-0.5 rounded-full">
                          Obligatoire
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#767676] mb-3">{etape.description}</p>

                    {/* Barre de progression de l'étape */}
                    {(etape.statut === 'en_cours' || etape.statut === 'complete') && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#767676]">Progression</span>
                          <span className="font-medium">{etape.progression}%</span>
                        </div>
                        <div className="w-full bg-[var(--color-border)] rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              etape.statut === 'complete' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-primary)]'
                            }`}
                            style={{width: `${etape.progression}%`}}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  {etape.statut === 'en_attente' && (
                    <button
                      onClick={() => demarrerEtape(etape.id)}
                      className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2 text-sm"
                    >
                      <Play className="w-3 h-3" />
                      <span>Démarrer</span>
                    </button>
                  )}
                  {etape.statut === 'complete' && (
                    <button className="px-3 py-1.5 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded-lg flex items-center space-x-2 text-sm">
                      <Eye className="w-3 h-3" />
                      <span>Détails</span>
                    </button>
                  )}
                  {etape.statut === 'en_cours' && (
                    <button className="px-3 py-1.5 bg-[var(--color-warning-lighter)] text-[var(--color-warning)] rounded-lg flex items-center space-x-2 text-sm">
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions globales */}
        <div className="mt-6 flex items-center justify-between pt-6 border-t border-[var(--color-border)]">
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-border)] flex items-center space-x-2" aria-label="Actualiser">
              <RefreshCw className="w-4 h-4" />
              <span>{t('common.refresh')}</span>
            </button>
            <button className="px-4 py-2 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-border)] flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Exporter rapport</span>
            </button>
          </div>
          <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2">
            <Save className="w-4 h-4" />
            <span>Sauvegarder progression</span>
          </button>
        </div>
      </div>

      {/* Modal de validation */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[#191919] mb-4">
              Confirmer la validation de la clôture
            </h3>
            <p className="text-[#767676] mb-6">
              Êtes-vous sûr de vouloir valider la clôture mensuelle de {moisNoms[selectedMonth]} {selectedYear} ?
              Cette action est irréversible.
            </p>
            <div className="bg-[var(--color-warning-lightest)] border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                ⚠️ Assurez-vous que toutes les écritures sont correctes avant de valider.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-border)]"
              >
                Annuler
              </button>
              <button
                onClick={confirmerValidation}
                className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirmer la validation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClotureMensuelle;