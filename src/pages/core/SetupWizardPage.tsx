/**
 * Assistant de Configuration Initial Atlas Finance
 * Paramétrage complet selon EXP-PAR-001 à EXP-PAR-010
 */
import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useForm, FormProvider } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import {
  Building2,
  Calculator,
  Calendar,
  Upload,
  CheckCircle,
  Globe,
  FileText,
  Users,
  Shield,
  Settings,
  ArrowRight,
  ArrowLeft,
  Save,
  Download,
  AlertTriangle,
  Info,
  ChevronRight
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  RadioGroup,
  RadioGroupItem,
  Checkbox,
  Badge,
  Alert,
  AlertDescription,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../../components/ui';

interface SetupData {
  company: {
    raisonSociale: string;
    formeJuridique: string;
    rccm: string;
    nif: string;
    numeroContribuable: string;
    adresse: string;
    telephone: string;
    email: string;
    siteWeb: string;
    secteurActivite: string;
    effectif: number;
    chiffreAffaires: number;
    logo?: File;
    multiEtablissements: boolean;
  };
  accounting: {
    referentiel: 'SYSCOHADA_NORMAL' | 'SYSCOHADA_ALLEGE' | 'SYSCOHADA_MINIMAL';
    planComptable: 'GENERAL' | 'BANQUE' | 'ASSURANCE' | 'MICROFINANCE';
    longueurComptes: 6 | 7 | 8 | 9;
    analytique: boolean;
    nbAxes: number;
    devisePrincipale: 'XOF' | 'XAF' | 'EUR' | 'USD';
    devisesSecondaires: string[];
    tvaActive: boolean;
  };
  fiscalYear: {
    dateDebut: Date;
    dateFin: Date;
    duree: number;
    exerciceDecale: boolean;
    periodesComptables: 'MENSUELLES' | 'TRIMESTRIELLES' | 'PERSONNALISEES';
    clotureMode: 'MENSUELLE' | 'TRIMESTRIELLE';
  };
  import: {
    importPlanComptable: boolean;
    importBalance: boolean;
    importTiers: boolean;
    importImmobilisations: boolean;
    files: {
      planComptable?: File;
      balance?: File;
      tiers?: File;
      immobilisations?: File;
    };
  };
}

const SETUP_STEPS = [
  { id: 'company', label: 'Informations Entreprise', icon: Building2, description: 'Identité et coordonnées de votre entreprise' },
  { id: 'accounting', label: 'Configuration Comptable', icon: Calculator, description: 'Référentiel SYSCOHADA et paramètres comptables' },
  { id: 'fiscal-year', label: 'Exercice Comptable', icon: Calendar, description: 'Périodes et calendrier comptable' },
  { id: 'import', label: 'Import Données', icon: Upload, description: 'Récupération des données existantes' },
  { id: 'review', label: 'Validation', icon: CheckCircle, description: 'Vérification et finalisation' }
];

const SECTEURS_ACTIVITE = [
  'Agriculture, élevage, chasse et sylviculture',
  'Pêche, aquaculture',
  'Industries extractives',
  'Industries manufacturières',
  'Production et distribution d\'électricité, gaz, eau',
  'Construction',
  'Commerce de gros et de détail; réparations',
  'Hôtels et restaurants',
  'Transports, entrepôts et communications',
  'Activités financières',
  'Immobilier, location et services aux entreprises',
  'Administration publique',
  'Éducation',
  'Santé et action sociale',
  'Services collectifs, sociaux et personnels'
];

const FORMES_JURIDIQUES = [
  'Société Anonyme (SA)',
  'Société à Responsabilité Limitée (SARL)',
  'Société en Nom Collectif (SNC)',
  'Société en Commandite Simple (SCS)',
  'Entreprise Individuelle',
  'Société Unipersonnelle à Responsabilité Limitée (SUARL)',
  'Groupement d\'Intérêt Économique (GIE)',
  'Société Coopérative',
  'Association',
  'Autre'
];

const SetupWizardPage: React.FC = () => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  
  const methods = useForm<SetupData>({
    defaultValues: {
      company: {
        raisonSociale: '',
        formeJuridique: '',
        rccm: '',
        nif: '',
        numeroContribuable: '',
        adresse: '',
        telephone: '',
        email: '',
        siteWeb: '',
        secteurActivite: '',
        effectif: 1,
        chiffreAffaires: 0,
        multiEtablissements: false
      },
      accounting: {
        referentiel: 'SYSCOHADA_NORMAL',
        planComptable: 'GENERAL',
        longueurComptes: 9,
        analytique: false,
        nbAxes: 1,
        devisePrincipale: 'XAF',
        devisesSecondaires: [],
        tvaActive: true
      },
      fiscalYear: {
        dateDebut: new Date(new Date().getFullYear(), 0, 1),
        dateFin: new Date(new Date().getFullYear(), 11, 31),
        duree: 12,
        exerciceDecale: false,
        periodesComptables: 'MENSUELLES',
        clotureMode: 'MENSUELLE'
      },
      import: {
        importPlanComptable: false,
        importBalance: false,
        importTiers: false,
        importImmobilisations: false,
        files: {}
      }
    }
  });

  const { mutate: finalizeSetup } = useMutation({
    mutationFn: async (setupData: SetupData) => {
      // Simulation API call pour finaliser la configuration
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, message: 'Configuration terminée avec succès' });
        }, 2000);
      });
    },
    onSuccess: () => {
      alert('Configuration terminée avec succès !');
      window.location.href = '/dashboard';
    }
  });

  const handleNext = async () => {
    const stepNames = ['company', 'accounting', 'fiscal-year', 'import'];
    const currentStepName = stepNames[currentStep];
    
    if (currentStepName) {
      const isValid = await methods.trigger(currentStepName as keyof SetupData);
      if (!isValid) return;
    }
    
    if (currentStep < SETUP_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Finaliser la configuration
      setIsCompleting(true);
      const formData = methods.getValues();
      await finalizeSetup(formData);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const renderCompanyStep = () => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="raisonSociale">Raison Sociale *</Label>
          <Input
            id="raisonSociale"
            {...methods.register('company.raisonSociale', { required: 'Raison sociale requise' })}
            placeholder="Nom de votre entreprise"
          />
          {methods.formState.errors.company?.raisonSociale && (
            <p className="text-red-500 text-sm mt-1">
              {methods.formState.errors.company.raisonSociale.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="formeJuridique">Forme Juridique *</Label>
          <Select onValueChange={(value) => methods.setValue('company.formeJuridique', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une forme" />
            </SelectTrigger>
            <SelectContent>
              {FORMES_JURIDIQUES.map((forme) => (
                <SelectItem key={forme} value={forme}>{forme}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="rccm">RCCM *</Label>
          <Input
            id="rccm"
            {...methods.register('company.rccm', { required: 'RCCM requis' })}
            placeholder="RC/YAO/2024/B/12345"
          />
        </div>

        <div>
          <Label htmlFor="nif">NIF *</Label>
          <Input
            id="nif"
            {...methods.register('company.nif', { required: 'NIF requis' })}
            placeholder="M071234567890P"
          />
        </div>

        <div>
          <Label htmlFor="numeroContribuable">Numéro Contribuable</Label>
          <Input
            id="numeroContribuable"
            {...methods.register('company.numeroContribuable')}
            placeholder="1234567890"
          />
        </div>

        <div>
          <Label htmlFor="secteurActivite">Secteur d'Activité *</Label>
          <Select onValueChange={(value) => methods.setValue('company.secteurActivite', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un secteur" />
            </SelectTrigger>
            <SelectContent>
              {SECTEURS_ACTIVITE.map((secteur) => (
                <SelectItem key={secteur} value={secteur}>{secteur}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="adresse">Adresse Siège Social *</Label>
        <Input
          id="adresse"
          {...methods.register('company.adresse', { required: 'Adresse requise' })}
          placeholder="Adresse complète du siège social"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="telephone">Téléphone</Label>
          <Input
            id="telephone"
            {...methods.register('company.telephone')}
            placeholder="+237 6XX XXX XXX"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...methods.register('company.email')}
            placeholder="contact@entreprise.com"
          />
        </div>

        <div>
          <Label htmlFor="siteWeb">Site Web</Label>
          <Input
            id="siteWeb"
            {...methods.register('company.siteWeb')}
            placeholder="https://www.entreprise.com"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="effectif">Effectif Moyen</Label>
          <Input
            id="effectif"
            type="number"
            {...methods.register('company.effectif', { valueAsNumber: true })}
            placeholder="Nombre d'employés"
          />
        </div>

        <div>
          <Label htmlFor="chiffreAffaires">Chiffre d'Affaires Annuel (XAF)</Label>
          <Input
            id="chiffreAffaires"
            type="number"
            {...methods.register('company.chiffreAffaires', { valueAsNumber: true })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="multiEtablissements"
          {...methods.register('company.multiEtablissements')}
        />
        <Label htmlFor="multiEtablissements">
          Cette entreprise a plusieurs établissements
        </Label>
      </div>
    </div>
  );

  const renderAccountingStep = () => (
    <div className="space-y-8">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          La configuration comptable détermine les règles de fonctionnement de votre système comptable selon les normes SYSCOHADA.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Référentiel SYSCOHADA</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={methods.watch('accounting.referentiel')} 
              onValueChange={(value: string) => methods.setValue('accounting.referentiel', value as SetupData['accounting']['referentiel'])}
              className="space-y-4"
            >
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="SYSCOHADA_NORMAL" id="normal" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="normal" className="font-medium">Système Normal</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Pour entreprises avec CA {">"} 100M XAF. Plan comptable complet, tous états obligatoires.
                  </p>
                  <Badge variant="outline" className="mt-2">Recommandé</Badge>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="SYSCOHADA_ALLEGE" id="allege" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="allege" className="font-medium">Système Allégé</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Pour PME avec 30M {"<"} CA {"<"} 100M XAF. États simplifiés, comptabilité réduite.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="SYSCOHADA_MINIMAL" id="minimal" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="minimal" className="font-medium">Système Minimal</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Pour très petites entreprises CA {"<"} 30M XAF. Tenue simplifiée.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plan Comptable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="planComptable">Type de Plan</Label>
              <Select onValueChange={(value: string) => methods.setValue('accounting.planComptable', value as SetupData['accounting']['planComptable'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Plan Général" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">Plan Général</SelectItem>
                  <SelectItem value="BANQUE">Plan Bancaire</SelectItem>
                  <SelectItem value="ASSURANCE">Plan Assurance</SelectItem>
                  <SelectItem value="MICROFINANCE">Plan Microfinance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="longueurComptes">Longueur des Comptes</Label>
              <Select onValueChange={(value) => methods.setValue('accounting.longueurComptes', parseInt(value) as SetupData['accounting']['longueurComptes'])}>
                <SelectTrigger>
                  <SelectValue placeholder="9 positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 positions (minimal)</SelectItem>
                  <SelectItem value="7">7 positions</SelectItem>
                  <SelectItem value="8">8 positions</SelectItem>
                  <SelectItem value="9">9 positions (recommandé)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="devisePrincipale">Devise Principale</Label>
              <Select onValueChange={(value: string) => methods.setValue('accounting.devisePrincipale', value as SetupData['accounting']['devisePrincipale'])}>
                <SelectTrigger>
                  <SelectValue placeholder="XAF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XAF">XAF - Franc CFA (CEMAC)</SelectItem>
                  <SelectItem value="XOF">XOF - Franc CFA (UEMOA)</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="USD">USD - Dollar US</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comptabilité Analytique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="analytique"
              {...methods.register('accounting.analytique')}
            />
            <Label htmlFor="analytique">
              Activer la comptabilité analytique (centres de coûts, projets, etc.)
            </Label>
          </div>

          {methods.watch('accounting.analytique') && (
            <div>
              <Label htmlFor="nbAxes">Nombre d'axes analytiques</Label>
              <Select onValueChange={(value) => methods.setValue('accounting.nbAxes', parseInt(value))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="1" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n} axe{n > 1 ? 's' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 mt-1">
                Exemples: Axe 1 = Centres de coûts, Axe 2 = Projets, Axe 3 = Zones géographiques
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="tvaActive"
              {...methods.register('accounting.tvaActive')}
            />
            <Label htmlFor="tvaActive">
              Activer la gestion de la TVA
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFiscalYearStep = () => (
    <div className="space-y-6">
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          L'exercice comptable définit la période sur laquelle votre comptabilité est tenue. La durée standard est de 12 mois.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="dateDebut">Date de Début d'Exercice *</Label>
          <Input
            id="dateDebut"
            type="date"
            {...methods.register('fiscalYear.dateDebut', { 
              required: 'Date de début requise',
              valueAsDate: true 
            })}
          />
          <p className="text-sm text-gray-600 mt-1">
            Date de début du premier exercice comptable
          </p>
        </div>

        <div>
          <Label htmlFor="dateFin">Date de Fin d'Exercice *</Label>
          <Input
            id="dateFin"
            type="date"
            {...methods.register('fiscalYear.dateFin', { 
              required: 'Date de fin requise',
              valueAsDate: true 
            })}
          />
          <p className="text-sm text-gray-600 mt-1">
            Date de fin du premier exercice comptable
          </p>
        </div>
      </div>

      <div>
        <Label>Périodes Comptables</Label>
        <RadioGroup 
          value={methods.watch('fiscalYear.periodesComptables')} 
          onValueChange={(value: string) => methods.setValue('fiscalYear.periodesComptables', value as SetupData['fiscalYear']['periodesComptables'])}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="MENSUELLES" id="mensuelles" />
            <Label htmlFor="mensuelles">12 périodes mensuelles (recommandé)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="TRIMESTRIELLES" id="trimestrielles" />
            <Label htmlFor="trimestrielles">4 périodes trimestrielles</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="PERSONNALISEES" id="personnalisees" />
            <Label htmlFor="personnalisees">Périodes personnalisées</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Mode de Clôture</Label>
        <RadioGroup 
          value={methods.watch('fiscalYear.clotureMode')} 
          onValueChange={(value: string) => methods.setValue('fiscalYear.clotureMode', value as SetupData['fiscalYear']['clotureMode'])}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="MENSUELLE" id="cloture-mensuelle" />
            <Label htmlFor="cloture-mensuelle">Clôture mensuelle (recommandé)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="TRIMESTRIELLE" id="cloture-trimestrielle" />
            <Label htmlFor="cloture-trimestrielle">Clôture trimestrielle</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="exerciceDecale"
          {...methods.register('fiscalYear.exerciceDecale')}
        />
        <Label htmlFor="exerciceDecale">
          Exercice décalé (exercice ne correspondant pas à l'année civile)
        </Label>
      </div>
    </div>
  );

  const renderImportStep = () => (
    <div className="space-y-6">
      <Alert>
        <Upload className="h-4 w-4" />
        <AlertDescription>
          Importez vos données existantes pour démarrer rapidement. Les formats supportés : Excel (.xlsx), CSV.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plan Comptable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="importPlanComptable"
                {...methods.register('import.importPlanComptable')}
              />
              <Label htmlFor="importPlanComptable">
                Importer un plan comptable existant
              </Label>
            </div>
            
            {methods.watch('import.importPlanComptable') && (
              <div>
                <Label htmlFor="planComptableFile">Fichier Plan Comptable</Label>
                <Input
                  id="planComptableFile"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) methods.setValue('import.files.planComptable', file);
                  }}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Format: Compte | Libellé | Classe | Type
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Balance d'Ouverture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="importBalance"
                {...methods.register('import.importBalance')}
              />
              <Label htmlFor="importBalance">
                Importer la balance d'ouverture
              </Label>
            </div>
            
            {methods.watch('import.importBalance') && (
              <div>
                <Label htmlFor="balanceFile">Fichier Balance</Label>
                <Input
                  id="balanceFile"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) methods.setValue('import.files.balance', file);
                  }}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Format: Compte | Libellé | Débit | Crédit
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fichier Tiers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="importTiers"
                {...methods.register('import.importTiers')}
              />
              <Label htmlFor="importTiers">
                Importer les tiers (clients/fournisseurs)
              </Label>
            </div>
            
            {methods.watch('import.importTiers') && (
              <div>
                <Label htmlFor="tiersFile">Fichier Tiers</Label>
                <Input
                  id="tiersFile"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) methods.setValue('import.files.tiers', file);
                  }}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Format: Code | Nom | Type | Compte | Contact
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('navigation.assets')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="importImmobilisations"
                {...methods.register('import.importImmobilisations')}
              />
              <Label htmlFor="importImmobilisations">
                Importer les immobilisations
              </Label>
            </div>
            
            {methods.watch('import.importImmobilisations') && (
              <div>
                <Label htmlFor="immobilisationsFile">Fichier Immobilisations</Label>
                <Input
                  id="immobilisationsFile"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) methods.setValue('import.files.immobilisations', file);
                  }}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Format: Désignation | Date | Valeur | Durée | Taux
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Templates Disponibles</h4>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <a href="/templates/plan-comptable-syscohada.xlsx" className="text-blue-600 hover:underline flex items-center">
            <Download className="h-4 w-4 mr-1" />
            Plan Comptable SYSCOHADA
          </a>
          <a href="/templates/balance-ouverture.xlsx" className="text-blue-600 hover:underline flex items-center">
            <Download className="h-4 w-4 mr-1" />
            Balance d'Ouverture
          </a>
          <a href="/templates/fichier-tiers.xlsx" className="text-blue-600 hover:underline flex items-center">
            <Download className="h-4 w-4 mr-1" />
            Fichier Tiers
          </a>
          <a href="/templates/immobilisations.xlsx" className="text-blue-600 hover:underline flex items-center">
            <Download className="h-4 w-4 mr-1" />
            Immobilisations
          </a>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const formData = methods.getValues();
    
    return (
      <div className="space-y-6">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Vérifiez les informations ci-dessous avant de finaliser la configuration. Cette étape créera votre environnement comptable.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations Entreprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div><strong>Raison Sociale:</strong> {formData.company.raisonSociale}</div>
              <div><strong>Forme Juridique:</strong> {formData.company.formeJuridique}</div>
              <div><strong>RCCM:</strong> {formData.company.rccm}</div>
              <div><strong>NIF:</strong> {formData.company.nif}</div>
              <div><strong>Secteur:</strong> {formData.company.secteurActivite}</div>
              <div><strong>Multi-établissements:</strong> {formData.company.multiEtablissements ? 'Oui' : 'Non'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration Comptable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div><strong>Référentiel:</strong> {formData.accounting.referentiel.replace('_', ' ')}</div>
              <div><strong>Plan Comptable:</strong> {formData.accounting.planComptable}</div>
              <div><strong>Longueur Comptes:</strong> {formData.accounting.longueurComptes} positions</div>
              <div><strong>Devise:</strong> {formData.accounting.devisePrincipale}</div>
              <div><strong>Analytique:</strong> {formData.accounting.analytique ? `Oui (${formData.accounting.nbAxes} axes)` : 'Non'}</div>
              <div><strong>TVA:</strong> {formData.accounting.tvaActive ? 'Activée' : 'Désactivée'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exercice Comptable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div><strong>Début:</strong> {formData.fiscalYear.dateDebut.toLocaleDateString('fr-FR')}</div>
              <div><strong>Fin:</strong> {formData.fiscalYear.dateFin.toLocaleDateString('fr-FR')}</div>
              <div><strong>Périodes:</strong> {formData.fiscalYear.periodesComptables}</div>
              <div><strong>Clôture:</strong> {formData.fiscalYear.clotureMode}</div>
              <div><strong>Exercice Décalé:</strong> {formData.fiscalYear.exerciceDecale ? 'Oui' : 'Non'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Imports Programmés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div><strong>Plan Comptable:</strong> {formData.import.importPlanComptable ? '✓ Fichier sélectionné' : '✗ Aucun import'}</div>
              <div><strong>Balance:</strong> {formData.import.importBalance ? '✓ Fichier sélectionné' : '✗ Aucun import'}</div>
              <div><strong>Tiers:</strong> {formData.import.importTiers ? '✓ Fichier sélectionné' : '✗ Aucun import'}</div>
              <div><strong>Immobilisations:</strong> {formData.import.importImmobilisations ? '✓ Fichier sélectionné' : '✗ Aucun import'}</div>
            </CardContent>
          </Card>
        </div>

        {isCompleting && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Configuration en cours...</h3>
                <p className="text-gray-600 mb-4">Création de votre environnement comptable</p>
                <Progress value={75} className="w-full" />
                <p className="text-sm text-gray-700 mt-2">Cette opération peut prendre quelques minutes</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-gray-900">Assistant de Configuration Atlas Finance</h1>
                <p className="text-gray-600">Paramétrage initial selon les normes SYSCOHADA</p>
              </div>
              <Badge variant="outline" className="text-sm">
                Étape {currentStep + 1} sur {SETUP_STEPS.length}
              </Badge>
            </div>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-8">
            {SETUP_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center text-center">
                    <div className={`rounded-full p-3 border-2 transition-colors ${
                      isActive 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : isCompleted
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="mt-2">
                      <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-700'}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-gray-700 max-w-24 mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  
                  {index < SETUP_STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-4 ${isCompleted ? 'bg-green-300' : 'bg-gray-300'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                {React.createElement(SETUP_STEPS[currentStep].icon, { className: "h-6 w-6" })}
                {SETUP_STEPS[currentStep].label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              {currentStep === 0 && renderCompanyStep()}
              {currentStep === 1 && renderAccountingStep()}
              {currentStep === 2 && renderFiscalYearStep()}
              {currentStep === 3 && renderImportStep()}
              {currentStep === 4 && renderReviewStep()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0 || isCompleting}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Précédent
            </Button>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => methods.reset()}
                disabled={isCompleting}
              >
                <Save className="h-4 w-4 mr-2" />
                Enregistrer Brouillon
              </Button>

              <Button
                onClick={handleNext}
                disabled={isCompleting}
                className="flex items-center gap-2"
              >
                {currentStep === SETUP_STEPS.length - 1 ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {isCompleting ? 'Configuration...' : 'Finaliser'}
                  </>
                ) : (
                  <>
                    Suivant
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </FormProvider>
  );
};

export default SetupWizardPage;