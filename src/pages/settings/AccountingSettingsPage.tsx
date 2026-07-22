import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { toast } from 'react-hot-toast';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Calculator,
  BookOpen,
  Calendar,
  DollarSign,
  FileCheck,
  Settings,
  Save,
  RefreshCw,
  Info,
  AlertCircle,
  Check,
  ChevronDown,
  Globe,
  Percent,
  Hash,
  Clock,
  Database,
  ArrowLeft,
  Users,
  Shield,
  Archive,
  Receipt,
  TrendingUp,
  FileText,
  Printer,
  Lock,
  Eye,
  Zap,
  Download,
  Upload,
  Search,
  Filter,
  X,
  HelpCircle,
  ExternalLink,
  Pencil,
  Trash2,
  Plus
} from 'lucide-react';
import {
  AuxiliaryCodeMapping,
  DEFAULT_MAPPINGS,
  loadMappings,
  saveMappings,
} from '../../services/auxiliaryCode/auxiliaryCodeService';
import { useNavigate } from 'react-router-dom';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import { cn } from '../../lib/utils';

interface AccountingSetting {
  id: string;
  /** Clé i18n du libellé (namespace acctSettings) */
  labelKey: string;
  /** Clé i18n de la description (namespace acctSettings) */
  descKey: string;
  value: string | number | boolean;
  type: 'select' | 'number' | 'boolean' | 'text' | 'date';
  options?: { value: string; labelKey: string }[];
  min?: number;
  max?: number;
  required?: boolean;
  category: string;
}

const AccountingSettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { adapter } = useData();
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('base');
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

  // Paramètres de comptabilité
  const [settings, setSettings] = useState<Record<string, AccountingSetting[]>>({
    general: [
      {
        id: 'plan_comptable',
        labelKey: 'acctSettings.sPlanComptable',
        descKey: 'acctSettings.sPlanComptableDesc',
        value: 'SYSCOHADA',
        type: 'select',
        options: [
          { value: 'SYSCOHADA', labelKey: 'acctSettings.optSyscohadaRevise' },
          { value: 'SYSCOHADA_BANQUE', labelKey: 'acctSettings.optSyscohadaBanque' },
          { value: 'SYSCOHADA_ASSURANCE', labelKey: 'acctSettings.optSyscohadaAssurance' },
          { value: 'CUSTOM', labelKey: 'acctSettings.optPlanPersonnalise' }
        ],
        required: true,
        category: 'general'
      },
      {
        id: 'exercice_fiscal',
        labelKey: 'acctSettings.sExerciceFiscal',
        descKey: 'acctSettings.sExerciceFiscalDesc',
        value: '01/01 - 31/12',
        type: 'select',
        options: [
          { value: '01/01 - 31/12', labelKey: 'acctSettings.optAnneeCivile' },
          { value: '01/07 - 30/06', labelKey: 'acctSettings.optJuilletJuin' },
          { value: '01/10 - 30/09', labelKey: 'acctSettings.optOctobreSeptembre' },
          { value: 'CUSTOM', labelKey: 'acctSettings.optPersonnalise' }
        ],
        required: true,
        category: 'general'
      },
      {
        id: 'devise_principale',
        labelKey: 'acctSettings.sDevisePrincipale',
        descKey: 'acctSettings.sDevisePrincipaleDesc',
        value: 'XAF',
        type: 'select',
        options: [
          { value: 'XAF', labelKey: 'acctSettings.optXaf' },
          { value: 'EUR', labelKey: 'acctSettings.optEur' },
          { value: 'USD', labelKey: 'acctSettings.optUsd' },
          { value: 'GBP', labelKey: 'acctSettings.optGbp' }
        ],
        required: true,
        category: 'general'
      },
      {
        id: 'multi_devise',
        labelKey: 'acctSettings.sMultiDevise',
        descKey: 'acctSettings.sMultiDeviseDesc',
        value: true,
        type: 'boolean',
        category: 'general'
      }
    ],
    saisie: [
      {
        id: 'methode_saisie',
        labelKey: 'acctSettings.sMethodeSaisie',
        descKey: 'acctSettings.sMethodeSaisieDesc',
        value: 'PARTIE_DOUBLE',
        type: 'select',
        options: [
          { value: 'PARTIE_DOUBLE', labelKey: 'acctSettings.optPartieDouble' },
          { value: 'SIMPLIFIEE', labelKey: 'acctSettings.optSaisieSimplifiee' },
          { value: 'GUIDEE', labelKey: 'acctSettings.optSaisieGuidee' }
        ],
        required: true,
        category: 'saisie'
      },
      {
        id: 'controle_equilibre',
        labelKey: 'acctSettings.sControleEquilibre',
        descKey: 'acctSettings.sControleEquilibreDesc',
        value: true,
        type: 'boolean',
        category: 'saisie'
      },
      {
        id: 'lettrage_auto',
        labelKey: 'acctSettings.sLettrageAuto',
        descKey: 'acctSettings.sLettrageAutoDesc',
        value: true,
        type: 'boolean',
        category: 'saisie'
      },
      {
        id: 'validation_pieces',
        labelKey: 'acctSettings.sValidationPieces',
        descKey: 'acctSettings.sValidationPiecesDesc',
        value: false,
        type: 'boolean',
        category: 'saisie'
      }
    ],
    affichage: [
      {
        id: 'decimales',
        labelKey: 'acctSettings.sDecimales',
        descKey: 'acctSettings.sDecimalesDesc',
        value: 2,
        type: 'number',
        min: 0,
        max: 4,
        required: true,
        category: 'affichage'
      },
      {
        id: 'separateur_milliers',
        labelKey: 'acctSettings.sSeparateurMilliers',
        descKey: 'acctSettings.sSeparateurMilliersDesc',
        value: ' ',
        type: 'select',
        options: [
          { value: ' ', labelKey: 'acctSettings.optEspace' },
          { value: ',', labelKey: 'acctSettings.optVirgule' },
          { value: '.', labelKey: 'acctSettings.optPoint' },
          { value: '', labelKey: 'acctSettings.optAucun' }
        ],
        category: 'affichage'
      },
      {
        id: 'format_date',
        labelKey: 'acctSettings.sFormatDate',
        descKey: 'acctSettings.sFormatDateDesc',
        value: 'DD/MM/YYYY',
        type: 'select',
        options: [
          { value: 'DD/MM/YYYY', labelKey: 'acctSettings.optDateDmy' },
          { value: 'MM/DD/YYYY', labelKey: 'acctSettings.optDateMdy' },
          { value: 'YYYY-MM-DD', labelKey: 'acctSettings.optDateYmd' }
        ],
        category: 'affichage'
      },
      {
        id: 'afficher_soldes_nuls',
        labelKey: 'acctSettings.sAfficherSoldesNuls',
        descKey: 'acctSettings.sAfficherSoldesNulsDesc',
        value: false,
        type: 'boolean',
        category: 'affichage'
      }
    ],
    cloture: [
      {
        id: 'frequence_cloture',
        labelKey: 'acctSettings.sFrequenceCloture',
        descKey: 'acctSettings.sFrequenceClotureDesc',
        value: 'MENSUELLE',
        type: 'select',
        options: [
          { value: 'MENSUELLE', labelKey: 'acctSettings.optMensuelle' },
          { value: 'TRIMESTRIELLE', labelKey: 'acctSettings.optTrimestrielle' },
          { value: 'SEMESTRIELLE', labelKey: 'acctSettings.optSemestrielle' },
          { value: 'ANNUELLE', labelKey: 'acctSettings.optAnnuelle' }
        ],
        required: true,
        category: 'cloture'
      },
      {
        id: 'cloture_auto',
        labelKey: 'acctSettings.sClotureAuto',
        descKey: 'acctSettings.sClotureAutoDesc',
        value: false,
        type: 'boolean',
        category: 'cloture'
      },
      {
        id: 'delai_cloture',
        labelKey: 'acctSettings.sDelaiCloture',
        descKey: 'acctSettings.sDelaiClotureDesc',
        value: 15,
        type: 'number',
        min: 1,
        max: 90,
        category: 'cloture'
      },
      {
        id: 'verrouillage_periode',
        labelKey: 'acctSettings.sVerrouillagePeriode',
        descKey: 'acctSettings.sVerrouillagePeriodeDesc',
        value: true,
        type: 'boolean',
        category: 'cloture'
      }
    ],
    taxes: [
      {
        id: 'tva_applicable',
        labelKey: 'acctSettings.sTvaApplicable',
        descKey: 'acctSettings.sTvaApplicableDesc',
        value: true,
        type: 'boolean',
        category: 'taxes'
      },
      {
        id: 'taux_tva_normal',
        labelKey: 'acctSettings.sTauxTvaNormal',
        descKey: 'acctSettings.sTauxTvaNormalDesc',
        value: 19.25,
        type: 'number',
        min: 0,
        max: 30,
        category: 'taxes'
      },
      {
        id: 'taux_tva_reduit',
        labelKey: 'acctSettings.sTauxTvaReduit',
        descKey: 'acctSettings.sTauxTvaReduitDesc',
        value: 5.5,
        type: 'number',
        min: 0,
        max: 30,
        category: 'taxes'
      },
      {
        id: 'regime_fiscal',
        labelKey: 'acctSettings.sRegimeFiscal',
        descKey: 'acctSettings.sRegimeFiscalDesc',
        value: 'REEL',
        type: 'select',
        options: [
          { value: 'REEL', labelKey: 'acctSettings.optRegimeReel' },
          { value: 'SIMPLIFIE', labelKey: 'acctSettings.optRegimeSimplifie' },
          { value: 'LIBERATOIRE', labelKey: 'acctSettings.optRegimeLiberatoire' }
        ],
        category: 'taxes'
      },
      {
        id: 'declaration_tva',
        labelKey: 'acctSettings.sDeclarationTva',
        descKey: 'acctSettings.sDeclarationTvaDesc',
        value: 'MENSUELLE',
        type: 'select',
        options: [
          { value: 'MENSUELLE', labelKey: 'acctSettings.optMensuelle' },
          { value: 'TRIMESTRIELLE', labelKey: 'acctSettings.optTrimestrielle' },
          { value: 'ANNUELLE', labelKey: 'acctSettings.optAnnuelle' }
        ],
        category: 'taxes'
      },
      {
        id: 'retenue_source',
        labelKey: 'acctSettings.sRetenueSource',
        descKey: 'acctSettings.sRetenueSourceDesc',
        value: 5.5,
        type: 'number',
        min: 0,
        max: 20,
        category: 'taxes'
      }
    ],
    analytique: [
      {
        id: 'comptabilite_analytique',
        labelKey: 'acctSettings.sComptabiliteAnalytique',
        descKey: 'acctSettings.sComptabiliteAnalytiqueDesc',
        value: true,
        type: 'boolean',
        category: 'analytique'
      },
      {
        id: 'nb_axes_analytiques',
        labelKey: 'acctSettings.sNbAxesAnalytiques',
        descKey: 'acctSettings.sNbAxesAnalytiquesDesc',
        value: 3,
        type: 'number',
        min: 1,
        max: 10,
        category: 'analytique'
      },
      {
        id: 'ventilation_obligatoire',
        labelKey: 'acctSettings.sVentilationObligatoire',
        descKey: 'acctSettings.sVentilationObligatoireDesc',
        value: false,
        type: 'boolean',
        category: 'analytique'
      },
      {
        id: 'controle_ventilation',
        labelKey: 'acctSettings.sControleVentilation',
        descKey: 'acctSettings.sControleVentilationDesc',
        value: true,
        type: 'boolean',
        category: 'analytique'
      }
    ],
    immobilisations: [
      {
        id: 'gestion_immobilisations',
        labelKey: 'acctSettings.sGestionImmobilisations',
        descKey: 'acctSettings.sGestionImmobilisationsDesc',
        value: true,
        type: 'boolean',
        category: 'immobilisations'
      },
      {
        id: 'amortissement_auto',
        labelKey: 'acctSettings.sAmortissementAuto',
        descKey: 'acctSettings.sAmortissementAutoDesc',
        value: true,
        type: 'boolean',
        category: 'immobilisations'
      },
      {
        id: 'methode_amortissement',
        labelKey: 'acctSettings.sMethodeAmortissement',
        descKey: 'acctSettings.sMethodeAmortissementDesc',
        value: 'LINEAIRE',
        type: 'select',
        options: [
          { value: 'LINEAIRE', labelKey: 'acctSettings.optLineaire' },
          { value: 'DEGRESSIF', labelKey: 'acctSettings.optDegressif' },
          { value: 'VARIABLE', labelKey: 'acctSettings.optVariable' }
        ],
        category: 'immobilisations'
      },
      {
        id: 'seuil_immobilisation',
        labelKey: 'acctSettings.sSeuilImmobilisation',
        descKey: 'acctSettings.sSeuilImmobilisationDesc',
        value: 500,
        type: 'number',
        min: 0,
        max: 10000,
        category: 'immobilisations'
      },
      {
        id: 'taux_amortissement_batiments',
        labelKey: 'acctSettings.sTauxAmortBatiments',
        descKey: 'acctSettings.sTauxAmortBatimentsDesc',
        value: 5,
        type: 'number',
        min: 1,
        max: 10,
        category: 'immobilisations'
      },
      {
        id: 'taux_amortissement_mobilier',
        labelKey: 'acctSettings.sTauxAmortMobilier',
        descKey: 'acctSettings.sTauxAmortMobilierDesc',
        value: 10,
        type: 'number',
        min: 5,
        max: 33.33,
        category: 'immobilisations'
      },
      {
        id: 'taux_amortissement_materiel',
        labelKey: 'acctSettings.sTauxAmortMateriel',
        descKey: 'acctSettings.sTauxAmortMaterielDesc',
        value: 20,
        type: 'number',
        min: 10,
        max: 50,
        category: 'immobilisations'
      },
      {
        id: 'taux_amortissement_informatique',
        labelKey: 'acctSettings.sTauxAmortInformatique',
        descKey: 'acctSettings.sTauxAmortInformatiqueDesc',
        value: 33.33,
        type: 'number',
        min: 20,
        max: 50,
        category: 'immobilisations'
      },
      {
        id: 'taux_amortissement_vehicules',
        labelKey: 'acctSettings.sTauxAmortVehicules',
        descKey: 'acctSettings.sTauxAmortVehiculesDesc',
        value: 20,
        type: 'number',
        min: 10,
        max: 33.33,
        category: 'immobilisations'
      },
      {
        id: 'coefficient_degressif',
        labelKey: 'acctSettings.sCoefficientDegressif',
        descKey: 'acctSettings.sCoefficientDegressifDesc',
        value: 2.5,
        type: 'number',
        min: 1.25,
        max: 3.5,
        category: 'immobilisations'
      },
      {
        id: 'prorata_temporis',
        labelKey: 'acctSettings.sProrataTemporis',
        descKey: 'acctSettings.sProrataTemporisDesc',
        value: true,
        type: 'boolean',
        category: 'immobilisations'
      }
    ],
    tresorerie: [
      {
        id: 'rapprochement_auto',
        labelKey: 'acctSettings.sRapprochementAuto',
        descKey: 'acctSettings.sRapprochementAutoDesc',
        value: true,
        type: 'boolean',
        category: 'tresorerie'
      },
      {
        id: 'controle_decouvert',
        labelKey: 'acctSettings.sControleDecouvert',
        descKey: 'acctSettings.sControleDecouvertDesc',
        value: true,
        type: 'boolean',
        category: 'tresorerie'
      },
      {
        id: 'previsions_tresorerie',
        labelKey: 'acctSettings.sPrevisionsTresorerie',
        descKey: 'acctSettings.sPrevisionsTresorerieDesc',
        value: true,
        type: 'boolean',
        category: 'tresorerie'
      },
      {
        id: 'horizon_prevision',
        labelKey: 'acctSettings.sHorizonPrevision',
        descKey: 'acctSettings.sHorizonPrevisionDesc',
        value: 12,
        type: 'number',
        min: 1,
        max: 36,
        category: 'tresorerie'
      }
    ],
    budget: [
      {
        id: 'gestion_budget',
        labelKey: 'acctSettings.sGestionBudget',
        descKey: 'acctSettings.sGestionBudgetDesc',
        value: true,
        type: 'boolean',
        category: 'budget'
      },
      {
        id: 'controle_budget',
        labelKey: 'acctSettings.sControleBudget',
        descKey: 'acctSettings.sControleBudgetDesc',
        value: true,
        type: 'boolean',
        category: 'budget'
      },
      {
        id: 'seuil_alerte_budget',
        labelKey: 'acctSettings.sSeuilAlerteBudget',
        descKey: 'acctSettings.sSeuilAlerteBudgetDesc',
        value: 80,
        type: 'number',
        min: 50,
        max: 100,
        category: 'budget'
      },
      {
        id: 'revision_budget',
        labelKey: 'acctSettings.sRevisionBudget',
        descKey: 'acctSettings.sRevisionBudgetDesc',
        value: true,
        type: 'boolean',
        category: 'budget'
      }
    ],
    reporting: [
      {
        id: 'etats_financiers_auto',
        labelKey: 'acctSettings.sEtatsFinanciersAuto',
        descKey: 'acctSettings.sEtatsFinanciersAutoDesc',
        value: true,
        type: 'boolean',
        category: 'reporting'
      },
      {
        id: 'format_etats',
        labelKey: 'acctSettings.sFormatEtats',
        descKey: 'acctSettings.sFormatEtatsDesc',
        value: 'SYSCOHADA',
        type: 'select',
        options: [
          { value: 'SYSCOHADA', labelKey: 'acctSettings.optSyscohada' },
          { value: 'IFRS', labelKey: 'acctSettings.optIfrs' },
          { value: 'PERSONNALISE', labelKey: 'acctSettings.optPersonnalise' }
        ],
        category: 'reporting'
      },
      {
        id: 'comparatifs_auto',
        labelKey: 'acctSettings.sComparatifsAuto',
        descKey: 'acctSettings.sComparatifsAutoDesc',
        value: true,
        type: 'boolean',
        category: 'reporting'
      },
      {
        id: 'tableau_bord_temps_reel',
        labelKey: 'acctSettings.sTableauBordTempsReel',
        descKey: 'acctSettings.sTableauBordTempsReelDesc',
        value: true,
        type: 'boolean',
        category: 'reporting'
      }
    ],
    securite: [
      {
        id: 'audit_trail',
        labelKey: 'acctSettings.sAuditTrail',
        descKey: 'acctSettings.sAuditTrailDesc',
        value: true,
        type: 'boolean',
        category: 'securite'
      },
      {
        id: 'signature_electronique',
        labelKey: 'acctSettings.sSignatureElectronique',
        descKey: 'acctSettings.sSignatureElectroniqueDesc',
        value: false,
        type: 'boolean',
        category: 'securite'
      },
      {
        id: 'sauvegarde_auto',
        labelKey: 'acctSettings.sSauvegardeAuto',
        descKey: 'acctSettings.sSauvegardeAutoDesc',
        value: true,
        type: 'boolean',
        category: 'securite'
      },
      {
        id: 'frequence_sauvegarde',
        labelKey: 'acctSettings.sFrequenceSauvegarde',
        descKey: 'acctSettings.sFrequenceSauvegardeDesc',
        value: 'QUOTIDIENNE',
        type: 'select',
        options: [
          { value: 'HORAIRE', labelKey: 'acctSettings.optHoraire' },
          { value: 'QUOTIDIENNE', labelKey: 'acctSettings.optQuotidienne' },
          { value: 'HEBDOMADAIRE', labelKey: 'acctSettings.optHebdomadaire' }
        ],
        category: 'securite'
      },
      {
        id: 'acces_utilisateurs',
        labelKey: 'acctSettings.sAccesUtilisateurs',
        descKey: 'acctSettings.sAccesUtilisateursDesc',
        value: true,
        type: 'boolean',
        category: 'securite'
      }
    ],
    avance: [
      {
        id: 'gestion_stocks',
        labelKey: 'acctSettings.sGestionStocks',
        descKey: 'acctSettings.sGestionStocksDesc',
        value: true,
        type: 'boolean',
        category: 'avance'
      },
      {
        id: 'methode_valorisation',
        labelKey: 'acctSettings.sMethodeValorisation',
        descKey: 'acctSettings.sMethodeValorisationDesc',
        value: 'FIFO',
        type: 'select',
        options: [
          { value: 'FIFO', labelKey: 'acctSettings.optFifo' },
          { value: 'LIFO', labelKey: 'acctSettings.optLifo' },
          { value: 'CMP', labelKey: 'acctSettings.optCmp' },
          { value: 'STANDARD', labelKey: 'acctSettings.optCoutStandard' }
        ],
        category: 'avance'
      },
      {
        id: 'consolidation',
        labelKey: 'acctSettings.sConsolidation',
        descKey: 'acctSettings.sConsolidationDesc',
        value: false,
        type: 'boolean',
        category: 'avance'
      },
      {
        id: 'nb_societes_consolidees',
        labelKey: 'acctSettings.sNbSocietesConsolidees',
        descKey: 'acctSettings.sNbSocietesConsolideesDesc',
        value: 5,
        type: 'number',
        min: 1,
        max: 50,
        category: 'avance'
      },
      {
        id: 'devises_etrangeres',
        labelKey: 'acctSettings.sDevisesEtrangeres',
        descKey: 'acctSettings.sDevisesEtrangeresDesc',
        value: true,
        type: 'boolean',
        category: 'avance'
      },
      {
        id: 'source_taux_change',
        labelKey: 'acctSettings.sSourceTauxChange',
        descKey: 'acctSettings.sSourceTauxChangeDesc',
        value: 'BEAC',
        type: 'select',
        options: [
          { value: 'BEAC', labelKey: 'acctSettings.optBeac' },
          { value: 'ECB', labelKey: 'acctSettings.optEcb' },
          { value: 'MANUEL', labelKey: 'acctSettings.optManuel' },
          { value: 'API', labelKey: 'acctSettings.optApi' }
        ],
        category: 'avance'
      }
    ],
    normes: [
      {
        id: 'conformite_syscohada',
        labelKey: 'acctSettings.sConformiteSyscohada',
        descKey: 'acctSettings.sConformiteSyscohadaDesc',
        value: true,
        type: 'boolean',
        category: 'normes'
      },
      {
        id: 'controles_coherence',
        labelKey: 'acctSettings.sControlesCoherence',
        descKey: 'acctSettings.sControlesCoherenceDesc',
        value: true,
        type: 'boolean',
        category: 'normes'
      },
      {
        id: 'validation_liasse',
        labelKey: 'acctSettings.sValidationLiasse',
        descKey: 'acctSettings.sValidationLiasseDesc',
        value: true,
        type: 'boolean',
        category: 'normes'
      },
      {
        id: 'archivage_legal',
        labelKey: 'acctSettings.sArchivageLegal',
        descKey: 'acctSettings.sArchivageLegalDesc',
        value: 10,
        type: 'number',
        min: 5,
        max: 30,
        category: 'normes'
      },
      {
        id: 'trace_modifications',
        labelKey: 'acctSettings.sTraceModifications',
        descKey: 'acctSettings.sTraceModificationsDesc',
        value: true,
        type: 'boolean',
        category: 'normes'
      }
    ]
  });

  // Tabs configuration
  const tabs = [
    { id: 'base', labelKey: 'acctSettings.tabBase', icon: Settings },
    { id: 'advanced', labelKey: 'acctSettings.tabAdvanced', icon: Zap },
    { id: 'security', labelKey: 'acctSettings.tabSecurity', icon: Shield },
    { id: 'import-export', labelKey: 'acctSettings.tabImportExport', icon: Database }
  ];

  // Validation rules
  const validateSetting = (setting: AccountingSetting): string | null => {
    const field = t(setting.labelKey);
    if (setting.required && (!setting.value || setting.value === '')) {
      return t('acctSettings.errRequired', { field });
    }
    if (setting.type === 'number') {
      if (typeof setting.value === 'boolean') return null; // boolean settings are never 'number' type
      const num = parseFloat(String(setting.value));
      if (isNaN(num)) return t('acctSettings.errNumber', { field });
      if (setting.min !== undefined && num < setting.min) {
        return t('acctSettings.errMin', { field, min: String(setting.min) });
      }
      if (setting.max !== undefined && num > setting.max) {
        return t('acctSettings.errMax', { field, max: String(setting.max) });
      }
    }
    return null;
  };

  const validateAllSettings = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    Object.values(settings).forEach(categorySettings => {
      categorySettings.forEach(setting => {
        const error = validateSetting(setting);
        if (error) {
          errors[setting.id] = error;
          isValid = false;
        }
      });
    });

    setValidationErrors(errors);
    return isValid;
  };

  const handleSettingChange = (category: string, settingId: string, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [category]: prev[category].map(setting =>
        setting.id === settingId ? { ...setting, value } : setting
      )
    }));

    // Clear validation error for this setting
    if (validationErrors[settingId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[settingId];
        return newErrors;
      });
    }

    setHasChanges(true);
  };

  // Load settings from adapter on mount
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const saved = await adapter.getById<{ key: string; value: string; updatedAt: string }>(
          'settings',
          'accounting_settings'
        );
        if (saved?.value) {
          const parsed = JSON.parse(saved.value) as Record<string, AccountingSetting[]>;
          // Merge with current defaults to handle new settings added since last save
          setSettings(prev => {
            const merged = { ...prev };
            for (const [category, savedItems] of Object.entries(parsed)) {
              if (merged[category]) {
                merged[category] = merged[category].map(defaultItem => {
                  const savedItem = savedItems.find(s => s.id === defaultItem.id);
                  return savedItem ? { ...defaultItem, value: savedItem.value } : defaultItem;
                });
              }
            }
            return merged;
          });
        }
        setLoading(false);
      } catch (error) {
        setNotification({
          type: 'error',
          message: t('acctSettings.toastLoadError')
        });
        setLoading(false);
      }
    };
    loadSettings();
  }, [adapter]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            if (hasChanges) handleSave();
            break;
          case 'f':
            event.preventDefault();
            (document.querySelector('input[data-settings-search]') as HTMLElement | null)?.focus();
            break;
          case 'r':
            event.preventDefault();
            if (hasChanges) handleResetClick();
            break;
        }
      }

      // Escape key to clear search
      if (event.key === 'Escape' && searchTerm) {
        setSearchTerm('');
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [hasChanges, searchTerm]);

  const handleSave = async () => {
    if (!validateAllSettings()) {
      setNotification({
        type: 'error',
        message: t('acctSettings.toastFixErrors')
      });
      return;
    }

    setSaving(true);
    try {
      const serialized = JSON.stringify(settings);
      const now = new Date().toISOString();

      // Check if a record already exists
      const existing = await adapter.getById<{ key: string; value: string; updatedAt: string }>(
        'settings',
        'accounting_settings'
      );

      if (existing) {
        await adapter.update<{ key: string; value: string; updatedAt: string }>(
          'settings',
          'accounting_settings',
          { value: serialized, updatedAt: now }
        );
      } else {
        // create() adds an `id` field but settings table uses `key` as PK —
        // Dexie will still use the `key` keyPath to store the record correctly.
        await adapter.create<{ key: string; value: string; updatedAt: string }>(
          'settings',
          { key: 'accounting_settings', value: serialized, updatedAt: now } as any
        );
      }

      setSaving(false);
      setHasChanges(false);
      toast.success(t('acctSettings.toastSaved'));
    } catch (error) {
      console.error('[AccountingSettings] Erreur sauvegarde:', error);
      setSaving(false);
      toast.error(t('acctSettings.toastSaveError'));
    }
  };

  const [resetConfirm, setResetConfirm] = useState(false);
  const importModalFileRef = useRef<HTMLInputElement>(null);

  // --- Codification des Tiers ---
  const [auxMappings, setAuxMappings] = useState<AuxiliaryCodeMapping[]>(DEFAULT_MAPPINGS);
  const [auxMappingsLoading, setAuxMappingsLoading] = useState(true);
  const [auxSaving, setAuxSaving] = useState(false);
  const [auxEditingId, setAuxEditingId] = useState<string | null>(null);
  const [auxEditRow, setAuxEditRow] = useState<AuxiliaryCodeMapping | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mappings = await loadMappings(adapter);
        if (mounted) setAuxMappings(mappings);
      } catch (err) {
        console.error('[AccountingSettings] Erreur chargement codification tiers:', err);
        if (mounted) toast.error(t('acctSettings.toastAuxLoadError'));
      } finally {
        if (mounted) setAuxMappingsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [adapter]);

  const handleAuxSave = async () => {
    setAuxSaving(true);
    try {
      await saveMappings(adapter, auxMappings);
      toast.success(t('acctSettings.toastAuxSaved'));
    } catch {
      toast.error(t('acctSettings.toastGenericSaveError'));
    } finally {
      setAuxSaving(false);
    }
  };

  const handleAuxReset = () => {
    if (!window.confirm(t('acctSettings.confirmAuxReset'))) return;
    setAuxMappings(DEFAULT_MAPPINGS);
    setAuxEditingId(null);
    setAuxEditRow(null);
  };

  const handleAuxEditStart = (mapping: AuxiliaryCodeMapping) => {
    setAuxEditingId(mapping.id);
    setAuxEditRow({ ...mapping });
  };

  const handleAuxEditSave = () => {
    if (!auxEditRow) return;
    setAuxMappings(prev => prev.map(m => (m.id === auxEditRow.id ? { ...auxEditRow } : m)));
    setAuxEditingId(null);
    setAuxEditRow(null);
  };

  const handleAuxEditCancel = () => {
    setAuxEditingId(null);
    setAuxEditRow(null);
  };

  const handleAuxDelete = (id: string) => {
    if (!window.confirm(t('acctSettings.confirmAuxDelete'))) return;
    setAuxMappings(prev => prev.filter(m => m.id !== id));
    if (auxEditingId === id) { setAuxEditingId(null); setAuxEditRow(null); }
  };

  const handleAuxAddRow = () => {
    const newId = crypto.randomUUID();
    const newRow: AuxiliaryCodeMapping = {
      id: newId,
      compteCollectif: '',
      prefixeCommercial: '',
      description: '',
      longueurSequence: 3,
    };
    setAuxMappings(prev => [...prev, newRow]);
    setAuxEditingId(newId);
    setAuxEditRow({ ...newRow });
  };

  const handleResetClick = () => {
    setResetConfirm(true);
  };

  const handleConfirmReset = () => {
    // Reset to default values — state updates are irrelevant because the page
    // is about to reload; close the dialog first so the confirm is visually
    // dismissed before the reload.
    setResetConfirm(false);
    window.location.reload();
  };

  const handleExportSettings = () => {
    const settingsData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      settings: settings
    };

    const blob = new Blob([JSON.stringify(settingsData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atlasfna-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setNotification({
      type: 'success',
      message: t('acctSettings.toastExported')
    });
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (!importedData || typeof importedData !== 'object') {
          throw new Error(t('acctSettings.errFormatObject'));
        }
        if (!importedData.settings || typeof importedData.settings !== 'object') {
          throw new Error(t('acctSettings.errFormatSettingsKey'));
        }
        // Structural validation: each category must be an array of objects with id/value
        for (const [category, items] of Object.entries(importedData.settings)) {
          if (!Array.isArray(items)) {
            throw new Error(t('acctSettings.errFormatCategoryArray', { category }));
          }
          for (const item of items as any[]) {
            if (typeof item !== 'object' || item === null || !('id' in item) || !('value' in item)) {
              throw new Error(t('acctSettings.errFormatCategoryEntry', { category }));
            }
          }
        }
        setSettings(importedData.settings as Record<string, AccountingSetting[]>);
        setHasChanges(true);
        toast.success(t('acctSettings.toastImported'));
        setNotification({
          type: 'success',
          message: t('acctSettings.toastImported')
        });
      } catch (error: any) {
        console.error('[AccountingSettings] Erreur import paramètres:', error);
        const importMessage = t('acctSettings.errImport', {
          message: error?.message ?? t('acctSettings.errImportInvalidFile')
        });
        toast.error(importMessage);
        setNotification({
          type: 'error',
          message: importMessage
        });
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  // Filter settings based on search term
  const filteredSettings = searchTerm ?
    Object.entries(settings).reduce((acc, [category, categorySettings]) => {
      const filtered = categorySettings.filter(setting =>
        t(setting.labelKey).toLowerCase().includes(searchTerm.toLowerCase()) ||
        t(setting.descKey).toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    }, {} as Record<string, AccountingSetting[]>) : settings;

  // Category configuration
  const getCategoryConfig = (category: string) => {
    const configs = {
      general: { title: t('acctSettings.catGeneral'), icon: Settings },
      saisie: { title: t('acctSettings.catSaisie'), icon: FileCheck },
      affichage: { title: t('acctSettings.catAffichage'), icon: Hash },
      cloture: { title: t('acctSettings.catCloture'), icon: Calendar },
      taxes: { title: t('acctSettings.catTaxes'), icon: Percent },
      analytique: { title: t('acctSettings.sComptabiliteAnalytique'), icon: TrendingUp },
      immobilisations: { title: t('navigation.assets'), icon: Archive },
      tresorerie: { title: t('navigation.treasury'), icon: DollarSign },
      budget: { title: t('acctSettings.catBudget'), icon: FileText },
      reporting: { title: t('acctSettings.catReporting'), icon: Printer },
      securite: { title: t('acctSettings.catSecurite'), icon: Shield },
      avance: { title: t('acctSettings.catAvance'), icon: Zap },
      normes: { title: t('acctSettings.catNormes'), icon: FileCheck }
    };
    return (configs as Record<string, { title: string; icon: typeof Settings }>)[category];
  };

  /** Libellé traduit de l'option actuellement sélectionnée d'un paramètre */
  const getSelectedOptionLabel = (category: string, settingId: string): string => {
    const setting = settings[category]?.find(s => s.id === settingId);
    const option = setting?.options?.find(o => o.value === setting?.value);
    return option ? t(option.labelKey) : '';
  };

  const renderSetting = (setting: AccountingSetting, category: string) => {
    const hasError = validationErrors[setting.id];

    switch (setting.type) {
      case 'select':
        return (
          <div>
            <select
              value={setting.value as string | number}
              onChange={(e) => handleSettingChange(category, setting.id, e.target.value)}
              className={cn(
                "w-full px-3 py-2 border rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2",
                hasError
                  ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                  : "border-[var(--color-border)] focus:ring-[var(--color-primary)]"
              )}
              required={setting.required}
            >
              {setting.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
            {hasError && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {validationErrors[setting.id]}
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <div>
            <input
              type="number"
              value={setting.value as string | number}
              onChange={(e) => handleSettingChange(category, setting.id, parseFloat(e.target.value))}
              min={setting.min}
              max={setting.max}
              className={cn(
                "w-full px-3 py-2 border rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2",
                hasError
                  ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                  : "border-[var(--color-border)] focus:ring-[var(--color-primary)]"
              )}
              required={setting.required}
            />
            {hasError && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {validationErrors[setting.id]}
              </p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={setting.value as boolean}
              onChange={(e) => handleSettingChange(category, setting.id, e.target.checked)}
              className="w-5 h-5 text-[var(--color-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-primary)]"
            />
            <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
              {setting.value ? t('acctSettings.enabled') : t('acctSettings.disabled')}
            </span>
          </label>
        );

      case 'text':
        return (
          <div>
            <input
              type="text"
              value={setting.value as string | number}
              onChange={(e) => handleSettingChange(category, setting.id, e.target.value)}
              className={cn(
                "w-full px-3 py-2 border rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2",
                hasError
                  ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                  : "border-[var(--color-border)] focus:ring-[var(--color-primary)]"
              )}
              required={setting.required}
            />
            {hasError && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {validationErrors[setting.id]}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('acctSettings.backToSettings')}
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
                {t('acctSettings.pageTitle')}
              </h1>
              <p className="text-[var(--color-text-secondary)]">
                {t('acctSettings.pageSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <ModernButton
              variant="outline"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={handleResetClick}
              disabled={!hasChanges}
            >
              {t('acctSettings.reset')}
            </ModernButton>
            <ModernButton
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? t('acctSettings.savingInProgress') : t('acctSettings.save')}
            </ModernButton>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={cn(
          'mb-6 p-4 rounded-lg flex items-center justify-between gap-3',
          notification.type === 'success' && 'bg-green-50 text-green-800 border border-green-200',
          notification.type === 'error' && 'bg-red-50 text-red-800 border border-red-200',
          notification.type === 'info' && 'bg-blue-50 text-blue-800 border border-blue-200',
          notification.type === 'warning' && 'bg-yellow-50 text-yellow-800 border border-yellow-200'
        )}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' && <Check className="w-5 h-5" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {notification.type === 'info' && <Info className="w-5 h-5" />}
            {notification.type === 'warning' && <AlertCircle className="w-5 h-5" />}
            <span className="flex-1">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className="border-b border-[var(--color-border)]">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "py-2 px-1 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors",
                    activeTab === tab.id
                      ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                      : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  <TabIcon className="w-4 h-4" />
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Search and Tools Bar */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)] w-4 h-4" />
          <input
            type="text"
            data-settings-search
            placeholder={t('acctSettings.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <Upload className="w-4 h-4" />
            {t('acctSettings.import')}
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <Download className="w-4 h-4" />
            {t('acctSettings.export')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {(() => {
            let categoriesToShow: string[] = [];

            if (activeTab === 'base') {
              categoriesToShow = ['general', 'saisie', 'affichage', 'cloture', 'taxes'];
            } else if (activeTab === 'advanced') {
              categoriesToShow = ['analytique', 'immobilisations', 'tresorerie', 'budget', 'reporting', 'avance'];
            } else if (activeTab === 'security') {
              categoriesToShow = ['securite', 'normes'];
            } else if (activeTab === 'import-export') {
              return (
                <div className="col-span-full">
                  <ModernCard>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-[var(--color-primary)]" />
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                          {t('acctSettings.ieTitle')}
                        </h2>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-medium text-[var(--color-text-primary)] mb-3">{t('acctSettings.ieBackupRestore')}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 border border-[var(--color-border)] rounded-lg">
                              <div className="flex items-center gap-3 mb-3">
                                <Download className="w-5 h-5 text-blue-500" />
                                <h4 className="font-medium">{t('acctSettings.ieExportTitle')}</h4>
                              </div>
                              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                                {t('acctSettings.ieExportDesc')}
                              </p>
                              <button
                                onClick={handleExportSettings}
                                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                              >
                                {t('acctSettings.ieDownloadBackup')}
                              </button>
                            </div>
                            <div className="p-4 border border-[var(--color-border)] rounded-lg">
                              <div className="flex items-center gap-3 mb-3">
                                <Upload className="w-5 h-5 text-green-500" />
                                <h4 className="font-medium">{t('acctSettings.ieImportTitle')}</h4>
                              </div>
                              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                                {t('acctSettings.ieImportDesc')}
                              </p>
                              <label
                                htmlFor="import-settings-main"
                                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer block text-center"
                              >
                                {t('acctSettings.ieSelectFile')}
                              </label>
                              <input
                                type="file"
                                accept=".json"
                                onChange={handleImportSettings}
                                className="hidden"
                                id="import-settings-main"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="border-t border-[var(--color-border)] pt-6">
                          <h3 className="font-medium text-[var(--color-text-primary)] mb-3">{t('acctSettings.ieTemplates')}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button className="p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-left">
                              <h4 className="font-medium mb-2">{t('acctSettings.ieTplRetail')}</h4>
                              <p className="text-sm text-[var(--color-text-secondary)]">{t('acctSettings.ieTplRetailDesc')}</p>
                            </button>
                            <button className="p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-left">
                              <h4 className="font-medium mb-2">{t('acctSettings.ieTplIndustry')}</h4>
                              <p className="text-sm text-[var(--color-text-secondary)]">{t('acctSettings.ieTplIndustryDesc')}</p>
                            </button>
                            <button className="p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-left">
                              <h4 className="font-medium mb-2">{t('acctSettings.ieTplServices')}</h4>
                              <p className="text-sm text-[var(--color-text-secondary)]">{t('acctSettings.ieTplServicesDesc')}</p>
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </ModernCard>
                </div>
              );
            }

            const settingsToDisplay = searchTerm ? filteredSettings :
              Object.fromEntries(
                Object.entries(settings).filter(([key]) => categoriesToShow.includes(key))
              );

            return Object.entries(settingsToDisplay).map(([category, categorySettings]) => {
              const categoryConfig = getCategoryConfig(category);
              if (!categoryConfig || categorySettings.length === 0) return null;

              const CategoryIcon = categoryConfig.icon;

              return (
                <ModernCard key={category}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="w-5 h-5 text-[var(--color-primary)]" />
                      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        {categoryConfig.title}
                      </h2>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-4">
                      {categorySettings.map(setting => (
                        <div key={setting.id}>
                          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                            {t(setting.labelKey)}
                            {setting.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                            {t(setting.descKey)}
                          </p>
                          {renderSetting(setting, category)}
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </ModernCard>
              );
            });
          })()}
        </div>
      )}

      {/* Résumé des paramètres critiques */}
      <ModernCard className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {t('acctSettings.summaryTitle')}
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-900">{t('acctSettings.sPlanComptable')}</h4>
              </div>
              <p className="text-blue-700 text-sm">
                {getSelectedOptionLabel('general', 'plan_comptable')}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-green-600" />
                <h4 className="font-medium text-green-900">{t('acctSettings.sDevisePrincipale')}</h4>
              </div>
              <p className="text-green-700 text-sm">
                {getSelectedOptionLabel('general', 'devise_principale')}
              </p>
            </div>
            <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-primary-600" />
                <h4 className="font-medium text-primary-900">{t('acctSettings.sExerciceFiscal')}</h4>
              </div>
              <p className="text-primary-700 text-sm">
                {getSelectedOptionLabel('general', 'exercice_fiscal')}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-orange-600" />
                <h4 className="font-medium text-orange-900">{t('acctSettings.sumTva')}</h4>
              </div>
              <p className="text-orange-700 text-sm">
                {settings.taxes.find(s => s.id === 'taux_tva_normal')?.value}%
              </p>
            </div>
            <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-primary-600" />
                <h4 className="font-medium text-primary-900">{t('acctSettings.sumDecimales')}</h4>
              </div>
              <p className="text-primary-700 text-sm">
                {t('acctSettings.sumDecimalesValue', { count: String(settings.affichage.find(s => s.id === 'decimales')?.value ?? '') })}
              </p>
            </div>
            <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary-600" />
                <h4 className="font-medium text-primary-900">{t('acctSettings.sumCloture')}</h4>
              </div>
              <p className="text-primary-700 text-sm">
                {getSelectedOptionLabel('cloture', 'frequence_cloture')}
              </p>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      {/* Informations */}
      <ModernCard className="mt-6">
        <CardBody>
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[var(--color-primary)] mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-[var(--color-text-primary)] mb-2">
                {t('acctSettings.aboutTitle')}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                {t('acctSettings.aboutText')}
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                    <p>
                      <strong className="text-[var(--color-text-primary)]">{t('acctSettings.aboutCurrentLabel')}</strong> {t('acctSettings.aboutCurrentText')}
                    </p>
                    <p>
                      <strong className="text-amber-600">{t('acctSettings.aboutImportantLabel')}</strong> {t('acctSettings.aboutImportantText')}
                    </p>
                    <p>
                      <strong className="text-blue-600">{t('acctSettings.aboutTipLabel')}</strong> {t('acctSettings.aboutTipText')}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-blue-900">{t('acctSettings.shortcutsTitle')}</h4>
                    </div>
                    <div className="space-y-1 text-sm text-blue-700">
                      <div className="flex justify-between">
                        <span>{t('acctSettings.shortcutSave')}</span>
                        <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Ctrl + S</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('common.search')}</span>
                        <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Ctrl + F</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('acctSettings.reset')}</span>
                        <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Ctrl + R</kbd>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <button
                        onClick={() => window.open('https://docs.atlasfna.com/settings', '_blank')}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t('acctSettings.docsLink')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      {/* Alertes et statuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <ModernCard>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {t('acctSettings.alertsTitle')}
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">{t('acctSettings.alertValidTitle')}</p>
                  <p className="text-xs text-green-700">{t('acctSettings.alertValidDesc')}</p>
                </div>
              </div>
              {!settings.taxes.find(s => s.id === 'tva_applicable')?.value && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">{t('acctSettings.alertVatOffTitle')}</p>
                    <p className="text-xs text-amber-700">{t('acctSettings.alertVatOffDesc')}</p>
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {t('acctSettings.modulesStatusTitle')}
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {[
                { label: t('acctSettings.sComptabiliteAnalytique'), enabled: settings.analytique.find(s => s.id === 'comptabilite_analytique')?.value },
                { label: t('acctSettings.sGestionStocks'), enabled: settings.avance.find(s => s.id === 'gestion_stocks')?.value },
                { label: t('navigation.assets'), enabled: settings.immobilisations.find(s => s.id === 'gestion_immobilisations')?.value },
                { label: t('acctSettings.sGestionBudget'), enabled: settings.budget.find(s => s.id === 'gestion_budget')?.value },
                { label: t('acctSettings.modPrevisionsTresorerie'), enabled: settings.tresorerie.find(s => s.id === 'previsions_tresorerie')?.value }
              ].map((module, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-b-0">
                  <span className="text-sm text-[var(--color-text-primary)]">{module.label}</span>
                  <span className={cn(
                    'px-2 py-1 text-xs rounded-full',
                    module.enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  )}>
                    {module.enabled ? t('acctSettings.enabled') : t('acctSettings.disabled')}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{t('acctSettings.imTitle')}</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">{t('acctSettings.imInstructionsTitle')}</p>
                    <p>
                      {t('acctSettings.imInstructionsText')}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('acctSettings.imTypeLabel')} <span className="text-red-500">*</span>
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">{t('acctSettings.imSelectPlaceholder')}</option>
                  <option value="full">{t('acctSettings.optAllSettings')}</option>
                  <option value="accounting">{t('acctSettings.optAccountingOnly')}</option>
                  <option value="fiscal">{t('acctSettings.optFiscalOnly')}</option>
                  <option value="users">{t('acctSettings.optUsersPermissions')}</option>
                  <option value="workflow">{t('acctSettings.optWorkflows')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('acctSettings.imFileLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  ref={importModalFileRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => { handleImportSettings(e); setShowImportModal(false); }}
                  className="hidden"
                />
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => importModalFileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('border-blue-400'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-400');
                    const file = e.dataTransfer.files[0];
                    if (!file) return;
                    const syntheticEvent = { target: { files: e.dataTransfer.files, value: '' }, currentTarget: { files: e.dataTransfer.files, value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>;
                    handleImportSettings(syntheticEvent);
                    setShowImportModal(false);
                  }}
                >
                  <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600 mb-1">
                    {t('acctSettings.imDropzone')}
                  </p>
                  <p className="text-xs text-gray-700">{t('acctSettings.imDropzoneHint')}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('acctSettings.imOptionsLabel')}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">{t('acctSettings.imOptBackup')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">{t('acctSettings.imOptMerge')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">{t('acctSettings.imOptValidate')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">{t('acctSettings.imOptNotify')}</span>
                  </label>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">{t('acctSettings.imWarningTitle')}</p>
                    <p>{t('acctSettings.imWarningText')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {t('acctSettings.cancel')}
              </button>
              <button
                onClick={() => importModalFileRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {t('acctSettings.import')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{t('acctSettings.exTitle')}</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">{t('acctSettings.exInfoTitle')}</p>
                    <p>
                      {t('acctSettings.exInfoText')}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('acctSettings.exTypeLabel')} <span className="text-red-500">*</span>
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="full">{t('acctSettings.optAllSettings')}</option>
                  <option value="accounting">{t('acctSettings.optAccountingOnly')}</option>
                  <option value="fiscal">{t('acctSettings.optFiscalOnly')}</option>
                  <option value="users">{t('acctSettings.optUsersPermissions')}</option>
                  <option value="workflow">{t('acctSettings.optWorkflows')}</option>
                  <option value="custom">{t('acctSettings.optCustomSelection')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('acctSettings.exFormatLabel')} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-500 transition-colors">
                    <input type="radio" name="format" value="json" defaultChecked className="text-green-600 focus:ring-green-500" />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">JSON</div>
                      <div className="text-sm text-gray-700">{t('acctSettings.exJsonDesc')}</div>
                    </div>
                  </label>
                  <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-500 transition-colors">
                    <input type="radio" name="format" value="excel" className="text-green-600 focus:ring-green-500" />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">Excel</div>
                      <div className="text-sm text-gray-700">{t('acctSettings.exExcelDesc')}</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('acctSettings.exSectionsLabel')}
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" defaultChecked className="rounded text-green-600 focus:ring-green-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{t('acctSettings.sPlanComptable')}</div>
                      <div className="text-sm text-gray-700">{t('acctSettings.exSecChartDesc')}</div>
                    </div>
                    <span className="text-sm text-gray-700">2.3 MB</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" defaultChecked className="rounded text-green-600 focus:ring-green-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{t('navigation.journals')}</div>
                      <div className="text-sm text-gray-700">{t('acctSettings.exSecJournalsDesc')}</div>
                    </div>
                    <span className="text-sm text-gray-700">0.5 MB</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" defaultChecked className="rounded text-green-600 focus:ring-green-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{t('acctSettings.exSecFiscal')}</div>
                      <div className="text-sm text-gray-700">{t('acctSettings.exSecFiscalDesc')}</div>
                    </div>
                    <span className="text-sm text-gray-700">0.8 MB</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{t('acctSettings.exSecUsers')}</div>
                      <div className="text-sm text-gray-700">{t('acctSettings.exSecUsersDesc')}</div>
                    </div>
                    <span className="text-sm text-gray-700">0.2 MB</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{t('acctSettings.exSecWorkflows')}</div>
                      <div className="text-sm text-gray-700">{t('acctSettings.exSecWorkflowsDesc')}</div>
                    </div>
                    <span className="text-sm text-gray-700">0.4 MB</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('acctSettings.exFileNameLabel')}
                </label>
                <input
                  type="text"
                  defaultValue={`atlasfna_settings_${new Date().toISOString().split('T')[0]}`}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-gray-700">{t('acctSettings.exOptMetadata')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-gray-700">{t('acctSettings.exOptCompress')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-gray-700">{t('acctSettings.exOptEncrypt')}</span>
                </label>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{t('acctSettings.exEstimatedSize')}</span>
                  <span className="text-sm font-bold text-gray-900">3.8 MB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{t('acctSettings.exIncludedSections')}</span>
                  <span className="text-sm font-bold text-gray-900">3 / 5</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {t('acctSettings.cancel')}
              </button>
              <button
                onClick={() => { handleExportSettings(); setShowExportModal(false); }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {t('acctSettings.export')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Codification des Tiers */}
      <ModernCard className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-[var(--color-primary)]" />
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {t('acctSettings.auxTitle')}
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t('acctSettings.auxSubtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAuxReset}
                className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {t('acctSettings.auxResetDefaults')}
              </button>
              <button
                onClick={handleAuxSave}
                disabled={auxSaving}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {auxSaving ? t('acctSettings.savingInProgress') : t('acctSettings.save')}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {auxMappingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-2 px-3 font-medium text-[var(--color-text-secondary)]">{t('acctSettings.auxColAccount')}</th>
                      <th className="text-left py-2 px-3 font-medium text-[var(--color-text-secondary)]">{t('acctSettings.auxColPrefix')}</th>
                      <th className="text-left py-2 px-3 font-medium text-[var(--color-text-secondary)]">{t('acctSettings.auxColDescription')}</th>
                      <th className="text-center py-2 px-3 font-medium text-[var(--color-text-secondary)]">{t('acctSettings.auxColSeqLength')}</th>
                      <th className="text-center py-2 px-3 font-medium text-[var(--color-text-secondary)]">{t('acctSettings.auxColActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auxMappings.map(mapping => {
                      const isEditing = auxEditingId === mapping.id;
                      return (
                        <tr key={mapping.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                          <td className="py-2 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={auxEditRow!.compteCollectif}
                                onChange={e => setAuxEditRow(r => r ? { ...r, compteCollectif: e.target.value } : r)}
                                className="w-full px-2 py-1 border border-[var(--color-border)] rounded font-mono focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                placeholder="411"
                              />
                            ) : (
                              <span className="font-mono text-[var(--color-primary)]">{mapping.compteCollectif}</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={auxEditRow!.prefixeCommercial}
                                onChange={e => setAuxEditRow(r => r ? { ...r, prefixeCommercial: e.target.value } : r)}
                                className="w-full px-2 py-1 border border-[var(--color-border)] rounded font-mono focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                placeholder="CL"
                              />
                            ) : (
                              <span className="font-mono font-semibold">{mapping.prefixeCommercial}</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={auxEditRow!.description}
                                onChange={e => setAuxEditRow(r => r ? { ...r, description: e.target.value } : r)}
                                className="w-full px-2 py-1 border border-[var(--color-border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                placeholder={t('acctSettings.auxColDescription')}
                              />
                            ) : (
                              <span className="text-[var(--color-text-secondary)]">{mapping.description}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                min={1}
                                max={6}
                                value={auxEditRow!.longueurSequence}
                                onChange={e => setAuxEditRow(r => r ? { ...r, longueurSequence: parseInt(e.target.value) || 3 } : r)}
                                className="w-16 px-2 py-1 border border-[var(--color-border)] rounded text-center focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                              />
                            ) : (
                              <span className="text-[var(--color-text-secondary)]">{mapping.longueurSequence}</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={handleAuxEditSave}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title={t('acctSettings.validate')}
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleAuxEditCancel}
                                    className="p-1 text-[var(--color-text-secondary)] hover:bg-gray-100 rounded"
                                    title={t('acctSettings.cancel')}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleAuxEditStart(mapping)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title={t('acctSettings.edit')}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleAuxDelete(mapping.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title={t('acctSettings.delete')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleAuxAddRow}
                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('acctSettings.auxAddRow')}
                </button>
              </div>
            </>
          )}
        </CardBody>
      </ModernCard>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={resetConfirm}
        onClose={() => setResetConfirm(false)}
        onConfirm={handleConfirmReset}
        title={t('acctSettings.resetDialogTitle')}
        message={t('acctSettings.resetDialogMessage')}
        variant="warning"
        confirmText={t('acctSettings.reset')}
        cancelText={t('acctSettings.cancel')}
      />
    </div>
  );
};

export default AccountingSettingsPage;