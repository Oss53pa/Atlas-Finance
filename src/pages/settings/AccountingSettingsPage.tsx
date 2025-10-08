import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
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
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import { cn } from '../../lib/utils';

interface AccountingSetting {
  id: string;
  label: string;
  description: string;
  value: any;
  type: 'select' | 'number' | 'boolean' | 'text' | 'date';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  required?: boolean;
  category: string;
}

const AccountingSettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
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
        label: 'Plan comptable',
        description: 'Type de plan comptable utilisé',
        value: 'SYSCOHADA',
        type: 'select',
        options: [
          { value: 'SYSCOHADA', label: 'SYSCOHADA Révisé' },
          { value: 'SYSCOHADA_BANQUE', label: 'SYSCOHADA Banque' },
          { value: 'SYSCOHADA_ASSURANCE', label: 'SYSCOHADA Assurance' },
          { value: 'CUSTOM', label: 'Plan personnalisé' }
        ],
        required: true,
        category: 'general'
      },
      {
        id: 'exercice_fiscal',
        label: 'Exercice fiscal',
        description: 'Période de l\'exercice comptable',
        value: '01/01 - 31/12',
        type: 'select',
        options: [
          { value: '01/01 - 31/12', label: 'Année civile (Jan - Déc)' },
          { value: '01/07 - 30/06', label: 'Juillet - Juin' },
          { value: '01/10 - 30/09', label: 'Octobre - Septembre' },
          { value: 'CUSTOM', label: 'Personnalisé' }
        ],
        required: true,
        category: 'general'
      },
      {
        id: 'devise_principale',
        label: 'Devise principale',
        description: 'Devise de référence pour la comptabilité',
        value: 'XAF',
        type: 'select',
        options: [
          { value: 'XAF', label: 'Franc CFA (XAF)' },
          { value: 'EUR', label: 'Euro (EUR)' },
          { value: 'USD', label: 'Dollar US (USD)' },
          { value: 'GBP', label: 'Livre Sterling (GBP)' }
        ],
        required: true,
        category: 'general'
      },
      {
        id: 'multi_devise',
        label: 'Multi-devises',
        description: 'Activer la gestion multi-devises',
        value: true,
        type: 'boolean',
        category: 'general'
      }
    ],
    saisie: [
      {
        id: 'methode_saisie',
        label: 'Méthode de saisie',
        description: 'Mode de saisie des écritures',
        value: 'PARTIE_DOUBLE',
        type: 'select',
        options: [
          { value: 'PARTIE_DOUBLE', label: 'Partie double' },
          { value: 'SIMPLIFIEE', label: 'Saisie simplifiée' },
          { value: 'GUIDEE', label: 'Saisie guidée' }
        ],
        required: true,
        category: 'saisie'
      },
      {
        id: 'controle_equilibre',
        label: 'Contrôle d\'équilibre',
        description: 'Vérifier l\'équilibre des écritures',
        value: true,
        type: 'boolean',
        category: 'saisie'
      },
      {
        id: 'lettrage_auto',
        label: 'Lettrage automatique',
        description: 'Activer le lettrage automatique des comptes',
        value: true,
        type: 'boolean',
        category: 'saisie'
      },
      {
        id: 'validation_pieces',
        label: 'Validation des pièces',
        description: 'Rendre obligatoire l\'ajout de pièces justificatives',
        value: false,
        type: 'boolean',
        category: 'saisie'
      }
    ],
    affichage: [
      {
        id: 'decimales',
        label: 'Nombre de décimales',
        description: 'Précision des montants',
        value: 2,
        type: 'number',
        min: 0,
        max: 4,
        required: true,
        category: 'affichage'
      },
      {
        id: 'separateur_milliers',
        label: 'Séparateur de milliers',
        description: 'Caractère pour séparer les milliers',
        value: ' ',
        type: 'select',
        options: [
          { value: ' ', label: 'Espace' },
          { value: ',', label: 'Virgule' },
          { value: '.', label: 'Point' },
          { value: '', label: 'Aucun' }
        ],
        category: 'affichage'
      },
      {
        id: 'format_date',
        label: 'Format de date',
        description: 'Format d\'affichage des dates',
        value: 'DD/MM/YYYY',
        type: 'select',
        options: [
          { value: 'DD/MM/YYYY', label: 'JJ/MM/AAAA' },
          { value: 'MM/DD/YYYY', label: 'MM/JJ/AAAA' },
          { value: 'YYYY-MM-DD', label: 'AAAA-MM-JJ' }
        ],
        category: 'affichage'
      },
      {
        id: 'afficher_soldes_nuls',
        label: 'Afficher soldes nuls',
        description: 'Afficher les comptes avec solde nul',
        value: false,
        type: 'boolean',
        category: 'affichage'
      }
    ],
    cloture: [
      {
        id: 'frequence_cloture',
        label: 'Fréquence de clôture',
        description: 'Périodicité des clôtures comptables',
        value: 'MENSUELLE',
        type: 'select',
        options: [
          { value: 'MENSUELLE', label: 'Mensuelle' },
          { value: 'TRIMESTRIELLE', label: 'Trimestrielle' },
          { value: 'SEMESTRIELLE', label: 'Semestrielle' },
          { value: 'ANNUELLE', label: 'Annuelle' }
        ],
        required: true,
        category: 'cloture'
      },
      {
        id: 'cloture_auto',
        label: 'Clôture automatique',
        description: 'Activer la clôture automatique des périodes',
        value: false,
        type: 'boolean',
        category: 'cloture'
      },
      {
        id: 'delai_cloture',
        label: 'Délai de clôture (jours)',
        description: 'Nombre de jours après la fin de période',
        value: 15,
        type: 'number',
        min: 1,
        max: 90,
        category: 'cloture'
      },
      {
        id: 'verrouillage_periode',
        label: 'Verrouillage des périodes',
        description: 'Empêcher les modifications après clôture',
        value: true,
        type: 'boolean',
        category: 'cloture'
      }
    ],
    taxes: [
      {
        id: 'tva_applicable',
        label: 'TVA applicable',
        description: 'Assujettissement à la TVA',
        value: true,
        type: 'boolean',
        category: 'taxes'
      },
      {
        id: 'taux_tva_normal',
        label: 'Taux TVA normal (%)',
        description: 'Taux de TVA par défaut',
        value: 19.25,
        type: 'number',
        min: 0,
        max: 30,
        category: 'taxes'
      },
      {
        id: 'taux_tva_reduit',
        label: 'Taux TVA réduit (%)',
        description: 'Taux de TVA réduit',
        value: 5.5,
        type: 'number',
        min: 0,
        max: 30,
        category: 'taxes'
      },
      {
        id: 'regime_fiscal',
        label: 'Régime fiscal',
        description: 'Régime d\'imposition de l\'entreprise',
        value: 'REEL',
        type: 'select',
        options: [
          { value: 'REEL', label: 'Régime réel' },
          { value: 'SIMPLIFIE', label: 'Régime simplifié' },
          { value: 'LIBERATOIRE', label: 'Régime libératoire' }
        ],
        category: 'taxes'
      },
      {
        id: 'declaration_tva',
        label: 'Déclaration TVA',
        description: 'Périodicité de déclaration',
        value: 'MENSUELLE',
        type: 'select',
        options: [
          { value: 'MENSUELLE', label: 'Mensuelle' },
          { value: 'TRIMESTRIELLE', label: 'Trimestrielle' },
          { value: 'ANNUELLE', label: 'Annuelle' }
        ],
        category: 'taxes'
      },
      {
        id: 'retenue_source',
        label: 'Retenue à la source',
        description: 'Taux de retenue à la source (%)',
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
        label: 'Comptabilité analytique',
        description: 'Activer la comptabilité analytique',
        value: true,
        type: 'boolean',
        category: 'analytique'
      },
      {
        id: 'nb_axes_analytiques',
        label: 'Nombre d\'axes analytiques',
        description: 'Nombre maximum d\'axes analytiques',
        value: 3,
        type: 'number',
        min: 1,
        max: 10,
        category: 'analytique'
      },
      {
        id: 'ventilation_obligatoire',
        label: 'Ventilation obligatoire',
        description: 'Rendre obligatoire la ventilation analytique',
        value: false,
        type: 'boolean',
        category: 'analytique'
      },
      {
        id: 'controle_ventilation',
        label: 'Contrôle ventilation 100%',
        description: 'Vérifier que la ventilation totalise 100%',
        value: true,
        type: 'boolean',
        category: 'analytique'
      }
    ],
    immobilisations: [
      {
        id: 'gestion_immobilisations',
        label: 'Gestion des immobilisations',
        description: 'Activer le module immobilisations',
        value: true,
        type: 'boolean',
        category: 'immobilisations'
      },
      {
        id: 'amortissement_auto',
        label: 'Amortissement automatique',
        description: 'Calcul automatique des amortissements',
        value: true,
        type: 'boolean',
        category: 'immobilisations'
      },
      {
        id: 'methode_amortissement',
        label: 'Méthode d\'amortissement par défaut',
        description: 'Méthode d\'amortissement par défaut',
        value: 'LINEAIRE',
        type: 'select',
        options: [
          { value: 'LINEAIRE', label: 'Linéaire' },
          { value: 'DEGRESSIF', label: 'Dégressif' },
          { value: 'VARIABLE', label: 'Variable' }
        ],
        category: 'immobilisations'
      },
      {
        id: 'seuil_immobilisation',
        label: 'Seuil d\'immobilisation',
        description: 'Montant minimum pour considérer comme immobilisation',
        value: 500,
        type: 'number',
        min: 0,
        max: 10000,
        category: 'immobilisations'
      },
      {
        id: 'taux_amortissement_batiments',
        label: 'Taux amortissement bâtiments (%)',
        description: 'Taux d\'amortissement annuel pour les bâtiments',
        value: 5,
        type: 'number',
        min: 1,
        max: 10,
        category: 'immobilisations'
      },
      {
        id: 'taux_amortissement_mobilier',
        label: 'Taux amortissement mobilier (%)',
        description: 'Taux d\'amortissement annuel pour le mobilier',
        value: 10,
        type: 'number',
        min: 5,
        max: 33.33,
        category: 'immobilisations'
      },
      {
        id: 'taux_amortissement_materiel',
        label: 'Taux amortissement matériel (%)',
        description: 'Taux d\'amortissement annuel pour le matériel',
        value: 20,
        type: 'number',
        min: 10,
        max: 50,
        category: 'immobilisations'
      },
      {
        id: 'taux_amortissement_informatique',
        label: 'Taux amortissement informatique (%)',
        description: 'Taux d\'amortissement annuel pour le matériel informatique',
        value: 33.33,
        type: 'number',
        min: 20,
        max: 50,
        category: 'immobilisations'
      },
      {
        id: 'taux_amortissement_vehicules',
        label: 'Taux amortissement véhicules (%)',
        description: 'Taux d\'amortissement annuel pour les véhicules',
        value: 20,
        type: 'number',
        min: 10,
        max: 33.33,
        category: 'immobilisations'
      },
      {
        id: 'coefficient_degressif',
        label: 'Coefficient dégressif',
        description: 'Coefficient pour l\'amortissement dégressif',
        value: 2.5,
        type: 'number',
        min: 1.25,
        max: 3.5,
        category: 'immobilisations'
      },
      {
        id: 'prorata_temporis',
        label: 'Prorata temporis',
        description: 'Appliquer le prorata temporis sur la première année',
        value: true,
        type: 'boolean',
        category: 'immobilisations'
      }
    ],
    tresorerie: [
      {
        id: 'rapprochement_auto',
        label: 'Rapprochement automatique',
        description: 'Activer le rapprochement bancaire automatique',
        value: true,
        type: 'boolean',
        category: 'tresorerie'
      },
      {
        id: 'controle_decouvert',
        label: 'Contrôle découvert',
        description: 'Alerter en cas de solde négatif',
        value: true,
        type: 'boolean',
        category: 'tresorerie'
      },
      {
        id: 'previsions_tresorerie',
        label: 'Prévisions de trésorerie',
        description: 'Activer les prévisions de trésorerie',
        value: true,
        type: 'boolean',
        category: 'tresorerie'
      },
      {
        id: 'horizon_prevision',
        label: 'Horizon de prévision (mois)',
        description: 'Nombre de mois pour les prévisions',
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
        label: 'Gestion budgétaire',
        description: 'Activer la gestion budgétaire',
        value: true,
        type: 'boolean',
        category: 'budget'
      },
      {
        id: 'controle_budget',
        label: 'Contrôle budgétaire',
        description: 'Alerter lors du dépassement budgétaire',
        value: true,
        type: 'boolean',
        category: 'budget'
      },
      {
        id: 'seuil_alerte_budget',
        label: 'Seuil d\'alerte (%)',
        description: 'Pourcentage de consommation pour alerter',
        value: 80,
        type: 'number',
        min: 50,
        max: 100,
        category: 'budget'
      },
      {
        id: 'revision_budget',
        label: 'Révision budgétaire',
        description: 'Permettre la révision des budgets en cours',
        value: true,
        type: 'boolean',
        category: 'budget'
      }
    ],
    reporting: [
      {
        id: 'etats_financiers_auto',
        label: 'États financiers automatiques',
        description: 'Génération automatique des états financiers',
        value: true,
        type: 'boolean',
        category: 'reporting'
      },
      {
        id: 'format_etats',
        label: 'Format des états',
        description: 'Format par défaut des états financiers',
        value: 'SYSCOHADA',
        type: 'select',
        options: [
          { value: 'SYSCOHADA', label: 'SYSCOHADA' },
          { value: 'IFRS', label: 'IFRS' },
          { value: 'PERSONNALISE', label: 'Personnalisé' }
        ],
        category: 'reporting'
      },
      {
        id: 'comparatifs_auto',
        label: 'Comparatifs automatiques',
        description: 'Générer automatiquement les comparatifs N-1',
        value: true,
        type: 'boolean',
        category: 'reporting'
      },
      {
        id: 'tableau_bord_temps_reel',
        label: 'Tableau de bord temps réel',
        description: 'Mise à jour en temps réel des indicateurs',
        value: true,
        type: 'boolean',
        category: 'reporting'
      }
    ],
    securite: [
      {
        id: 'audit_trail',
        label: 'Piste d\'audit',
        description: 'Enregistrer toutes les modifications',
        value: true,
        type: 'boolean',
        category: 'securite'
      },
      {
        id: 'signature_electronique',
        label: 'Signature électronique',
        description: 'Exiger une signature pour les documents',
        value: false,
        type: 'boolean',
        category: 'securite'
      },
      {
        id: 'sauvegarde_auto',
        label: 'Sauvegarde automatique',
        description: 'Sauvegarde automatique des données',
        value: true,
        type: 'boolean',
        category: 'securite'
      },
      {
        id: 'frequence_sauvegarde',
        label: 'Fréquence de sauvegarde',
        description: 'Fréquence des sauvegardes automatiques',
        value: 'QUOTIDIENNE',
        type: 'select',
        options: [
          { value: 'HORAIRE', label: 'Horaire' },
          { value: 'QUOTIDIENNE', label: 'Quotidienne' },
          { value: 'HEBDOMADAIRE', label: 'Hebdomadaire' }
        ],
        category: 'securite'
      },
      {
        id: 'acces_utilisateurs',
        label: 'Contrôle d\'accès',
        description: 'Activer le contrôle d\'accès par utilisateur',
        value: true,
        type: 'boolean',
        category: 'securite'
      }
    ],
    avance: [
      {
        id: 'gestion_stocks',
        label: 'Gestion des stocks',
        description: 'Activer la gestion des stocks intégrée',
        value: true,
        type: 'boolean',
        category: 'avance'
      },
      {
        id: 'methode_valorisation',
        label: 'Méthode de valorisation',
        description: 'Méthode de valorisation des stocks',
        value: 'FIFO',
        type: 'select',
        options: [
          { value: 'FIFO', label: 'FIFO (Premier Entré, Premier Sorti)' },
          { value: 'LIFO', label: 'LIFO (Dernier Entré, Premier Sorti)' },
          { value: 'CMP', label: 'Coût Moyen Pondéré' },
          { value: 'STANDARD', label: 'Coût Standard' }
        ],
        category: 'avance'
      },
      {
        id: 'consolidation',
        label: 'Consolidation',
        description: 'Activer la consolidation des comptes',
        value: false,
        type: 'boolean',
        category: 'avance'
      },
      {
        id: 'nb_societes_consolidees',
        label: 'Nombre de sociétés à consolider',
        description: 'Nombre maximum de sociétés dans le périmètre',
        value: 5,
        type: 'number',
        min: 1,
        max: 50,
        category: 'avance'
      },
      {
        id: 'devises_etrangeres',
        label: 'Conversion devises',
        description: 'Activer la conversion automatique des devises',
        value: true,
        type: 'boolean',
        category: 'avance'
      },
      {
        id: 'source_taux_change',
        label: 'Source taux de change',
        description: 'Source des taux de change',
        value: 'BEAC',
        type: 'select',
        options: [
          { value: 'BEAC', label: 'Banque Centrale (BEAC)' },
          { value: 'ECB', label: 'Banque Centrale Européenne' },
          { value: 'MANUEL', label: 'Saisie manuelle' },
          { value: 'API', label: 'Service externe (API)' }
        ],
        category: 'avance'
      }
    ],
    normes: [
      {
        id: 'conformite_syscohada',
        label: 'Conformité SYSCOHADA',
        description: 'Respect strict des normes SYSCOHADA',
        value: true,
        type: 'boolean',
        category: 'normes'
      },
      {
        id: 'controles_coherence',
        label: 'Contrôles de cohérence',
        description: 'Activer les contrôles de cohérence automatiques',
        value: true,
        type: 'boolean',
        category: 'normes'
      },
      {
        id: 'validation_liasse',
        label: 'Validation liasse fiscale',
        description: 'Validation automatique de la liasse fiscale',
        value: true,
        type: 'boolean',
        category: 'normes'
      },
      {
        id: 'archivage_legal',
        label: 'Archivage légal',
        description: 'Durée d\'archivage légal (années)',
        value: 10,
        type: 'number',
        min: 5,
        max: 30,
        category: 'normes'
      },
      {
        id: 'trace_modifications',
        label: 'Traçabilité des modifications',
        description: 'Enregistrer toutes les modifications avec horodatage',
        value: true,
        type: 'boolean',
        category: 'normes'
      }
    ]
  });

  // Tabs configuration
  const tabs = [
    { id: 'base', label: 'Paramètres de base', icon: Settings },
    { id: 'advanced', label: 'Modules avancés', icon: Zap },
    { id: 'security', label: 'Sécurité & Audit', icon: Shield },
    { id: 'import-export', label: 'Import/Export', icon: Database }
  ];

  // Validation rules
  const validateSetting = (setting: AccountingSetting): string | null => {
    if (setting.required && (!setting.value || setting.value === '')) {
      return `${setting.label} est obligatoire`;
    }
    if (setting.type === 'number') {
      const num = parseFloat(setting.value);
      if (isNaN(num)) return `${setting.label} doit être un nombre`;
      if (setting.min !== undefined && num < setting.min) {
        return `${setting.label} doit être supérieur ou égal à ${setting.min}`;
      }
      if (setting.max !== undefined && num > setting.max) {
        return `${setting.label} doit être inférieur ou égal à ${setting.max}`;
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

  const handleSettingChange = (category: string, settingId: string, value: any) => {
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

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        // Simulated API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
      } catch (error) {
        setNotification({
          type: 'error',
          message: 'Erreur lors du chargement des paramètres'
        });
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

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
            document.querySelector('input[placeholder*="Rechercher"]')?.focus();
            break;
          case 'r':
            event.preventDefault();
            handleResetClick();
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
        message: 'Veuillez corriger les erreurs avant de sauvegarder'
      });
      return;
    }

    setSaving(true);
    try {
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulated success
      setSaving(false);
      setHasChanges(false);
      setNotification({
        type: 'success',
        message: 'Les paramètres de comptabilité ont été enregistrés avec succès'
      });
    } catch (error) {
      setSaving(false);
      setNotification({
        type: 'error',
        message: 'Erreur lors de la sauvegarde des paramètres'
      });
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const [resetConfirm, setResetConfirm] = useState(false);

  const handleResetClick = () => {
    setResetConfirm(true);
  };

  const handleConfirmReset = () => {
    // Reset to default values
    window.location.reload();
    setNotification({
      type: 'info',
      message: 'Paramètres réinitialisés aux valeurs par défaut'
    });
    setResetConfirm(false);
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
    link.download = `wisebook-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setNotification({
      type: 'success',
      message: 'Paramètres exportés avec succès'
    });
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (importedData.settings) {
          setSettings(importedData.settings);
          setHasChanges(true);
          setNotification({
            type: 'success',
            message: 'Paramètres importés avec succès'
          });
        } else {
          throw new Error('Format invalide');
        }
      } catch (error) {
        setNotification({
          type: 'error',
          message: 'Erreur lors de l\'import: fichier invalide'
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
        setting.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        setting.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    }, {} as Record<string, AccountingSetting[]>) : settings;

  // Category configuration
  const getCategoryConfig = (category: string) => {
    const configs = {
      general: { title: 'Paramètres généraux', icon: Settings },
      saisie: { title: 'Saisie comptable', icon: FileCheck },
      affichage: { title: 'Format et affichage', icon: Hash },
      cloture: { title: 'Clôture & Périodes', icon: Calendar },
      taxes: { title: 'Taxes & Fiscalité', icon: Percent },
      analytique: { title: 'Comptabilité analytique', icon: TrendingUp },
      immobilisations: { title: t('navigation.assets'), icon: Archive },
      tresorerie: { title: t('navigation.treasury'), icon: DollarSign },
      budget: { title: 'Gestion budgétaire', icon: FileText },
      reporting: { title: 'États & Reporting', icon: Printer },
      securite: { title: 'Sécurité & Audit', icon: Shield },
      avance: { title: 'Paramètres avancés', icon: Zap },
      normes: { title: 'Normes & Conformité', icon: FileCheck }
    };
    return configs[category];
  };

  const renderSetting = (setting: AccountingSetting, category: string) => {
    const hasError = validationErrors[setting.id];

    switch (setting.type) {
      case 'select':
        return (
          <div>
            <select
              value={setting.value}
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
                  {option.label}
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
              value={setting.value}
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
              checked={setting.value}
              onChange={(e) => handleSettingChange(category, setting.id, e.target.checked)}
              className="w-5 h-5 text-[var(--color-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-primary)]"
            />
            <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
              {setting.value ? 'Activé' : 'Désactivé'}
            </span>
          </label>
        );

      case 'text':
        return (
          <div>
            <input
              type="text"
              value={setting.value}
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
          Retour aux paramètres
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                Paramètres de Comptabilité
              </h1>
              <p className="text-[var(--color-text-secondary)]">
                Configuration des paramètres comptables et fiscaux
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <ModernButton
              variant="outline"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={handleReset}
              disabled={!hasChanges}
            >
              Réinitialiser
            </ModernButton>
            <ModernButton
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
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
                  {tab.label}
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
            placeholder="Rechercher un paramètre..."
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
          <input
            type="file"
            accept=".json"
            onChange={handleImportSettings}
            className="hidden"
            id="import-settings"
          />
          <label
            htmlFor="import-settings"
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <Upload className="w-4 h-4" />
            Importer
          </label>
          <button
            onClick={handleExportSettings}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <Download className="w-4 h-4" />
            Exporter
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
            let categoriesToShow = [];

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
                          Import / Export des paramètres
                        </h2>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-medium text-[var(--color-text-primary)] mb-3">Sauvegarde et restauration</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 border border-[var(--color-border)] rounded-lg">
                              <div className="flex items-center gap-3 mb-3">
                                <Download className="w-5 h-5 text-blue-500" />
                                <h4 className="font-medium">Exporter les paramètres</h4>
                              </div>
                              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                                Téléchargez une sauvegarde de tous vos paramètres comptables au format JSON.
                              </p>
                              <button
                                onClick={handleExportSettings}
                                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                              >
                                Télécharger la sauvegarde
                              </button>
                            </div>
                            <div className="p-4 border border-[var(--color-border)] rounded-lg">
                              <div className="flex items-center gap-3 mb-3">
                                <Upload className="w-5 h-5 text-green-500" />
                                <h4 className="font-medium">Importer les paramètres</h4>
                              </div>
                              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                                Restaurez vos paramètres à partir d'un fichier de sauvegarde.
                              </p>
                              <label
                                htmlFor="import-settings-main"
                                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer block text-center"
                              >
                                Sélectionner un fichier
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
                          <h3 className="font-medium text-[var(--color-text-primary)] mb-3">Modèles prédéfinis</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button className="p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-left">
                              <h4 className="font-medium mb-2">PME Commerce</h4>
                              <p className="text-sm text-[var(--color-text-secondary)]">Configuration optimisée pour les petites et moyennes entreprises commerciales</p>
                            </button>
                            <button className="p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-left">
                              <h4 className="font-medium mb-2">Industrie</h4>
                              <p className="text-sm text-[var(--color-text-secondary)]">Paramètres adaptés aux entreprises industrielles avec gestion des stocks</p>
                            </button>
                            <button className="p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-left">
                              <h4 className="font-medium mb-2">Services</h4>
                              <p className="text-sm text-[var(--color-text-secondary)]">Configuration pour les entreprises de services et prestations</p>
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
                            {setting.label}
                            {setting.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                            {setting.description}
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
              Résumé de la configuration
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-900">Plan comptable</h4>
              </div>
              <p className="text-blue-700 text-sm">
                {settings.general.find(s => s.id === 'plan_comptable')?.options?.find(o => o.value === settings.general.find(s => s.id === 'plan_comptable')?.value)?.label}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-green-600" />
                <h4 className="font-medium text-green-900">Devise principale</h4>
              </div>
              <p className="text-green-700 text-sm">
                {settings.general.find(s => s.id === 'devise_principale')?.options?.find(o => o.value === settings.general.find(s => s.id === 'devise_principale')?.value)?.label}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <h4 className="font-medium text-purple-900">Exercice fiscal</h4>
              </div>
              <p className="text-purple-700 text-sm">
                {settings.general.find(s => s.id === 'exercice_fiscal')?.options?.find(o => o.value === settings.general.find(s => s.id === 'exercice_fiscal')?.value)?.label}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-orange-600" />
                <h4 className="font-medium text-orange-900">TVA normale</h4>
              </div>
              <p className="text-orange-700 text-sm">
                {settings.taxes.find(s => s.id === 'taux_tva_normal')?.value}%
              </p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-indigo-600" />
                <h4 className="font-medium text-indigo-900">Décimales</h4>
              </div>
              <p className="text-indigo-700 text-sm">
                {settings.affichage.find(s => s.id === 'decimales')?.value} décimales
              </p>
            </div>
            <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-teal-600" />
                <h4 className="font-medium text-teal-900">Clôture</h4>
              </div>
              <p className="text-teal-700 text-sm">
                {settings.cloture.find(s => s.id === 'frequence_cloture')?.options?.find(o => o.value === settings.cloture.find(s => s.id === 'frequence_cloture')?.value)?.label}
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
                À propos des paramètres comptables
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                Ces paramètres définissent le comportement global de votre système comptable.
                Les modifications s'appliqueront à tous les utilisateurs et toutes les transactions futures.
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                    <p>
                      <strong className="text-[var(--color-text-primary)]">Configuration actuelle :</strong> Votre système est configuré selon les normes SYSCOHADA avec un exercice fiscal calqué sur l'année civile.
                    </p>
                    <p>
                      <strong className="text-amber-600">Important :</strong> Certains paramètres (plan comptable, exercice fiscal) ne peuvent être modifiés qu'en début d'exercice ou nécessitent des droits administrateur spéciaux.
                    </p>
                    <p>
                      <strong className="text-blue-600">Conseil :</strong> Il est recommandé de tester les modifications sur un environnement de test avant de les appliquer en production.
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Raccourcis clavier</h4>
                    </div>
                    <div className="space-y-1 text-sm text-blue-700">
                      <div className="flex justify-between">
                        <span>Sauvegarder</span>
                        <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Ctrl + S</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('common.search')}</span>
                        <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Ctrl + F</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Réinitialiser</span>
                        <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Ctrl + R</kbd>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <button
                        onClick={() => window.open('https://docs.wisebook.com/settings', '_blank')}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Documentation complète
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
                Alertes système
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Configuration valide</p>
                  <p className="text-xs text-green-700">Tous les paramètres obligatoires sont configurés</p>
                </div>
              </div>
              {!settings.taxes.find(s => s.id === 'tva_applicable')?.value && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">TVA désactivée</p>
                    <p className="text-xs text-amber-700">Vérifiez si votre entreprise est assujettie à la TVA</p>
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
                Statut des modules
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {[
                { label: 'Comptabilité analytique', enabled: settings.analytique.find(s => s.id === 'comptabilite_analytique')?.value },
                { label: 'Gestion des stocks', enabled: settings.avance.find(s => s.id === 'gestion_stocks')?.value },
                { label: t('navigation.assets'), enabled: settings.immobilisations.find(s => s.id === 'gestion_immobilisations')?.value },
                { label: 'Gestion budgétaire', enabled: settings.budget.find(s => s.id === 'gestion_budget')?.value },
                { label: 'Prévisions trésorerie', enabled: settings.tresorerie.find(s => s.id === 'previsions_tresorerie')?.value }
              ].map((module, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-b-0">
                  <span className="text-sm text-[var(--color-text-primary)]">{module.label}</span>
                  <span className={cn(
                    'px-2 py-1 text-xs rounded-full',
                    module.enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  )}>
                    {module.enabled ? 'Activé' : 'Désactivé'}
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
              <h2 className="text-xl font-semibold text-gray-900">Importer des Paramètres</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Instructions d'importation</p>
                    <p>
                      Sélectionnez un fichier de configuration JSON ou Excel contenant les paramètres comptables.
                      L'import écrasera les paramètres existants.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type d'importation <span className="text-red-500">*</span>
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Sélectionner...</option>
                  <option value="full">Tous les paramètres</option>
                  <option value="accounting">Paramètres comptables uniquement</option>
                  <option value="fiscal">Paramètres fiscaux uniquement</option>
                  <option value="users">Utilisateurs et permissions</option>
                  <option value="workflow">Workflows et validations</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier de configuration <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                  <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600 mb-1">
                    Cliquez pour sélectionner ou glissez-déposez
                  </p>
                  <p className="text-xs text-gray-700">JSON, Excel (.xlsx, .xls) - Max 5 MB</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Options d'importation
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Créer une sauvegarde avant l'import</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Fusionner avec les paramètres existants (ne pas écraser)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Valider la structure avant l'import</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Envoyer une notification après l'import</span>
                  </label>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Attention</p>
                    <p>L'import de paramètres peut affecter l'ensemble du système. Assurez-vous d'avoir vérifié le fichier avant de procéder.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Importer
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
              <h2 className="text-xl font-semibold text-gray-900">Exporter des Paramètres</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Exportation des paramètres</p>
                    <p>
                      Créez une sauvegarde complète de vos paramètres comptables au format JSON ou Excel.
                      Vous pourrez les réimporter ultérieurement.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type d'exportation <span className="text-red-500">*</span>
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  <option value="full">Tous les paramètres</option>
                  <option value="accounting">Paramètres comptables uniquement</option>
                  <option value="fiscal">Paramètres fiscaux uniquement</option>
                  <option value="users">Utilisateurs et permissions</option>
                  <option value="workflow">Workflows et validations</option>
                  <option value="custom">Sélection personnalisée</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format d'exportation <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-500 transition-colors">
                    <input type="radio" name="format" value="json" defaultChecked className="text-green-600 focus:ring-green-500" />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">JSON</div>
                      <div className="text-sm text-gray-700">Format structuré, compatible système</div>
                    </div>
                  </label>
                  <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-500 transition-colors">
                    <input type="radio" name="format" value="excel" className="text-green-600 focus:ring-green-500" />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">Excel</div>
                      <div className="text-sm text-gray-700">Format lisible, éditable</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Sections à inclure
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" defaultChecked className="rounded text-green-600 focus:ring-green-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Plan comptable</div>
                      <div className="text-sm text-gray-700">Comptes, classes, rubriques</div>
                    </div>
                    <span className="text-sm text-gray-700">2.3 MB</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" defaultChecked className="rounded text-green-600 focus:ring-green-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{t('navigation.journals')}</div>
                      <div className="text-sm text-gray-700">Configuration des journaux comptables</div>
                    </div>
                    <span className="text-sm text-gray-700">0.5 MB</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" defaultChecked className="rounded text-green-600 focus:ring-green-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Paramètres fiscaux</div>
                      <div className="text-sm text-gray-700">Taxes, TVA, déclarations</div>
                    </div>
                    <span className="text-sm text-gray-700">0.8 MB</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Utilisateurs et rôles</div>
                      <div className="text-sm text-gray-700">Permissions et droits d'accès</div>
                    </div>
                    <span className="text-sm text-gray-700">0.2 MB</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Workflows</div>
                      <div className="text-sm text-gray-700">Processus de validation et clôtures</div>
                    </div>
                    <span className="text-sm text-gray-700">0.4 MB</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du fichier
                </label>
                <input
                  type="text"
                  defaultValue={`wisebook_settings_${new Date().toISOString().split('T')[0]}`}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-gray-700">Inclure les métadonnées (date, version, auteur)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-gray-700">Compresser le fichier (.zip)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-gray-700">Chiffrer le fichier (mot de passe requis)</span>
                </label>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Taille estimée:</span>
                  <span className="text-sm font-bold text-gray-900">3.8 MB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Sections incluses:</span>
                  <span className="text-sm font-bold text-gray-900">3 / 5</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exporter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={resetConfirm}
        onClose={() => setResetConfirm(false)}
        onConfirm={handleConfirmReset}
        title="Réinitialiser les paramètres"
        message="Voulez-vous vraiment réinitialiser tous les paramètres aux valeurs par défaut ? Cette action rechargera la page."
        variant="warning"
        confirmText="Réinitialiser"
        cancelText="Annuler"
      />
    </div>
  );
};

export default AccountingSettingsPage;