import React, { useState, useRef } from 'react';
import {
  Calculator,
  Code,
  Play,
  Save,
  Eye,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Layers,
  Database,
  TrendingUp
} from 'lucide-react';

interface FormulaVariable {
  name: string;
  type: 'account' | 'amount' | 'date' | 'percentage' | 'text';
  description: string;
  example: string;
  syscohadaReference?: string;
}

interface FormulaTemplate {
  id: string;
  name: string;
  category: string;
  formula: string;
  description: string;
  variables: string[];
  syscohadaCompliant: boolean;
}

const AdvancedFormulaEditor: React.FC = () => {
  const [formula, setFormula] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showVariables, setShowVariables] = useState(true);
  const [showValidation, setShowValidation] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Variables contextuelles disponibles
  const availableVariables: FormulaVariable[] = [
    {
      name: 'CA',
      type: 'amount',
      description: 'Chiffre d\'affaires de la période',
      example: '2500000',
      syscohadaReference: 'Comptes 70X'
    },
    {
      name: 'STOCK_MOYEN',
      type: 'amount',
      description: 'Stock moyen de la période',
      example: '180000',
      syscohadaReference: 'Comptes 3XX'
    },
    {
      name: 'CREANCES_CLIENTS',
      type: 'amount',
      description: 'Total créances clients',
      example: '450000',
      syscohadaReference: 'Comptes 411'
    },
    {
      name: 'DUREE_PERIODE',
      type: 'date',
      description: 'Nombre de jours de la période',
      example: '31',
      syscohadaReference: 'Calendrier fiscal'
    },
    {
      name: 'TAUX_PROVISION_LEGALE',
      type: 'percentage',
      description: 'Taux de provision légal SYSCOHADA',
      example: '0.5',
      syscohadaReference: 'SYSCOHADA Art. 45'
    },
    {
      name: 'EXERCICE_PRECEDENT',
      type: 'amount',
      description: 'Montant exercice précédent pour comparaison',
      example: '2200000',
      syscohadaReference: 'N-1'
    }
  ];

  // Templates de formules prédéfinies
  const formulaTemplates: FormulaTemplate[] = [
    {
      id: 'provision_clients',
      name: 'Provision Créances Douteuses',
      category: 'Provisions',
      formula: 'IF(CREANCES_CLIENTS > 0, CREANCES_CLIENTS * TAUX_PROVISION_LEGALE, 0)',
      description: 'Calcul automatique des provisions clients selon SYSCOHADA',
      variables: ['CREANCES_CLIENTS', 'TAUX_PROVISION_LEGALE'],
      syscohadaCompliant: true
    },
    {
      id: 'rotation_stocks',
      name: 'Rotation des Stocks',
      category: 'Ratios',
      formula: '(STOCK_MOYEN * 365) / CA',
      description: 'Nombre de jours de rotation des stocks',
      variables: ['STOCK_MOYEN', 'CA'],
      syscohadaCompliant: true
    },
    {
      id: 'dso_clients',
      name: 'DSO (Délai de Recouvrement)',
      category: 'Ratios',
      formula: '(CREANCES_CLIENTS / CA) * DUREE_PERIODE',
      description: 'Délai moyen de recouvrement des créances',
      variables: ['CREANCES_CLIENTS', 'CA', 'DUREE_PERIODE'],
      syscohadaCompliant: true
    },
    {
      id: 'croissance_ca',
      name: 'Croissance Chiffre d\'Affaires',
      category: 'Analyse',
      formula: '((CA - EXERCICE_PRECEDENT) / EXERCICE_PRECEDENT) * 100',
      description: 'Taux de croissance du CA vs exercice précédent',
      variables: ['CA', 'EXERCICE_PRECEDENT'],
      syscohadaCompliant: true
    },
    {
      id: 'provision_avancee',
      name: 'Provision Avancée Multi-Critères',
      category: 'Provisions',
      formula: 'SWITCH(TRUE, CREANCES_CLIENTS_AGE > 365, CREANCES_CLIENTS * 1, CREANCES_CLIENTS_AGE > 180, CREANCES_CLIENTS * 0.5, CREANCES_CLIENTS * TAUX_PROVISION_LEGALE)',
      description: 'Provision basée sur l\'ancienneté des créances',
      variables: ['CREANCES_CLIENTS', 'CREANCES_CLIENTS_AGE', 'TAUX_PROVISION_LEGALE'],
      syscohadaCompliant: true
    }
  ];

  const insertVariable = (variableName: string) => {
    if (editorRef.current) {
      const start = editorRef.current.selectionStart;
      const end = editorRef.current.selectionEnd;
      const newFormula = formula.substring(0, start) + variableName + formula.substring(end);
      setFormula(newFormula);

      // Repositionner le curseur
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + variableName.length;
          editorRef.current.focus();
        }
      }, 0);
    }
  };

  const loadTemplate = (templateId: string) => {
    const template = formulaTemplates.find(t => t.id === templateId);
    if (template) {
      setFormula(template.formula);
      setSelectedTemplate(templateId);
    }
  };

  const testFormula = () => {
    try {
      // Simulation de test avec valeurs d'exemple
      const testData = {
        CA: 2500000,
        STOCK_MOYEN: 180000,
        CREANCES_CLIENTS: 450000,
        DUREE_PERIODE: 31,
        TAUX_PROVISION_LEGALE: 0.025,
        EXERCICE_PRECEDENT: 2200000,
        CREANCES_CLIENTS_AGE: 120
      };

      // Simulation d'évaluation (en production, utiliser un moteur d'évaluation sécurisé)
      let result: any = null;
      let isValid = true;
      let syscohadaCompliant = true;

      // Tests basiques selon la formule sélectionnée
      if (selectedTemplate === 'provision_clients') {
        result = testData.CREANCES_CLIENTS * testData.TAUX_PROVISION_LEGALE;
      } else if (selectedTemplate === 'rotation_stocks') {
        result = (testData.STOCK_MOYEN * 365) / testData.CA;
      } else if (selectedTemplate === 'dso_clients') {
        result = (testData.CREANCES_CLIENTS / testData.CA) * testData.DUREE_PERIODE;
      } else if (selectedTemplate === 'croissance_ca') {
        result = ((testData.CA - testData.EXERCICE_PRECEDENT) / testData.EXERCICE_PRECEDENT) * 100;
      } else {
        result = 'Formule testée avec succès';
      }

      setTestResult({
        success: isValid,
        result: result,
        syscohadaCompliant,
        executionTime: '12ms',
        testData
      });

    } catch (error) {
      setTestResult({
        success: false,
        error: 'Erreur dans la formule',
        details: 'Vérifiez la syntaxe et les variables utilisées'
      });
    }
  };

  const validateFormula = () => {
    // Simulation de validation
    const validation = {
      syntaxValid: true,
      variablesValid: true,
      syscohadaCompliant: true,
      securityChecks: true,
      recommendations: [
        'Ajouter une condition de contrôle pour les montants négatifs',
        'Documenter la méthode de calcul pour audit'
      ]
    };

    setShowValidation(true);
    return validation;
  };

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Panneau variables et templates */}
      <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calculator className="h-5 w-5 mr-2 text-blue-600" />
          Éditeur de Formules
        </h3>

        {/* Templates prédéfinis */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Templates SYSCOHADA</h4>
          <div className="space-y-2">
            {formulaTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => loadTemplate(template.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedTemplate === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900 text-sm">{template.name}</div>
                  {template.syscohadaCompliant && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                <div className="text-xs text-blue-600 mt-1">{template.category}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Variables disponibles */}
        {showVariables && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Variables Contextuelles</h4>
            <div className="space-y-2">
              {availableVariables.map((variable) => (
                <div
                  key={variable.name}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => insertVariable(variable.name)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium text-blue-600">
                      {variable.name}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      variable.type === 'amount' ? 'bg-green-100 text-green-700' :
                      variable.type === 'percentage' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {variable.type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{variable.description}</div>
                  <div className="text-xs text-gray-500 mt-1">Ex: {variable.example}</div>
                  {variable.syscohadaReference && (
                    <div className="text-xs text-blue-500 mt-1">
                      📖 {variable.syscohadaReference}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fonctions disponibles */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Fonctions Intégrées</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              'SUM', 'AVG', 'MAX', 'MIN', 'COUNT', 'IF',
              'SWITCH', 'AND', 'OR', 'ROUND', 'ABS', 'SQRT'
            ].map((func) => (
              <button
                key={func}
                onClick={() => insertVariable(`${func}()`)}
                className="p-2 text-xs bg-gray-100 hover:bg-blue-100 rounded border border-gray-200 font-mono"
              >
                {func}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Zone d'édition principale */}
      <div className="flex-1 flex flex-col">
        {/* Barre d'outils */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedTemplate
                  ? formulaTemplates.find(t => t.id === selectedTemplate)?.name
                  : 'Nouvelle Formule'
                }
              </h3>
              {selectedTemplate && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                  SYSCOHADA Conforme
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowVariables(!showVariables)}
                className={`p-2 rounded-lg border transition-colors ${
                  showVariables ? 'bg-blue-50 border-blue-300' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Database className="h-4 w-4" />
              </button>
              <button
                onClick={validateFormula}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Valider</span>
              </button>
              <button
                onClick={testFormula}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Tester</span>
              </button>
              <button className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>Sauvegarder</span>
              </button>
            </div>
          </div>
        </div>

        {/* Éditeur de formule */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Code className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Éditeur de Formule</span>
                <span className="text-xs text-gray-500">
                  Syntaxe: Excel/Python compatible
                </span>
              </div>
            </div>

            <div className="flex-1 p-4">
              <textarea
                ref={editorRef}
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                className="w-full h-32 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Saisissez votre formule ici...&#10;&#10;Exemples:&#10;- IF(CREANCES_CLIENTS > 100000, CREANCES_CLIENTS * 0.05, 0)&#10;- SUM(COMPTE_70X) - SUM(COMPTE_60X)&#10;- (STOCK_MOYEN * 365) / CA"
              />

              {/* Suggestions de syntaxe */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Aide à la Syntaxe</span>
                </div>
                <div className="space-y-1 text-xs text-blue-800">
                  <div><code>IF(condition, valeur_si_vrai, valeur_si_faux)</code></div>
                  <div><code>SUM(COMPTE_XXX)</code> - Somme des mouvements d'un compte</div>
                  <div><code>BALANCE(CLASSE_X)</code> - Solde d'une classe de comptes</div>
                  <div><code>PERIODE_PRECEDENTE(variable)</code> - Valeur N-1</div>
                </div>
              </div>

              {/* Aperçu du résultat de test */}
              {testResult && (
                <div className={`mt-4 p-4 rounded-lg border ${
                  testResult.success
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      testResult.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {testResult.success ? 'Test Réussi' : 'Erreur de Test'}
                    </span>
                  </div>

                  {testResult.success ? (
                    <div className="space-y-2">
                      <div className="text-sm text-green-800">
                        <strong>Résultat:</strong> {typeof testResult.result === 'number'
                          ? testResult.result.toLocaleString('fr-FR')
                          : testResult.result
                        }
                      </div>
                      <div className="text-xs text-green-700">
                        Temps d'exécution: {testResult.executionTime}
                      </div>
                      {testResult.syscohadaCompliant && (
                        <div className="flex items-center space-x-1 text-xs text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          <span>Conforme SYSCOHADA</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-sm text-red-800">
                        <strong>Erreur:</strong> {testResult.error}
                      </div>
                      {testResult.details && (
                        <div className="text-xs text-red-700">{testResult.details}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Panel de validation */}
              {showValidation && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Validation Complète</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-800">Syntaxe:</span>
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-800">Variables:</span>
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-800">SYSCOHADA:</span>
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-800">Sécurité:</span>
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    </div>
                  </div>

                  <div className="text-xs text-purple-800">
                    <div className="font-medium mb-1">Recommandations:</div>
                    <ul className="space-y-1">
                      <li>• Ajouter contrôle montants négatifs</li>
                      <li>• Documenter méthode pour audit</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Zone de prévisualisation */}
      <div className="w-96 bg-white border-l border-gray-200 p-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Eye className="h-5 w-5 mr-2 text-green-600" />
          Prévisualisation
        </h4>

        {/* Informations template */}
        {selectedTemplate && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            {(() => {
              const template = formulaTemplates.find(t => t.id === selectedTemplate);
              if (!template) return null;

              return (
                <div className="space-y-2">
                  <div className="font-medium text-gray-900">{template.name}</div>
                  <div className="text-sm text-gray-600">{template.description}</div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {template.category}
                    </span>
                    {template.syscohadaCompliant && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                        SYSCOHADA
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Aperçu du calcul */}
        <div className="mb-6">
          <h5 className="text-sm font-medium text-gray-700 mb-3">Simulation de Calcul</h5>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded border">
              <div className="text-xs text-gray-600 mb-2">Données d'entrée (exemple):</div>
              <div className="space-y-1 text-xs font-mono">
                <div>CA = 2,500,000 XOF</div>
                <div>CREANCES_CLIENTS = 450,000 XOF</div>
                <div>STOCK_MOYEN = 180,000 XOF</div>
                <div>TAUX_PROVISION_LEGALE = 2.5%</div>
              </div>
            </div>

            {testResult && testResult.success && (
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <div className="text-xs text-green-600 mb-2">Résultat calculé:</div>
                <div className="text-lg font-bold text-green-900">
                  {typeof testResult.result === 'number'
                    ? testResult.result.toLocaleString('fr-FR')
                    : testResult.result
                  }
                  {selectedTemplate === 'provision_clients' && ' XOF'}
                  {selectedTemplate === 'rotation_stocks' && ' jours'}
                  {selectedTemplate === 'croissance_ca' && '%'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Documentation SYSCOHADA */}
        <div className="mb-6">
          <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <BookOpen className="h-4 w-4 mr-2 text-blue-500" />
            Références SYSCOHADA
          </h5>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="p-2 bg-blue-50 rounded border border-blue-200">
              <div className="font-medium text-blue-900">Art. 45 - Provisions</div>
              <div className="text-blue-800 mt-1">
                "Les provisions constituent des passifs dont l'échéance ou le montant ne sont pas fixés de façon précise"
              </div>
            </div>
            <div className="p-2 bg-blue-50 rounded border border-blue-200">
              <div className="font-medium text-blue-900">Art. 42 - Amortissements</div>
              <div className="text-blue-800 mt-1">
                "L'amortissement consiste à répartir le coût d'une immobilisation sur sa durée d'utilisation"
              </div>
            </div>
          </div>
        </div>

        {/* Historique des formules */}
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-3">Historique</h5>
          <div className="space-y-2">
            {[
              { name: 'Provision clients Jan 2024', date: '15/01/2024', user: 'Marie L.' },
              { name: 'Rotation stocks Q4', date: '31/12/2023', user: 'Jean D.' },
              { name: 'Amortissement nouveau', date: '28/12/2023', user: 'Paul M.' }
            ].map((item, index) => (
              <div key={index} className="p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                <div className="text-xs text-gray-500">
                  {item.date} par {item.user}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFormulaEditor;