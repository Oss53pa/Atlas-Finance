import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  FileText, Eye, Calculator, Brain, Grid,
  ChevronRight, X, Plus, Sparkles
} from 'lucide-react';
import JournalEntryModal from '../components/accounting/JournalEntryModal';
import IntelligentEntryForm from '../components/accounting/IntelligentEntryForm';
import IntelligentEntryAssistant from '../components/accounting/IntelligentEntryAssistant';
import FloatingJournalButton from '../components/accounting/FloatingJournalButton';

const AllEntryModals: React.FC = () => {
  const { t } = useLanguage();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showJournalEntry, setShowJournalEntry] = useState(false);
  const [showIntelligentForm, setShowIntelligentForm] = useState(false);
  const [showIntelligentAssistant, setShowIntelligentAssistant] = useState(false);

  const modals = [
    {
      id: 'journal-entry',
      name: 'JournalEntryModal',
      description: 'Modal principal avec AnimatePresence et règlements (💰 ENTRÉE / 💸 SORTIE)',
      icon: FileText,
      color: 'from-indigo-500 to-purple-600',
      features: ['Achat', 'Vente', 'Règlement', 'Opération diverse', 'Lettrage auto', 'TVA']
    },
    {
      id: 'intelligent-form',
      name: 'IntelligentEntryForm',
      description: 'Formulaire intelligent avec suggestions et modes de saisie',
      icon: Calculator,
      color: 'from-green-500 to-teal-600',
      features: ['Mode Standard', 'Mode Rapide', 'Mode Expert', '8 types journaux', 'Suggestions', 'Analytique']
    },
    {
      id: 'intelligent-assistant',
      name: 'IntelligentEntryAssistant',
      description: 'Assistant IA avec ventilation automatique et templates',
      icon: Brain,
      color: 'from-purple-500 to-pink-600',
      features: ['Mode GUIDED', 'Mode SMART', 'Mode EXPERT', 'Ventilation auto', 'Templates', 'Learning mode']
    }
  ];

  const journalType = {
    code: 'VE' as const,
    label: 'Ventes',
    comptesPreferes: ['701000', '411000'],
    suggestionsAuto: true,
    champSpecifiques: []
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                🔍 Identification des Modals "Nouvelle Écriture"
              </h1>
              <p className="text-gray-600 mt-2">
                Cliquez sur chaque modal pour le voir et identifier votre modal original
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                3 Modals disponibles
              </span>
            </div>
          </div>

          {/* Quick Legend */}
          <div className="grid grid-cols-3 gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              <span className="text-sm text-gray-600">JournalEntryModal - Le plus complet</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">IntelligentEntryForm - Avec suggestions</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600">IntelligentAssistant - Avec IA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modals.map((modal) => (
          <div key={modal.id} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className={`h-2 bg-gradient-to-r ${modal.color}`}></div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${modal.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                  <modal.icon className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-gray-700">Composant</span>
                  <span className="text-xs font-mono text-gray-700">{modal.name}.tsx</span>
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-2">{modal.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{modal.description}</p>

              <div className="space-y-1 mb-6">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Caractéristiques:</p>
                <div className="flex flex-wrap gap-1">
                  {modal.features.map((feature, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  if (modal.id === 'journal-entry') setShowJournalEntry(true);
                  else if (modal.id === 'intelligent-form') setShowIntelligentForm(true);
                  else if (modal.id === 'intelligent-assistant') setShowIntelligentAssistant(true);
                }}
                className={`w-full py-3 px-4 bg-gradient-to-r ${modal.color} text-white font-semibold rounded-xl hover:opacity-90 transition-all duration-200 flex items-center justify-center space-x-2 group`}
              >
                <Eye className="w-5 h-5" />
                <span>Voir ce Modal</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        ))}

        {/* FloatingJournalButton Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="h-2 bg-gradient-to-r from-pink-500 to-rose-600"></div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Plus className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-700">Composant</span>
                <span className="text-xs font-mono text-gray-700">FloatingJournalButton.tsx</span>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">FloatingJournalButton</h3>
            <p className="text-sm text-gray-600 mb-4">Bouton flottant qui utilise JournalEntryModal</p>

            <div className="space-y-1 mb-6">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Info:</p>
              <p className="text-xs text-gray-600">
                Ce composant affiche un bouton flottant en bas à droite qui ouvre le JournalEntryModal
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-700 mb-2">Preview du bouton:</p>
              <div className="relative h-20">
                <div className="absolute bottom-0 right-0">
                  <button className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center text-white" aria-label="Ajouter">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pages that use JournalEntryModal */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 lg:col-span-2">
          <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-600"></div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Grid className="w-6 h-6" />
              </div>
              <span className="text-xs text-gray-700">Pages utilisant JournalEntryModal</span>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-4">Pages avec JournalEntryModal intégré</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-1">EntriesPage.tsx</h4>
                <p className="text-xs text-gray-600">Page avec onglet Brouillard et badge "8 en attente"</p>
                <p className="text-xs text-orange-600 mt-2">Utilise: JournalEntryModal</p>
              </div>

              <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                <h4 className="font-semibold text-teal-800 mb-1">EntriesPageClean.tsx</h4>
                <p className="text-xs text-gray-600">Version épurée avec 3 onglets principaux</p>
                <p className="text-xs text-teal-600 mt-2">Utilise: JournalEntryModal</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-300">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Ces pages importent et utilisent JournalEntryModal comme composant principal
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showJournalEntry && (
        <JournalEntryModal
          isOpen={showJournalEntry}
          onClose={() => setShowJournalEntry(false)}
        />
      )}

      {showIntelligentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">IntelligentEntryForm</h2>
              <button
                onClick={() => setShowIntelligentForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <IntelligentEntryForm
              journalType={journalType}
              onSubmit={(entries) => {
                console.log('Entries:', entries);
                setShowIntelligentForm(false);
              }}
              onCancel={() => setShowIntelligentForm(false)}
              companyId="1"
              exerciceId="2024"
            />
          </div>
        </div>
      )}

      {showIntelligentAssistant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">IntelligentEntryAssistant</h2>
              <button
                onClick={() => setShowIntelligentAssistant(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <IntelligentEntryAssistant />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowIntelligentAssistant(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button Component (always visible) */}
      <FloatingJournalButton />
    </div>
  );
};

export default AllEntryModals;