import React, { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import {
  BuildingOfficeIcon,
  PhotoIcon,
  GlobeAltIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const companySchema = z.object({
  // Informations juridiques - Seuls les champs essentiels sont obligatoires
  raisonSociale: z.string().min(2, 'Raison sociale obligatoire').optional().or(z.literal('')),
  nomCommercial: z.string().optional(),
  formeJuridique: z.enum(['SA', 'SARL', 'SAS', 'EI', 'GIE', 'COOP', 'ASSOC', 'SNC', 'SCS', 'GCV', 'SEP']).optional(),
  capital: z.number().min(0).optional(),
  dateCreation: z.string().optional(),

  // Identifiants légaux
  rccm: z.string().optional(),
  nif: z.string().optional(),
  numeroContribuable: z.string().optional(),
  cnps: z.string().optional(),
  patente: z.string().optional(),

  // Localisation
  pays: z.string().optional(),
  region: z.string().optional(),
  ville: z.string().optional(),
  quartier: z.string().optional(),
  adresse: z.string().optional(),
  boitePostale: z.string().optional(),
  codePostal: z.string().optional(),
  coordonneesGPS: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }).optional(),

  // Contacts
  telephone1: z.string().optional(),
  telephone2: z.string().optional(),
  mobile: z.string().optional(),
  fax: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  emailComptabilite: z.string().email().optional().or(z.literal('')),
  siteWeb: z.string().url().optional().or(z.literal('')),

  // Réseaux sociaux
  facebook: z.string().optional(),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),

  // Données économiques
  secteurActivite: z.string().optional(),
  activitePrincipale: z.string().optional(),
  effectif: z.number().min(0).optional(),
  chiffreAffaires: z.number().min(0).optional(),

  // Identité visuelle
  logo: z.any().optional(),
  cachet: z.any().optional(),
  signature: z.any().optional(),
  slogan: z.string().optional(),
  couleurPrimaire: z.string().optional(),
  couleurSecondaire: z.string().optional(),

  // Options
  multiEtablissements: z.boolean().default(false),
  nombreEtablissements: z.number().optional(),
  typeEntreprise: z.enum(['PME', 'GE', 'TPE', 'MULTI']).default('PME')
});

type CompanyFormData = z.infer<typeof companySchema>;

// Données des pays africains avec leurs devises
const africanCountries = {
  // Zone CEMAC (XAF)
  'Cameroun': { code: 'CM', devise: 'XAF', zone: 'CEMAC', indicatif: '+237' },
  'Gabon': { code: 'GA', devise: 'XAF', zone: 'CEMAC', indicatif: '+241' },
  'Tchad': { code: 'TD', devise: 'XAF', zone: 'CEMAC', indicatif: '+235' },
  'République Centrafricaine': { code: 'CF', devise: 'XAF', zone: 'CEMAC', indicatif: '+236' },
  'République du Congo': { code: 'CG', devise: 'XAF', zone: 'CEMAC', indicatif: '+242' },
  'Guinée Équatoriale': { code: 'GQ', devise: 'XAF', zone: 'CEMAC', indicatif: '+240' },

  // Zone UEMOA (XOF)
  'Côte d\'Ivoire': { code: 'CI', devise: 'XOF', zone: 'UEMOA', indicatif: '+225' },
  'Sénégal': { code: 'SN', devise: 'XOF', zone: 'UEMOA', indicatif: '+221' },
  'Mali': { code: 'ML', devise: 'XOF', zone: 'UEMOA', indicatif: '+223' },
  'Burkina Faso': { code: 'BF', devise: 'XOF', zone: 'UEMOA', indicatif: '+226' },
  'Niger': { code: 'NE', devise: 'XOF', zone: 'UEMOA', indicatif: '+227' },
  'Bénin': { code: 'BJ', devise: 'XOF', zone: 'UEMOA', indicatif: '+229' },
  'Togo': { code: 'TG', devise: 'XOF', zone: 'UEMOA', indicatif: '+228' },
  'Guinée-Bissau': { code: 'GW', devise: 'XOF', zone: 'UEMOA', indicatif: '+245' },

  // Autres devises
  'Nigeria': { code: 'NG', devise: 'NGN', zone: 'CEDEAO', indicatif: '+234' },
  'Ghana': { code: 'GH', devise: 'GHS', zone: 'CEDEAO', indicatif: '+233' },
  'Liberia': { code: 'LR', devise: 'LRD', zone: 'CEDEAO', indicatif: '+231' },
  'Sierra Leone': { code: 'SL', devise: 'SLL', zone: 'CEDEAO', indicatif: '+232' },
  'Guinée': { code: 'GN', devise: 'GNF', zone: 'CEDEAO', indicatif: '+224' },
  'Gambie': { code: 'GM', devise: 'GMD', zone: 'CEDEAO', indicatif: '+220' },
  'Cap-Vert': { code: 'CV', devise: 'CVE', zone: 'CEDEAO', indicatif: '+238' },

  // Afrique de l'Est
  'Kenya': { code: 'KE', devise: 'KES', zone: 'EAC', indicatif: '+254' },
  'Tanzanie': { code: 'TZ', devise: 'TZS', zone: 'EAC', indicatif: '+255' },
  'Ouganda': { code: 'UG', devise: 'UGX', zone: 'EAC', indicatif: '+256' },
  'Rwanda': { code: 'RW', devise: 'RWF', zone: 'EAC', indicatif: '+250' },
  'Burundi': { code: 'BI', devise: 'BIF', zone: 'EAC', indicatif: '+257' },
  'Éthiopie': { code: 'ET', devise: 'ETB', zone: 'IGAD', indicatif: '+251' },
  'Somalie': { code: 'SO', devise: 'SOS', zone: 'IGAD', indicatif: '+252' },
  'Djibouti': { code: 'DJ', devise: 'DJF', zone: 'IGAD', indicatif: '+253' },
  'Soudan': { code: 'SD', devise: 'SDG', zone: 'IGAD', indicatif: '+249' },
  'Soudan du Sud': { code: 'SS', devise: 'SSP', zone: 'IGAD', indicatif: '+211' },

  // Afrique Australe
  'Afrique du Sud': { code: 'ZA', devise: 'ZAR', zone: 'SADC', indicatif: '+27' },
  'Angola': { code: 'AO', devise: 'AOA', zone: 'SADC', indicatif: '+244' },
  'Mozambique': { code: 'MZ', devise: 'MZN', zone: 'SADC', indicatif: '+258' },
  'Zimbabwe': { code: 'ZW', devise: 'ZWL', zone: 'SADC', indicatif: '+263' },
  'Zambie': { code: 'ZM', devise: 'ZMW', zone: 'SADC', indicatif: '+260' },
  'Botswana': { code: 'BW', devise: 'BWP', zone: 'SADC', indicatif: '+267' },
  'Namibie': { code: 'NA', devise: 'NAD', zone: 'SADC', indicatif: '+264' },
  'Malawi': { code: 'MW', devise: 'MWK', zone: 'SADC', indicatif: '+265' },
  'Lesotho': { code: 'LS', devise: 'LSL', zone: 'SADC', indicatif: '+266' },
  'Eswatini': { code: 'SZ', devise: 'SZL', zone: 'SADC', indicatif: '+268' },
  'Madagascar': { code: 'MG', devise: 'MGA', zone: 'SADC', indicatif: '+261' },
  'Maurice': { code: 'MU', devise: 'MUR', zone: 'SADC', indicatif: '+230' },
  'Seychelles': { code: 'SC', devise: 'SCR', zone: 'SADC', indicatif: '+248' },
  'Comores': { code: 'KM', devise: 'KMF', zone: 'SADC', indicatif: '+269' },

  // Afrique du Nord
  'Maroc': { code: 'MA', devise: 'MAD', zone: 'UMA', indicatif: '+212' },
  'Algérie': { code: 'DZ', devise: 'DZD', zone: 'UMA', indicatif: '+213' },
  'Tunisie': { code: 'TN', devise: 'TND', zone: 'UMA', indicatif: '+216' },
  'Libye': { code: 'LY', devise: 'LYD', zone: 'UMA', indicatif: '+218' },
  'Égypte': { code: 'EG', devise: 'EGP', zone: 'LEA', indicatif: '+20' },
  'Mauritanie': { code: 'MR', devise: 'MRU', zone: 'UMA', indicatif: '+222' }
};

const EnhancedCompanyConfiguration: React.FC = () => {
  const [activeTab, setActiveTab] = useState('juridique');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [cachetPreview, setCachetPreview] = useState<string>('');
  const [signaturePreview, setSignaturePreview] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState('Cameroun');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const cachetInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const { control, handleSubmit, watch, formState: { errors }, setValue } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      pays: 'Cameroun',
      formeJuridique: 'SARL',
      effectif: 1,
      chiffreAffaires: 0,
      multiEtablissements: false,
      typeEntreprise: 'PME',
      capital: 1000000,
      couleurPrimaire: '#1e40af',
      couleurSecondaire: '#059669'
    }
  });

  const watchedValues = watch();

  const tabs = [
    { id: 'juridique', label: 'Informations Juridiques', icon: ShieldCheckIcon },
    { id: 'localisation', label: 'Localisation', icon: MapPinIcon },
    { id: 'contacts', label: 'Contacts', icon: PhoneIcon },
    { id: 'economique', label: 'Données Économiques', icon: BanknotesIcon },
    { id: 'visuelle', label: 'Identité Visuelle', icon: PhotoIcon },
    { id: 'etablissements', label: 'Multi-Établissements', icon: BuildingOffice2Icon }
  ];

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'cachet' | 'signature'
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast(`Le fichier ${type} doit faire moins de 5MB`);
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'].includes(file.type)) {
        toast('Format autorisé: JPG, PNG, GIF, SVG');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        switch (type) {
          case 'logo':
            setLogoPreview(preview);
            setValue('logo', file);
            break;
          case 'cachet':
            setCachetPreview(preview);
            setValue('cachet', file);
            break;
          case 'signature':
            setSignaturePreview(preview);
            setValue('signature', file);
            break;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (type: 'logo' | 'cachet' | 'signature') => {
    switch (type) {
      case 'logo':
        setLogoPreview('');
        setValue('logo', undefined);
        if (logoInputRef.current) logoInputRef.current.value = '';
        break;
      case 'cachet':
        setCachetPreview('');
        setValue('cachet', undefined);
        if (cachetInputRef.current) cachetInputRef.current.value = '';
        break;
      case 'signature':
        setSignaturePreview('');
        setValue('signature', undefined);
        if (signatureInputRef.current) signatureInputRef.current.value = '';
        break;
    }
  };

  const onSubmit = (data: CompanyFormData) => {
    toast.success('Configuration enregistrée avec succès !', {
      duration: 4000,
      position: 'top-right',
    });
  };

  const onError = (errors: Record<string, { message?: string }>) => {
    console.error('Erreurs de validation:', errors);
    const firstError = Object.values(errors)[0];
    toast.error(firstError?.message || 'Veuillez corriger les erreurs du formulaire', {
      duration: 4000,
      position: 'top-right',
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* En-tête */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 mr-3 text-[var(--color-primary)]" />
              Configuration de l'Entreprise
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Configuration complète avec support multi-pays et identité visuelle
            </p>
          </div>
          {selectedCountry && africanCountries[selectedCountry as keyof typeof africanCountries] && (
            <div className="text-right">
              <div className="text-sm text-[var(--color-text-tertiary)]">Pays sélectionné</div>
              <div className="text-lg font-semibold text-[var(--color-primary)]">{selectedCountry}</div>
              <div className="text-sm text-[var(--color-text-secondary)]">
                Devise: {africanCountries[selectedCountry as keyof typeof africanCountries].devise}
                ({africanCountries[selectedCountry as keyof typeof africanCountries].zone})
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] mb-6">
        <div className="flex flex-wrap border-b border-[var(--color-border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit, onError)} className="p-6">
          {/* Tab: Informations Juridiques */}
          {activeTab === 'juridique' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
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
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                  {errors.raisonSociale && (
                    <p className="text-[var(--color-error)] text-sm mt-1">{errors.raisonSociale.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Nom commercial
                  </label>
                  <Controller
                    name="nomCommercial"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="Atlas Finance Pro"
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Forme juridique *
                  </label>
                  <Controller
                    name="formeJuridique"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <option value="SARL">SARL - Société à Responsabilité Limitée</option>
                        <option value="SA">SA - Société Anonyme</option>
                        <option value="SAS">SAS - Société par Actions Simplifiée</option>
                        <option value="EI">EI - Entreprise Individuelle</option>
                        <option value="GIE">GIE - Groupement d'Intérêt Économique</option>
                        <option value="COOP">Coopérative</option>
                        <option value="ASSOC">Association</option>
                        <option value="SNC">SNC - Société en Nom Collectif</option>
                        <option value="SCS">SCS - Société en Commandite Simple</option>
                        <option value="GCV">GCV - Groupement à Capital Variable</option>
                        <option value="SEP">SEP - Société en Participation</option>
                      </select>
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Capital social *
                  </label>
                  <Controller
                    name="capital"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="number"
                        min="0"
                        placeholder="1000000"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                  {errors.capital && (
                    <p className="text-[var(--color-error)] text-sm mt-1">{errors.capital.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Date de création *
                  </label>
                  <Controller
                    name="dateCreation"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="date"
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                  {errors.dateCreation && (
                    <p className="text-[var(--color-error)] text-sm mt-1">{errors.dateCreation.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Type d'entreprise
                  </label>
                  <Controller
                    name="typeEntreprise"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <option value="TPE">TPE - Très Petite Entreprise</option>
                        <option value="PME">PME - Petite et Moyenne Entreprise</option>
                        <option value="GE">GE - Grande Entreprise</option>
                        <option value="MULTI">Multinationale</option>
                      </select>
                    )}
                  />
                </div>
              </div>

              {/* Identifiants légaux */}
              <div className="bg-[var(--color-info-light)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[var(--color-info)] mb-4 flex items-center">
                  <IdentificationIcon className="h-5 w-5 mr-2" />
                  Identifiants Légaux
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                      RCCM * <span className="text-xs text-[var(--color-text-tertiary)]">(Registre du Commerce)</span>
                    </label>
                    <Controller
                      name="rccm"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          placeholder="RC/YAE/2024/B/1234"
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                        />
                      )}
                    />
                    {errors.rccm && (
                      <p className="text-[var(--color-error)] text-sm mt-1">{errors.rccm.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                      NIF * <span className="text-xs text-[var(--color-text-tertiary)]">(Numéro d'Identification Fiscale)</span>
                    </label>
                    <Controller
                      name="nif"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          placeholder="M051234567890"
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                        />
                      )}
                    />
                    {errors.nif && (
                      <p className="text-[var(--color-error)] text-sm mt-1">{errors.nif.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
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
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                      CNPS <span className="text-xs text-[var(--color-text-tertiary)]">(Caisse Nationale de Prévoyance Sociale)</span>
                    </label>
                    <Controller
                      name="cnps"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          placeholder="123456789"
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                      Patente
                    </label>
                    <Controller
                      name="patente"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          placeholder="PAT2024/1234"
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Localisation */}
          {activeTab === 'localisation' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Pays * <span className="text-xs text-[var(--color-text-tertiary)]">(54 pays africains)</span>
                  </label>
                  <Controller
                    name="pays"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSelectedCountry(e.target.value);
                        }}
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <optgroup label="Zone CEMAC (XAF)">
                          {Object.entries(africanCountries)
                            .filter(([_, info]) => info.zone === 'CEMAC')
                            .map(([country, info]) => (
                              <option key={country} value={country}>
                                {country} ({info.code})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Zone UEMOA (XOF)">
                          {Object.entries(africanCountries)
                            .filter(([_, info]) => info.zone === 'UEMOA')
                            .map(([country, info]) => (
                              <option key={country} value={country}>
                                {country} ({info.code})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="CEDEAO (Autres devises)">
                          {Object.entries(africanCountries)
                            .filter(([_, info]) => info.zone === 'CEDEAO')
                            .map(([country, info]) => (
                              <option key={country} value={country}>
                                {country} ({info.devise})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Afrique de l'Est">
                          {Object.entries(africanCountries)
                            .filter(([_, info]) => info.zone === 'EAC' || info.zone === 'IGAD')
                            .map(([country, info]) => (
                              <option key={country} value={country}>
                                {country} ({info.devise})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Afrique Australe">
                          {Object.entries(africanCountries)
                            .filter(([_, info]) => info.zone === 'SADC')
                            .map(([country, info]) => (
                              <option key={country} value={country}>
                                {country} ({info.devise})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Afrique du Nord">
                          {Object.entries(africanCountries)
                            .filter(([_, info]) => info.zone === 'UMA' || info.zone === 'LEA')
                            .map(([country, info]) => (
                              <option key={country} value={country}>
                                {country} ({info.devise})
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    )}
                  />
                  {errors.pays && (
                    <p className="text-[var(--color-error)] text-sm mt-1">{errors.pays.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Région/Province
                  </label>
                  <Controller
                    name="region"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="Centre"
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Ville *
                  </label>
                  <Controller
                    name="ville"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="Yaoundé"
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                  {errors.ville && (
                    <p className="text-[var(--color-error)] text-sm mt-1">{errors.ville.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Quartier
                  </label>
                  <Controller
                    name="quartier"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="Bastos"
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Adresse complète *
                  </label>
                  <Controller
                    name="adresse"
                    control={control}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={3}
                        placeholder="Rue, Numéro, Repères..."
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                  {errors.adresse && (
                    <p className="text-[var(--color-error)] text-sm mt-1">{errors.adresse.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Boîte postale
                  </label>
                  <Controller
                    name="boitePostale"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="BP 1234"
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Code postal
                  </label>
                  <Controller
                    name="codePostal"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="00237"
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Contacts */}
          {activeTab === 'contacts' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Téléphone principal *
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-tertiary)] text-sm">
                      {selectedCountry && africanCountries[selectedCountry as keyof typeof africanCountries]?.indicatif}
                    </span>
                    <Controller
                      name="telephone1"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          placeholder="6XX XX XX XX"
                          className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      )}
                    />
                  </div>
                  {errors.telephone1 && (
                    <p className="text-[var(--color-error)] text-sm mt-1">{errors.telephone1.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Téléphone secondaire
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-tertiary)] text-sm">
                      {selectedCountry && africanCountries[selectedCountry as keyof typeof africanCountries]?.indicatif}
                    </span>
                    <Controller
                      name="telephone2"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          placeholder="6XX XX XX XX"
                          className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Mobile
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-tertiary)] text-sm">
                      {selectedCountry && africanCountries[selectedCountry as keyof typeof africanCountries]?.indicatif}
                    </span>
                    <Controller
                      name="mobile"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          placeholder="6XX XX XX XX"
                          className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Fax
                  </label>
                  <Controller
                    name="fax"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="tel"
                        placeholder="+237 2XX XX XX XX"
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Email principal *
                  </label>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="email"
                        placeholder="contact@atlasfinance.com"
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                  {errors.email && (
                    <p className="text-[var(--color-error)] text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Email comptabilité
                  </label>
                  <Controller
                    name="emailComptabilite"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="email"
                        placeholder="comptabilite@atlasfinance.com"
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Site web
                  </label>
                  <Controller
                    name="siteWeb"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="url"
                        placeholder="https://www.atlasfinance.com"
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                </div>
              </div>

              {/* Réseaux sociaux */}
              <div className="bg-[var(--color-info-light)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[var(--color-info)] mb-4">Réseaux Sociaux</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                      Facebook
                    </label>
                    <Controller
                      name="facebook"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          placeholder="facebook.com/atlasfinance"
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                      LinkedIn
                    </label>
                    <Controller
                      name="linkedin"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          placeholder="linkedin.com/company/atlasfinance"
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                      Twitter
                    </label>
                    <Controller
                      name="twitter"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          placeholder="@atlasfinance"
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Données Économiques */}
          {activeTab === 'economique' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Secteur d'activité *
                  </label>
                  <Controller
                    name="secteurActivite"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
                    <p className="text-[var(--color-error)] text-sm mt-1">{errors.secteurActivite.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Effectif *
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
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                  {errors.effectif && (
                    <p className="text-[var(--color-error)] text-sm mt-1">{errors.effectif.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Chiffre d'affaires annuel *
                    <span className="text-xs text-[var(--color-text-tertiary)] ml-2">
                      ({selectedCountry && africanCountries[selectedCountry as keyof typeof africanCountries]?.devise})
                    </span>
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
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    )}
                  />
                  {errors.chiffreAffaires && (
                    <p className="text-[var(--color-error)] text-sm mt-1">{errors.chiffreAffaires.message}</p>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Description de l'activité principale *
                </label>
                <Controller
                  name="activitePrincipale"
                  control={control}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      rows={4}
                      placeholder="Décrivez votre activité principale..."
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  )}
                />
                {errors.activitePrincipale && (
                  <p className="text-[var(--color-error)] text-sm mt-1">{errors.activitePrincipale.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Tab: Identité Visuelle */}
          {activeTab === 'visuelle' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Logo */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Logo de l'entreprise</h3>
                  <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-6 text-center hover:border-[var(--color-surface-hover)] transition-colors">
                    {logoPreview ? (
                      <div className="space-y-4">
                        <img
                          src={logoPreview}
                          alt="Logo"
                          className="max-h-32 mx-auto rounded-lg shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile('logo')}
                          className="text-[var(--color-error)] hover:text-[var(--color-error)] font-medium flex items-center justify-center mx-auto"
                        >
                          <XMarkIcon className="h-5 w-5 mr-1" />
                          Supprimer
                        </button>
                      </div>
                    ) : (
                      <>
                        <PhotoIcon className="h-12 w-12 mx-auto text-[var(--color-text-tertiary)] mb-3" />
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium"
                        >
                          Télécharger le logo
                        </button>
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-2">JPG, PNG, GIF ou SVG (max 5MB)</p>
                      </>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/svg+xml"
                      onChange={(e) => handleFileUpload(e, 'logo')}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Cachet */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Cachet de l'entreprise</h3>
                  <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-6 text-center hover:border-[var(--color-surface-hover)] transition-colors">
                    {cachetPreview ? (
                      <div className="space-y-4">
                        <img
                          src={cachetPreview}
                          alt="Cachet"
                          className="max-h-32 mx-auto rounded-lg shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile('cachet')}
                          className="text-[var(--color-error)] hover:text-[var(--color-error)] font-medium flex items-center justify-center mx-auto"
                        >
                          <XMarkIcon className="h-5 w-5 mr-1" />
                          Supprimer
                        </button>
                      </div>
                    ) : (
                      <>
                        <DocumentTextIcon className="h-12 w-12 mx-auto text-[var(--color-text-tertiary)] mb-3" />
                        <button
                          type="button"
                          onClick={() => cachetInputRef.current?.click()}
                          className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium"
                        >
                          Télécharger le cachet
                        </button>
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-2">JPG, PNG, GIF ou SVG (max 5MB)</p>
                      </>
                    )}
                    <input
                      ref={cachetInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/svg+xml"
                      onChange={(e) => handleFileUpload(e, 'cachet')}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Signature */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Signature autorisée</h3>
                  <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-6 text-center hover:border-[var(--color-surface-hover)] transition-colors">
                    {signaturePreview ? (
                      <div className="space-y-4">
                        <img
                          src={signaturePreview}
                          alt="Signature"
                          className="max-h-32 mx-auto rounded-lg shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile('signature')}
                          className="text-[var(--color-error)] hover:text-[var(--color-error)] font-medium flex items-center justify-center mx-auto"
                        >
                          <XMarkIcon className="h-5 w-5 mr-1" />
                          Supprimer
                        </button>
                      </div>
                    ) : (
                      <>
                        <IdentificationIcon className="h-12 w-12 mx-auto text-[var(--color-text-tertiary)] mb-3" />
                        <button
                          type="button"
                          onClick={() => signatureInputRef.current?.click()}
                          className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium"
                        >
                          Télécharger la signature
                        </button>
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-2">JPG, PNG, GIF ou SVG (max 5MB)</p>
                      </>
                    )}
                    <input
                      ref={signatureInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/svg+xml"
                      onChange={(e) => handleFileUpload(e, 'signature')}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Charte graphique */}
              <div className="bg-[var(--color-primary-light)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Charte Graphique</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                      Slogan de l'entreprise
                    </label>
                    <Controller
                      name="slogan"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          placeholder="Votre partenaire comptable de confiance"
                          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                        Couleur primaire
                      </label>
                      <div className="flex items-center space-x-2">
                        <Controller
                          name="couleurPrimaire"
                          control={control}
                          render={({ field }) => (
                            <>
                              <input
                                {...field}
                                type="color"
                                className="h-10 w-20 rounded border border-[var(--color-border)]"
                              />
                              <input
                                {...field}
                                type="text"
                                placeholder="#1e40af"
                                className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                              />
                            </>
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                        Couleur secondaire
                      </label>
                      <div className="flex items-center space-x-2">
                        <Controller
                          name="couleurSecondaire"
                          control={control}
                          render={({ field }) => (
                            <>
                              <input
                                {...field}
                                type="color"
                                className="h-10 w-20 rounded border border-[var(--color-border)]"
                              />
                              <input
                                {...field}
                                type="text"
                                placeholder="#059669"
                                className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                              />
                            </>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Multi-Établissements */}
          {activeTab === 'etablissements' && (
            <div className="space-y-6">
              <div className="bg-[var(--color-warning-light)] border border-[var(--color-warning)] rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <BuildingOffice2Icon className="h-6 w-6 text-[var(--color-warning)]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[var(--color-warning)] mb-2">
                      Configuration Multi-Établissements
                    </h3>
                    <p className="text-sm text-[var(--color-warning)] mb-4">
                      Cette fonctionnalité permet de gérer plusieurs sites, filiales ou succursales
                      avec une comptabilité centralisée ou décentralisée.
                    </p>

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
                            className="h-4 w-4 text-[var(--color-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-primary)]"
                          />
                        )}
                      />
                      <label className="text-sm font-medium text-[var(--color-text-primary)]">
                        Activer la gestion multi-établissements
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {watchedValues.multiEtablissements && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                    Configuration des établissements
                  </h4>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                      Nombre d'établissements
                    </label>
                    <Controller
                      name="nombreEtablissements"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="2"
                          max="100"
                          placeholder="2"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                          className="w-full max-w-xs px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      )}
                    />
                  </div>

                  <div className="bg-[var(--color-info-light)] rounded-lg p-4">
                    <h5 className="font-medium text-[var(--color-info)] mb-2">Options disponibles:</h5>
                    <ul className="space-y-2 text-sm text-[var(--color-info)]">
                      <li className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 text-[var(--color-info)]" />
                        Comptabilité centralisée avec ventilation par établissement
                      </li>
                      <li className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 text-[var(--color-info)]" />
                        Plan comptable spécifique par établissement
                      </li>
                      <li className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 text-[var(--color-info)]" />
                        Journaux dédiés par site
                      </li>
                      <li className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 text-[var(--color-info)]" />
                        Reporting consolidé et par établissement
                      </li>
                      <li className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 text-[var(--color-info)]" />
                        Gestion des transferts inter-établissements
                      </li>
                    </ul>
                  </div>

                  <div className="mt-4 text-sm text-[var(--color-text-secondary)]">
                    <p>
                      Vous pourrez configurer chaque établissement en détail après la validation
                      de cette configuration initiale.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Boutons de soumission */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-[var(--color-border)]">
            <button
              type="button"
              className="px-6 py-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[var(--color-primary)] text-[var(--color-surface)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors flex items-center"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Enregistrer la configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnhancedCompanyConfiguration;