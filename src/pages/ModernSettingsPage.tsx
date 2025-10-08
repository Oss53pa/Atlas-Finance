import React, { useState } from 'react';
import {
  Settings, Palette, User, Shield, Bell, Globe, Database,
  CreditCard, Mail, Key, Building2, Moon, Sun, Check,
  Save, ChevronRight, Lock, Smartphone, Monitor, HelpCircle,
  FileText, Download, Upload, AlertTriangle, Calculator,
  BookOpen, Calendar, DollarSign, FileCheck, X, Eye, History, FileDown
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../components/ui/ModernCard';
import ModernButton from '../components/ui/ModernButton';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import pdfGeneratorService from '../services/pdf-generator.service';
import toast from 'react-hot-toast';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ModernSettingsPage: React.FC = () => {
  const { theme, themeType, setTheme } = useTheme();
  const { isAdmin, user } = useAuth();
  const { t } = useLanguage();
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateContent, setTemplateContent] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateNotificationType, setTemplateNotificationType] = useState('');

  const emailTemplates = [
    {
      id: 'invoice',
      name: 'Facture',
      description: 'Email envoyé lors de l\'émission d\'une facture',
      icon: FileText,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      status: 'Actif',
      lastModified: 'Modifié il y a 2j',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2E7D69; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .button { display: inline-block; padding: 12px 30px; background: #2E7D69; color: white; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{company_name}}</h1>
    </div>
    <div class="content">
      <h2>Nouvelle Facture #{{invoice_number}}</h2>
      <p>Bonjour {{client_name}},</p>
      <p>Veuillez trouver ci-joint votre facture d'un montant de <strong>{{amount}}</strong>.</p>
      <p>Date d'échéance : <strong>{{due_date}}</strong></p>
      <p><a href="{{payment_link}}" class="button">Payer maintenant</a></p>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'payment-reminder',
      name: 'Rappel de Paiement',
      description: 'Email de relance pour paiement en retard',
      icon: Bell,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      status: 'Actif',
      lastModified: 'Modifié il y a 5j',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #F97316; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #FFF7ED; }
    .alert { background: #FEE2E2; padding: 15px; border-left: 4px solid #DC2626; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rappel de Paiement</h1>
    </div>
    <div class="content">
      <p>Bonjour {{client_name}},</p>
      <div class="alert">
        <strong>⚠️ Facture en retard</strong><br>
        Facture #{{invoice_number}} - Montant : {{amount}}
      </div>
      <p>Nous vous rappelons que le paiement était attendu le {{due_date}}.</p>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'order-confirmation',
      name: 'Confirmation de Commande',
      description: 'Email envoyé après validation d\'une commande',
      icon: Check,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      status: 'Actif',
      lastModified: 'Jamais modifié',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10B981; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Commande Confirmée</h1>
    </div>
    <div class="content">
      <p>Bonjour {{client_name}},</p>
      <p>Votre commande #{{order_number}} a été confirmée avec succès.</p>
      <p>Montant total : <strong>{{amount}}</strong></p>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'client-followup',
      name: 'Relance Client',
      description: 'Email de relance pour factures impayées',
      icon: AlertTriangle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      status: 'Actif',
      lastModified: 'Modifié il y a 1 sem',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Relance Urgente</h1>
    </div>
    <div class="content">
      <p>Bonjour {{client_name}},</p>
      <p>Malgré nos précédents rappels, nous constatons que la facture #{{invoice_number}} reste impayée.</p>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'welcome',
      name: 'Bienvenue Nouveau Client',
      description: 'Email de bienvenue pour les nouveaux clients',
      icon: User,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      status: 'Actif',
      lastModified: 'Jamais modifié',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #9333EA; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bienvenue chez {{company_name}} !</h1>
    </div>
    <div class="content">
      <p>Bonjour {{client_name}},</p>
      <p>Nous sommes ravis de vous compter parmi nos clients.</p>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'payment-receipt',
      name: 'Réçu de Paiement',
      description: 'Email de confirmation après réception d\'un paiement',
      icon: CreditCard,
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      status: 'Actif',
      lastModified: 'Modifié il y a 3j',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #14B8A6; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Paiement Reçu</h1>
    </div>
    <div class="content">
      <p>Bonjour {{client_name}},</p>
      <p>Nous confirmons la réception de votre paiement de <strong>{{amount}}</strong>.</p>
    </div>
  </div>
</body>
</html>`
    }
  ];

  const handleOpenTemplate = (template: any) => {
    setSelectedTemplate(template);
    setTemplateContent(template.htmlContent);
    setTemplateName(template.name);
    setTemplateNotificationType(template.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTemplate(null);
  };

  const handleSaveTemplate = () => {
    console.log('Saving template:', {
      name: templateName,
      type: templateNotificationType,
      content: templateContent
    });
    // Ici vous pouvez ajouter la logique pour sauvegarder dans la base de données
    setIsModalOpen(false);
  };

  const handleCreateNewTemplate = () => {
    const newTemplate = {
      id: 'custom-' + Date.now(),
      name: 'Nouveau Modèle',
      description: 'Modèle personnalisé',
      icon: Mail,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      status: t('status.draft'),
      lastModified: t('actions.new'),
      htmlContent: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2E7D69; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{company_name}}</h1>
    </div>
    <div class="content">
      <p>Bonjour {{client_name}},</p>
      <p>Votre message personnalisé ici...</p>
    </div>
  </div>
</body>
</html>`
    };
    handleOpenTemplate(newTemplate);
  };

  const extractTextFromHTML = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    let text = tempDiv.textContent || tempDiv.innerText || '';

    // Remplacer les variables par des vraies valeurs d'exemple
    text = text.replace(/\{\{company_name\}\}/g, 'WiseBook Entreprise');
    text = text.replace(/\{\{client_name\}\}/g, 'Jean Dupont');
    text = text.replace(/\{\{invoice_number\}\}/g, 'INV-2025-001');
    text = text.replace(/\{\{order_number\}\}/g, 'CMD-2025-001');
    text = text.replace(/\{\{amount\}\}/g, '1 500,00 €');
    text = text.replace(/\{\{due_date\}\}/g, '15/02/2025');
    text = text.replace(/\{\{payment_link\}\}/g, 'https://wisebook.com/paiement/inv-2025-001');

    return text.trim().split('\n').map(line => line.trim()).filter(line => line).join('\n\n');
  };

  const handleGeneratePDF = async () => {
    try {
      toast.loading('Génération du PDF en cours...');

      // Variables d'exemple pour la prévisualisation
      const variables = {
        company_name: 'WiseBook Entreprise',
        client_name: 'Jean Dupont',
        client_address: '123 Rue de la République',
        client_city: '75001 Paris, France',
        invoice_number: 'INV-2025-001',
        order_number: 'CMD-2025-001',
        amount: '1 500,00 €',
        due_date: '15/02/2025',
        payment_link: 'https://wisebook.com/paiement/inv-2025-001',
        notification_title: templateName || selectedTemplate?.name || 'Notification',
        reference: 'INV-2025-001'
      };

      // Informations de l'entreprise
      const companyInfo = {
        name: 'WiseBook ERP',
        address: '123 Avenue de la Comptabilité',
        city: 'Paris',
        postalCode: '75001',
        country: 'France',
        phone: '+33 1 23 45 67 89',
        email: 'contact@wisebook.com',
        taxId: 'FR 12 345 678 901'
      };

      // Générer le PDF
      const result = await pdfGeneratorService.generateEmailAttachmentPDF(
        templateContent,
        variables,
        companyInfo
      );

      // Télécharger le PDF
      pdfGeneratorService.downloadPDF(result.blob, result.filename);

      toast.dismiss();
      toast.success('PDF généré et téléchargé avec succès !');
    } catch (error: any) {
      toast.dismiss();
      toast.error('Erreur lors de la génération du PDF: ' + error.message);
      console.error('Erreur PDF:', error);
    }
  };

  const handlePreviewPDF = async () => {
    try {
      toast.loading('Génération de la prévisualisation PDF...');

      // Variables d'exemple
      const variables = {
        company_name: 'WiseBook Entreprise',
        client_name: 'Jean Dupont',
        client_address: '123 Rue de la République',
        client_city: '75001 Paris, France',
        invoice_number: 'INV-2025-001',
        order_number: 'CMD-2025-001',
        amount: '1 500,00 €',
        due_date: '15/02/2025',
        payment_link: 'https://wisebook.com/paiement/inv-2025-001',
        notification_title: templateName || selectedTemplate?.name || 'Notification',
        reference: 'INV-2025-001'
      };

      const companyInfo = {
        name: 'WiseBook ERP',
        address: '123 Avenue de la Comptabilité',
        city: 'Paris',
        postalCode: '75001',
        country: 'France',
        phone: '+33 1 23 45 67 89',
        email: 'contact@wisebook.com',
        taxId: 'FR 12 345 678 901'
      };

      // Générer le PDF
      const result = await pdfGeneratorService.generateEmailAttachmentPDF(
        templateContent,
        variables,
        companyInfo
      );

      // Ouvrir dans un nouvel onglet
      const url = URL.createObjectURL(result.blob);
      window.open(url, '_blank');

      toast.dismiss();
      toast.success('Prévisualisation PDF ouverte !');
    } catch (error: any) {
      toast.dismiss();
      toast.error('Erreur lors de la génération: ' + error.message);
      console.error('Erreur PDF:', error);
    }
  };

  const settingSections: SettingSection[] = [
    {
      id: 'appearance',
      title: t('settings.appearance'),
      description: t('settings.appearanceDesc'),
      icon: <Palette className="w-5 h-5" />
    },
    {
      id: 'notifications',
      title: t('settings.notifications'),
      description: t('settings.notificationsDesc'),
      icon: <Bell className="w-5 h-5" />
    },
    {
      id: 'regional',
      title: t('settings.regional'),
      description: t('settings.regionalDesc'),
      icon: <Globe className="w-5 h-5" />
    },
    {
      id: 'email-templates',
      title: t('settings.emailTemplates'),
      description: t('settings.emailTemplatesDesc'),
      icon: <Mail className="w-5 h-5" />
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
                  <select className="input" defaultValue="normal">
                    <option value="small">Petite (13px)</option>
                    <option value="normal">Normale (14px)</option>
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

            {/* Champ Email de notification */}
            <div className="bg-white border border-[var(--color-border)] rounded-lg p-4">
              <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                Email de notification
              </label>
              <input
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="exemple@wisebook.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                Adresse email où vous recevrez toutes les notifications système
              </p>
            </div>

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

      case 'email-templates':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Modèles de Mails HTML
            </h3>
            <p className="text-[var(--color-text-secondary)] mb-4">
              Personnalisez les modèles d'emails envoyés par le système pour les notifications, factures, rappels, etc.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {emailTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <div
                    key={template.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenTemplate(template)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenTemplate(template);
                      }
                    }}
                    aria-label={`Modifier le template: ${template.name}`}
                    className="border border-[var(--color-border)] rounded-lg p-4 hover:bg-[var(--color-surface-hover)] cursor-pointer transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${template.iconBg} rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${template.iconColor}`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-[var(--color-text-primary)]">{template.name}</h4>
                          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                            {template.description}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">{template.status}</span>
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">{template.lastModified}</span>
                          </div>
                        </div>
                      </div>
                      <Eye className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bouton pour créer un nouveau modèle */}
            <div className="pt-4">
              <ModernButton
                onClick={handleCreateNewTemplate}
                className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                icon={<FileText className="w-4 h-4" />}
              >
                Créer un nouveau modèle
              </ModernButton>
            </div>

            {/* Informations sur les PDF automatiques */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileDown className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">📄 PDF automatique avec en-tête entreprise</h4>
                  <p className="text-sm text-green-800 mb-2">
                    Chaque email envoyé sera automatiquement accompagné d'un PDF professionnel :
                  </p>
                  <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                    <li>En-tête avec logo et coordonnées de l'entreprise</li>
                    <li>Mise en forme professionnelle type courrier officiel</li>
                    <li>Signature automatique avec nom et fonction</li>
                    <li>Pied de page avec mentions légales</li>
                  </ul>
                  <p className="text-xs text-green-700 mt-3 italic">
                    💡 Utilisez les boutons "Prévisualiser PDF" et "Télécharger PDF" dans l'éditeur pour voir le rendu final
                  </p>
                </div>
              </div>
            </div>

            {/* Informations sur les variables */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Variables disponibles</h4>
                  <p className="text-sm text-blue-800 mb-2">
                    Utilisez ces variables dans vos modèles pour personnaliser les emails :
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{client_name}}'}</code>
                    <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{invoice_number}}'}</code>
                    <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{amount}}'}</code>
                    <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{due_date}}'}</code>
                    <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{company_name}}'}</code>
                    <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{company_logo}}'}</code>
                    <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{payment_link}}'}</code>
                    <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{unsubscribe}}'}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'assets_removed':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Classification des Actifs déplacée
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              La Classification des Actifs a été déplacée vers Paramètres de Comptabilité.
            </p>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[var(--color-primary-light)] rounded-lg flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                    Accéder à la Classification
                  </h4>
                  <p className="text-[var(--color-text-secondary)] mb-4">
                    La Classification des Actifs SYSCOHADA est maintenant accessible depuis les Paramètres de Comptabilité.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <ModernButton
                      onClick={() => window.location.href = '/settings/accounting'}
                      className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                      icon={<ChevronRight className="w-4 h-4" />}
                    >
                      Aller aux Paramètres de Comptabilité
                    </ModernButton>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--color-info-light)] border border-[var(--color-info)] rounded-lg p-4">
                <h5 className="font-semibold text-[var(--color-info)] mb-2">✨ Fonctionnalités</h5>
                <ul className="text-sm text-[var(--color-info)] opacity-90 space-y-1">
                  <li>• 14 catégories d'actifs SYSCOHADA</li>
                  <li>• Durées de vie et taux d'amortissement</li>
                  <li>• Détection automatique par mots-clés</li>
                  <li>• Comptes comptables associés</li>
                </ul>
              </div>
              <div className="bg-[var(--color-success-light)] border border-[var(--color-success)] rounded-lg p-4">
                <h5 className="font-semibold text-[var(--color-success)] mb-2">🔗 Intégrations</h5>
                <ul className="text-sm text-[var(--color-success)] opacity-90 space-y-1">
                  <li>• Module comptabilité</li>
                  <li>• Module immobilisations</li>
                  <li>• Détection automatique</li>
                  <li>• Workflow de capitalisation</li>
                </ul>
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

  // Vérification des droits administrateur
  if (!isAdmin) {
    return (
      <div className="w-full space-y-6 animate-fadeIn">
        <ModernCard>
          <CardBody>
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                {t('settings.accessDenied')}
              </h2>
              <p className="text-[var(--color-text-secondary)] text-center max-w-md">
                {t('settings.adminOnly')}
              </p>
              <div className="mt-6 text-sm text-[var(--color-text-tertiary)]">
                Connecté en tant que : <strong>{user?.email || 'Non connecté'}</strong>
              </div>
            </div>
          </CardBody>
        </ModernCard>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {t('settings.description')}
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

      {/* Modal pour afficher/éditer le template */}
      {isModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${selectedTemplate.iconBg} rounded-lg flex items-center justify-center`}>
                  {React.createElement(selectedTemplate.icon, { className: `w-5 h-5 ${selectedTemplate.iconColor}` })}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{selectedTemplate.name}</h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">{selectedTemplate.description}</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Fermer">
                <X className="w-6 h-6 text-[var(--color-text-secondary)]" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Configuration du modèle */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                    Titre du modèle
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ex: Facture de vente"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                    Type de notification
                  </label>
                  <select
                    value={templateNotificationType}
                    onChange={(e) => setTemplateNotificationType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  >
                    <option value="">-- Sélectionner un type --</option>
                    <option value="invoice">Facture</option>
                    <option value="payment-reminder">Rappel de Paiement</option>
                    <option value="order-confirmation">Confirmation de Commande</option>
                    <option value="client-followup">Relance Client</option>
                    <option value="welcome">Bienvenue Nouveau Client</option>
                    <option value="payment-receipt">Reçu de Paiement</option>
                    <option value="custom">Personnalisé</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Version Texte */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                    Version Texte du modèle
                  </label>
                  <div className="w-full h-[500px] p-4 text-sm border border-gray-300 rounded-lg bg-gray-50 overflow-auto whitespace-pre-wrap">
                    {extractTextFromHTML(templateContent)}
                  </div>
                </div>

                {/* Aperçu */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                    Aperçu du rendu
                  </label>
                  <div className="border border-gray-300 rounded-lg bg-white h-[500px] overflow-auto">
                    <div
                      dangerouslySetInnerHTML={{ __html: templateContent }}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>

              {/* Variables disponibles */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Variables disponibles</h4>
                    <p className="text-sm text-blue-800 mb-2">
                      Utilisez ces variables dans votre modèle HTML :
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{client_name}}'}</code>
                      <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{invoice_number}}'}</code>
                      <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{amount}}'}</code>
                      <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{due_date}}'}</code>
                      <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{company_name}}'}</code>
                      <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{company_logo}}'}</code>
                      <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{payment_link}}'}</code>
                      <code className="bg-white px-2 py-1 rounded text-blue-700">{'{{order_number}}'}</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              {/* Boutons PDF à gauche */}
              <div className="flex gap-3">
                <ModernButton
                  onClick={handlePreviewPDF}
                  className="border border-[var(--color-primary)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
                  icon={<Eye className="w-4 h-4" />}
                >
                  Prévisualiser PDF
                </ModernButton>
                <ModernButton
                  onClick={handleGeneratePDF}
                  className="border border-[var(--color-secondary)] bg-white text-[var(--color-secondary)] hover:bg-[#B87333]/10"
                  icon={<FileDown className="w-4 h-4" />}
                >
                  Télécharger PDF
                </ModernButton>
              </div>

              {/* Boutons d'action à droite */}
              <div className="flex gap-3">
                <ModernButton
                  onClick={handleCloseModal}
                  className="border border-gray-300 bg-white text-[var(--color-text-primary)] hover:bg-gray-100"
                >
                  {t('common.cancel')}
                </ModernButton>
                <ModernButton
                  onClick={handleSaveTemplate}
                  className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                  icon={<Save className="w-4 h-4" />}
                >
                  {t('common.save')}
                </ModernButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernSettingsPage;