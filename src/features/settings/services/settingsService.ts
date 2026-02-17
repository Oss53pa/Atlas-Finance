import { AccountingSetting, SettingsGroup } from '../types/settings.types';

class SettingsService {
  async getSettings(): Promise<SettingsGroup> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      general: [
        {
          id: 'company_name',
          label: 'Nom de la société',
          description: 'Nom officiel de votre entreprise',
          value: 'Ma Société SARL',
          type: 'text',
          required: true,
          category: 'general'
        },
        {
          id: 'fiscal_year_start',
          label: 'Début exercice fiscal',
          description: 'Date de début de l\'exercice comptable',
          value: '2024-01-01',
          type: 'date',
          required: true,
          category: 'general'
        },
        {
          id: 'currency',
          label: 'Devise principale',
          description: 'Devise utilisée pour la comptabilité',
          value: 'XAF',
          type: 'select',
          options: [
            { value: 'XAF', label: 'Franc CFA (XAF)' },
            { value: 'XOF', label: 'Franc CFA (XOF)' },
            { value: 'EUR', label: 'Euro (EUR)' },
            { value: 'USD', label: 'Dollar US (USD)' }
          ],
          required: true,
          category: 'general'
        },
        {
          id: 'chart_of_accounts',
          label: 'Plan comptable',
          description: 'Référentiel comptable utilisé',
          value: 'SYSCOHADA',
          type: 'select',
          options: [
            { value: 'SYSCOHADA', label: 'SYSCOHADA' },
            { value: 'SYSCOHADA_REVISED', label: 'SYSCOHADA Révisé' },
            { value: 'CUSTOM', label: 'Personnalisé' }
          ],
          required: true,
          category: 'general'
        }
      ],
      fiscal: [
        {
          id: 'tva_regime',
          label: 'Régime TVA',
          description: 'Régime de TVA applicable',
          value: 'NORMAL',
          type: 'select',
          options: [
            { value: 'NORMAL', label: 'Régime Normal' },
            { value: 'SIMPLIFIE', label: 'Régime Simplifié' },
            { value: 'FRANCHISE', label: 'Franchise en base' }
          ],
          required: true,
          category: 'fiscal'
        },
        {
          id: 'tva_rate_standard',
          label: 'Taux TVA standard',
          description: 'Taux de TVA normal applicable',
          value: 19.25,
          type: 'number',
          min: 0,
          max: 100,
          required: true,
          category: 'fiscal'
        },
        {
          id: 'tva_rate_reduced',
          label: 'Taux TVA réduit',
          description: 'Taux de TVA réduit si applicable',
          value: 5.5,
          type: 'number',
          min: 0,
          max: 100,
          category: 'fiscal'
        }
      ],
      immobilisations: [
        {
          id: 'depreciation_method',
          label: 'Méthode d\'amortissement',
          description: 'Méthode par défaut pour les amortissements',
          value: 'LINEAR',
          type: 'select',
          options: [
            { value: 'LINEAR', label: 'Linéaire' },
            { value: 'DECLINING', label: 'Dégressif' },
            { value: 'UNITS', label: 'Unités de production' }
          ],
          required: true,
          category: 'immobilisations'
        },
        {
          id: 'asset_threshold',
          label: 'Seuil d\'immobilisation',
          description: 'Montant minimum pour immobiliser un bien',
          value: 500000,
          type: 'number',
          min: 0,
          required: true,
          category: 'immobilisations'
        }
      ],
      documents: [
        {
          id: 'invoice_prefix',
          label: 'Préfixe factures',
          description: 'Préfixe pour la numérotation des factures',
          value: 'FA',
          type: 'text',
          required: true,
          category: 'documents'
        },
        {
          id: 'auto_numbering',
          label: 'Numérotation automatique',
          description: 'Activer la numérotation automatique des documents',
          value: true,
          type: 'boolean',
          category: 'documents'
        }
      ],
      advanced: [
        {
          id: 'multi_currency',
          label: 'Multi-devises',
          description: 'Activer la gestion multi-devises',
          value: false,
          type: 'boolean',
          category: 'advanced'
        },
        {
          id: 'analytic_accounting',
          label: 'Comptabilité analytique',
          description: 'Activer la comptabilité analytique',
          value: true,
          type: 'boolean',
          category: 'advanced'
        }
      ]
    };
  }

  async updateSetting(id: string, value: any): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  async saveAllSettings(settings: SettingsGroup): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  validateSetting(setting: AccountingSetting, value: any): string | null {
    if (setting.required && !value) {
      return 'Ce champ est obligatoire';
    }

    if (setting.type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return 'Valeur numérique invalide';
      }
      if (setting.min !== undefined && numValue < setting.min) {
        return `La valeur doit être supérieure ou égale à ${setting.min}`;
      }
      if (setting.max !== undefined && numValue > setting.max) {
        return `La valeur doit être inférieure ou égale à ${setting.max}`;
      }
    }

    return null;
  }
}

export const settingsService = new SettingsService();