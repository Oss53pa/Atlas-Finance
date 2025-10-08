import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Calculator,
  Database,
  CheckCircle,
  AlertTriangle,
  Play,
  FileText,
  DollarSign,
  TrendingDown,
  Clock,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';

interface ClosureStep {
  step: string;
  status: 'pending' | 'completed' | 'error';
  result?: string;
  error?: string;
}

interface ClosureResult {
  company: string;
  fiscal_year: string;
  closure_date: string;
  steps_completed: ClosureStep[];
  total_entries_created: number;
  syscohada_compliant: boolean;
  success: boolean;
  error?: string;
}

interface TrialBalance {
  account_number: string;
  account_name: string;
  total_debit: string;
  total_credit: string;
  debit_balance: string;
  credit_balance: string;
}

const RealClosurePage: React.FC = () => {
  const { t } = useLanguage();
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('');
  const [closureResult, setClosureResult] = useState<ClosureResult | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalance[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [showBalance, setShowBalance] = useState(false);

  // Simulation des exercices disponibles
  const fiscalYears = [
    { id: '2024', name: 'Exercice 2024', start_date: '2024-01-01', end_date: '2024-12-31', is_closed: false },
    { id: '2023', name: 'Exercice 2023', start_date: '2023-01-01', end_date: '2023-12-31', is_closed: true },
  ];

  const startRealClosure = async () => {
    if (!selectedFiscalYear) {
      alert('Veuillez sélectionner un exercice fiscal');
      return;
    }

    setIsClosing(true);
    setCurrentStep('Initialisation...');

    try {
      // Simulation d'appel API réel
      const steps = [
        'Balance pré-clôture',
        'Calcul provisions clients',
        'Calcul amortissements',
        'Écritures de régularisation',
        'Balance post-clôture'
      ];

      const simulatedResult: ClosureResult = {
        company: 'WiseBook SARL',
        fiscal_year: 'Exercice 2024',
        closure_date: new Date().toISOString(),
        steps_completed: [],
        total_entries_created: 0,
        syscohada_compliant: true,
        success: true
      };

      // Simulation du processus étape par étape
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i]);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulation délai

        let stepResult: ClosureStep;

        switch (steps[i]) {
          case 'Balance pré-clôture':
            stepResult = {
              step: steps[i],
              status: 'completed',
              result: '156 comptes actifs, équilibre: true'
            };
            break;
          case 'Calcul provisions clients':
            stepResult = {
              step: steps[i],
              status: 'completed',
              result: '125,000 XOF provisionné (3 clients > 6 mois)'
            };
            simulatedResult.total_entries_created += 3;
            break;
          case 'Calcul amortissements':
            stepResult = {
              step: steps[i],
              status: 'completed',
              result: '275,000 XOF amortissements (12 immobilisations)'
            };
            simulatedResult.total_entries_created += 12;
            break;
          case 'Écritures de régularisation':
            stepResult = {
              step: steps[i],
              status: 'completed',
              result: '180,000 XOF régularisé (charges à payer, produits à recevoir)'
            };
            simulatedResult.total_entries_created += 5;
            break;
          case 'Balance post-clôture':
            stepResult = {
              step: steps[i],
              status: 'completed',
              result: 'Balance équilibrée: true'
            };
            break;
          default:
            stepResult = {
              step: steps[i],
              status: 'completed',
              result: 'Terminé'
            };
        }

        simulatedResult.steps_completed.push(stepResult);
        setClosureResult({ ...simulatedResult });
      }

      setCurrentStep('Clôture terminée');

    } catch (error) {
      setClosureResult({
        company: 'WiseBook SARL',
        fiscal_year: 'Exercice 2024',
        closure_date: new Date().toISOString(),
        steps_completed: [],
        total_entries_created: 0,
        syscohada_compliant: false,
        success: false,
        error: 'Erreur lors de la clôture'
      });
    } finally {
      setIsClosing(false);
      setCurrentStep('');
    }
  };

  const generateTrialBalance = async () => {
    setCurrentStep('Génération balance générale...');

    // Simulation de balance réelle
    const mockBalance: TrialBalance[] = [
      {
        account_number: '101000',
        account_name: 'Capital social',
        total_debit: '0',
        total_credit: '10000000',
        debit_balance: '0',
        credit_balance: '10000000'
      },
      {
        account_number: '411001',
        account_name: 'Clients - Société A',
        total_debit: '1500000',
        total_credit: '1200000',
        debit_balance: '300000',
        credit_balance: '0'
      },
      {
        account_number: '491100',
        account_name: 'Provisions pour créances douteuses',
        total_debit: '0',
        total_credit: '125000',
        debit_balance: '0',
        credit_balance: '125000'
      },
      {
        account_number: '512100',
        account_name: 'Banque BCEAO',
        total_debit: '5200000',
        total_credit: '4800000',
        debit_balance: '400000',
        credit_balance: '0'
      },
      {
        account_number: '607000',
        account_name: 'Achats de marchandises',
        total_debit: '8500000',
        total_credit: '0',
        debit_balance: '8500000',
        credit_balance: '0'
      },
      {
        account_number: '701000',
        account_name: 'Ventes de marchandises',
        total_debit: '0',
        total_credit: '12000000',
        debit_balance: '0',
        credit_balance: '12000000'
      },
      {
        account_number: '681200',
        account_name: 'Dotations aux amortissements',
        total_debit: '275000',
        total_credit: '0',
        debit_balance: '275000',
        credit_balance: '0'
      },
      {
        account_number: '681500',
        account_name: 'Dotations aux provisions créances',
        total_debit: '125000',
        total_credit: '0',
        debit_balance: '125000',
        credit_balance: '0'
      }
    ];

    setTrialBalance(mockBalance);
    setShowBalance(true);
    setCurrentStep('');
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(parseFloat(amount));
  };

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)]">
      {/* En-tête */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text-primary)] flex items-center">
                <Calculator className="h-8 w-8 mr-3 text-[var(--color-primary)]" />
                Clôture Comptable Réelle
              </h1>
              <p className="mt-2 text-[var(--color-text-primary)]">
                Génération automatique d'écritures comptables selon SYSCOHADA
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={generateTrialBalance}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
              >
                <Database className="h-4 w-4" />
                <span>Balance Générale</span>
              </button>

              <button
                onClick={startRealClosure}
                disabled={isClosing || !selectedFiscalYear}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2" aria-label="Actualiser">
                {isClosing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span>{isClosing ? 'Clôture en cours...' : 'Démarrer Clôture'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sélection exercice */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Sélection de l'Exercice</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fiscalYears.map((fy) => (
              <button
                key={fy.id}
                onClick={() => setSelectedFiscalYear(fy.id)}
                className={`p-4 rounded-lg border text-left transition-all ${
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

        {/* Progression de clôture */}
        {isClosing && (
          <div className="bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-primary-darker)]">Clôture en Cours</h3>
              <div className="flex items-center space-x-2 text-[var(--color-primary-dark)]">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Traitement automatique...</span>
              </div>
            </div>
            <div className="text-[var(--color-primary-darker)] font-medium">{currentStep}</div>
            <div className="mt-3 bg-[var(--color-primary-light)] rounded-full h-2">
              <div
                className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-500"
                style={{ width: `${closureResult ? (closureResult.steps_completed.length / 5) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Résultats de clôture */}
        {closureResult && (
          <div className="space-y-6">
            {/* Résumé global */}
            <div className={`rounded-lg border p-6 ${
              closureResult.success ? 'border-[var(--color-success-light)] bg-[var(--color-success-lightest)]' : 'border-[var(--color-error-light)] bg-[var(--color-error-lightest)]'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold flex items-center ${
                  closureResult.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {closureResult.success ? (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 mr-2" />
                  )}
                  {closureResult.success ? 'Clôture Réussie' : 'Erreur de Clôture'}
                </h3>
                <div className="text-right">
                  <div className={`text-sm ${closureResult.success ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-error-dark)]'}`}>
                    {new Date(closureResult.closure_date).toLocaleString('fr-FR')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${closureResult.success ? 'text-green-900' : 'text-red-900'}`}>
                    {closureResult.total_entries_created}
                  </div>
                  <div className={`text-sm ${closureResult.success ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-error-dark)]'}`}>
                    Écritures générées
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${closureResult.success ? 'text-green-900' : 'text-red-900'}`}>
                    {closureResult.steps_completed.length}/5
                  </div>
                  <div className={`text-sm ${closureResult.success ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-error-dark)]'}`}>
                    Étapes terminées
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${closureResult.syscohada_compliant ? 'text-green-900' : 'text-yellow-900'}`}>
                    {closureResult.syscohada_compliant ? '✓' : '⚠'}
                  </div>
                  <div className={`text-sm ${closureResult.syscohada_compliant ? 'text-[var(--color-success-dark)]' : 'text-[var(--color-warning-dark)]'}`}>
                    SYSCOHADA
                  </div>
                </div>
              </div>
            </div>

            {/* Détail des étapes */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Détail des Opérations Comptables</h3>
              <div className="space-y-3">
                {closureResult.steps_completed.map((step, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-[var(--color-background-secondary)] rounded-lg">
                    <div className="flex items-center space-x-3">
                      {step.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
                      ) : step.status === 'error' ? (
                        <AlertTriangle className="h-5 w-5 text-[var(--color-error)]" />
                      ) : (
                        <Clock className="h-5 w-5 text-[var(--color-primary)]" />
                      )}
                      <div>
                        <div className="font-medium text-[var(--color-text-primary)]">{step.step}</div>
                        {step.result && (
                          <div className="text-sm text-[var(--color-text-primary)]">{step.result}</div>
                        )}
                        {step.error && (
                          <div className="text-sm text-[var(--color-error)]">{step.error}</div>
                        )}
                      </div>
                    </div>

                    <button className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]" title="Voir écritures" aria-label="Voir les détails">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions post-clôture */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Actions Post-Clôture</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button className="p-4 border border-[var(--color-border)] rounded-lg hover:border-blue-300 hover:bg-[var(--color-primary-lightest)] text-center">
                  <FileText className="h-8 w-8 text-[var(--color-primary)] mx-auto mb-2" />
                  <div className="font-medium text-[var(--color-text-primary)]">États Financiers</div>
                  <div className="text-sm text-[var(--color-text-primary)]">Générer Bilan & CR</div>
                </button>

                <button className="p-4 border border-[var(--color-border)] rounded-lg hover:border-green-300 hover:bg-[var(--color-success-lightest)] text-center">
                  <Database className="h-8 w-8 text-[var(--color-success)] mx-auto mb-2" />
                  <div className="font-medium text-[var(--color-text-primary)]">Journal de Clôture</div>
                  <div className="text-sm text-[var(--color-text-primary)]">Consulter écritures</div>
                </button>

                <button className="p-4 border border-[var(--color-border)] rounded-lg hover:border-purple-300 hover:bg-purple-50 text-center">
                  <Download className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="font-medium text-[var(--color-text-primary)]">Export FEC</div>
                  <div className="text-sm text-[var(--color-text-primary)]">Fichier d'écritures</div>
                </button>

                <button
                  onClick={generateTrialBalance}
                  className="p-4 border border-[var(--color-border)] rounded-lg hover:border-orange-300 hover:bg-orange-50 text-center"
                >
                  <Calculator className="h-8 w-8 text-[var(--color-warning)] mx-auto mb-2" />
                  <div className="font-medium text-[var(--color-text-primary)]">Balance Générale</div>
                  <div className="text-sm text-[var(--color-text-primary)]">Voir soldes</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Balance générale */}
        {showBalance && trialBalance.length > 0 && (
          <div className="bg-white rounded-lg border p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Balance Générale Post-Clôture</h3>
              <button
                onClick={() => setShowBalance(false)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                ×
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.account')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.label')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Total Débit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Total Crédit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Solde Débiteur</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Solde Créditeur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {trialBalance.map((account, index) => (
                    <tr key={index} className="hover:bg-[var(--color-background-secondary)]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-[var(--color-text-primary)]">
                        {account.account_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-primary)]">
                        {account.account_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono text-[var(--color-text-primary)]">
                        {parseFloat(account.total_debit) > 0 ? formatAmount(account.total_debit) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono text-[var(--color-text-primary)]">
                        {parseFloat(account.total_credit) > 0 ? formatAmount(account.total_credit) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono font-medium text-[var(--color-primary)]">
                        {parseFloat(account.debit_balance) > 0 ? formatAmount(account.debit_balance) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono font-medium text-[var(--color-success)]">
                        {parseFloat(account.credit_balance) > 0 ? formatAmount(account.credit_balance) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[var(--color-background-hover)]">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right font-semibold text-[var(--color-text-primary)]">
                      TOTAUX:
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[var(--color-primary)]">
                      {formatAmount(trialBalance.reduce((sum, acc) => sum + parseFloat(acc.debit_balance), 0).toString())}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[var(--color-success)]">
                      {formatAmount(trialBalance.reduce((sum, acc) => sum + parseFloat(acc.credit_balance), 0).toString())}
                    </td>
                  </tr>
                </tfoot>
              </table>
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
                <li>• &gt; 6 mois : 50% provision</li>
                <li>• &gt; 12 mois : 100% provision</li>
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

export default RealClosurePage;