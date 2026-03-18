// @ts-nocheck
/**
 * DemoModal — Modal principal de découverte des solutions Atlas Studio
 * Orchestre les 4 modes : Démos interactives, Visite guidée, Tutoriels, Démo live
 */
import React, { useState } from 'react';
import { X, Monitor, Play, Lightbulb, Users, Clock, Mail, ChevronRight, Calculator, Shield, Zap, FileText, BarChart3, Building, Wallet, BookOpen } from 'lucide-react';
import InteractiveEntryDemo from './InteractiveEntryDemo';
import InteractiveBilanDemo from './InteractiveBilanDemo';
import InteractiveTaxDemo from './InteractiveTaxDemo';
import GuidedTour from './GuidedTour';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSolution?: string;
}

type DemoView = 'menu' | 'interactive-entry' | 'interactive-bilan' | 'interactive-tax' | 'guided' | 'tutorials' | 'live';

const INTERACTIVE_DEMOS = {
  'atlas-finance': [
    { id: 'interactive-entry', icon: Calculator, title: 'Saisie d\'écriture comptable', desc: 'Créez une écriture multi-lignes avec contrôle D=C automatique, sélection de comptes SYSCOHADA, équilibrage intelligent.', tags: ['SYSCOHADA', 'Temps réel', 'Multi-journaux'] },
    { id: 'interactive-bilan', icon: BarChart3, title: 'Bilan SYSCOHADA interactif', desc: 'Explorez un bilan complet avec drill-down par poste. Actif immobilisé, circulant, trésorerie vs capitaux propres, dettes.', tags: ['Drill-down', 'Actif/Passif', 'Équilibre'] },
    { id: 'interactive-tax', icon: Shield, title: 'Calcul TVA automatique', desc: 'Regardez le moteur fiscal scanner vos écritures et calculer la TVA collectée, déductible et nette à payer en temps réel.', tags: ['18% UEMOA', 'Auto-calcul', '10 écritures'] },
  ],
  'liass-pilot': [
    { id: 'interactive-entry', icon: FileText, title: 'Pré-remplissage DSF', desc: 'Simulez l\'import des données comptables et la génération automatique des 22 états annexes de la liasse fiscale.', tags: ['22 annexes', 'DGI', 'Auto-remplissage'] },
    { id: 'interactive-tax', icon: Shield, title: 'Contrôles de cohérence', desc: 'Le moteur vérifie la concordance des totaux inter-états, l\'équilibre actif/passif, et signale les anomalies.', tags: ['Contrôles croisés', 'Alertes'] },
  ],
  'doc-journey': [
    { id: 'interactive-entry', icon: BookOpen, title: 'Import & classement de documents', desc: 'Simulez le scan OCR d\'une facture fournisseur : extraction des données, classement automatique, rattachement comptable.', tags: ['OCR', 'IA', 'Auto-classement'] },
  ],
};

const TUTORIALS = {
  'atlas-finance': [
    { title: 'Créer votre première écriture', desc: 'De la saisie à la validation : journal, comptes, montants, pièce jointe.', duration: '3 min', difficulty: 'Facile', steps: ['Choisir le journal', 'Sélectionner les comptes', 'Saisir les montants', 'Vérifier l\'équilibre', 'Valider'] },
    { title: 'Configurer le plan comptable', desc: 'Chargez le plan SYSCOHADA ou personnalisez vos sous-comptes.', duration: '2 min', difficulty: 'Facile', steps: ['Accéder au plan comptable', 'Parcourir les classes 1-9', 'Ajouter un sous-compte', 'Rechercher un compte'] },
    { title: 'Paramétrer la TVA', desc: 'Configurez les taux, comptes collecteurs/déductibles pour votre pays.', duration: '3 min', difficulty: 'Moyen', steps: ['Sélectionner le pays', 'Définir le taux normal', 'Configurer les comptes 443/445', 'Activer le calcul automatique'] },
    { title: 'Lettrage automatique', desc: 'Rapprochez les comptes clients et fournisseurs en un clic.', duration: '4 min', difficulty: 'Moyen', steps: ['Sélectionner le compte 411/401', 'Lancer l\'auto-lettrage', 'Vérifier les rapprochements', 'Valider ou ajuster'] },
    { title: 'Générer le bilan SYSCOHADA', desc: 'Visualisez le bilan et exportez-le en PDF.', duration: '2 min', difficulty: 'Facile', steps: ['Accéder aux états financiers', 'Sélectionner la période', 'Explorer le bilan', 'Exporter en PDF'] },
    { title: 'Clôturer un exercice', desc: 'Suivez les 6 étapes de la clôture annuelle.', duration: '5 min', difficulty: 'Avancé', steps: ['Vérifier l\'équilibre', 'Générer les amortissements', 'Verrouiller les périodes', 'Calculer le résultat', 'Générer les reports à nouveau', 'Finaliser'] },
    { title: 'Gérer les immobilisations', desc: 'Ajoutez un actif, paramétrez l\'amortissement linéaire ou dégressif.', duration: '4 min', difficulty: 'Moyen', steps: ['Créer une fiche immobilisation', 'Définir la méthode d\'amortissement', 'Renseigner la durée de vie', 'Visualiser le tableau'] },
    { title: 'Configurer le multi-devise', desc: 'Gérez les opérations en EUR, USD avec taux de change automatique.', duration: '3 min', difficulty: 'Avancé', steps: ['Activer le multi-devise', 'Paramétrer les taux de change', 'Saisir une écriture en devise', 'Voir les écarts de conversion'] },
  ],
  'liass-pilot': [
    { title: 'Préparer la liasse fiscale', desc: 'Import des données comptables et mapping des comptes.', duration: '5 min', difficulty: 'Moyen', steps: ['Sélectionner l\'exercice', 'Importer la balance', 'Vérifier le mapping', 'Lancer la génération'] },
    { title: 'Vérifier et corriger', desc: 'Contrôles automatiques et corrections manuelles.', duration: '3 min', difficulty: 'Facile', steps: ['Lancer les contrôles', 'Examiner les alertes', 'Corriger les anomalies', 'Re-valider'] },
    { title: 'Télédéclarer', desc: 'Export et envoi du fichier XML au portail DGI.', duration: '2 min', difficulty: 'Facile', steps: ['Vérifier la conformité', 'Exporter en XML', 'Envoyer au portail', 'Archiver l\'accusé'] },
  ],
  'doc-journey': [
    { title: 'Scanner un document', desc: 'Utilisez l\'OCR pour extraire les données d\'une facture.', duration: '2 min', difficulty: 'Facile', steps: ['Uploader le document', 'Lancer l\'OCR', 'Vérifier les données extraites', 'Valider'] },
    { title: 'Organiser vos fichiers', desc: 'Classement par catégories, tags et métadonnées.', duration: '3 min', difficulty: 'Facile', steps: ['Créer des dossiers', 'Activer le classement IA', 'Ajouter des tags', 'Rechercher'] },
  ],
};

const DemoModal: React.FC<DemoModalProps> = ({ isOpen, onClose, initialSolution = 'atlas-finance' }) => {
  const [solution, setSolution] = useState(initialSolution);
  const [tab, setTab] = useState('interactive');
  const [view, setView] = useState<DemoView>('menu');
  const [tutoIndex, setTutoIndex] = useState(0);
  const [tutoStep, setTutoStep] = useState(0);

  if (!isOpen) return null;

  const demos = INTERACTIVE_DEMOS[solution] || INTERACTIVE_DEMOS['atlas-finance'];
  const tutorials = TUTORIALS[solution] || TUTORIALS['atlas-finance'];
  const solutionLabel = solution === 'atlas-finance' ? 'Atlas Finance' : solution === 'liass-pilot' ? "Liass'Pilot" : 'DocJourney';

  const goBack = () => { setView('menu'); setTutoStep(0); };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            {view !== 'menu' && (
              <button onClick={goBack} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-[#141414]">
                ←
              </button>
            )}
            <div>
              <h3 className="text-lg font-bold text-[#141414]">
                {view === 'menu' ? `Découvrir ${solutionLabel}` : view === 'guided' ? 'Visite guidée' : view.startsWith('interactive') ? 'Démo interactive' : 'Retour'}
              </h3>
              <p className="text-xs text-gray-500">{view === 'menu' ? 'Choisissez votre mode de découverte' : 'Mode interactif — testez en conditions réelles'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        {view === 'menu' && (
          <>
            {/* Solution tabs */}
            <div className="px-5 pt-4 flex gap-2">
              {[
                { id: 'atlas-finance', label: 'Atlas Finance' },
                { id: 'liass-pilot', label: "Liass'Pilot" },
                { id: 'doc-journey', label: 'DocJourney' },
              ].map(s => (
                <button key={s.id} onClick={() => { setSolution(s.id); setTab('interactive'); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${solution === s.id ? 'bg-[#141414] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Mode tabs */}
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'interactive', icon: Monitor, title: 'Démos interactives', desc: 'Testez en conditions réelles', time: 'Illimité', badge: 'Populaire' },
                { id: 'guided', icon: Play, title: 'Visite guidée', desc: 'Tour rapide des modules', time: '2 min', badge: null },
                { id: 'tutorials', icon: Lightbulb, title: 'Tutoriels', desc: 'Pas à pas par fonctionnalité', time: '5-10 min', badge: null },
                { id: 'live', icon: Users, title: 'Démo live', desc: 'Un expert en direct', time: '30 min', badge: null },
              ].map(opt => (
                <button key={opt.id} onClick={() => opt.id === 'guided' ? setView('guided') : setTab(opt.id)}
                  className={`relative p-3 rounded-xl border-2 text-left transition-all ${tab === opt.id && opt.id !== 'guided' ? 'border-[#141414] bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  {opt.badge && <span className="absolute -top-2 right-2 px-2 py-0.5 bg-[#141414] text-white text-[10px] font-bold rounded-full">{opt.badge}</span>}
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center mb-2"><opt.icon className="w-4 h-4 text-[#141414]" /></div>
                  <h4 className="text-xs font-semibold text-[#141414]">{opt.title}</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400"><Clock className="w-3 h-3" /> {opt.time}</div>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="px-5 pb-5">
              {tab === 'interactive' && (
                <div className="grid gap-3">
                  {demos.map(demo => (
                    <button key={demo.id} onClick={() => setView(demo.id as DemoView)}
                      className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-[#141414] hover:shadow-md transition-all text-left group">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#141414] group-hover:text-white transition-colors">
                        <demo.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-[#141414]">{demo.title}</h5>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{demo.desc}</p>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {demo.tags.map((tag, ti) => (
                            <span key={ti} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-full">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#141414] shrink-0 mt-1" />
                    </button>
                  ))}
                </div>
              )}

              {tab === 'tutorials' && (
                <div className="space-y-2">
                  {tutorials.map((tuto, i) => (
                    <button key={i} onClick={() => { setTutoIndex(i); setTutoStep(0); setView('tutorials' as DemoView); }}
                      className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 hover:border-[#141414] transition-all text-left group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-[#141414] group-hover:text-white transition-colors">
                          <Lightbulb className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#141414]">{tuto.title}</p>
                          <p className="text-xs text-gray-500">{tuto.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${tuto.difficulty === 'Facile' ? 'bg-green-100 text-green-700' : tuto.difficulty === 'Moyen' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                          {tuto.difficulty}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {tuto.duration}</span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#141414]" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {tab === 'live' && (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="text-center mb-6">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h4 className="font-semibold text-[#141414] mb-2">Réservez une démo personnalisée</h4>
                    <p className="text-sm text-gray-500">Un expert Atlas Studio vous accompagne en direct pendant 30 minutes.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[{ label: 'Découverte', desc: 'Tour complet', icon: '🎯' }, { label: 'Migration', desc: 'Depuis votre logiciel', icon: '🔄' }, { label: 'Sur mesure', desc: 'Vos besoins spécifiques', icon: '⚙️' }].map((opt, i) => (
                      <div key={i} className="p-3 bg-white rounded-lg border border-gray-200 text-center">
                        <div className="text-2xl mb-1">{opt.icon}</div>
                        <p className="text-sm font-medium text-[#141414]">{opt.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="text-center">
                    <button className="px-8 py-3 bg-[#141414] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] inline-flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Planifier un rendez-vous
                    </button>
                    <p className="text-xs text-gray-400 mt-2">contact@atlasstudio.com</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Interactive demos */}
        {view === 'interactive-entry' && (
          <div className="p-5"><InteractiveEntryDemo onClose={goBack} /></div>
        )}
        {view === 'interactive-bilan' && (
          <div className="p-5"><InteractiveBilanDemo onClose={goBack} /></div>
        )}
        {view === 'interactive-tax' && (
          <div className="p-5"><InteractiveTaxDemo onClose={goBack} /></div>
        )}

        {/* Guided tour */}
        {view === 'guided' && (
          <div className="p-5"><GuidedTour solution={solution} onClose={goBack} /></div>
        )}

        {/* Tutorial detail */}
        {view === ('tutorials' as DemoView) && tutorials[tutoIndex] && (
          <div className="p-5 space-y-4">
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-[#141414]">{tutorials[tutoIndex].title}</h4>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tutorials[tutoIndex].difficulty === 'Facile' ? 'bg-green-100 text-green-700' : tutorials[tutoIndex].difficulty === 'Moyen' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                  {tutorials[tutoIndex].difficulty} • {tutorials[tutoIndex].duration}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-5">{tutorials[tutoIndex].desc}</p>

              {/* Steps */}
              <div className="space-y-3">
                {tutorials[tutoIndex].steps.map((stepLabel, si) => (
                  <div key={si} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${si === tutoStep ? 'border-[#141414] bg-white shadow-sm' : si < tutoStep ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white opacity-60'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${si < tutoStep ? 'bg-green-500 text-white' : si === tutoStep ? 'bg-[#141414] text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {si < tutoStep ? '✓' : si + 1}
                    </div>
                    <span className={`text-sm ${si === tutoStep ? 'font-medium text-[#141414]' : si < tutoStep ? 'text-green-700' : 'text-gray-500'}`}>{stepLabel}</span>
                  </div>
                ))}
              </div>

              {/* Pro tip */}
              {tutoStep < tutorials[tutoIndex].steps.length && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700"><strong>💡 Astuce Pro :</strong> {tutoStep === 0 ? 'Utilisez le raccourci Ctrl+N pour créer rapidement.' : tutoStep === 1 ? 'Tapez les premiers chiffres du compte pour le trouver instantanément.' : 'Vérifiez toujours l\'équilibre avant de valider.'}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-5">
                <button onClick={() => setTutoStep(s => Math.max(0, s - 1))} disabled={tutoStep === 0}
                  className={`px-4 py-2 text-sm rounded-lg ${tutoStep === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}>
                  ← Précédent
                </button>
                {tutoStep < tutorials[tutoIndex].steps.length - 1 ? (
                  <button onClick={() => setTutoStep(s => s + 1)} className="px-4 py-2 bg-[#141414] text-white text-sm rounded-lg font-semibold hover:bg-[#2a2a2a]">
                    Étape suivante →
                  </button>
                ) : (
                  <button onClick={goBack} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg font-semibold hover:bg-green-700">
                    ✓ Tutoriel terminé
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoModal;
