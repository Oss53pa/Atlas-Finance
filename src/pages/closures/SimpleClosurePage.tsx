import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Calendar,
  Calculator,
  Database,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Play,
  Settings,
  Download
} from 'lucide-react';

interface FiscalYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
}

interface ClosureOperation {
  name: string;
  status: 'pending' | 'completed' | 'error';
  result?: string;
  entries_created?: number;
}

const SimpleClosurePage: React.FC = () => {
  const { t } = useLanguage();
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('');
  const [operations, setOperations] = useState<ClosureOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOperation, setCurrentOperation] = useState('');

  // Exercices disponibles (à charger depuis l'API)
  const fiscalYears: FiscalYear[] = [
    { id: '2024', name: 'Exercice 2024', start_date: '2024-01-01', end_date: '2024-12-31', is_closed: false },
    { id: '2023', name: 'Exercice 2023', start_date: '2023-01-01', end_date: '2023-12-31', is_closed: true }
  ];

  const startClosure = async () => {
    if (!selectedFiscalYear) {
      alert('Veuillez sélectionner un exercice fiscal');
      return;
    }

    setIsProcessing(true);
    setOperations([]);

    const operationSteps = [
      'Balance pré-clôture',
      'Calcul provisions clients',
      'Calcul amortissements',
      'Écritures de régularisation',
      'Balance post-clôture'
    ];

    try {
      for (const step of operationSteps) {
        setCurrentOperation(`Exécution: ${step}`);

        // Appel API réel
        let apiUrl = '';
        let method = 'GET';
        let body = null;

        switch (step) {
          case 'Balance pré-clôture':
          case 'Balance post-clôture':
            apiUrl = `http://127.0.0.1:8888/api/v1/period-closures/api/closures/trial-balance/?fiscal_year_id=${selectedFiscalYear}`;
            break;
          case 'Calcul provisions clients':
            apiUrl = 'http://127.0.0.1:8888/api/v1/period-closures/api/closures/calculate-provisions/';
            method = 'POST';
            body = JSON.stringify({ fiscal_year_id: selectedFiscalYear });
            break;
          case 'Calcul amortissements':
            apiUrl = 'http://127.0.0.1:8888/api/v1/period-closures/api/closures/calculate-depreciation/';
            method = 'POST';
            body = JSON.stringify({ fiscal_year_id: selectedFiscalYear });
            break;
          case 'Écritures de régularisation':
            apiUrl = 'http://127.0.0.1:8888/api/v1/period-closures/api/closures/generate-accruals/';
            method = 'POST';
            body = JSON.stringify({ fiscal_year_id: selectedFiscalYear });
            break;
        }

        try {
          const response = await fetch(apiUrl, {
            method,
            headers: {
              'Content-Type': 'application/json',
            },
            body
          });

          if (response.ok) {
            const data = await response.json();

            const operation: ClosureOperation = {
              name: step,
              status: 'completed',
              result: data.success ? 'Réussi' : 'Échec',
              entries_created: data.provisions_count || data.assets_count || data.accruals_count || 0
            };

            setOperations(prev => [...prev, operation]);
          } else {
            throw new Error(`Erreur API: ${response.statusText}`);
          }

        } catch (error) {
          const operation: ClosureOperation = {
            name: step,
            status: 'error',
            result: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
          };
          setOperations(prev => [...prev, operation]);
        }

        // Délai entre les étapes
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setCurrentOperation('Clôture terminée');

    } catch (error) {
      console.error('Erreur clôture:', error);
      setCurrentOperation('Erreur lors de la clôture');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateProvisions = async () => {
    if (!selectedFiscalYear) return;

    setCurrentOperation('Calcul provisions en cours...');

    try {
      const response = await fetch('http://127.0.0.1:8888/api/v1/period-closures/api/closures/calculate-provisions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiscal_year_id: selectedFiscalYear })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentOperation(`Provisions calculées: ${data.total_provisions || '0'} XOF`);
      } else {
        setCurrentOperation('Erreur calcul provisions');
      }
    } catch (error) {
      setCurrentOperation('Erreur API provisions');
    }
  };

  const calculateDepreciation = async () => {
    if (!selectedFiscalYear) return;

    setCurrentOperation('Calcul amortissements en cours...');

    try {
      const response = await fetch('http://127.0.0.1:8888/api/v1/period-closures/api/closures/calculate-depreciation/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiscal_year_id: selectedFiscalYear })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentOperation(`Amortissements calculés: ${data.total_depreciation || '0'} XOF`);
      } else {
        setCurrentOperation('Erreur calcul amortissements');
      }
    } catch (error) {
      setCurrentOperation('Erreur API amortissements');
    }
  };

  const generateTrialBalance = async () => {
    if (!selectedFiscalYear) return;

    setCurrentOperation('Génération balance en cours...');

    try {
      const response = await fetch(`http://127.0.0.1:8888/api/v1/period-closures/api/closures/trial-balance/?fiscal_year_id=${selectedFiscalYear}`);

      if (response.ok) {
        const data = await response.json();
        setCurrentOperation(`Balance générée: ${data.accounts_count || 0} comptes, équilibrée: ${data.is_balanced ? 'Oui' : 'Non'}`);
      } else {
        setCurrentOperation('Erreur génération balance');
      }
    } catch (error) {
      setCurrentOperation('Erreur API balance');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)]">
      {/* En-tête simple */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center">
            <Calculator className="h-6 w-6 mr-3 text-[var(--color-primary)]" />
            Clôture Comptable Périodique
          </h1>
          <p className="mt-1 text-[var(--color-text-primary)]">
            Opérations de clôture automatisées conformes SYSCOHADA
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Sélection exercice */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Sélection de l'Exercice</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fiscalYears.map((fy) => (
              <button
                key={fy.id}
                onClick={() => setSelectedFiscalYear(fy.id)}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  selectedFiscalYear === fy.id
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-lightest)]'
                    : fy.is_closed
                    ? 'border-[var(--color-border)] bg-[var(--color-background-secondary)] opacity-75'
                    : 'border-[var(--color-border)] hover:border-blue-300 hover:bg-[var(--color-primary-lightest)]'
                }`}
                disabled={fy.is_closed}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--color-text-primary)]">{fy.name}</span>
                  {fy.is_closed ? (
                    <span className="px-2 py-1 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] text-xs rounded">Clôturé</span>
                  ) : (
                    <span className="px-2 py-1 bg-[var(--color-success-lighter)] text-[var(--color-success-dark)] text-xs rounded">Ouvert</span>
                  )}
                </div>
                <div className="text-sm text-[var(--color-text-primary)] mt-1">
                  {fy.start_date} → {fy.end_date}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions de clôture */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Actions de Clôture</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={startClosure}
              disabled={isProcessing || !selectedFiscalYear}
              className="p-4 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Play className="h-5 w-5" />
              <span>Clôture Complète</span>
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={calculateProvisions}
                disabled={!selectedFiscalYear}
                className="p-3 border border-[var(--color-border-dark)] rounded-lg hover:bg-[var(--color-background-secondary)] text-center disabled:opacity-50"
              >
                <Calculator className="h-5 w-5 mx-auto mb-1 text-[var(--color-warning)]" />
                <div className="text-xs">Provisions</div>
              </button>

              <button
                onClick={calculateDepreciation}
                disabled={!selectedFiscalYear}
                className="p-3 border border-[var(--color-border-dark)] rounded-lg hover:bg-[var(--color-background-secondary)] text-center disabled:opacity-50"
              >
                <Settings className="h-5 w-5 mx-auto mb-1 text-[var(--color-primary)]" />
                <div className="text-xs">Amortissements</div>
              </button>

              <button
                onClick={generateTrialBalance}
                disabled={!selectedFiscalYear}
                className="p-3 border border-[var(--color-border-dark)] rounded-lg hover:bg-[var(--color-background-secondary)] text-center disabled:opacity-50"
              >
                <Database className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                <div className="text-xs">{t('accounting.balance')}</div>
              </button>
            </div>
          </div>

          {/* État actuel */}
          {currentOperation && (
            <div className="p-4 bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded-lg">
              <div className="flex items-center space-x-2">
                {isProcessing ? (
                  <Clock className="h-4 w-4 text-[var(--color-primary)] animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                )}
                <span className="text-[var(--color-primary-darker)] font-medium">{currentOperation}</span>
              </div>
            </div>
          )}
        </div>

        {/* Résultats des opérations */}
        {operations.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Résultats</h2>
            <div className="space-y-3">
              {operations.map((operation, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded-lg">
                  <div className="flex items-center space-x-3">
                    {operation.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
                    ) : operation.status === 'error' ? (
                      <AlertTriangle className="h-5 w-5 text-[var(--color-error)]" />
                    ) : (
                      <Clock className="h-5 w-5 text-[var(--color-primary)]" />
                    )}
                    <div>
                      <div className="font-medium text-[var(--color-text-primary)]">{operation.name}</div>
                      <div className="text-sm text-[var(--color-text-primary)]">{operation.result}</div>
                    </div>
                  </div>
                  {operation.entries_created && operation.entries_created > 0 && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-[var(--color-success)]">
                        {operation.entries_created} écritures
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">générées</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t flex space-x-3">
              <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                <FileText className="h-4 w-4 mr-2 inline" />
                Journal de Clôture
              </button>
              <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)]">
                <Database className="h-4 w-4 mr-2 inline" />
                Balance Générale
              </button>
              <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]">
                <Download className="h-4 w-4 mr-2 inline" />
                États Financiers
              </button>
            </div>
          </div>
        )}

        {/* Informations SYSCOHADA */}
        <div className="bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-[var(--color-primary-darker)] mb-4">Conformité SYSCOHADA</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-[var(--color-primary-darker)] mb-2">Provisions (Art. 45)</h4>
              <ul className="space-y-1 text-[var(--color-primary-darker)]">
                <li>• Plus de 6 mois : 50% provision</li>
                <li>• Plus de 12 mois : 100% provision</li>
                <li>• Justification documentée</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-[var(--color-primary-darker)] mb-2">Amortissements (Art. 42)</h4>
              <ul className="space-y-1 text-[var(--color-primary-darker)]">
                <li>• Matériel informatique : 3 ans</li>
                <li>• Matériel bureau : 5 ans</li>
                <li>• Constructions : 5-20 ans</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-[var(--color-primary-darker)] mb-2">Régularisations (Art. 58)</h4>
              <ul className="space-y-1 text-[var(--color-primary-darker)]">
                <li>• Charges à payer identifiées</li>
                <li>• Produits à recevoir justifiés</li>
                <li>• Cut-off strict 31/12</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleClosurePage;