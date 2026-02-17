import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import PeriodSelectorModal from '../shared/PeriodSelectorModal';
import {
  Sparkles as SparklesIcon,
  Lightbulb as LightBulbIcon,
  Wand2 as MagicWandIcon,
  Brain as BrainIcon,
  Target as TargetIcon,
  SplitSquareHorizontal as SplitSquareHorizontalIcon,
  Calculator as CalculatorIcon,
  CheckCircle as CheckCircleIcon,
  AlertTriangle as ExclamationTriangleIcon,
  RotateCcw as ArrowPathIcon,
  FileText as DocumentTextIcon,
  DollarSign as CurrencyDollarIcon,
  Scale as ScaleIcon,
  Link as LinkIcon
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  ToggleLeft,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Separator,
  Switch
} from '../ui';

interface IntelligentSuggestion {
  type: 'ACCOUNT' | 'AMOUNT' | 'THIRD_PARTY' | 'VAT' | 'SPLIT' | 'TEMPLATE';
  confidence: number;
  suggestion: any;
  reasoning: string;
  autoApply: boolean;
}

interface VentilationSuggestion {
  method: 'EQUAL' | 'PERCENTAGE' | 'HISTORICAL' | 'ANALYTICAL';
  accounts: Array<{
    code: string;
    name: string;
    suggestedAmount: number;
    suggestedPercentage: number;
    reasoning: string;
  }>;
  confidence: number;
}

interface TemplateSuggestion {
  id: string;
  name: string;
  description: string;
  matchScore: number;
  structure: any;
  usage: number;
}

const IntelligentEntryAssistant: React.FC = () => {
  const { t } = useLanguage();
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
  const [assistantMode, setAssistantMode] = useState<'GUIDED' | 'SMART' | 'EXPERT'>('SMART');
  const [currentContext, setCurrentContext] = useState<any>({});
  const [suggestions, setSuggestions] = useState<IntelligentSuggestion[]>([]);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [autoAcceptSuggestions, setAutoAcceptSuggestions] = useState(false);
  const [learningMode, setLearningMode] = useState(true);

  // Form principal
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors }
  } = useForm({
    defaultValues: {
      metadata: {
        entryDate: new Date().toISOString().split('T')[0],
        journal: '',
        reference: '',
        description: '',
        notes: '',
        attachments: [],
      },
      transactionData: {
        type: 'GENERAL',
        autoAnalysis: true,
        smartSuggestions: true,
        templateMatching: true,
      },
      entries: [
        {
          id: crypto.randomUUID(),
          account: '',
          description: '',
          debitAmount: 0,
          creditAmount: 0,
          thirdParty: '',
          
          // Ventilation intelligente
          intelligentSplit: {
            enabled: false,
            method: 'MANUAL',
            totalAmount: 0,
            splitLines: [],
            suggestions: [],
          },
          
          // Analytics et dimensions
          analytics: {
            costCenter: '',
            project: '',
            department: '',
            analyticalAccount: '',
            tags: [],
          },
          
          // Métadonnées ligne
          lineNotes: '',
          confidence: 100,
          aiSuggested: false,
        }
      ]
    }
  });

  const { fields: entries, append: addEntry, remove: removeEntry } = useFieldArray({
    control,
    name: 'entries'
  });

  const watchedEntries = watch('entries');
  const watchedTransactionType = watch('transactionData.type');
  const watchedDescription = watch('metadata.description');

  // IA - Analyse intelligente du contexte
  const { data: contextAnalysis } = useQuery({
    queryKey: ['context-analysis', watchedDescription, watchedTransactionType],
    queryFn: async () => {
      if (!watchedDescription) return null;
      
      // Simulation d'analyse IA du contexte
      return {
        transactionType: analyzeTransactionType(watchedDescription),
        suggestedAccounts: suggestAccountsFromDescription(watchedDescription),
        templateMatches: findMatchingTemplates(watchedDescription),
        vatApplicable: detectVATApplicability(watchedDescription),
        thirdPartyDetected: extractThirdPartyFromDescription(watchedDescription),
        amountEstimate: estimateAmountFromDescription(watchedDescription),
        splitSuggestion: suggestVentilationStrategy(watchedDescription),
        confidence: calculateConfidenceScore(watchedDescription),
      };
    },
    enabled: !!watchedDescription && watchedDescription.length > 10
  });

  // Calculs temps réel
  const calculatedMetrics = useMemo(() => {
    const totalDebit = watchedEntries.reduce((sum, entry) => {
      if (entry.intelligentSplit?.enabled) {
        return sum + (entry.intelligentSplit?.splitLines?.reduce((s: number, line: any) => s + (line.amount || 0), 0) || 0);
      }
      return sum + (entry.debitAmount || 0);
    }, 0);

    const totalCredit = watchedEntries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0);
    
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    const balance = totalDebit - totalCredit;
    const complexity = calculateComplexityScore(watchedEntries);
    
    return {
      totalDebit,
      totalCredit,
      isBalanced,
      balance,
      complexity,
      equilibriumPercentage: totalCredit > 0 ? Math.min(100, (Math.min(totalDebit, totalCredit) / Math.max(totalDebit, totalCredit)) * 100) : 0
    };
  }, [watchedEntries]);

  // Suggestions intelligentes temps réel
  useEffect(() => {
    if (contextAnalysis && showAIPanel) {
      const newSuggestions: IntelligentSuggestion[] = [];

      // Suggestion de type de transaction
      if (contextAnalysis.transactionType && contextAnalysis.confidence > 70) {
        newSuggestions.push({
          type: 'TEMPLATE',
          confidence: contextAnalysis.confidence,
          suggestion: {
            transactionType: contextAnalysis.transactionType,
            template: contextAnalysis.templateMatches[0]
          },
          reasoning: `Détection automatique: ${contextAnalysis.transactionType} (${contextAnalysis.confidence}% confiance)`,
          autoApply: contextAnalysis.confidence > 85
        });
      }

      // Suggestions de comptes
      if (contextAnalysis.suggestedAccounts?.length > 0) {
        newSuggestions.push({
          type: 'ACCOUNT',
          confidence: 85,
          suggestion: contextAnalysis.suggestedAccounts,
          reasoning: 'Comptes suggérés basés sur l\'analyse sémantique',
          autoApply: false
        });
      }

      // Suggestion de ventilation
      if (contextAnalysis.splitSuggestion && contextAnalysis.amountEstimate > 100000) {
        newSuggestions.push({
          type: 'SPLIT',
          confidence: contextAnalysis.splitSuggestion.confidence,
          suggestion: contextAnalysis.splitSuggestion,
          reasoning: 'Ventilation recommandée pour optimiser l\'analyse',
          autoApply: false
        });
      }

      setSuggestions(newSuggestions);

      // Auto-application des suggestions à haute confiance
      if (autoAcceptSuggestions) {
        newSuggestions
          .filter(s => s.autoApply && s.confidence > 90)
          .forEach(applySuggestion);
      }
    }
  }, [contextAnalysis, autoAcceptSuggestions, showAIPanel]);

  const applySuggestion = (suggestion: IntelligentSuggestion) => {
    switch (suggestion.type) {
      case 'TEMPLATE':
        applyTemplate(suggestion.suggestion.template);
        break;
      case 'ACCOUNT':
        suggestion.suggestion.forEach((account: any, index: number) => {
          if (entries[index]) {
            setValue(`entries.${index}.account`, account.id);
            setValue(`entries.${index}.description`, account.suggestedDescription);
          }
        });
        break;
      case 'SPLIT':
        applySplitSuggestion(suggestion.suggestion);
        break;
    }
  };

  const applyTemplate = (template: TemplateSuggestion) => {
    // Application intelligente d'un template
    const templateStructure = template.structure;
    
    // Effacer les entrées actuelles
    while (entries.length > 0) {
      removeEntry(0);
    }
    
    // Ajouter les lignes du template
    templateStructure.lines?.forEach((line: any) => {
      addEntry({
        id: crypto.randomUUID(),
        account: line.accountId,
        description: line.description,
        debitAmount: line.debitAmount || 0,
        creditAmount: line.creditAmount || 0,
        thirdParty: line.thirdParty || '',
        intelligentSplit: { enabled: false, method: 'MANUAL', totalAmount: 0, splitLines: [] },
        analytics: line.analytics || { costCenter: '', project: '', department: '', analyticalAccount: '', tags: [] },
        lineNotes: '',
        confidence: 95,
        aiSuggested: true,
      });
    });
  };

  const applySplitSuggestion = (splitSuggestion: VentilationSuggestion) => {
    // Trouver la ligne avec le montant le plus élevé pour appliquer la ventilation
    const maxAmountIndex = watchedEntries.reduce((maxIndex, entry, index) => {
      const currentTotal = (entry.debitAmount || 0) + (entry.creditAmount || 0);
      const maxTotal = (watchedEntries[maxIndex]?.debitAmount || 0) + (watchedEntries[maxIndex]?.creditAmount || 0);
      return currentTotal > maxTotal ? index : maxIndex;
    }, 0);

    const targetEntry = watchedEntries[maxAmountIndex];
    const totalAmount = (targetEntry.debitAmount || 0) + (targetEntry.creditAmount || 0);

    setValue(`entries.${maxAmountIndex}.intelligentSplit.enabled`, true);
    setValue(`entries.${maxAmountIndex}.intelligentSplit.method`, splitSuggestion.method);
    setValue(`entries.${maxAmountIndex}.intelligentSplit.totalAmount`, totalAmount);
    setValue(`entries.${maxAmountIndex}.intelligentSplit.splitLines`, splitSuggestion.accounts.map(acc => ({
      account: acc.code,
      description: acc.name,
      amount: acc.suggestedAmount,
      percentage: acc.suggestedPercentage,
    })));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel principal */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header intelligent */}
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <BrainIcon className="h-8 w-8 text-indigo-600" />
                  <div>
                    <CardTitle className="text-xl text-indigo-900">Assistant IA de Saisie</CardTitle>
                    <p className="text-indigo-700">Saisie intelligente avec suggestions automatiques</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge className="bg-indigo-100 text-indigo-800">
                    Mode {assistantMode}
                  </Badge>
                  <Select value={assistantMode} onValueChange={setAssistantMode}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GUIDED">Guidé</SelectItem>
                      <SelectItem value="SMART">Intelligent</SelectItem>
                      <SelectItem value="EXPERT">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Formulaire principal avec IA */}
          <form onSubmit={handleSubmit((data) => {
            // TODO: Process intelligent entry submission
          })}>
            {/* Métadonnées enrichies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Informations de l'Écriture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <Controller
                      name="metadata.entryDate"
                      control={control}
                      render={({ field }) => (
                        <div className="relative">
                          <Input type="date" {...field} />
                          {assistantMode === 'SMART' && (
                            <div className="absolute right-2 top-2">
                              <LightBulbIcon className="h-4 w-4 text-yellow-500" title="Suggestion: Fin de mois détectée" />
                            </div>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Journal *</label>
                    <Controller
                      name="metadata.journal"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Auto-suggestion activée" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACH">
                              <div className="flex items-center">
                                <Badge className="bg-blue-100 text-blue-800 mr-2">Suggéré</Badge>
                                ACH - Journal des Achats
                              </div>
                            </SelectItem>
                            <SelectItem value="VTE">VTE - Journal des Ventes</SelectItem>
                            <SelectItem value="BQ1">BQ1 - Banque SGBC</SelectItem>
                            <SelectItem value="OD">OD - Opérations Diverses</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
                    <Controller
                      name="metadata.reference"
                      control={control}
                      render={({ field }) => (
                        <div className="relative">
                          <Input 
                            placeholder="Auto-générée si vide"
                            {...field} 
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-6 w-6 p-0"
                            onClick={() => setValue('metadata.reference', `REF-${Date.now()}`)}
                          >
                            <MagicWandIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description * 
                      {assistantMode === 'SMART' && (
                        <span className="text-xs text-indigo-600 ml-2">(L'IA analyse pendant la saisie)</span>
                      )}
                    </label>
                    <Controller
                      name="metadata.description"
                      control={control}
                      render={({ field }) => (
                        <div className="relative">
                          <Input 
                            placeholder="Décrivez l'opération... L'IA suggérera automatiquement"
                            {...field}
                            className="pr-10"
                          />
                          {contextAnalysis && (
                            <div className="absolute right-2 top-2">
                              <div className="flex items-center space-x-1">
                                <div className={`w-2 h-2 rounded-full ${
                                  contextAnalysis.confidence > 80 ? 'bg-green-400' :
                                  contextAnalysis.confidence > 60 ? 'bg-yellow-400' : 'bg-red-400'
                                }`}></div>
                                <SparklesIcon className="h-4 w-4 text-indigo-500" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section des écritures avec IA */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <ScaleIcon className="h-5 w-5 mr-2" />
                    Écritures Comptables Intelligentes
                  </CardTitle>
                  <div className="flex items-center space-x-4">
                    {/* Indicateur d'équilibre en temps réel */}
                    <div className="flex items-center space-x-2">
                      <div className="w-24">
                        <Progress 
                          value={calculatedMetrics.equilibriumPercentage} 
                          className={`h-2 ${calculatedMetrics.isBalanced ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                        />
                      </div>
                      <Badge className={calculatedMetrics.isBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {calculatedMetrics.isBalanced ? '⚖️ Équilibrée' : `❌ Écart: ${formatCurrency(Math.abs(calculatedMetrics.balance))}`}
                      </Badge>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addEntry({
                        id: crypto.randomUUID(),
                        account: '',
                        description: '',
                        debitAmount: 0,
                        creditAmount: 0,
                        thirdParty: '',
                        intelligentSplit: { enabled: false, method: 'MANUAL', totalAmount: 0, splitLines: [] },
                        analytics: { costCenter: '', project: '', department: '', analyticalAccount: '', tags: [] },
                        lineNotes: '',
                        confidence: 100,
                        aiSuggested: false,
                      })}
                    >
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      Ligne Intelligente
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {entries.map((entry, index) => (
                    <IntelligentEntryLine 
                      key={entry.id}
                      entry={entry}
                      index={index}
                      control={control}
                      contextAnalysis={contextAnalysis}
                      onRemove={() => removeEntry(index)}
                      assistantMode={assistantMode}
                    />
                  ))}
                </div>

                {/* Résumé des totaux */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="grid grid-cols-3 gap-6 text-sm">
                      <div>
                        <span className="text-gray-600">Total Débit:</span>
                        <span className="ml-2 font-bold text-blue-600">{formatCurrency(calculatedMetrics.totalDebit)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Crédit:</span>
                        <span className="ml-2 font-bold text-green-600">{formatCurrency(calculatedMetrics.totalCredit)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Complexité:</span>
                        <Badge className={
                          calculatedMetrics.complexity < 30 ? 'bg-green-100 text-green-800' :
                          calculatedMetrics.complexity < 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }>
                          {calculatedMetrics.complexity}%
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {calculatedMetrics.isBalanced ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircleIcon className="h-5 w-5 mr-2" />
                          <span className="font-medium">Écriture équilibrée</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                          <span className="font-medium">Déséquilibre détecté</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button type="button" variant="outline">
                      💾 Sauvegarder Brouillon
                    </Button>
                    <Button type="button" variant="outline">
                      📋 Créer Template
                    </Button>
                    <Button type="button" variant="outline">
                      🔄 Réinitialiser
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <Button
                      type="submit"
                      disabled={!calculatedMetrics.isBalanced}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Enregistrer & Valider
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Panel IA Assistant */}
        {showAIPanel && (
          <div className="space-y-6">
            {/* Panel de suggestions */}
            <Card className="border-purple-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center text-purple-900">
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    Assistant IA
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAIPanel(false)}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Configuration IA */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={autoAcceptSuggestions}
                        onCheckedChange={setAutoAcceptSuggestions}
                      />
                      <label className="text-sm text-gray-700">Auto-application</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={learningMode}
                        onCheckedChange={setLearningMode}
                      />
                      <label className="text-sm text-gray-700">Mode apprentissage</label>
                    </div>
                  </div>

                  <Separator />

                  {/* Suggestions actives */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Suggestions</h4>
                    {suggestions.length > 0 ? (
                      suggestions.map((suggestion, index) => (
                        <SuggestionCard 
                          key={index}
                          suggestion={suggestion}
                          onApply={() => applySuggestion(suggestion)}
                          onDismiss={() => setSuggestions(suggestions.filter((_, i) => i !== index))}
                        />
                      ))
                    ) : (
                      <div className="text-center text-gray-700 py-4">
                        <LightBulbIcon className="h-8 w-8 mx-auto mb-2 text-gray-700" />
                        <p className="text-sm">Commencez la saisie pour obtenir des suggestions</p>
                      </div>
                    )}
                  </div>

                  {/* Analyse contextuelle */}
                  {contextAnalysis && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Analyse Contextuelle</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Type détecté:</span>
                            <Badge className="bg-blue-100 text-blue-800">
                              {contextAnalysis.transactionType || 'Indéterminé'}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Confiance:</span>
                            <div className="flex items-center space-x-2">
                              <Progress value={contextAnalysis.confidence} className="w-16 h-2" />
                              <span className="font-medium">{contextAnalysis.confidence}%</span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">TVA applicable:</span>
                            <span className={contextAnalysis.vatApplicable ? 'text-green-600' : 'text-gray-600'}>
                              {contextAnalysis.vatApplicable ? '✓ Oui' : '- Non'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Templates suggérés */}
            {contextAnalysis?.templateMatches?.length > 0 && (
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center text-green-900">
                    <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
                    Templates Suggérés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {contextAnalysis.templateMatches.slice(0, 3).map((template: TemplateSuggestion, index: number) => (
                      <div key={template.id} className="p-3 border border-green-200 rounded-lg hover:bg-green-50 cursor-pointer"
                           onClick={() => applyTemplate(template)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{template.name}</p>
                            <p className="text-xs text-gray-600">{template.description}</p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-green-100 text-green-800">
                              {template.matchScore}% match
                            </Badge>
                            <p className="text-xs text-gray-700 mt-1">{template.usage} utilisations</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(range) => setDateRange(range)}
        initialDateRange={dateRange}
      />
    </div>
  );
};

// Composant pour une ligne d'écriture intelligente
const IntelligentEntryLine: React.FC<{
  entry: any;
  index: number;
  control: any;
  contextAnalysis: any;
  onRemove: () => void;
  assistantMode: string;
}> = ({ entry, index, control, contextAnalysis, onRemove, assistantMode }) => {
  const [showVentilation, setShowVentilation] = useState(false);
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Ligne {index + 1}</span>
          {entry.aiSuggested && (
            <Badge className="bg-purple-100 text-purple-800">
              <SparklesIcon className="h-3 w-3 mr-1" />
              IA
            </Badge>
          )}
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              entry.confidence > 80 ? 'bg-green-400' :
              entry.confidence > 60 ? 'bg-yellow-400' : 'bg-red-400'
            }`}></div>
            <span className="text-xs text-gray-700">{entry.confidence}% confiance</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowVentilation(!showVentilation)}
            className={entry.intelligentSplit?.enabled ? 'text-purple-600' : 'text-gray-600'}
          >
            <SplitSquareHorizontalIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Champs de la ligne */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Compte *</label>
          <Controller
            name={`entries.${index}.account`}
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner ou taper..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contextAnalysis?.suggestedAccounts?.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center">
                          <Badge className="bg-purple-100 text-purple-800 mr-2 text-xs">Suggéré</Badge>
                          {account.code} - {account.name}
                        </div>
                      </SelectItem>
                    )) || []}
                    <SelectItem value="601">601 - Achats marchandises</SelectItem>
                    <SelectItem value="701">701 - Ventes marchandises</SelectItem>
                    <SelectItem value="411">411 - Clients</SelectItem>
                    <SelectItem value="401">401 - Fournisseurs</SelectItem>
                  </SelectContent>
                </Select>
                {assistantMode === 'SMART' && contextAnalysis?.suggestedAccounts?.length > 0 && (
                  <MagicWandIcon className="absolute right-8 top-2 h-4 w-4 text-purple-500" />
                )}
              </div>
            )}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
          <Controller
            name={`entries.${index}.description`}
            control={control}
            render={({ field }) => (
              <Input 
                placeholder="Description de la ligne"
                {...field}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t('accounting.debit')}</label>
          <Controller
            name={`entries.${index}.debitAmount`}
            control={control}
            render={({ field }) => (
              <Input 
                type="number"
                step="0.01"
                placeholder="0.00"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                className="text-right"
              />
            )}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t('accounting.credit')}</label>
          <Controller
            name={`entries.${index}.creditAmount`}
            control={control}
            render={({ field }) => (
              <Input 
                type="number"
                step="0.01"
                placeholder="0.00"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                className="text-right"
              />
            )}
          />
        </div>
      </div>

      {/* Ventilation intelligente */}
      {showVentilation && (
        <IntelligentVentilationPanel 
          control={control}
          lineIndex={index}
          entry={entry}
          contextAnalysis={contextAnalysis}
        />
      )}
    </div>
  );
};

// Panel de ventilation intelligente
const IntelligentVentilationPanel: React.FC<{
  control: any;
  lineIndex: number;
  entry: any;
  contextAnalysis: any;
}> = ({ control, lineIndex, entry, contextAnalysis }) => {
  return (
    <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <h4 className="font-medium text-purple-900 mb-3 flex items-center">
        <SplitSquareHorizontalIcon className="h-4 w-4 mr-2" />
        Ventilation Intelligente
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Méthode</label>
          <Controller
            name={`entries.${lineIndex}.intelligentSplit.method`}
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manuelle</SelectItem>
                  <SelectItem value="PERCENTAGE">Par Pourcentage</SelectItem>
                  <SelectItem value="EQUAL">Répartition Égale</SelectItem>
                  <SelectItem value="HISTORICAL">Basée Historique</SelectItem>
                  <SelectItem value="AI_SUGGESTED">Suggérée par IA</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Montant Total</label>
          <Controller
            name={`entries.${lineIndex}.intelligentSplit.totalAmount`}
            control={control}
            render={({ field }) => (
              <Input 
                type="number"
                step="0.01"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              />
            )}
          />
        </div>
        
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              // Activer la ventilation intelligente
              setValue(`entries.${lineIndex}.intelligentSplit.enabled`, true);
              // Suggérer des comptes basés sur l'analyse
              if (contextAnalysis?.splitSuggestion) {
                setValue(`entries.${lineIndex}.intelligentSplit.splitLines`, 
                  contextAnalysis.splitSuggestion.accounts.map((acc: any) => ({
                    account: acc.code,
                    description: acc.name,
                    amount: acc.suggestedAmount,
                    percentage: acc.suggestedPercentage,
                  }))
                );
              }
            }}
          >
            <MagicWandIcon className="h-4 w-4 mr-2" />
            Suggérer
          </Button>
        </div>
      </div>
    </div>
  );
};

// Carte de suggestion
const SuggestionCard: React.FC<{
  suggestion: IntelligentSuggestion;
  onApply: () => void;
  onDismiss: () => void;
}> = ({ suggestion, onApply, onDismiss }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ACCOUNT': return <TargetIcon className="h-4 w-4 text-blue-500" />;
      case 'AMOUNT': return <CurrencyDollarIcon className="h-4 w-4 text-green-500" />;
      case 'SPLIT': return <SplitSquareHorizontalIcon className="h-4 w-4 text-purple-500" />;
      case 'TEMPLATE': return <DocumentTextIcon className="h-4 w-4 text-indigo-500" />;
      default: return <LightBulbIcon className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2">
          {getTypeIcon(suggestion.type)}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {suggestion.type === 'ACCOUNT' && 'Comptes suggérés'}
              {suggestion.type === 'AMOUNT' && 'Montant estimé'}
              {suggestion.type === 'SPLIT' && 'Ventilation recommandée'}
              {suggestion.type === 'TEMPLATE' && 'Template correspondant'}
            </p>
            <p className="text-xs text-gray-600 mt-1">{suggestion.reasoning}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              suggestion.confidence > 80 ? 'bg-green-400' :
              suggestion.confidence > 60 ? 'bg-yellow-400' : 'bg-red-400'
            }`}></div>
            <span className="text-xs text-gray-700">{suggestion.confidence}%</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onApply}
              className="h-6 w-6 p-0 text-green-600"
            >
              <CheckCircleIcon className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 text-red-600"
            >
              ✕
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Fonctions utilitaires d'analyse IA (simulation)
const analyzeTransactionType = (description: string): string | null => {
  const desc = description.toLowerCase();
  if (desc.includes('facture') && desc.includes('achat')) return 'PURCHASE_INVOICE';
  if (desc.includes('facture') && desc.includes('vente')) return 'SALE_INVOICE';
  if (desc.includes('règlement') || desc.includes('paiement')) return 'PAYMENT_RECEIPT';
  if (desc.includes('amortissement')) return 'DEPRECIATION';
  if (desc.includes('provision')) return 'PROVISION';
  return null;
};

const suggestAccountsFromDescription = (description: string) => {
  const suggestions = [];
  const desc = description.toLowerCase();
  
  if (desc.includes('achat')) {
    suggestions.push({ id: '601', code: '601', name: 'Achats marchandises', suggestedDescription: 'Achat marchandises' });
  }
  if (desc.includes('vente')) {
    suggestions.push({ id: '701', code: '701', name: 'Ventes marchandises', suggestedDescription: 'Vente marchandises' });
  }
  if (desc.includes('banque')) {
    suggestions.push({ id: '512', code: '512', name: 'Banque', suggestedDescription: 'Mouvement bancaire' });
  }
  
  return suggestions;
};

const findMatchingTemplates = (description: string): TemplateSuggestion[] => {
  return [
    {
      id: '1',
      name: 'Facture d\'achat standard',
      description: 'Template pour factures fournisseurs avec TVA',
      matchScore: 85,
      structure: { lines: [] },
      usage: 245
    }
  ];
};

const detectVATApplicability = (description: string): boolean => {
  const vatKeywords = ['facture', 'achat', 'vente', 'prestation', 'service'];
  return vatKeywords.some(keyword => description.toLowerCase().includes(keyword));
};

const extractThirdPartyFromDescription = (description: string) => {
  // Logique d'extraction de tiers depuis la description
  return null;
};

const estimateAmountFromDescription = (description: string): number => {
  // Logique d'estimation de montant
  const numbers = description.match(/\d+[.,]?\d*/g);
  return numbers ? parseFloat(numbers[0].replace(',', '.')) : 0;
};

const suggestVentilationStrategy = (description: string): VentilationSuggestion | null => {
  if (description.toLowerCase().includes('répartir') || description.toLowerCase().includes('ventiler')) {
    return {
      method: 'PERCENTAGE',
      accounts: [
        { code: '601', name: 'Achats A', suggestedAmount: 50000, suggestedPercentage: 60, reasoning: 'Historique' },
        { code: '602', name: 'Achats B', suggestedAmount: 33333, suggestedPercentage: 40, reasoning: 'Analytique' }
      ],
      confidence: 75
    };
  }
  return null;
};

const calculateConfidenceScore = (description: string): number => {
  let score = 50;
  
  // Facteurs d'augmentation de confiance
  if (description.length > 20) score += 10;
  if (/\d/.test(description)) score += 15; // Contient des chiffres
  if (description.includes('facture')) score += 20;
  if (description.includes('€') || description.includes('XAF')) score += 10;
  
  return Math.min(100, score);
};

const calculateComplexityScore = (entries: any[]): number => {
  let complexity = 0;
  
  // Facteurs de complexité
  complexity += entries.length * 5; // Nombre de lignes
  complexity += entries.filter(e => e.intelligentSplit?.enabled).length * 15; // Lignes ventilées
  complexity += entries.filter(e => e.thirdParty).length * 10; // Lignes avec tiers
  complexity += entries.filter(e => e.analytics?.costCenter).length * 5; // Lignes analytiques
  
  return Math.min(100, complexity);
};

export default IntelligentEntryAssistant;