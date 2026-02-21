import React, { useState, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BuildingOfficeIcon,
  CalculatorIcon,
  CalendarIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  PhotoIcon,
  GlobeAltIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

// Schémas de validation
const companyInfoSchema = z.object({
  raisonSociale: z.string().min(2, 'Raison sociale obligatoire'),
  formeJuridique: z.enum(['SA', 'SARL', 'SAS', 'EI', 'GIE', 'COOP', 'ASSOC']),
  rccm: z.string().min(1, 'RCCM obligatoire'),
  nif: z.string().min(1, 'NIF obligatoire'),
  numeroContribuable: z.string().optional(),
  adresse: z.string().min(5, 'Adresse obligatoire'),
  ville: z.string().min(2, 'Ville obligatoire'),
  codePostal: z.string().optional(),
  pays: z.string().default('Cameroun'),
  telephone: z.string().min(8, 'Téléphone obligatoire'),
  mobile: z.string().optional(),
  email: z.string().email('Email invalide'),
  siteWeb: z.string().url().optional().or(z.literal('')),
  secteurActivite: z.string().min(1, 'Secteur obligatoire'),
  effectif: z.number().min(1, 'Effectif obligatoire'),
  chiffreAffaires: z.number().min(0, 'CA obligatoire'),
  logo: z.any().optional(),
  multiEtablissements: z.boolean().default(false)
});

const accountingConfigSchema = z.object({
  referentiel: z.enum(['SYSCOHADA_NORMAL', 'SYSCOHADA_ALLEGE', 'SYSCOHADA_MINIMAL']),
  planComptableSectoriel: z.enum(['GENERAL', 'BANQUE', 'ASSURANCE', 'MICROFINANCE', 'COMMERCE', 'INDUSTRIE']),
  longueurComptes: z.enum([6, 7, 8, 9]),
  activerAnalytique: z.boolean().default(false),
  nombreAxes: z.number().min(1).max(10).default(3),
  devisePrincipale: z.enum(['XOF', 'XAF', 'EUR', 'USD']),
  devisesSecondaires: z.array(z.string()).default([]),
  activerTVA: z.boolean().default(true),
  tauxTVANormal: z.number().default(19.25),
  tauxTVAReduit: z.number().default(5.5),
  activerMultiTaux: z.boolean().default(true)
});

const fiscalYearSchema = z.object({
  dateDebut: z.string().min(1, 'Date début obligatoire'),
  dateFin: z.string().min(1, 'Date fin obligatoire'),
  dureeExercice: z.number().min(1).max(18).default(12),
  exerciceDecale: z.boolean().default(false),
  periodesComptables: z.enum(['MENSUELLES', 'TRIMESTRIELLES', 'PERSONNALISEES']),
  modeClotureAutomatique: z.enum(['MENSUELLE', 'TRIMESTRIELLE', 'ANNUELLE']),
  dateClotureDefinitive: z.string().optional(),
  ouvertureAutomatique: z.boolean().default(true)
});

const importDataSchema = z.object({
  importerDonnees: z.boolean().default(false),
  sourceSystem: z.enum(['SAGE', 'CIEL', 'EXCEL', 'CSV', 'AUTRE']).optional(),
  
  planComptable: z.object({
    importer: z.boolean().default(false),
    fichier: z.any().optional(),
    mappingAuto: z.boolean().default(true)
  }),
  
  balanceOuverture: z.object({
    importer: z.boolean().default(false),
    fichier: z.any().optional(),
    dateReference: z.string().optional()
  }),
  
  fichierTiers: z.object({
    importer: z.boolean().default(false),
    fichier: z.any().optional(),
    separerClientsFournisseurs: z.boolean().default(true)
  }),
  
  immobilisations: z.object({
    importer: z.boolean().default(false),
    fichier: z.any().optional(),
    calculerAmortissements: z.boolean().default(true)
  })
});

type CompanySetupData = z.infer<typeof companyInfoSchema> & 
  z.infer<typeof accountingConfigSchema> & 
  z.infer<typeof fiscalYearSchema> & 
  z.infer<typeof importDataSchema>;

const CompanySetupWizard: React.FC = () => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const methods = useForm<CompanySetupData>({
    mode: 'onChange',
    defaultValues: {
      // Étape 1 - Entreprise
      pays: 'Cameroun',
      formeJuridique: 'SARL',
      effectif: 1,
      chiffreAffaires: 0,
      multiEtablissements: false,
      
      // Étape 2 - Comptable
      referentiel: 'SYSCOHADA_NORMAL',
      planComptableSectoriel: 'GENERAL',
      longueurComptes: 6,
      activerAnalytique: false,
      nombreAxes: 3,
      devisePrincipale: 'XAF',
      devisesSecondaires: [],
      activerTVA: true,
      tauxTVANormal: 19.25,
      tauxTVAReduit: 5.5,
      activerMultiTaux: true,
      
      // Étape 3 - Exercice
      dureeExercice: 12,
      exerciceDecale: false,
      periodesComptables: 'MENSUELLES',
      modeClotureAutomatique: 'MENSUELLE',
      ouvertureAutomatique: true,
      
      // Étape 4 - Import
      importerDonnees: false,
      planComptable: { importer: false, mappingAuto: true },
      balanceOuverture: { importer: false },
      fichierTiers: { importer: false, separerClientsFournisseurs: true },
      immobilisations: { importer: false, calculerAmortissements: true }
    }
  });

  const { control, handleSubmit, watch, trigger, formState: { errors, isValid } } = methods;
  const watchedValues = watch();

  const steps = [
    {
      id: 1,
      title: 'Informations Entreprise',
      description: 'Données légales et coordonnées',
      icon: BuildingOfficeIcon,
      color: 'blue',
      schema: companyInfoSchema
    },
    {
      id: 2,
      title: 'Configuration Comptable',
      description: 'SYSCOHADA et paramètres comptables',
      icon: CalculatorIcon,
      color: 'green',
      schema: accountingConfigSchema
    },
    {
      id: 3,
      title: 'Exercice Comptable',
      description: 'Périodes et clôtures',
      icon: CalendarIcon,
      color: 'purple',
      schema: fiscalYearSchema
    },
    {
      id: 4,
      title: 'Import Données',
      description: 'Récupération données existantes',
      icon: DocumentArrowUpIcon,
      color: 'orange',
      schema: importDataSchema
    }
  ];

  const nextStep = async () => {
    const currentStepData = getCurrentStepData();
    const isStepValid = await trigger(Object.keys(currentStepData) as any);
    
    if (isStepValid) {
      setCompletedSteps([...completedSteps, currentStep]);
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getCurrentStepData = () => {
    switch (currentStep) {
      case 1: return {
        raisonSociale: true, formeJuridique: true, rccm: true, nif: true,
        adresse: true, ville: true, telephone: true, email: true,
        secteurActivite: true, effectif: true, chiffreAffaires: true
      };
      case 2: return {
        referentiel: true, planComptableSectoriel: true, longueurComptes: true,
        devisePrincipale: true, activerTVA: true
      };
      case 3: return {
        dateDebut: true, dateFin: true, periodesComptables: true
      };
      case 4: return {};
      default: return {};
    }
  };

  const onSubmit = (data: CompanySetupData) => {
    // TODO: Save company configuration
    alert('Configuration terminée avec succès !');
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validation du fichier
      if (file.size > 2 * 1024 * 1024) { // 2MB max
        alert('Le fichier logo doit faire moins de 2MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        alert('Format autorisé: JPG, PNG, GIF');
        return;
      }
      // TODO: Upload et preview
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F3F2] py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header avec progression */}
        <div className="bg-[#6A8A82] rounded-lg shadow-lg border border-gray-200 mb-8 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center">
                <SparklesIcon className="h-8 w-8 mr-3 text-white" />
                Assistant de Configuration Atlas Finance
              </h1>
              <p className="text-[#F0F3F2] mt-2">Configuration complète en 4 étapes selon SYSCOHADA</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-white">Étape {currentStep}/4</div>
              <div className="text-sm text-[#F0F3F2]">
                {Math.round((currentStep / steps.length) * 100)}% complété
              </div>
            </div>
          </div>

          {/* Stepper horizontal */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              const isAccessible = step.id <= currentStep;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompleted 
                        ? 'bg-green-500 border-green-500 text-white'
                        : isCurrent 
                        ? `bg-${step.color}-500 border-${step.color}-500 text-white`
                        : isAccessible
                        ? `border-${step.color}-300 text-${step.color}-600`
                        : 'border-gray-300 text-gray-700'
                    }`}>
                      {isCompleted ? (
                        <CheckCircleIcon className="h-6 w-6" />
                      ) : (
                        <step.icon className="h-6 w-6" />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-medium ${
                        isCurrent ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-700">{step.description}</div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      completedSteps.includes(step.id) 
                        ? 'bg-green-300' 
                        : step.id < currentStep 
                        ? `bg-${step.color}-300`
                        : 'bg-gray-300'
                    }`}></div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          
          {/* Barre de progression globale */}
          <div className="mt-6">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#B87333] h-2 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Étape 1: Informations Entreprise */}
          {currentStep === 1 && (
            <div className="bg-[#F0F3F2] rounded-lg shadow-lg border border-gray-200 p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                <BuildingOfficeIcon className="h-6 w-6 mr-2 text-blue-600" />
                Informations de l'Entreprise
              </h2>
              
              <div className="space-y-6">
                {/* Identité légale */}
                <div className="bg-[#ECECEC] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-[#191919] mb-4">Identité Légale</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Raison sociale *
                      </label>
                      <Controller
                        name="raisonSociale"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            placeholder="ATLAS FINANCE SARL"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      />
                      {errors.raisonSociale && (
                        <p className="text-red-600 text-xs mt-1">{errors.raisonSociale.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Forme juridique *
                      </label>
                      <Controller
                        name="formeJuridique"
                        control={control}
                        render={({ field }) => (
                          <select
                            {...field}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="SARL">SARL - Société à Responsabilité Limitée</option>
                            <option value="SA">SA - Société Anonyme</option>
                            <option value="SAS">SAS - Société par Actions Simplifiée</option>
                            <option value="EI">EI - Entreprise Individuelle</option>
                            <option value="GIE">GIE - Groupement d'Intérêt Économique</option>
                            <option value="COOP">Coopérative</option>
                            <option value="ASSOC">Association</option>
                          </select>
                        )}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        RCCM * <span className="text-xs text-gray-700">(Registre du Commerce)</span>
                      </label>
                      <Controller
                        name="rccm"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            placeholder="RC/YAE/2024/B/1234"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      />
                      {errors.rccm && (
                        <p className="text-red-600 text-xs mt-1">{errors.rccm.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        NIF * <span className="text-xs text-gray-700">(Numéro d'Identification Fiscale)</span>
                      </label>
                      <Controller
                        name="nif"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            placeholder="M051234567890"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      />
                      {errors.nif && (
                        <p className="text-red-600 text-xs mt-1">{errors.nif.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Numéro contribuable
                      </label>
                      <Controller
                        name="numeroContribuable"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            placeholder="P051234567890C"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Secteur d'activité * <span className="text-xs text-gray-700">(Classification SYSCOHADA)</span>
                      </label>
                      <Controller
                        name="secteurActivite"
                        control={control}
                        render={({ field }) => (
                          <select
                            {...field}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Sélectionner un secteur</option>
                            <option value="AGRICULTURE">Agriculture, sylviculture et pêche</option>
                            <option value="MINES">Industries extractives</option>
                            <option value="INDUSTRIE">Industries manufacturières</option>
                            <option value="ELECTRICITE">Production électricité, gaz, vapeur</option>
                            <option value="EAU">Production et distribution d'eau</option>
                            <option value="CONSTRUCTION">Construction</option>
                            <option value="COMMERCE">Commerce de gros et de détail</option>
                            <option value="TRANSPORT">Transports et entreposage</option>
                            <option value="HEBERGEMENT">Hébergement et restauration</option>
                            <option value="INFORMATION">Information et communication</option>
                            <option value="FINANCE">Activités financières et d'assurance</option>
                            <option value="IMMOBILIER">Activités immobilières</option>
                            <option value="SERVICES">Activités de services</option>
                            <option value="ADMINISTRATION">Administration publique</option>
                            <option value="EDUCATION">Enseignement</option>
                            <option value="SANTE">Santé et action sociale</option>
                            <option value="CULTURE">Arts, spectacles et loisirs</option>
                            <option value="AUTRES">Autres activités de services</option>
                          </select>
                        )}
                      />
                      {errors.secteurActivite && (
                        <p className="text-red-600 text-xs mt-1">{errors.secteurActivite.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Adresse complète */}
                <div className="bg-[#ECECEC] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                    <MapPinIcon className="h-5 w-5 mr-2" />
                    Siège Social
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adresse complète *</label>
                      <Controller
                        name="adresse"
                        control={control}
                        render={({ field }) => (
                          <textarea
                            {...field}
                            placeholder="Rue, Quartier, BP..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        )}
                      />
                      {errors.adresse && (
                        <p className="text-red-600 text-xs mt-1">{errors.adresse.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                      <Controller
                        name="ville"
                        control={control}
                        render={({ field }) => (
                          <select
                            {...field}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">Sélectionner une ville</option>
                            <option value="Yaoundé">Yaoundé</option>
                            <option value="Douala">Douala</option>
                            <option value="Garoua">Garoua</option>
                            <option value="Bafoussam">Bafoussam</option>
                            <option value="Bamenda">Bamenda</option>
                            <option value="Maroua">Maroua</option>
                            <option value="Ngaoundéré">Ngaoundéré</option>
                            <option value="Bertoua">Bertoua</option>
                            <option value="Ebolowa">Ebolowa</option>
                            <option value="Limbé">Limbé</option>
                            <option value="Autre">Autre ville</option>
                          </select>
                        )}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                      <Controller
                        name="pays"
                        control={control}
                        render={({ field }) => (
                          <select
                            {...field}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="Cameroun">🇨🇲 Cameroun</option>
                            <option value="Gabon">🇬🇦 Gabon</option>
                            <option value="Tchad">🇹🇩 Tchad</option>
                            <option value="Centrafrique">🇨🇫 République Centrafricaine</option>
                            <option value="Congo">🇨🇬 République du Congo</option>
                            <option value="Guinée Équatoriale">🇬🇶 Guinée Équatoriale</option>
                            <option value="Côte d'Ivoire">🇨🇮 Côte d'Ivoire</option>
                            <option value="Sénégal">🇸🇳 Sénégal</option>
                            <option value="Mali">🇲🇱 Mali</option>
                            <option value="Burkina Faso">🇧🇫 Burkina Faso</option>
                            <option value="Niger">🇳🇪 Niger</option>
                            <option value="Bénin">🇧🇯 Bénin</option>
                            <option value="Togo">🇹🇬 Togo</option>
                            <option value="Guinée-Bissau">🇬🇼 Guinée-Bissau</option>
                          </select>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Coordonnées */}
                <div className="bg-[#ECECEC] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                    <PhoneIcon className="h-5 w-5 mr-2" />
                    Coordonnées
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                      <Controller
                        name="telephone"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="tel"
                            placeholder="+237 6XX XX XX XX"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        )}
                      />
                      {errors.telephone && (
                        <p className="text-red-600 text-xs mt-1">{errors.telephone.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                      <Controller
                        name="mobile"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="tel"
                            placeholder="+237 6XX XX XX XX"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        )}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="email"
                            placeholder="contact@atlasfinance.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        )}
                      />
                      {errors.email && (
                        <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
                      <Controller
                        name="siteWeb"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="url"
                            placeholder="https://www.atlasfinance.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Données économiques */}
                <div className="bg-[#ECECEC] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                    <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                    Données Économiques
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Effectif * <span className="text-xs text-gray-700">(Nombre d'employés)</span>
                      </label>
                      <Controller
                        name="effectif"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="number"
                            min="1"
                            placeholder="10"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          />
                        )}
                      />
                      {errors.effectif && (
                        <p className="text-red-600 text-xs mt-1">{errors.effectif.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chiffre d'affaires annuel * <span className="text-xs text-gray-700">(XAF)</span>
                      </label>
                      <Controller
                        name="chiffreAffaires"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="number"
                            min="0"
                            step="1000000"
                            placeholder="50000000"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          />
                        )}
                      />
                      {errors.chiffreAffaires && (
                        <p className="text-red-600 text-xs mt-1">{errors.chiffreAffaires.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logo et options avancées */}
                <div className="bg-[#ECECEC] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                    <PhotoIcon className="h-5 w-5 mr-2" />
                    Logo et Options
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Logo entreprise <span className="text-xs text-gray-700">(JPG/PNG, max 2MB)</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <PhotoIcon className="h-12 w-12 mx-auto text-gray-700 mb-2" />
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="text-[#6A8A82] hover:text-[#B87333] font-medium"
                        >
                          Cliquer pour télécharger
                        </button>
                        <p className="text-xs text-gray-700 mt-1">ou glisser-déposer</p>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Controller
                          name="multiEtablissements"
                          control={control}
                          render={({ field }) => (
                            <input
                              type="checkbox"
                              {...field}
                              value=""
                              checked={field.value}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                          )}
                        />
                        <div>
                          <label className="text-sm font-medium text-gray-900">
                            Multi-établissements
                          </label>
                          <p className="text-xs text-gray-600">
                            Activez si votre société a plusieurs sites/filiales
                          </p>
                        </div>
                      </div>

                      {watchedValues.multiEtablissements && (
                        <div className="bg-[#F0F3F2] border border-[#6A8A82] rounded-lg p-4">
                          <p className="text-sm text-[#191919] font-medium mb-2">
                            🏢 Mode Multi-établissements activé
                          </p>
                          <p className="text-xs text-[#191919]">
                            Vous pourrez configurer vos différents sites après cette étape.
                            Chaque établissement peut avoir son propre plan comptable et ses journaux.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étape 2: Configuration Comptable */}
          {currentStep === 2 && (
            <CompteConfigStep control={control} errors={errors} watchedValues={watchedValues} />
          )}

          {/* Étape 3: Exercice Comptable */}
          {currentStep === 3 && (
            <FiscalYearConfigStep control={control} errors={errors} watchedValues={watchedValues} />
          )}

          {/* Étape 4: Import Données */}
          {currentStep === 4 && (
            <ImportDataStep control={control} errors={errors} watchedValues={watchedValues} />
          )}

          {/* Navigation */}
          <div className="bg-[#F0F3F2] rounded-lg shadow-lg border border-gray-200 p-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={previousStep}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    <span>Précédent</span>
                  </button>
                )}
                
                <div className="text-sm text-gray-600">
                  {Object.keys(errors).length > 0 && (
                    <span className="text-red-600 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      Veuillez corriger les erreurs
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {currentStep < steps.length ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center space-x-2 px-6 py-2 bg-[#B87333] text-white rounded-md hover:bg-[#6A8A82] transition-colors"
                  >
                    <span>Suivant</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-6 py-2 bg-[#B87333] text-white rounded-md hover:bg-[#6A8A82] transition-colors"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>Finaliser Configuration</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Composant Étape 2: Configuration Comptable
const CompteConfigStep: React.FC<{ control: any; errors: any; watchedValues: any }> = ({
  control, errors, watchedValues
}) => (
  <div className="bg-[#F0F3F2] rounded-lg shadow-lg border border-gray-200 p-8">
    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
      <CalculatorIcon className="h-6 w-6 mr-2 text-green-600" />
      Configuration Comptable SYSCOHADA
    </h2>
    
    <div className="space-y-6">
      {/* Référentiel SYSCOHADA */}
      <div className="bg-[#ECECEC] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#191919] mb-4">Référentiel SYSCOHADA</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              value: 'SYSCOHADA_NORMAL',
              title: 'SYSCOHADA Normal',
              description: 'Plan complet - Toutes entreprises',
              recommended: true
            },
            {
              value: 'SYSCOHADA_ALLEGE',
              title: 'SYSCOHADA Allégé',
              description: 'PME < 100M XAF de CA',
              recommended: false
            },
            {
              value: 'SYSCOHADA_MINIMAL',
              title: 'SYSCOHADA Minimal',
              description: 'TPE < 30M XAF de CA',
              recommended: false
            }
          ].map((option) => (
            <Controller
              key={option.value}
              name="referentiel"
              control={control}
              render={({ field }) => (
                <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  field.value === option.value 
                    ? 'border-green-500 bg-green-100' 
                    : 'border-gray-200 hover:border-green-300'
                }`}>
                  <input
                    type="radio"
                    {...field}
                    value={option.value}
                    checked={field.value === option.value}
                    className="sr-only"
                  />
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900 flex items-center">
                        {option.title}
                        {option.recommended && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded-full">
                            Recommandé
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      field.value === option.value 
                        ? 'border-green-500 bg-green-500' 
                        : 'border-gray-300'
                    }`}>
                      {field.value === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full mt-0.5 ml-0.5"></div>
                      )}
                    </div>
                  </div>
                </label>
              )}
            />
          ))}
        </div>
      </div>

      {/* Plan comptable sectoriel */}
      <div className="bg-[#ECECEC] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#191919] mb-4">Plan Comptable Sectoriel</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secteur spécialisé</label>
            <Controller
              name="planComptableSectoriel"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GENERAL">Général (Toutes activités)</option>
                  <option value="BANQUE">Banques et Établissements Financiers</option>
                  <option value="ASSURANCE">Sociétés d'Assurance</option>
                  <option value="MICROFINANCE">Institutions de Microfinance</option>
                  <option value="COMMERCE">Commerce et Distribution</option>
                  <option value="INDUSTRIE">Industries Manufacturières</option>
                </select>
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longueur des comptes <span className="text-xs text-gray-700">(6 à 9 positions)</span>
            </label>
            <Controller
              name="longueurComptes"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={6}>6 positions (Ex: 401001)</option>
                  <option value={7}>7 positions (Ex: 4010001)</option>
                  <option value={8}>8 positions (Ex: 40100001)</option>
                  <option value={9}>9 positions (Ex: 401000001)</option>
                </select>
              )}
            />
          </div>
        </div>
      </div>

      {/* Devises */}
      <div className="bg-[#ECECEC] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
          <GlobeAltIcon className="h-5 w-5 mr-2" />
          Configuration Devises
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Devise principale *</label>
            <Controller
              name="devisePrincipale"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="XAF">XAF - Franc CFA (CEMAC)</option>
                  <option value="XOF">XOF - Franc CFA (UEMOA)</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - Dollar US</option>
                </select>
              )}
            />
          </div>

          <div className="flex items-center space-x-3">
            <Controller
              name="activerTVA"
              control={control}
              render={({ field }) => (
                <input
                  type="checkbox"
                  {...field}
                  value=""
                  checked={field.value}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              )}
            />
            <div>
              <label className="text-sm font-medium text-gray-900">Activer la TVA</label>
              <p className="text-xs text-gray-600">
                Gestion automatique de la TVA selon les taux {watchedValues.pays === 'Cameroun' ? 'CEMAC' : 'locaux'}
              </p>
            </div>
          </div>
        </div>

        {watchedValues.activerTVA && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taux TVA Normal (%)
                </label>
                <Controller
                  name="tauxTVANormal"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      placeholder="19.25"
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 19.25)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  )}
                />
                <p className="text-xs text-gray-700 mt-1">
                  {watchedValues.pays === 'Cameroun' ? 'CEMAC: 19.25% (TVA 18% + CSS 1.25%)' : 'Taux local applicable'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taux TVA Réduit (%)
                </label>
                <Controller
                  name="tauxTVAReduit"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      max="25"
                      placeholder="5.5"
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 5.5)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comptabilité analytique */}
      <div className="bg-[#ECECEC] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
          <Cog6ToothIcon className="h-5 w-5 mr-2" />
          Comptabilité Analytique
        </h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Controller
              name="activerAnalytique"
              control={control}
              render={({ field }) => (
                <input
                  type="checkbox"
                  {...field}
                  value=""
                  checked={field.value}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              )}
            />
            <div>
              <label className="text-sm font-medium text-gray-900">
                Activer la comptabilité analytique
              </label>
              <p className="text-xs text-gray-600">
                Suivi des coûts par centres, projets, départements
              </p>
            </div>
          </div>

          {watchedValues.activerAnalytique && (
            <div className="bg-white rounded-lg border border-[#6A8A82] p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre d'axes analytiques (1-10)
                  </label>
                  <Controller
                    name="nombreAxes"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>
                            {num} axe{num > 1 ? 's' : ''} - {getAxisDescription(num)}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  <div className="font-medium mb-2">Axes suggérés:</div>
                  <ul className="space-y-1 text-xs">
                    <li>• Axe 1: Centres de coûts</li>
                    <li>• Axe 2: Projets/Affaires</li>
                    <li>• Axe 3: Zones géographiques</li>
                    {watchedValues.nombreAxes > 3 && <li>• Axe 4: Départements</li>}
                    {watchedValues.nombreAxes > 4 && <li>• Axe 5: Produits/Services</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

// Composant Étape 3: Exercice Comptable
const FiscalYearConfigStep: React.FC<{ control: any; errors: any; watchedValues: any }> = ({
  control, errors, watchedValues
}) => (
  <div className="bg-[#F0F3F2] rounded-lg shadow-lg border border-gray-200 p-8">
    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
      <CalendarIcon className="h-6 w-6 mr-2 text-purple-600" />
      Exercice Comptable
    </h2>
    
    <div className="space-y-6">
      {/* Dates d'exercice */}
      <div className="bg-[#ECECEC] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-purple-900 mb-4">Période de l'Exercice</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
            <Controller
              name="dateDebut"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin *</label>
            <Controller
              name="dateFin"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durée en mois</label>
            <Controller
              name="dureeExercice"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={12}>12 mois (Standard)</option>
                  <option value={6}>6 mois (Premier exercice)</option>
                  <option value={18}>18 mois (Exercice exceptionnel)</option>
                </select>
              )}
            />
          </div>

          <div className="flex items-center space-x-3">
            <Controller
              name="exerciceDecale"
              control={control}
              render={({ field }) => (
                <input
                  type="checkbox"
                  {...field}
                  value=""
                  checked={field.value}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              )}
            />
            <div>
              <label className="text-sm font-medium text-gray-900">Exercice décalé</label>
              <p className="text-xs text-gray-600">Exercice ne commençant pas au 1er janvier</p>
            </div>
          </div>
        </div>
      </div>

      {/* Périodes comptables */}
      <div className="bg-[#ECECEC] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4">Découpage en Périodes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de périodes</label>
            <Controller
              name="periodesComptables"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="MENSUELLES">12 périodes mensuelles (Recommandé)</option>
                  <option value="TRIMESTRIELLES">4 périodes trimestrielles</option>
                  <option value="PERSONNALISEES">Périodes personnalisées</option>
                </select>
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mode de clôture</label>
            <Controller
              name="modeClotureAutomatique"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="MENSUELLE">Clôtures mensuelles automatiques</option>
                  <option value="TRIMESTRIELLE">Clôtures trimestrielles</option>
                  <option value="ANNUELLE">Clôture annuelle uniquement</option>
                </select>
              )}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-3">
          <Controller
            name="ouvertureAutomatique"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                {...field}
                value=""
                checked={field.value}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
            )}
          />
          <div>
            <label className="text-sm font-medium text-gray-900">
              Ouverture automatique de l'exercice suivant
            </label>
            <p className="text-xs text-gray-600">
              Report à-nouveaux automatique et ouverture N+1
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Composant Étape 4: Import Données
const ImportDataStep: React.FC<{ control: any; errors: any; watchedValues: any }> = ({
  control, errors, watchedValues
}) => (
  <div className="bg-[#F0F3F2] rounded-lg shadow-lg border border-gray-200 p-8">
    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
      <DocumentArrowUpIcon className="h-6 w-6 mr-2 text-orange-600" />
      Import Données Existantes
    </h2>
    
    <div className="space-y-6">
      {/* Activation import */}
      <div className="bg-[#ECECEC] rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Controller
            name="importerDonnees"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                {...field}
                value=""
                checked={field.value}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
            )}
          />
          <div>
            <label className="text-lg font-semibold text-orange-900">
              Importer des données existantes
            </label>
            <p className="text-sm text-gray-600">
              Récupérer votre comptabilité depuis un autre système
            </p>
          </div>
        </div>

        {watchedValues.importerDonnees && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Système source</label>
              <Controller
                name="sourceSystem"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Sélectionner le système source</option>
                    <option value="SAGE">Sage (Saari, 100, X3)</option>
                    <option value="CIEL">Ciel Comptabilité</option>
                    <option value="EXCEL">Fichiers Excel</option>
                    <option value="CSV">Fichiers CSV</option>
                    <option value="AUTRE">Autre système</option>
                  </select>
                )}
              />
            </div>

            {/* Options d'import détaillées */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  key: 'planComptable',
                  title: 'Plan comptable',
                  description: 'Comptes et leur hiérarchie',
                  formats: 'Excel, CSV',
                  mapping: true
                },
                {
                  key: 'balanceOuverture',
                  title: 'Balance d\'ouverture',
                  description: 'Soldes de début d\'exercice',
                  formats: 'Excel, CSV',
                  mapping: false
                },
                {
                  key: 'fichierTiers',
                  title: 'Fichier tiers',
                  description: 'Clients et fournisseurs',
                  formats: 'Excel, CSV, vCard',
                  mapping: true
                },
                {
                  key: 'immobilisations',
                  title: t('navigation.assets'),
                  description: 'Actifs et amortissements',
                  formats: 'Excel, CSV',
                  mapping: true
                }
              ].map((importOption) => (
                <div key={importOption.key} className="bg-white rounded-lg border border-orange-200 p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Controller
                      name={`${importOption.key}.importer`}
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          {...field}
                          value=""
                          checked={field.value}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      )}
                    />
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        {importOption.title}
                      </label>
                      <p className="text-xs text-gray-600">{importOption.description}</p>
                    </div>
                  </div>

                  {(watchedValues as any)[importOption.key]?.importer && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Fichier ({importOption.formats})
                        </label>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv,.txt"
                          className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                        />
                      </div>
                      
                      {importOption.mapping && (
                        <div className="flex items-center space-x-2">
                          <Controller
                            name={`${importOption.key}.mappingAuto`}
                            control={control}
                            render={({ field }) => (
                              <input
                                type="checkbox"
                                {...field}
                                value=""
                                checked={field.value}
                                className="h-3 w-3 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                            )}
                          />
                          <label className="text-xs text-gray-700">Mapping automatique SYSCOHADA</label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

// Fonctions utilitaires
const getAxisDescription = (num: number): string => {
  switch (num) {
    case 1: return 'Centres de coûts';
    case 2: return '+ Projets/Affaires';
    case 3: return '+ Zones géographiques';
    case 4: return '+ Départements';
    case 5: return '+ Produits/Services';
    default: return `+ ${num - 1} axes personnalisés`;
  }
};

export default CompanySetupWizard;