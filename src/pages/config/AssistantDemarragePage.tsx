
import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Building2,
  FileText,
  Users,
  CreditCard,
  Shield,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Download,
  Settings,
  Eye,
  Save,
  RefreshCw,
  AlertCircle,
  Info,
  Star,
  Globe,
  Database
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Progress,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui';
import { toast } from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'pending' | 'current' | 'completed' | 'skipped';
  required: boolean;
  estimatedTime: string;
}

interface CompanyInfo {
  name: string;
  legal_form: string;
  rccm: string;
  nif: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  activity_sector: string;
  capital: string;
  currency: string;
  fiscal_year_start: string;
}

const AssistantDemarragePage: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [setupProgress, setSetupProgress] = useState(0);

  // Company information form state
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    legal_form: '',
    rccm: '',
    nif: '',
    address: '',
    city: '',
    country: 'CI',
    phone: '',
    email: '',
    website: '',
    activity_sector: '',
    capital: '',
    currency: 'XOF',
    fiscal_year_start: '01-01'
  });

  // Setup steps configuration
  const setupSteps: SetupStep[] = [
    {
      id: 'welcome',
      title: t('startupWizard.stepWelcomeTitle'),
      description: t('startupWizard.stepWelcomeDesc'),
      icon: Rocket,
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending',
      required: true,
      estimatedTime: '2 min'
    },
    {
      id: 'company',
      title: t('startupWizard.stepCompanyTitle'),
      description: t('startupWizard.stepCompanyDesc'),
      icon: Building2,
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending',
      required: true,
      estimatedTime: '5 min'
    },
    {
      id: 'accounting',
      title: t('startupWizard.stepAccountingTitle'),
      description: t('startupWizard.stepAccountingDesc'),
      icon: FileText,
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending',
      required: true,
      estimatedTime: '3 min'
    },
    {
      id: 'users',
      title: t('startupWizard.stepUsersTitle'),
      description: t('startupWizard.stepUsersDesc'),
      icon: Users,
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'pending',
      required: true,
      estimatedTime: '4 min'
    },
    {
      id: 'taxes',
      title: t('startupWizard.stepTaxesTitle'),
      description: t('startupWizard.stepTaxesDesc'),
      icon: CreditCard,
      status: currentStep === 4 ? 'current' : currentStep > 4 ? 'completed' : 'pending',
      required: false,
      estimatedTime: '3 min'
    },
    {
      id: 'security',
      title: t('settings.security'),
      description: t('startupWizard.stepSecurityDesc'),
      icon: Shield,
      status: currentStep === 5 ? 'current' : currentStep > 5 ? 'completed' : 'pending',
      required: false,
      estimatedTime: '2 min'
    },
    {
      id: 'finish',
      title: t('startupWizard.stepFinishTitle'),
      description: t('startupWizard.stepFinishDesc'),
      icon: CheckCircle,
      status: currentStep === 6 ? 'current' : currentStep > 6 ? 'completed' : 'pending',
      required: true,
      estimatedTime: '2 min'
    }
  ];

  const handleNext = async () => {
    if (currentStep < setupSteps.length - 1) {
      setIsProcessing(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStep(currentStep + 1);
      setSetupProgress((currentStep + 1) / (setupSteps.length - 1) * 100);
      setIsProcessing(false);
      toast.success(t('startupWizard.toastNextStep'));
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setSetupProgress(currentStep / (setupSteps.length - 1) * 100);
    }
  };

  const handleSkip = async () => {
    if (!setupSteps[currentStep].required) {
      setIsProcessing(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setupSteps[currentStep].status = 'skipped';
      handleNext();
      setIsProcessing(false);
      toast(t('startupWizard.toastStepSkipped'));
    }
  };

  const handleFinish = async () => {
    setIsProcessing(true);
    try {
      // Persiste RÉELLEMENT l'entreprise dans la source canonique settings.admin_company_legal
      // (au lieu d'un setTimeout + toast qui n'enregistrait rien).
      const value = {
        raisonSociale: companyInfo.name,
        legalName: companyInfo.name,
        formeJuridique: companyInfo.legal_form,
        rccm: companyInfo.rccm,
        nif: companyInfo.nif,
        adresse: companyInfo.address,
        ville: companyInfo.city,
        pays: companyInfo.country,
        telephone: companyInfo.phone,
        email: companyInfo.email,
        secteurActivite: companyInfo.activity_sector,
        capital: companyInfo.capital,
        devise: companyInfo.currency,
        debutExercice: companyInfo.fiscal_year_start,
      };
      const payload = { key: 'admin_company_legal', value: JSON.stringify(value), updatedAt: new Date().toISOString() };
      const existing = await adapter.getById('settings', 'admin_company_legal').catch(() => null);
      if (existing) await adapter.update('settings', 'admin_company_legal', payload);
      else await adapter.create('settings', payload);
      toast.success(t('startupWizard.toastCompanySaved'));
    } catch {
      toast.error(t('startupWizard.toastCompanySaveError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompanyInfoChange = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getTotalEstimatedTime = () => {
    return setupSteps.reduce((total, step) => {
      const time = parseInt(step.estimatedTime);
      return total + time;
    }, 0);
  };

  const getStepIcon = (step: SetupStep) => {
    const IconComponent = step.icon;
    const baseClasses = "h-6 w-6";
    
    switch (step.status) {
      case 'completed':
        return <CheckCircle className={`${baseClasses} text-green-600`} />;
      case 'current':
        return <IconComponent className={`${baseClasses} text-blue-600`} />;
      case 'skipped':
        return <IconComponent className={`${baseClasses} text-orange-500`} />;
      default:
        return <IconComponent className={`${baseClasses} text-gray-700`} />;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Rocket className="h-12 w-12 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {t('startupWizard.welcomeHeading')}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {t('startupWizard.welcomeIntro')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="p-6 bg-blue-50 rounded-lg">
                <Building2 className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{t('startupWizard.cardCompanyTitle')}</h3>
                <p className="text-sm text-gray-600">
                  {t('startupWizard.cardCompanyDesc')}
                </p>
              </div>
              <div className="p-6 bg-green-50 rounded-lg">
                <FileText className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{t('startupWizard.cardChartTitle')}</h3>
                <p className="text-sm text-gray-600">
                  {t('startupWizard.cardChartDesc')}
                </p>
              </div>
              <div className="p-6 bg-primary-50 rounded-lg">
                <Users className="h-8 w-8 text-primary-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{t('startupWizard.cardUsersTitle')}</h3>
                <p className="text-sm text-gray-600">
                  {t('startupWizard.cardUsersDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-700">
              <div className="flex items-center space-x-1">
                <Info className="h-4 w-4" />
                <span>{t('startupWizard.estimatedTime', { count: String(getTotalEstimatedTime()) })}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4" />
                <span>{t('startupWizard.recommendedSetup')}</span>
              </div>
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900">{t('startupWizard.companyHeading')}</h2>
              <p className="text-gray-600">{t('startupWizard.companySubtitle')}</p>
            </div>

            <div className="grid gap-6 max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('startupWizard.labelLegalName')} *
                  </label>
                  <Input
                    value={companyInfo.name}
                    onChange={(e) => handleCompanyInfoChange('name', e.target.value)}
                    placeholder={t('startupWizard.phCompanyName')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('startupWizard.labelLegalForm')} *
                  </label>
                  <Select
                    value={companyInfo.legal_form}
                    onValueChange={(value) => handleCompanyInfoChange('legal_form', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('startupWizard.phSelect')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SARL">SARL</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="SAS">SAS</SelectItem>
                      <SelectItem value="EI">{t('startupWizard.legalFormSole')}</SelectItem>
                      <SelectItem value="GIE">GIE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('startupWizard.labelRccm')} *
                  </label>
                  <Input
                    value={companyInfo.rccm}
                    onChange={(e) => handleCompanyInfoChange('rccm', e.target.value)}
                    placeholder="CI-ABJ-2024-B-12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('startupWizard.labelNif')} *
                  </label>
                  <Input
                    value={companyInfo.nif}
                    onChange={(e) => handleCompanyInfoChange('nif', e.target.value)}
                    placeholder={t('startupWizard.phNif')}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('startupWizard.labelAddress')} *
                  </label>
                  <Input
                    value={companyInfo.address}
                    onChange={(e) => handleCompanyInfoChange('address', e.target.value)}
                    placeholder={t('startupWizard.phAddress')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('startupWizard.labelCity')} *
                  </label>
                  <Input
                    value={companyInfo.city}
                    onChange={(e) => handleCompanyInfoChange('city', e.target.value)}
                    placeholder={t('startupWizard.phCity')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('startupWizard.labelCountry')} *
                  </label>
                  <Select
                    value={companyInfo.country}
                    onValueChange={(value) => handleCompanyInfoChange('country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CI">{t('startupWizard.countryCI')}</SelectItem>
                      <SelectItem value="SN">{t('startupWizard.countrySN')}</SelectItem>
                      <SelectItem value="BF">{t('startupWizard.countryBF')}</SelectItem>
                      <SelectItem value="ML">{t('startupWizard.countryML')}</SelectItem>
                      <SelectItem value="NE">{t('startupWizard.countryNE')}</SelectItem>
                      <SelectItem value="TG">{t('startupWizard.countryTG')}</SelectItem>
                      <SelectItem value="BJ">{t('startupWizard.countryBJ')}</SelectItem>
                      <SelectItem value="GN">{t('startupWizard.countryGN')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('startupWizard.labelPhone')}
                  </label>
                  <Input
                    value={companyInfo.phone}
                    onChange={(e) => handleCompanyInfoChange('phone', e.target.value)}
                    placeholder="+225 XX XX XX XX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('startupWizard.labelEmail')}
                  </label>
                  <Input
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => handleCompanyInfoChange('email', e.target.value)}
                    placeholder={t('startupWizard.phCompanyEmail')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('startupWizard.labelSector')} *
                  </label>
                  <Select
                    value={companyInfo.activity_sector}
                    onValueChange={(value) => handleCompanyInfoChange('activity_sector', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('startupWizard.phSelect')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commerce">{t('startupWizard.sectorCommerce')}</SelectItem>
                      <SelectItem value="industrie">{t('startupWizard.sectorIndustry')}</SelectItem>
                      <SelectItem value="services">{t('startupWizard.sectorServices')}</SelectItem>
                      <SelectItem value="agriculture">{t('startupWizard.sectorAgriculture')}</SelectItem>
                      <SelectItem value="btp">{t('startupWizard.sectorConstruction')}</SelectItem>
                      <SelectItem value="transport">{t('startupWizard.sectorTransport')}</SelectItem>
                      <SelectItem value="finance">{t('startupWizard.sectorFinance')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('startupWizard.labelCapital')}
                  </label>
                  <Input
                    value={companyInfo.capital}
                    onChange={(e) => handleCompanyInfoChange('capital', e.target.value)}
                    placeholder={t('startupWizard.phCapital')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('startupWizard.labelCurrency')} *
                  </label>
                  <Select
                    value={companyInfo.currency}
                    onValueChange={(value) => handleCompanyInfoChange('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XOF">FCFA (XOF)</SelectItem>
                      <SelectItem value="XAF">FCFA (XAF)</SelectItem>
                      <SelectItem value="EUR">{t('startupWizard.currencyEur')}</SelectItem>
                      <SelectItem value="USD">{t('startupWizard.currencyUsd')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('startupWizard.labelFiscalYearStart')} *
                  </label>
                  <Select
                    value={companyInfo.fiscal_year_start}
                    onValueChange={(value) => handleCompanyInfoChange('fiscal_year_start', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01-01">{t('startupWizard.fiscalJan')}</SelectItem>
                      <SelectItem value="04-01">{t('startupWizard.fiscalApr')}</SelectItem>
                      <SelectItem value="07-01">{t('startupWizard.fiscalJul')}</SelectItem>
                      <SelectItem value="10-01">{t('startupWizard.fiscalOct')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <FileText className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900">{t('startupWizard.cardChartTitle')}</h2>
              <p className="text-gray-600">{t('startupWizard.chartSubtitle')}</p>
            </div>

            <div className="grid gap-4 max-w-4xl mx-auto">
              <div className="border border-green-200 bg-green-50 rounded-lg p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900">{t('startupWizard.chartStandardTitle')}</h3>
                    <p className="text-sm text-green-700">{t('startupWizard.chartStandardDesc')}</p>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    {t('startupWizard.recommended')}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">{t('startupWizard.additionalOptions')}</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" defaultChecked className="form-checkbox" />
                    <span className="text-sm text-gray-700">{t('startupWizard.optCustomerSubaccounts')}</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" defaultChecked className="form-checkbox" />
                    <span className="text-sm text-gray-700">{t('startupWizard.optSupplierSubaccounts')}</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-700">{t('startupWizard.optDefaultAnalytic')}</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-700">{t('startupWizard.optBudgetAccounts')}</span>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">{t('startupWizard.importantInfo')}</p>
                    <p>
                      {t('startupWizard.chartInfoText')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Users className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900">{t('startupWizard.usersHeading')}</h2>
              <p className="text-gray-600">{t('startupWizard.usersSubtitle')}</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              {/* Administrateur Principal */}
              <div className="border border-primary-200 bg-primary-50 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Shield className="h-6 w-6 text-primary-600" />
                  <h3 className="font-semibold text-primary-900">{t('startupWizard.mainAdmin')}</h3>
                  <Badge className="bg-primary-100 text-primary-800">{t('startupWizard.required')}</Badge>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('startupWizard.labelFullName')} *
                    </label>
                    <Input placeholder={t('startupWizard.phFullNameAdmin')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('startupWizard.labelEmail')} *
                    </label>
                    <Input type="email" placeholder={t('startupWizard.phAdminEmail')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('startupWizard.labelPassword')} *
                    </label>
                    <Input type="password" placeholder={t('startupWizard.phPasswordMin')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('startupWizard.labelConfirmPassword')} *
                    </label>
                    <Input type="password" placeholder={t('startupWizard.phConfirmPassword')} />
                  </div>
                </div>
              </div>

              {/* Utilisateur Comptable */}
              <div className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Users className="h-6 w-6 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{t('startupWizard.accountantUser')}</h3>
                    <Badge variant="outline">{t('startupWizard.optional')}</Badge>
                  </div>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="form-checkbox" />
                    <span className="text-sm text-gray-600">{t('startupWizard.createThisUser')}</span>
                  </label>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('startupWizard.labelFullName')}
                    </label>
                    <Input placeholder={t('startupWizard.phFullNameAccountant')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('startupWizard.labelEmail')}
                    </label>
                    <Input type="email" placeholder={t('startupWizard.phAccountantEmail')} />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">{t('startupWizard.securityProfiles')}</p>
                    <p>
                      {t('startupWizard.securityProfilesText')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <CreditCard className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900">{t('startupWizard.taxHeading')}</h2>
              <p className="text-gray-600">{t('startupWizard.taxSubtitle')}</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              {/* Régime TVA */}
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{t('startupWizard.vatRegime')}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:border-orange-300">
                    <input type="radio" name="tva_regime" value="normal" defaultChecked className="mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">{t('startupWizard.regimeNormal')}</p>
                      <p className="text-sm text-gray-600">{t('startupWizard.regimeNormalDesc')}</p>
                    </div>
                  </label>
                  <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:border-orange-300">
                    <input type="radio" name="tva_regime" value="simplifie" className="mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">{t('startupWizard.regimeSimplified')}</p>
                      <p className="text-sm text-gray-600">{t('startupWizard.regimeSimplifiedDesc')}</p>
                    </div>
                  </label>
                  <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:border-orange-300">
                    <input type="radio" name="tva_regime" value="franchise" className="mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">{t('startupWizard.regimeFranchise')}</p>
                      <p className="text-sm text-gray-600">{t('startupWizard.regimeFranchiseDesc')}</p>
                    </div>
                  </label>
                  <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:border-orange-300">
                    <input type="radio" name="tva_regime" value="exonere" className="mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">{t('startupWizard.regimeExempt')}</p>
                      <p className="text-sm text-gray-600">{t('startupWizard.regimeExemptDesc')}</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Taux de TVA */}
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{t('startupWizard.applicableVatRates')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="font-bold text-orange-600">18%</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{t('startupWizard.rateStandard')}</p>
                        <p className="text-sm text-gray-600">{t('startupWizard.rateStandardDesc')}</p>
                      </div>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">{t('startupWizard.active')}</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="font-bold text-gray-600">9%</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{t('startupWizard.rateReduced')}</p>
                        <p className="text-sm text-gray-600">{t('startupWizard.rateReducedDesc')}</p>
                      </div>
                    </div>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="form-checkbox" />
                      <span className="text-sm">{t('startupWizard.enable')}</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="font-bold text-gray-600">0%</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{t('startupWizard.rateExempt')}</p>
                        <p className="text-sm text-gray-600">{t('startupWizard.rateExemptDesc')}</p>
                      </div>
                    </div>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="form-checkbox" />
                      <span className="text-sm">{t('startupWizard.enable')}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium mb-1">{t('startupWizard.taxInfo')}</p>
                    <p>
                      {t('startupWizard.taxInfoText')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Shield className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900">{t('settings.security')}</h2>
              <p className="text-gray-600">{t('startupWizard.securitySubtitle')}</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              {/* Politique de Mot de Passe */}
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{t('startupWizard.passwordPolicy')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{t('startupWizard.minLength')}</p>
                      <p className="text-sm text-gray-600">{t('startupWizard.minLengthDesc')}</p>
                    </div>
                    <Select defaultValue="8">
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="8">8</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" defaultChecked className="form-checkbox" />
                      <span className="text-sm text-gray-700">{t('startupWizard.requireUppercase')}</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" defaultChecked className="form-checkbox" />
                      <span className="text-sm text-gray-700">{t('startupWizard.requireDigit')}</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="form-checkbox" />
                      <span className="text-sm text-gray-700">{t('startupWizard.requireSpecial')}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Sessions */}
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{t('startupWizard.sessionManagement')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{t('startupWizard.sessionExpiry')}</p>
                      <p className="text-sm text-gray-600">{t('startupWizard.sessionExpiryDesc')}</p>
                    </div>
                    <Select defaultValue="30">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">{t('startupWizard.session15min')}</SelectItem>
                        <SelectItem value="30">{t('startupWizard.session30min')}</SelectItem>
                        <SelectItem value="60">{t('startupWizard.session1hour')}</SelectItem>
                        <SelectItem value="120">{t('startupWizard.session2hours')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" defaultChecked className="form-checkbox" />
                    <span className="text-sm text-gray-700">{t('startupWizard.oneSessionPerUser')}</span>
                  </label>
                </div>
              </div>

              {/* Authentification à Deux Facteurs */}
              <div className="border border-primary-200 bg-primary-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-6 w-6 text-primary-600" />
                    <div>
                      <h3 className="font-semibold text-primary-900">{t('startupWizard.twoFactorTitle')}</h3>
                      <p className="text-sm text-primary-700">{t('startupWizard.twoFactorDesc')}</p>
                    </div>
                  </div>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-primary-700">{t('startupWizard.enable')}</span>
                  </label>
                </div>
                <p className="text-sm text-primary-600">
                  {t('startupWizard.twoFactorText')}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-700">
                    <p className="font-medium mb-1">{t('startupWizard.recommendedConfig')}</p>
                    <p>
                      {t('startupWizard.recommendedConfigText')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {t('startupWizard.setupCompleteTitle')}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {t('startupWizard.setupCompleteText')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="p-6 bg-white border rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{t('startupWizard.summaryCompany')}</h3>
                <p className="text-sm text-gray-600">
                  {t('startupWizard.summaryCompanyDesc')}
                </p>
              </div>
              <div className="p-6 bg-white border rounded-lg">
                <FileText className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{t('startupWizard.summaryChart')}</h3>
                <p className="text-sm text-gray-600">
                  {t('startupWizard.summaryChartDesc')}
                </p>
              </div>
              <div className="p-6 bg-white border rounded-lg">
                <Users className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{t('startupWizard.summaryUsers')}</h3>
                <p className="text-sm text-gray-600">
                  {t('startupWizard.summaryUsersDesc')}
                </p>
              </div>
              <div className="p-6 bg-white border rounded-lg">
                <Shield className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{t('startupWizard.summarySecurity')}</h3>
                <p className="text-sm text-gray-600">
                  {t('startupWizard.summarySecurityDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-4">
              <Button
                onClick={handleFinish}
                className="bg-green-600 hover:bg-green-700"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {t('startupWizard.finalizing')}
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    {t('startupWizard.startUsing')}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        );

      default:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{t('startupWizard.stepUnderConstruction')}</h2>
            <p className="text-gray-600">{t('startupWizard.stepComingSoon')}</p>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Progress */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{t('startupWizard.pageTitle')}</h1>
              <p className="text-gray-600">
                {t('startupWizard.stepXofY', { current: String(currentStep + 1), total: String(setupSteps.length) })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-2">
                {t('startupWizard.overallProgress', { value: String(Math.round(setupProgress)) })}
              </div>
              <Progress value={setupProgress} className="w-48" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Steps Sidebar */}
          <div className="lg:col-span-3">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">{t('startupWizard.setupStepsTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2">
                  {setupSteps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      className={`p-4 border-l-4 cursor-pointer transition-colors ${
                        step.status === 'current'
                          ? 'border-l-blue-500 bg-blue-50'
                          : step.status === 'completed'
                          ? 'border-l-green-500 bg-green-50'
                          : step.status === 'skipped'
                          ? 'border-l-orange-500 bg-orange-50'
                          : 'border-l-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        if (step.status === 'completed') {
                          setCurrentStep(index);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        {getStepIcon(step)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className={`font-medium ${
                              step.status === 'current' ? 'text-blue-900' :
                              step.status === 'completed' ? 'text-green-900' :
                              step.status === 'skipped' ? 'text-orange-900' :
                              'text-gray-700'
                            }`}>
                              {step.title}
                            </h3>
                            <div className="flex items-center space-x-1">
                              {step.required && (
                                <AlertCircle className="h-3 w-3 text-red-500" />
                              )}
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                              >
                                {step.estimatedTime}
                              </Badge>
                            </div>
                          </div>
                          <p className={`text-xs mt-1 ${
                            step.status === 'current' ? 'text-blue-700' :
                            step.status === 'completed' ? 'text-green-700' :
                            step.status === 'skipped' ? 'text-orange-700' :
                            'text-gray-700'
                          }`}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <Card className="min-h-96">
              <CardContent className="p-8">
                <AnimatePresence mode="wait">
                  {renderStepContent()}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                onClick={handlePrevious}
                disabled={currentStep === 0 || isProcessing}
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('startupWizard.previous')}
              </Button>

              <div className="flex space-x-3">
                {!setupSteps[currentStep].required && currentStep < setupSteps.length - 1 && (
                  <Button
                    onClick={handleSkip}
                    disabled={isProcessing}
                    variant="ghost"
                    className="text-gray-600"
                  >
                    {t('startupWizard.skipStep')}
                  </Button>
                )}
                
                {currentStep < setupSteps.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        {t('startupWizard.processing')}
                      </>
                    ) : (
                      <>
                        {t('startupWizard.next')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleFinish}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        {t('startupWizard.finalizing')}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t('startupWizard.finish')}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantDemarragePage;