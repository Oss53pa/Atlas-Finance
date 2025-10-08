import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ArrowLeft, Save, RefreshCw, Calculator, FileText, DollarSign, Archive, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { useSettings, useSettingValidation } from '../hooks/useSettings';
import { SettingsSection } from '../components/SettingsSection';

const AccountingSettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { settings, loading, error, hasChanges, updateSetting, saveSettings } = useSettings();
  const { validationErrors, validateAllSettings } = useSettingValidation();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['general', 'fiscal', 'immobilisations', 'documents', 'advanced'])
  );
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!validateAllSettings(settings)) {
      setNotification({
        type: 'error',
        message: 'Veuillez corriger les erreurs avant de sauvegarder'
      });
      return;
    }

    try {
      await saveSettings();
      setNotification({
        type: 'success',
        message: 'Paramètres sauvegardés avec succès'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Erreur lors de la sauvegarde'
      });
    }
  };

  const sections = [
    {
      key: 'general',
      title: 'Paramètres Généraux',
      icon: SettingsIcon
    },
    {
      key: 'fiscal',
      title: 'Paramètres Fiscaux',
      icon: Calculator
    },
    {
      key: 'immobilisations',
      title: t('navigation.assets'),
      icon: Archive
    },
    {
      key: 'documents',
      title: 'Documents',
      icon: FileText
    },
    {
      key: 'advanced',
      title: 'Avancés',
      icon: DollarSign
    }
  ];

  if (loading && Object.keys(settings).length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-[#767676]">Chargement des paramètres...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={ArrowLeft}
            onClick={() => navigate(-1)}
          />
          <div>
            <h1 className="text-3xl font-bold text-[#191919]">Paramètres Comptables</h1>
            <p className="text-[#767676] mt-1">
              Configuration de votre système comptable
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-orange-600 mr-2">
              Modifications non sauvegardées
            </span>
          )}
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={() => window.location.reload()}
          >
            Réinitialiser
          </Button>
          <Button
            icon={Save}
            onClick={handleSave}
            disabled={!hasChanges || loading}
          >
            Sauvegarder
          </Button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-lg ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {notification.message}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section) => (
          <SettingsSection
            key={section.key}
            title={section.title}
            icon={section.icon}
            settings={settings[section.key] || []}
            expanded={expandedSections.has(section.key)}
            onToggle={() => toggleSection(section.key)}
            onUpdate={(id, value) => updateSetting(section.key, id, value)}
            errors={validationErrors}
          />
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <SettingsIcon className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">
              Information importante
            </h4>
            <p className="text-sm text-blue-800">
              Les modifications apportées aux paramètres comptables peuvent avoir un impact
              significatif sur vos opérations. Assurez-vous de bien comprendre chaque
              paramètre avant de le modifier.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingSettingsPage;