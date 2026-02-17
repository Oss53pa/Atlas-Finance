import { useState, useEffect } from 'react';
import { AccountingSetting, SettingsGroup, ValidationError } from '../types/settings.types';
import { settingsService } from '../services/settingsService';

export const useSettings = () => {
  const [settings, setSettings] = useState<SettingsGroup>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await settingsService.getSettings();
        setSettings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement paramètres');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const updateSetting = (category: string, id: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: prev[category].map(setting =>
        setting.id === id ? { ...setting, value } : setting
      )
    }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      await settingsService.saveAllSettings(settings);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur sauvegarde paramètres');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    loading,
    error,
    hasChanges,
    updateSetting,
    saveSettings
  };
};

export const useSettingValidation = () => {
  const [validationErrors, setValidationErrors] = useState<ValidationError>({});

  const validateSetting = (setting: AccountingSetting, value: any): boolean => {
    const error = settingsService.validateSetting(setting, value);

    if (error) {
      setValidationErrors(prev => ({ ...prev, [setting.id]: error }));
      return false;
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[setting.id];
        return newErrors;
      });
      return true;
    }
  };

  const validateAllSettings = (settings: SettingsGroup): boolean => {
    let allValid = true;
    const errors: ValidationError = {};

    Object.values(settings).flat().forEach(setting => {
      const error = settingsService.validateSetting(setting, setting.value);
      if (error) {
        errors[setting.id] = error;
        allValid = false;
      }
    });

    setValidationErrors(errors);
    return allValid;
  };

  return {
    validationErrors,
    validateSetting,
    validateAllSettings,
    clearErrors: () => setValidationErrors({})
  };
};