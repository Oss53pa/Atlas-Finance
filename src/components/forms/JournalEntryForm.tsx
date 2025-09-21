/**
 * Formulaire de saisie d'écriture comptable SYSCOHADA optimisé
 * Validation temps réel et intégration moteur comptable
 */
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  Save, 
  Calculator,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Sparkles
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
  Card,
  CardContent,
  LoadingSpinner 
} from '../ui';
import { accountingService } from '../../services/accounting.service';
import { formatCurrency } from '../../lib/utils';
// Mock toast pour éviter les erreurs
const toast = {
  success: (message: string) => {},
  error: (message: string) => {}
};

interface EntryLineData {
  id?: string;
  account_code: string;
  account_name: string;
  label: string;
  debit_amount: number;
  credit_amount: number;
  third_party?: string;
  analytical_code?: string;
  currency?: string;
  currency_amount?: number;
  exchange_rate?: number;
}

interface EntryFormData {
  entry_date: string;
  journal_code: string;
  piece_number?: string;
  reference?: string;
  description: string;
  source_document?: string;
  lines: EntryLineData[];
}

interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface JournalEntryFormProps {
  initialData?: Partial<EntryFormData>;
  onSave?: (data: EntryFormData) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
  className?: string;
}

export const JournalEntryForm: React.FC<JournalEntryFormProps> = ({
  initialData,
  onSave,
  onCancel,
  mode = 'create',
  className = ''
}) => {
  // États du formulaire
  const [formData, setFormData] = useState<EntryFormData>({
    entry_date: new Date().toISOString().split('T')[0],
    journal_code: '',
    description: '',
    lines: [
      { account_code: '', account_name: '', label: '', debit_amount: 0, credit_amount: 0 }
    ],
    ...initialData
  });

  const [validation, setValidation] = useState<ValidationResult>({
    is_valid: false,
    errors: [],
    warnings: [],
    suggestions: []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Queries
  const { data: journals } = useQuery({
    queryKey: ['journals'],
    queryFn: () => accountingService.getJournals({ active_only: true }),
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountingService.getAccounts({ 
      active_only: true,
      allow_direct_entry: true 
    }),
  });

  const { data: templates } = useQuery({
    queryKey: ['entry-templates'],
    queryFn: () => accountingService.getEntryTemplates(),
    enabled: showTemplates
  });

  // Mutations
  const saveEntryMutation = useMutation({
    mutationFn: (data: EntryFormData) => 
      mode === 'create' 
        ? accountingService.createJournalEntry(data)
        : accountingService.updateJournalEntry(data),
    onSuccess: (result) => {
      toast.success(
        mode === 'create' 
          ? `Écriture ${result.piece_number} créée avec succès`
          : `Écriture ${result.piece_number} modifiée avec succès`
      );
      onSave?.(formData);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  // Calculs automatiques
  const totals = useMemo(() => {
    const debit = formData.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
    const credit = formData.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
    const difference = Math.abs(debit - credit);
    
    return {
      debit,
      credit,
      difference,
      is_balanced: difference < 0.01
    };
  }, [formData.lines]);

  // Validation temps réel
  useEffect(() => {
    validateForm();
  }, [formData, totals]);

  const validateForm = () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validation en-tête
    if (!formData.entry_date) errors.push('Date obligatoire');
    if (!formData.journal_code) errors.push('Journal obligatoire');
    if (!formData.description.trim()) errors.push('Libellé obligatoire');

    // Validation lignes
    if (formData.lines.length < 2) {
      errors.push('Minimum 2 lignes obligatoire');
    }

    formData.lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      if (!line.account_code) {
        errors.push(`Ligne ${lineNum}: Code compte obligatoire`);
      }
      
      if (!line.label.trim()) {
        errors.push(`Ligne ${lineNum}: Libellé obligatoire`);
      }
      
      if (line.debit_amount > 0 && line.credit_amount > 0) {
        errors.push(`Ligne ${lineNum}: Débit ET crédit non autorisé`);
      }
      
      if (line.debit_amount === 0 && line.credit_amount === 0) {
        errors.push(`Ligne ${lineNum}: Montant obligatoire`);
      }

      // Suggestions intelligentes
      if (accounts?.results) {
        const account = accounts.results.find(acc => acc.code === line.account_code);
        if (account) {
          // Suggestion sens selon nature du compte
          if (account.normal_balance === 'DEBIT' && line.credit_amount > 0 && line.debit_amount === 0) {
            suggestions.push(`Ligne ${lineNum}: Crédit inhabituel sur compte débiteur ${account.code}`);
          }
          if (account.normal_balance === 'CREDIT' && line.debit_amount > 0 && line.credit_amount === 0) {
            suggestions.push(`Ligne ${lineNum}: Débit inhabituel sur compte créditeur ${account.code}`);
          }
          
          // Suggestion tiers
          if (account.is_reconcilable && account.code.startsWith('4') && !line.third_party) {
            suggestions.push(`Ligne ${lineNum}: Tiers recommandé pour compte ${account.code}`);
          }
        }
      }

      // Validation montants élevés
      const total_amount = line.debit_amount + line.credit_amount;
      if (total_amount > 10000000) {  // 10M XAF
        warnings.push(`Ligne ${lineNum}: Montant très élevé (${formatCurrency(total_amount)})`);
      }
    });

    // Validation équilibrage
    if (!totals.is_balanced) {
      errors.push(`Écriture déséquilibrée: différence de ${formatCurrency(totals.difference)}`);
    }

    // Validation TVA cohérente
    const tvaValidation = validateTVAConsistency(formData.lines);
    warnings.push(...tvaValidation.warnings);

    setValidation({
      is_valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    });
  };

  const validateTVAConsistency = (lines: EntryLineData[]) => {
    const warnings: string[] = [];
    
    // Calcul TVA collectée et déductible
    const tva_collectee = lines
      .filter(l => l.account_code.startsWith('443'))
      .reduce((sum, l) => sum + l.credit_amount, 0);
    
    const tva_deductible = lines
      .filter(l => l.account_code.startsWith('445'))
      .reduce((sum, l) => sum + l.debit_amount, 0);
    
    // Calcul base HT (comptes 6xx et 7xx hors TVA)
    const ht_amount = lines
      .filter(l => l.account_code.match(/^[67]/) && !l.account_code.startsWith('44'))
      .reduce((sum, l) => sum + l.debit_amount + l.credit_amount, 0);
    
    // Vérification taux TVA 19.25%
    if (tva_collectee > 0) {
      const base_calculee = tva_collectee / 0.1925;
      if (Math.abs(base_calculee - ht_amount) > 1) {
        warnings.push(`TVA collectée incohérente: base ${formatCurrency(ht_amount)} vs calculée ${formatCurrency(base_calculee)}`);
      }
    }
    
    if (tva_deductible > 0) {
      const base_calculee = tva_deductible / 0.1925;
      if (Math.abs(base_calculee - ht_amount) > 1) {
        warnings.push(`TVA déductible incohérente: base ${formatCurrency(ht_amount)} vs calculée ${formatCurrency(base_calculee)}`);
      }
    }

    return { warnings };
  };

  // Gestion des lignes
  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { 
        account_code: '', 
        account_name: '', 
        label: '', 
        debit_amount: 0, 
        credit_amount: 0 
      }]
    }));
  };

  const removeLine = (index: number) => {
    if (formData.lines.length > 1) {
      setFormData(prev => ({
        ...prev,
        lines: prev.lines.filter((_, i) => i !== index)
      }));
    }
  };

  const updateLine = (index: number, field: keyof EntryLineData, value: any) => {
    const updatedLines = [...formData.lines];
    updatedLines[index] = { ...updatedLines[index], [field]: value };
    
    // Auto-completion du libellé du compte
    if (field === 'account_code' && accounts?.results) {
      const account = accounts.results.find(acc => acc.code === value);
      if (account) {
        updatedLines[index].account_name = account.name;
        if (!updatedLines[index].label) {
          updatedLines[index].label = account.name;
        }
      }
    }

    // Reset du montant opposé
    if (field === 'debit_amount' && value > 0) {
      updatedLines[index].credit_amount = 0;
    }
    if (field === 'credit_amount' && value > 0) {
      updatedLines[index].debit_amount = 0;
    }
    
    setFormData(prev => ({ ...prev, lines: updatedLines }));
  };

  const updateHeader = (field: keyof Omit<EntryFormData, 'lines'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!validation.is_valid) {
      toast.error('Veuillez corriger les erreurs avant d\'enregistrer');
      return;
    }

    setIsSaving(true);
    try {
      await saveEntryMutation.mutateAsync(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const applyTemplate = (template: any) => {
    setFormData(prev => ({
      ...prev,
      description: template.description,
      lines: template.lines.map((line: any, index: number) => ({
        account_code: line.account_code,
        account_name: accounts?.results?.find(acc => acc.code === line.account_code)?.name || '',
        label: line.label,
        debit_amount: line.debit_amount || 0,
        credit_amount: line.credit_amount || 0,
      }))
    }));
    setShowTemplates(false);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Templates rapides */}
      {showTemplates && templates?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Modèles d'écritures</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>
                ×
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {templates.map((template, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-left justify-start h-auto p-3"
                  onClick={() => applyTemplate(template)}
                >
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-xs text-gray-500">{template.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* En-tête de l'écriture */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {mode === 'create' ? 'Nouvelle Écriture' : 'Modification Écriture'}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Modèles
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date *</label>
              <Input
                type="date"
                value={formData.entry_date}
                onChange={(e) => updateHeader('entry_date', e.target.value)}
                className={validation.errors.includes('Date obligatoire') ? 'border-red-500' : ''}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Journal *</label>
              <Select
                value={formData.journal_code}
                onValueChange={(value) => updateHeader('journal_code', value)}
              >
                <SelectTrigger className={validation.errors.includes('Journal obligatoire') ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Sélectionner un journal" />
                </SelectTrigger>
                <SelectContent>
                  {journals?.results?.map((journal) => (
                    <SelectItem key={journal.id} value={journal.code}>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {journal.code}
                        </Badge>
                        <span>{journal.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">N° Pièce</label>
              <Input
                placeholder="Auto-généré"
                value={formData.piece_number || ''}
                onChange={(e) => updateHeader('piece_number', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Référence</label>
              <Input
                placeholder="Optionnel"
                value={formData.reference || ''}
                onChange={(e) => updateHeader('reference', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Description *</label>
            <Textarea
              placeholder="Description de l'opération comptable"
              value={formData.description}
              onChange={(e) => updateHeader('description', e.target.value)}
              className={validation.errors.includes('Libellé obligatoire') ? 'border-red-500' : ''}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lignes d'écriture */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Lignes d'écriture</h3>
            <div className="flex items-center space-x-2">
              <Badge variant={totals.is_balanced ? 'default' : 'destructive'}>
                {totals.is_balanced ? 'Équilibrée' : 'Déséquilibrée'}
              </Badge>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-2" />
                Ligne
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left font-medium w-32">
                    Compte
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-medium">
                    Libellé Compte
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-medium">
                    Libellé Opération
                  </th>
                  <th className="border border-gray-200 p-3 text-right font-medium w-32">
                    Débit
                  </th>
                  <th className="border border-gray-200 p-3 text-right font-medium w-32">
                    Crédit
                  </th>
                  <th className="border border-gray-200 p-3 text-center font-medium w-16">
                    
                  </th>
                </tr>
              </thead>
              <tbody>
                {formData.lines.map((line, index) => {
                  const account = accounts?.results?.find(acc => acc.code === line.account_code);
                  const hasError = validation.errors.some(err => err.includes(`Ligne ${index + 1}`));
                  
                  return (
                    <tr key={index} className={hasError ? 'bg-red-50' : ''}>
                      <td className="border border-gray-200 p-2">
                        <Select
                          value={line.account_code}
                          onValueChange={(value) => updateLine(index, 'account_code', value)}
                        >
                          <SelectTrigger className={`w-full ${hasError ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Compte" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts?.results?.map((account) => (
                              <SelectItem key={account.id} value={account.code}>
                                <div className="flex items-center space-x-2 w-full">
                                  <code className="text-xs bg-gray-100 px-1 rounded">
                                    {account.code}
                                  </code>
                                  <span className="text-sm truncate flex-1">
                                    {account.name}
                                  </span>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      account.normal_balance === 'DEBIT' 
                                        ? 'text-green-600 border-green-300' 
                                        : 'text-blue-600 border-blue-300'
                                    }`}
                                  >
                                    {account.normal_balance}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border border-gray-200 p-2">
                        <Input
                          value={line.account_name}
                          placeholder="Libellé automatique"
                          readOnly
                          className="bg-gray-50 text-sm"
                        />
                      </td>
                      <td className="border border-gray-200 p-2">
                        <Input
                          value={line.label}
                          onChange={(e) => updateLine(index, 'label', e.target.value)}
                          placeholder="Libellé de l'opération"
                          className={hasError ? 'border-red-500' : ''}
                        />
                      </td>
                      <td className="border border-gray-200 p-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit_amount || ''}
                          onChange={(e) => updateLine(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="text-right font-mono"
                        />
                      </td>
                      <td className="border border-gray-200 p-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit_amount || ''}
                          onChange={(e) => updateLine(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="text-right font-mono"
                        />
                      </td>
                      <td className="border border-gray-200 p-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(index)}
                          disabled={formData.lines.length === 1}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan={3} className="border border-gray-200 p-3 text-right">
                    TOTAUX:
                  </td>
                  <td className="border border-gray-200 p-3 text-right text-green-700 font-mono">
                    {formatCurrency(totals.debit)}
                  </td>
                  <td className="border border-gray-200 p-3 text-right text-red-700 font-mono">
                    {formatCurrency(totals.credit)}
                  </td>
                  <td className="border border-gray-200 p-3 text-center">
                    {totals.is_balanced ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Validation Messages */}
      {(validation.errors.length > 0 || validation.warnings.length > 0 || validation.suggestions.length > 0) && (
        <div className="space-y-3">
          {/* Erreurs */}
          {validation.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Erreurs ({validation.errors.length})
                  </h3>
                  <ul className="mt-2 text-sm text-red-700 space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Avertissements */}
          {validation.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Avertissements ({validation.warnings.length})
                  </h3>
                  <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {validation.suggestions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <FileText className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Suggestions d'amélioration ({validation.suggestions.length})
                  </h3>
                  <ul className="mt-2 text-sm text-blue-700 space-y-1">
                    {validation.suggestions.map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Succès */}
          {validation.is_valid && formData.lines.length >= 2 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Écriture valide ✓
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    Montant: {formatCurrency(totals.debit)} - {formData.lines.length} ligne(s)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        
        <Button
          onClick={handleSave}
          disabled={!validation.is_valid || isSaving}
          className="bg-tuatara hover:bg-rolling-stone text-white"
        >
          {isSaving ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {mode === 'create' ? 'Créer' : 'Modifier'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default JournalEntryForm;