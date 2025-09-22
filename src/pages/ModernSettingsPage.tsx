import React, { useState } from 'react';
import {
  Settings, Palette, User, Shield, Bell, Globe, Database,
  CreditCard, Mail, Key, Building2, Moon, Sun, Check,
  Save, ChevronRight, Lock, Smartphone, Monitor, HelpCircle,
  FileText, Download, Upload, AlertTriangle, Calculator,
  BookOpen, Calendar, DollarSign, FileCheck
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
  const [country, setCountry] = useState('FR');
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
              </div>
            </div>

            {/* Typography Options */}
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Typographie
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Police d'affichage</label>
                  <select className="input">
                    <option value="inter">Inter (Recommandée)</option>
                    <option value="system">System UI</option>
                    <option value="arial">Arial</option>
                    <option value="helvetica">Helvetica</option>
                    <option value="roboto">Roboto</option>
                    <option value="open-sans">Open Sans</option>
                  </select>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Police utilisée pour l'interface utilisateur
                  </p>
                </div>
                <div>
                  <label className="label">Taille de police</label>
                  <select className="input">
                    <option value="small">Petite (13px)</option>
                    <option value="normal" selected>Normale (14px)</option>
                    <option value="large">Grande (16px)</option>
                    <option value="extra-large">Très grande (18px)</option>
                  </select>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Ajustez la taille de police selon votre préférence
                  </p>
                </div>
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Pays/Région</label>
                <select
                  className="input"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <optgroup label="Afrique du Nord">
                    <option value="DZ">Algérie</option>
                    <option value="EG">Égypte</option>
                    <option value="LY">Libye</option>
                    <option value="MA">Maroc</option>
                    <option value="SD">Soudan</option>
                    <option value="TN">Tunisie</option>
                  </optgroup>
                  <optgroup label="Afrique de l'Ouest">
                    <option value="BJ">Bénin</option>
                    <option value="BF">Burkina Faso</option>
                    <option value="CV">Cap-Vert</option>
                    <option value="CI">Côte d'Ivoire</option>
                    <option value="GM">Gambie</option>
                    <option value="GH">Ghana</option>
                    <option value="GN">Guinée</option>
                    <option value="GW">Guinée-Bissau</option>
                    <option value="LR">Liberia</option>
                    <option value="ML">Mali</option>
                    <option value="MR">Mauritanie</option>
                    <option value="NE">Niger</option>
                    <option value="NG">Nigeria</option>
                    <option value="SN">Sénégal</option>
                    <option value="SL">Sierra Leone</option>
                    <option value="TG">Togo</option>
                  </optgroup>
                  <optgroup label="Afrique Centrale">
                    <option value="AO">Angola</option>
                    <option value="CM">Cameroun</option>
                    <option value="CF">République centrafricaine</option>
                    <option value="TD">Tchad</option>
                    <option value="CG">Congo</option>
                    <option value="CD">République démocratique du Congo</option>
                    <option value="GQ">Guinée équatoriale</option>
                    <option value="GA">Gabon</option>
                    <option value="ST">São Tomé-et-Principe</option>
                  </optgroup>
                  <optgroup label="Afrique de l'Est">
                    <option value="BI">Burundi</option>
                    <option value="KM">Comores</option>
                    <option value="DJ">Djibouti</option>
                    <option value="ER">Érythrée</option>
                    <option value="ET">Éthiopie</option>
                    <option value="KE">Kenya</option>
                    <option value="MG">Madagascar</option>
                    <option value="MW">Malawi</option>
                    <option value="MU">Maurice</option>
                    <option value="MZ">Mozambique</option>
                    <option value="RW">Rwanda</option>
                    <option value="SC">Seychelles</option>
                    <option value="SO">Somalie</option>
                    <option value="SS">Soudan du Sud</option>
                    <option value="TZ">Tanzanie</option>
                    <option value="UG">Ouganda</option>
                    <option value="ZM">Zambie</option>
                    <option value="ZW">Zimbabwe</option>
                  </optgroup>
                  <optgroup label="Afrique Australe">
                    <option value="BW">Botswana</option>
                    <option value="LS">Lesotho</option>
                    <option value="NA">Namibie</option>
                    <option value="ZA">Afrique du Sud</option>
                    <option value="SZ">Eswatini</option>
                  </optgroup>
                  <optgroup label="Europe & Autres">
                    <option value="FR">France</option>
                    <option value="BE">Belgique</option>
                    <option value="CH">Suisse</option>
                    <option value="LU">Luxembourg</option>
                    <option value="CA">Canada</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="label">Devise</label>
                <select
                  className="input"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <optgroup label="Devises Africaines">
                    <option value="XOF">Franc CFA BCEAO (XOF) - Afrique de l'Ouest</option>
                    <option value="XAF">Franc CFA BEAC (XAF) - Afrique Centrale</option>
                    <option value="DZD">Dinar algérien (DZD)</option>
                    <option value="AOA">Kwanza angolais (AOA)</option>
                    <option value="BWP">Pula botswanais (BWP)</option>
                    <option value="BIF">Franc burundais (BIF)</option>
                    <option value="CVE">Escudo cap-verdien (CVE)</option>
                    <option value="KMF">Franc comorien (KMF)</option>
                    <option value="CDF">Franc congolais (CDF)</option>
                    <option value="DJF">Franc djiboutien (DJF)</option>
                    <option value="EGP">Livre égyptienne (EGP)</option>
                    <option value="ERN">Nakfa érythréen (ERN)</option>
                    <option value="SZL">Lilangeni eswatinien (SZL)</option>
                    <option value="ETB">Birr éthiopien (ETB)</option>
                    <option value="GMD">Dalasi gambien (GMD)</option>
                    <option value="GHS">Cedi ghanéen (GHS)</option>
                    <option value="GNF">Franc guinéen (GNF)</option>
                    <option value="KES">Shilling kényan (KES)</option>
                    <option value="LSL">Loti lesothien (LSL)</option>
                    <option value="LRD">Dollar libérien (LRD)</option>
                    <option value="LYD">Dinar libyen (LYD)</option>
                    <option value="MGA">Ariary malgache (MGA)</option>
                    <option value="MWK">Kwacha malawien (MWK)</option>
                    <option value="MRU">Ouguiya mauritanien (MRU)</option>
                    <option value="MUR">Roupie mauricienne (MUR)</option>
                    <option value="MAD">Dirham marocain (MAD)</option>
                    <option value="MZN">Metical mozambicain (MZN)</option>
                    <option value="NAD">Dollar namibien (NAD)</option>
                    <option value="NGN">Naira nigérian (NGN)</option>
                    <option value="RWF">Franc rwandais (RWF)</option>
                    <option value="STN">Dobra santoméen (STN)</option>
                    <option value="SCR">Roupie seychelloise (SCR)</option>
                    <option value="SLL">Leone sierra-léonais (SLL)</option>
                    <option value="SOS">Shilling somalien (SOS)</option>
                    <option value="ZAR">Rand sud-africain (ZAR)</option>
                    <option value="SSP">Livre sud-soudanaise (SSP)</option>
                    <option value="SDG">Livre soudanaise (SDG)</option>
                    <option value="TZS">Shilling tanzanien (TZS)</option>
                    <option value="TND">Dinar tunisien (TND)</option>
                    <option value="UGX">Shilling ougandais (UGX)</option>
                    <option value="ZMW">Kwacha zambien (ZMW)</option>
                    <option value="ZWL">Dollar zimbabwéen (ZWL)</option>
                  </optgroup>
                  <optgroup label="Devises Internationales">
                    <option value="EUR">Euro (€)</option>
                    <option value="USD">Dollar US ($)</option>
                    <option value="GBP">Livre Sterling (£)</option>
                    <option value="CHF">Franc Suisse (CHF)</option>
                    <option value="CAD">Dollar Canadien (CAD)</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="label">Langue</label>
                <select
                  className="input"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <optgroup label="Langues officielles africaines">
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="ar">العربية (Arabe)</option>
                    <option value="pt">Português</option>
                    <option value="es">Español</option>
                    <option value="sw">Kiswahili</option>
                    <option value="am">አማርኛ (Amharique)</option>
                    <option value="zu">isiZulu</option>
                    <option value="af">Afrikaans</option>
                    <option value="ha">Hausa</option>
                    <option value="yo">Yoruba</option>
                    <option value="ig">Igbo</option>
                    <option value="wo">Wolof</option>
                  </optgroup>
                  <optgroup label="Autres langues">
                    <option value="de">Deutsch</option>
                    <option value="it">Italiano</option>
                    <option value="nl">Nederlands</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="label">Fuseau horaire</label>
                <select
                  className="input"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <optgroup label="Fuseaux horaires africains">
                    <option value="Africa/Casablanca">Casablanca (UTC+1) - Maroc</option>
                    <option value="Africa/Tunis">Tunis (UTC+1) - Tunisie</option>
                    <option value="Africa/Algiers">Alger (UTC+1) - Algérie</option>
                    <option value="Africa/Cairo">Le Caire (UTC+2) - Égypte</option>
                    <option value="Africa/Johannesburg">Johannesburg (UTC+2) - Afrique du Sud</option>
                    <option value="Africa/Lagos">Lagos (UTC+1) - Nigeria</option>
                    <option value="Africa/Kinshasa">Kinshasa (UTC+1) - RD Congo</option>
                    <option value="Africa/Nairobi">Nairobi (UTC+3) - Kenya</option>
                    <option value="Africa/Addis_Ababa">Addis-Abeba (UTC+3) - Éthiopie</option>
                    <option value="Africa/Dakar">Dakar (UTC+0) - Sénégal</option>
                    <option value="Africa/Abidjan">Abidjan (UTC+0) - Côte d'Ivoire</option>
                    <option value="Africa/Accra">Accra (UTC+0) - Ghana</option>
                    <option value="Africa/Bamako">Bamako (UTC+0) - Mali</option>
                    <option value="Africa/Ouagadougou">Ouagadougou (UTC+0) - Burkina Faso</option>
                    <option value="Africa/Douala">Douala (UTC+1) - Cameroun</option>
                    <option value="Africa/Libreville">Libreville (UTC+1) - Gabon</option>
                    <option value="Africa/Luanda">Luanda (UTC+1) - Angola</option>
                    <option value="Africa/Maputo">Maputo (UTC+2) - Mozambique</option>
                    <option value="Africa/Harare">Harare (UTC+2) - Zimbabwe</option>
                    <option value="Africa/Lusaka">Lusaka (UTC+2) - Zambie</option>
                    <option value="Africa/Gaborone">Gaborone (UTC+2) - Botswana</option>
                    <option value="Africa/Windhoek">Windhoek (UTC+2) - Namibie</option>
                    <option value="Indian/Mauritius">Port-Louis (UTC+4) - Maurice</option>
                    <option value="Indian/Antananarivo">Antananarivo (UTC+3) - Madagascar</option>
                  </optgroup>
                  <optgroup label="Autres fuseaux">
                    <option value="Europe/Paris">Paris (UTC+1)</option>
                    <option value="Europe/London">Londres (UTC+0)</option>
                    <option value="America/New_York">New York (UTC-5)</option>
                    <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="label">Format de date</label>
                <select className="input">
                  <option value="DD/MM/YYYY">JJ/MM/AAAA (France, Afrique francophone)</option>
                  <option value="MM/DD/YYYY">MM/JJ/AAAA (États-Unis)</option>
                  <option value="YYYY-MM-DD">AAAA-MM-JJ (ISO 8601)</option>
                  <option value="DD-MM-YYYY">JJ-MM-AAAA</option>
                  <option value="DD.MM.YYYY">JJ.MM.AAAA (Allemagne)</option>
                </select>
              </div>
              <div>
                <label className="label">Format des nombres</label>
                <select className="input">
                  <option value="FR">1 234,56 (France, Afrique francophone)</option>
                  <option value="US">1,234.56 (États-Unis, Afrique anglophone)</option>
                  <option value="DE">1.234,56 (Allemagne)</option>
                  <option value="CH">1'234,56 (Suisse)</option>
                </select>
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
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Paramètres
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Gérez vos préférences et configurations
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-[var(--color-border)]">
        <div className="flex flex-wrap gap-1">
          {settingSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 rounded-t-lg border-b-2 transition-all duration-200',
                'hover:bg-[var(--color-surface-hover)]',
                activeSection === section.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <div className={cn(
                'transition-colors',
                activeSection === section.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)]'
              )}>
                {section.icon}
              </div>
              <span className="text-sm font-medium whitespace-nowrap">
                {section.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <ModernCard>
        <CardBody>
          {renderSectionContent()}
        </CardBody>
      </ModernCard>
    </div>
  );
};

export default ModernSettingsPage;