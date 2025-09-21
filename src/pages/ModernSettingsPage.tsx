import React, { useState } from 'react';
import { 
  Settings, Palette, User, Shield, Bell, Globe, Database,
  CreditCard, Mail, Key, Building2, Moon, Sun, Check,
  Save, ChevronRight, Lock, Smartphone, Monitor, HelpCircle,
  FileText, Download, Upload, AlertTriangle
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../components/ui/ModernCard';
import ModernButton from '../components/ui/ModernButton';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ModernSettingsPage: React.FC = () => {
  const { theme, themeType, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('appearance');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    recouvrementReminders: true,
    paymentAlerts: true,
    systemUpdates: false
  });
  const [language, setLanguage] = useState('fr');
  const [currency, setCurrency] = useState('EUR');
  const [timezone, setTimezone] = useState('Europe/Paris');
  const [twoFactor, setTwoFactor] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const settingSections: SettingSection[] = [
    {
      id: 'appearance',
      title: 'Apparence',
      description: 'Personnalisez l\'interface',
      icon: <Palette className="w-5 h-5" />
    },
    {
      id: 'account',
      title: 'Compte',
      description: 'Informations personnelles',
      icon: <User className="w-5 h-5" />
    },
    {
      id: 'company',
      title: 'Entreprise',
      description: 'Paramètres société',
      icon: <Building2 className="w-5 h-5" />
    },
    {
      id: 'security',
      title: 'Sécurité',
      description: 'Protection du compte',
      icon: <Shield className="w-5 h-5" />
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Alertes et rappels',
      icon: <Bell className="w-5 h-5" />
    },
    {
      id: 'regional',
      title: 'Régional',
      description: 'Langue et région',
      icon: <Globe className="w-5 h-5" />
    },
    {
      id: 'recouvrement',
      title: 'Recouvrement',
      description: 'Abonnement et paiements',
      icon: <CreditCard className="w-5 h-5" />
    },
    {
      id: 'data',
      title: 'Données',
      description: 'Import/Export et sauvegardes',
      icon: <Database className="w-5 h-5" />
    }
  ];

  const themes = [
    {
      id: 'elegant',
      name: 'Élégance Sobre',
      description: 'Finance traditionnelle moderne',
      colors: ['#2E7D69', '#D4AF37', '#1E1E2F', '#F5F5F7'],
      preview: 'bg-gradient-to-br from-[#2E7D69] to-[#D4AF37]'
    },
    {
      id: 'fintech',
      name: 'Modern Fintech',
      description: 'Tableau de bord financier moderne',
      colors: ['#27AE60', '#2C3E50', '#FAFAFA', '#C0392B'],
      preview: 'bg-gradient-to-br from-[#27AE60] to-[#2C3E50]'
    },
    {
      id: 'minimalist',
      name: 'Minimaliste Premium',
      description: 'Élégance minimaliste avec touche premium',
      colors: ['#6A8A82', '#B87333', '#191919', '#ECECEC'],
      preview: 'bg-gradient-to-br from-[#6A8A82] to-[#B87333]'
    },
    {
      id: 'neutralOdyssey',
      name: 'Neutral Odyssey',
      description: 'Palette haut de gamme pour immobilier',
      colors: ['#373B4D', '#BDBFB7', '#949597', '#ECEDEF'],
      preview: 'bg-gradient-to-br from-[#373B4D] to-[#BDBFB7]'
    }
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'appearance':
        return (
          <div className="space-y-6">
            {/* Theme Selection */}
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Thème de l'application
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {themes.map((themeOption) => (
                  <button
                    key={themeOption.id}
                    onClick={() => setTheme(themeOption.id as any)}
                    className={cn(
                      'relative p-4 rounded-xl border-2 transition-all duration-200',
                      themeType === themeOption.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-hover)]'
                    )}
                  >
                    {themeType === themeOption.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`w-full h-24 rounded-lg mb-3 ${themeOption.preview}`}></div>
                    <div className="text-left">
                      <h4 className="font-semibold text-[var(--color-text-primary)]">
                        {themeOption.name}
                      </h4>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        {themeOption.description}
                      </p>
                      <div className="flex gap-1 mt-2">
                        {themeOption.colors.map((color, index) => (
                          <div
                            key={index}
                            className="w-6 h-6 rounded-full border border-gray-200"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Display Options */}
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Options d'affichage
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 hover:bg-[var(--color-surface-hover)] rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Moon className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">Mode sombre</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Activer le thème sombre (bientôt disponible)
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                    disabled
                    className="w-5 h-5 text-[var(--color-primary)] rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-3 hover:bg-[var(--color-surface-hover)] rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">Sidebar compacte</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Réduire la largeur de la barre latérale
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-[var(--color-primary)] rounded"
                  />
                </label>
              </div>
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Informations personnelles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Prénom</label>
                <input type="text" className="input" defaultValue="Admin" />
              </div>
              <div>
                <label className="label">Nom</label>
                <input type="text" className="input" defaultValue="User" />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" defaultValue="admin@wisebook.com" />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input type="tel" className="input" defaultValue="+33 6 12 34 56 78" />
              </div>
              <div>
                <label className="label">Fonction</label>
                <input type="text" className="input" defaultValue="Directeur Financier" />
              </div>
              <div>
                <label className="label">Département</label>
                <select className="input">
                  <option>Finance</option>
                  <option>Comptabilité</option>
                  <option>Direction</option>
                  <option>Commercial</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <ModernButton variant="primary" leftIcon={<Save className="w-4 h-4" />}>
                Enregistrer les modifications
              </ModernButton>
            </div>
          </div>
        );

      case 'company':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Informations de l'entreprise
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Raison sociale</label>
                <input type="text" className="input" defaultValue="WiseBook SAS" />
              </div>
              <div>
                <label className="label">SIRET</label>
                <input type="text" className="input" defaultValue="123 456 789 00012" />
              </div>
              <div>
                <label className="label">TVA Intracommunautaire</label>
                <input type="text" className="input" defaultValue="FR12345678901" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Adresse</label>
                <input type="text" className="input" defaultValue="123 Rue de la République" />
              </div>
              <div>
                <label className="label">Code postal</label>
                <input type="text" className="input" defaultValue="75001" />
              </div>
              <div>
                <label className="label">Ville</label>
                <input type="text" className="input" defaultValue="Paris" />
              </div>
              <div>
                <label className="label">Pays</label>
                <select className="input">
                  <option>France</option>
                  <option>Belgique</option>
                  <option>Suisse</option>
                  <option>Luxembourg</option>
                </select>
              </div>
              <div>
                <label className="label">Secteur d'activité</label>
                <select className="input">
                  <option>Services</option>
                  <option>Commerce</option>
                  <option>Industrie</option>
                  <option>BTP</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <ModernButton variant="primary" leftIcon={<Save className="w-4 h-4" />}>
                Enregistrer les modifications
              </ModernButton>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Paramètres de sécurité
            </h3>
            <div className="space-y-4">
              <ModernCard>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">Mot de passe</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Dernière modification il y a 45 jours
                      </p>
                    </div>
                  </div>
                  <ModernButton variant="outline" size="sm">
                    Modifier
                  </ModernButton>
                </div>
              </ModernCard>

              <ModernCard>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        Authentification à deux facteurs
                      </p>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Sécurisez votre compte avec 2FA
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={twoFactor}
                      onChange={(e) => setTwoFactor(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>
              </ModernCard>

              <ModernCard>
                <div className="p-4">
                  <h4 className="font-medium text-[var(--color-text-primary)] mb-3">
                    Sessions actives
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <Monitor className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                        <div>
                          <p className="text-sm font-medium">Windows • Chrome</p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">
                            Paris, France • Actif maintenant
                          </p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        Actuel
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                        <div>
                          <p className="text-sm font-medium">iPhone • Safari</p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">
                            Lyon, France • Il y a 2 heures
                          </p>
                        </div>
                      </div>
                      <button className="text-sm text-[var(--color-error)] hover:underline">
                        Déconnecter
                      </button>
                    </div>
                  </div>
                </div>
              </ModernCard>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Préférences de notification
            </h3>
            <div className="space-y-4">
              {Object.entries({
                email: { label: 'Notifications par email', icon: Mail },
                push: { label: 'Notifications push', icon: Bell },
                sms: { label: 'Notifications SMS', icon: Smartphone },
                recouvrementReminders: { label: 'Rappels de recouvrement', icon: FileText },
                paymentAlerts: { label: 'Alertes de paiement', icon: CreditCard },
                systemUpdates: { label: 'Mises à jour système', icon: AlertTriangle }
              }).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <label
                    key={key}
                    className="flex items-center justify-between p-4 bg-white border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {config.label}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications[key as keyof typeof notifications]}
                      onChange={(e) => setNotifications({
                        ...notifications,
                        [key]: e.target.checked
                      })}
                      className="w-5 h-5 text-[var(--color-primary)] rounded"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        );

      case 'regional':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Paramètres régionaux
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Langue</label>
                <select
                  className="input"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              <div>
                <label className="label">Devise</label>
                <select
                  className="input"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="EUR">Euro (€)</option>
                  <option value="USD">Dollar US ($)</option>
                  <option value="GBP">Livre Sterling (£)</option>
                  <option value="CHF">Franc Suisse (CHF)</option>
                </select>
              </div>
              <div>
                <label className="label">Fuseau horaire</label>
                <select
                  className="input"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="Europe/Paris">Paris (UTC+1)</option>
                  <option value="Europe/London">Londres (UTC+0)</option>
                  <option value="America/New_York">New York (UTC-5)</option>
                  <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
                </select>
              </div>
              <div>
                <label className="label">Format de date</label>
                <select className="input">
                  <option>JJ/MM/AAAA</option>
                  <option>MM/JJ/AAAA</option>
                  <option>AAAA-MM-JJ</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Gestion des données
            </h3>
            <div className="space-y-4">
              <ModernCard>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)]">
                        Sauvegarde automatique
                      </h4>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Sauvegarde quotidienne de vos données
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoBackup}
                        onChange={(e) => setAutoBackup(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                    </label>
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    Dernière sauvegarde : Aujourd'hui à 03:00
                  </p>
                </div>
              </ModernCard>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ModernCard className="p-4">
                  <Download className="w-8 h-8 text-[var(--color-primary)] mb-3" />
                  <h4 className="font-medium text-[var(--color-text-primary)] mb-2">
                    Exporter les données
                  </h4>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                    Téléchargez une copie de toutes vos données
                  </p>
                  <ModernButton variant="outline" size="sm" fullWidth>
                    Exporter
                  </ModernButton>
                </ModernCard>

                <ModernCard className="p-4">
                  <Upload className="w-8 h-8 text-[var(--color-primary)] mb-3" />
                  <h4 className="font-medium text-[var(--color-text-primary)] mb-2">
                    Importer des données
                  </h4>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                    Importez des données depuis un fichier
                  </p>
                  <ModernButton variant="outline" size="sm" fullWidth>
                    Importer
                  </ModernButton>
                </ModernCard>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <HelpCircle className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-4" />
            <p className="text-[var(--color-text-secondary)]">
              Section en cours de développement
            </p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Paramètres
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Gérez vos préférences et configurations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <ModernCard>
            <CardBody className="p-2">
              {settingSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'hover:bg-[var(--color-surface-hover)]',
                    activeSection === section.id && 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                  )}
                >
                  <div className={cn(
                    'transition-colors',
                    activeSection === section.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)]'
                  )}>
                    {section.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">
                      {section.title}
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                </button>
              ))}
            </CardBody>
          </ModernCard>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <ModernCard>
            <CardBody>
              {renderSectionContent()}
            </CardBody>
          </ModernCard>
        </div>
      </div>
    </div>
  );
};

export default ModernSettingsPage;