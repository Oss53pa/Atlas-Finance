/**
 * GenerateReportModal - Modal for generating reports
 * Opens directly to template selection (no data source step)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, FileText, Sparkles,
  ChevronRight, ChevronLeft, Check,
  Search, ChevronDown,
} from 'lucide-react';
import { cn } from '../../utils/cn';

type Step = 'template' | 'options' | 'generating';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  isAI: boolean;
}

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedSources?: string[];
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'sales-analysis', name: 'Analyse des Ventes', description: 'Rapport complet sur les performances commerciales', category: 'Commercial', isAI: true },
  { id: 'marketing-performance', name: 'Performance Marketing', description: 'Analyse des campagnes et ROI marketing', category: 'Marketing', isAI: true },
  { id: 'financial-report', name: 'Rapport Financier', description: 'États financiers et indicateurs clés', category: 'Finance', isAI: true },
  { id: 'hr-dashboard', name: 'Tableau de Bord RH', description: 'Suivi des effectifs et indicateurs RH', category: 'RH', isAI: true },
  { id: 'custom-report', name: 'Rapport Personnalisé', description: 'L\'IA génère un rapport adapté à vos données', category: 'IA', isAI: true },
];

const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
  isOpen, onClose,
}) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('template');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep('template');
      setSelectedTemplates([]);
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  }, [isOpen]);

  const toggleTemplate = (id: string) => {
    setSelectedTemplates(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const selectedTemplatesInfo = useMemo(() =>
    selectedTemplates.map(id => REPORT_TEMPLATES.find(t => t.id === id)).filter(Boolean) as ReportTemplate[], [selectedTemplates]);

  const canProceed = () => {
    if (currentStep === 'template') return selectedTemplates.length > 0;
    return true;
  };

  const handleGenerate = async () => {
    setCurrentStep('generating');
    setIsGenerating(true);
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 300));
      setGenerationProgress(i);
    }
    setTimeout(() => { onClose(); navigate('/reporting/custom'); }, 500);
  };

  const handleNext = () => {
    if (currentStep === 'template') setCurrentStep('options');
    else if (currentStep === 'options') handleGenerate();
  };

  const handleBack = () => {
    if (currentStep === 'options') setCurrentStep('template');
  };

  const getStepNumber = () => {
    if (currentStep === 'template') return 1;
    if (currentStep === 'options') return 2;
    return 3;
  };
  const totalSteps = 3;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Générer un rapport</h2>
              <p className="text-sm text-gray-500">Étape {getStepNumber()}/{totalSteps}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300" style={{ width: `${(getStepNumber() / totalSteps) * 100}%` }} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Template */}
          {currentStep === 'template' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 mb-4">Sélectionnez un ou plusieurs modèles pour votre rapport.</p>
              {selectedTemplates.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedTemplatesInfo.map(t => (
                    <span key={t.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm">
                      {t.isAI && <Sparkles className="w-3 h-3" />}{t.name}
                      <button type="button" onClick={() => toggleTemplate(t.id)}><X className="w-4 h-4" /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <button onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-gray-400 bg-white">
                  <span className="text-gray-500">Sélectionner un modèle...</span>
                  <ChevronDown className={cn('w-5 h-5 text-gray-400', showTemplateDropdown && 'rotate-180')} />
                </button>
                {showTemplateDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowTemplateDropdown(false)} />
                    <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                      <div className="p-3 border-b border-gray-100">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -tranprimary-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="text" value={templateSearchQuery} onChange={(e) => setTemplateSearchQuery(e.target.value)}
                            placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {REPORT_TEMPLATES.filter(t => t.name.toLowerCase().includes(templateSearchQuery.toLowerCase())).map(template => {
                          const isSelected = selectedTemplates.includes(template.id);
                          return (
                            <button key={template.id} onClick={() => toggleTemplate(template.id)}
                              className={cn('w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left border-b border-gray-50', isSelected && 'bg-blue-50')}>
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2"><p className="font-medium text-gray-900">{template.name}</p>
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{template.category}</span></div>
                                <p className="text-sm text-gray-500 truncate">{template.description}</p>
                              </div>
                              {isSelected && <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step: Options */}
          {currentStep === 'options' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Résumé</h4>
                <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600"><strong>{selectedTemplates.length}</strong> modèle{selectedTemplates.length > 1 ? 's' : ''}</span>
                </div>
                {selectedTemplatesInfo.length > 0 && (
                  <div className="ml-7 flex flex-wrap gap-2">
                    {selectedTemplatesInfo.map(t => (
                      <span key={t.id} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{t.name}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">Génération IA</h4>
                    <p className="text-sm text-amber-700 mt-1">Le rapport sera généré avec vos modèles sélectionnés. Vous pourrez le modifier avant validation.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Generating */}
          {currentStep === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-gray-200">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-8 h-8 text-blue-600" /></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Génération en cours...</h3>
              <p className="text-gray-500 text-center max-w-md">Chargement de vos données et modèles.</p>
              <div className="w-full max-w-xs mt-6">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300" style={{ width: `${generationProgress}%` }} />
                </div>
                <p className="text-sm text-gray-500 text-center mt-2">{generationProgress}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {currentStep !== 'generating' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button onClick={currentStep === 'template' ? onClose : handleBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
              {currentStep === 'template' ? 'Annuler' : (<><ChevronLeft className="w-4 h-4" />Retour</>)}
            </button>
            <button onClick={handleNext} disabled={!canProceed()}
              className={cn('flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all',
                canProceed() ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed')}>
              {currentStep === 'options' ? (<><Sparkles className="w-4 h-4" />Générer le rapport</>) : (<>Suivant<ChevronRight className="w-4 h-4" /></>)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateReportModal;
