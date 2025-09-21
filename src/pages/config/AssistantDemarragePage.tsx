import React, { useState } from 'react';
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
      title: 'Bienvenue',
      description: 'Introduction à l\'assistant de démarrage',
      icon: Rocket,
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending',
      required: true,
      estimatedTime: '2 min'
    },
    {
      id: 'company',
      title: 'Informations Société',
      description: 'Configuration des données de base de votre entreprise',
      icon: Building2,
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending',
      required: true,
      estimatedTime: '5 min'
    },
    {
      id: 'accounting',
      title: 'Plan Comptable',
      description: 'Sélection du plan comptable SYSCOHADA',
      icon: FileText,
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending',
      required: true,
      estimatedTime: '3 min'
    },
    {
      id: 'users',
      title: 'Utilisateurs',
      description: 'Création des premiers utilisateurs',
      icon: Users,
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'pending',
      required: true,
      estimatedTime: '4 min'
    },
    {
      id: 'taxes',
      title: 'Configuration TVA',
      description: 'Paramétrage des taux de TVA',
      icon: CreditCard,
      status: currentStep === 4 ? 'current' : currentStep > 4 ? 'completed' : 'pending',
      required: false,
      estimatedTime: '3 min'
    },
    {
      id: 'security',
      title: 'Sécurité',
      description: 'Configuration des paramètres de sécurité',
      icon: Shield,
      status: currentStep === 5 ? 'current' : currentStep > 5 ? 'completed' : 'pending',
      required: false,
      estimatedTime: '2 min'
    },
    {
      id: 'finish',
      title: 'Finalisation',
      description: 'Récapitulatif et finalisation de la configuration',
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
      toast.success('Étape suivante!');
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
      toast.info('Étape ignorée');
    }
  };

  const handleFinish = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsProcessing(false);
    toast.success('Configuration terminée avec succès!');
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
        return <IconComponent className={`${baseClasses} text-gray-400`} />;
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
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Bienvenue dans WiseBook ERP
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Cet assistant vous guidera à travers les étapes essentielles pour configurer 
                votre système ERP selon les normes SYSCOHADA.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="p-6 bg-blue-50 rounded-lg">
                <Building2 className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Configuration Société</h3>
                <p className="text-sm text-gray-600">
                  Paramétrage des informations légales et comptables
                </p>
              </div>
              <div className="p-6 bg-green-50 rounded-lg">
                <FileText className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Plan Comptable SYSCOHADA</h3>
                <p className="text-sm text-gray-600">
                  Installation automatique du référentiel comptable
                </p>
              </div>
              <div className="p-6 bg-purple-50 rounded-lg">
                <Users className="h-8 w-8 text-purple-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Gestion Utilisateurs</h3>
                <p className="text-sm text-gray-600">
                  Configuration des profils et permissions
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Info className="h-4 w-4" />
                <span>Temps estimé: {getTotalEstimatedTime()} minutes</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4" />
                <span>Configuration recommandée</span>
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
              <h2 className="text-2xl font-bold text-gray-900">Informations de l'Entreprise</h2>
              <p className="text-gray-600">Saisissez les informations légales et administratives</p>
            </div>

            <div className="grid gap-6 max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Raison Sociale *
                  </label>
                  <Input
                    value={companyInfo.name}
                    onChange={(e) => handleCompanyInfoChange('name', e.target.value)}
                    placeholder="Nom de votre entreprise"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Forme Juridique *
                  </label>
                  <Select
                    value={companyInfo.legal_form}
                    onValueChange={(value) => handleCompanyInfoChange('legal_form', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SARL">SARL</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="SAS">SAS</SelectItem>
                      <SelectItem value="EI">Entreprise Individuelle</SelectItem>
                      <SelectItem value="GIE">GIE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    N° RCCM *
                  </label>
                  <Input
                    value={companyInfo.rccm}
                    onChange={(e) => handleCompanyInfoChange('rccm', e.target.value)}
                    placeholder="CI-ABJ-2024-B-12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NIF *
                  </label>
                  <Input
                    value={companyInfo.nif}
                    onChange={(e) => handleCompanyInfoChange('nif', e.target.value)}
                    placeholder="Numéro d'Identification Fiscale"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse *
                  </label>
                  <Input
                    value={companyInfo.address}
                    onChange={(e) => handleCompanyInfoChange('address', e.target.value)}
                    placeholder="Adresse complète"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ville *
                  </label>
                  <Input
                    value={companyInfo.city}
                    onChange={(e) => handleCompanyInfoChange('city', e.target.value)}
                    placeholder="Ville"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pays *
                  </label>
                  <Select
                    value={companyInfo.country}
                    onValueChange={(value) => handleCompanyInfoChange('country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CI">Côte d'Ivoire</SelectItem>
                      <SelectItem value="SN">Sénégal</SelectItem>
                      <SelectItem value="BF">Burkina Faso</SelectItem>
                      <SelectItem value="ML">Mali</SelectItem>
                      <SelectItem value="NE">Niger</SelectItem>
                      <SelectItem value="TG">Togo</SelectItem>
                      <SelectItem value="BJ">Bénin</SelectItem>
                      <SelectItem value="GN">Guinée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <Input
                    value={companyInfo.phone}
                    onChange={(e) => handleCompanyInfoChange('phone', e.target.value)}
                    placeholder="+225 XX XX XX XX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => handleCompanyInfoChange('email', e.target.value)}
                    placeholder="contact@entreprise.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secteur d'Activité *
                  </label>
                  <Select
                    value={companyInfo.activity_sector}
                    onValueChange={(value) => handleCompanyInfoChange('activity_sector', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commerce">Commerce</SelectItem>
                      <SelectItem value="industrie">Industrie</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="agriculture">Agriculture</SelectItem>
                      <SelectItem value="btp">BTP</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capital Social
                  </label>
                  <Input
                    value={companyInfo.capital}
                    onChange={(e) => handleCompanyInfoChange('capital', e.target.value)}
                    placeholder="Montant en FCFA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monnaie *
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
                      <SelectItem value="EUR">Euro</SelectItem>
                      <SelectItem value="USD">Dollar US</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Début Exercice Fiscal *
                  </label>
                  <Select
                    value={companyInfo.fiscal_year_start}
                    onValueChange={(value) => handleCompanyInfoChange('fiscal_year_start', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01-01">1er Janvier</SelectItem>
                      <SelectItem value="04-01">1er Avril</SelectItem>
                      <SelectItem value="07-01">1er Juillet</SelectItem>
                      <SelectItem value="10-01">1er Octobre</SelectItem>
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
              <h2 className="text-2xl font-bold text-gray-900">Plan Comptable SYSCOHADA</h2>
              <p className="text-gray-600">Sélectionnez le plan comptable adapté à votre activité</p>
            </div>

            <div className="grid gap-4 max-w-4xl mx-auto">
              <div className="border border-green-200 bg-green-50 rounded-lg p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900">Plan Comptable Standard SYSCOHADA</h3>
                    <p className="text-sm text-green-700">Recommandé pour la majorité des entreprises</p>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Recommandé
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Options additionnelles:</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" defaultChecked className="form-checkbox" />
                    <span className="text-sm text-gray-700">Comptes auxiliaires clients</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" defaultChecked className="form-checkbox" />
                    <span className="text-sm text-gray-700">Comptes auxiliaires fournisseurs</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-700">Plan analytique par défaut</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm text-gray-700">Comptes budgétaires</span>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Information importante</p>
                    <p>
                      Le plan comptable SYSCOHADA sera installé automatiquement. 
                      Vous pourrez le personnaliser ultérieurement selon vos besoins spécifiques.
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
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Configuration Terminée !
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Félicitations ! Votre système WiseBook ERP est maintenant configuré et prêt à être utilisé.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="p-6 bg-white border rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Société configurée</h3>
                <p className="text-sm text-gray-600">
                  Informations légales et paramètres de base enregistrés
                </p>
              </div>
              <div className="p-6 bg-white border rounded-lg">
                <FileText className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Plan comptable installé</h3>
                <p className="text-sm text-gray-600">
                  Plan SYSCOHADA activé avec 847 comptes disponibles
                </p>
              </div>
              <div className="p-6 bg-white border rounded-lg">
                <Users className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Utilisateurs créés</h3>
                <p className="text-sm text-gray-600">
                  Comptes administrateur et utilisateur configurés
                </p>
              </div>
              <div className="p-6 bg-white border rounded-lg">
                <Shield className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Sécurité activée</h3>
                <p className="text-sm text-gray-600">
                  Paramètres de sécurité configurés selon les bonnes pratiques
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
                    Finalisation...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Commencer à utiliser WiseBook
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
            <h2 className="text-2xl font-bold text-gray-900">Étape en Construction</h2>
            <p className="text-gray-600">Cette étape sera disponible prochainement.</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Assistant de Démarrage</h1>
              <p className="text-gray-600">
                Étape {currentStep + 1} sur {setupSteps.length}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-2">
                Progression globale: {Math.round(setupProgress)}%
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
                <CardTitle className="text-lg">Étapes de Configuration</CardTitle>
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
                            'text-gray-500'
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
                Précédent
              </Button>

              <div className="flex space-x-3">
                {!setupSteps[currentStep].required && currentStep < setupSteps.length - 1 && (
                  <Button
                    onClick={handleSkip}
                    disabled={isProcessing}
                    variant="ghost"
                    className="text-gray-600"
                  >
                    Ignorer cette étape
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
                        Traitement...
                      </>
                    ) : (
                      <>
                        Suivant
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
                        Finalisation...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Terminer
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