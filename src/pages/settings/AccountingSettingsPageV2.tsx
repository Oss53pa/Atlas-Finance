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
  ChevronRight,
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
  Grid3x3,
  List,
  LayoutGrid,
  ChevronUp,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import { cn } from '../../lib/utils';
import { AssetClassificationService, AssetClassification } from '../../data/assetClassification';

interface AccountingSetting {
  id: string;
  label: string;
  description: string;
  value: any;
  type: 'select' | 'number' | 'boolean' | 'text' | 'date' | 'action';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  required?: boolean;
  category: string;
  action?: () => void;
  actionLabel?: string;
}

type ViewMode = 'cards' | 'list' | 'compact';

const AccountingSettingsPageV2: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('base');
  const [searchTerm, setSearchTerm] = useState('');
  const [classificationSearchTerm, setClassificationSearchTerm] = useState('');
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>('all');
  const [classifications, setClassifications] = useState<AssetClassification[]>(
    AssetClassificationService.getAllClassifications()
  );
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['general']));
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingParameter, setEditingParameter] = useState<{category: string, setting: AccountingSetting} | null>(null);
  const [newParameter, setNewParameter] = useState<Partial<AccountingSetting & { optionsText?: string }>>({
    type: 'text',
    required: false,
    category: 'general',
    optionsText: ''
  });

  // Paramètres de comptabilité complets
  const [settings, setSettings] = useState<Record<string, AccountingSetting[]>>({
    general: [
      {
        id: 'plan_comptable',
        label: t('accounting.chartOfAccounts'),
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
        label: 'Retenue à la source (%)',
        description: 'Taux de retenue à la source',
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
        label: t('assets.management'),
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
        label: 'Méthode d\'amortissement',
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
      }
    ],
    classification: [],
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
        label: t('treasury.forecast'),
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
        label: t('budget.control'),
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
    ]
  });

  // Category configuration
  const getCategoryConfig = (category: string) => {
    const configs: Record<string, any> = {
      general: { title: t('settings.general'), icon: Settings, color: 'blue' },
      saisie: { title: 'Saisie comptable', icon: FileCheck, color: 'green' },
      affichage: { title: 'Format et affichage', icon: Hash, color: 'purple' },
      cloture: { title: 'Clôture & Périodes', icon: Calendar, color: 'indigo' },
      taxes: { title: 'Taxes & Fiscalité', icon: Percent, color: 'orange' },
      analytique: { title: 'Comptabilité analytique', icon: TrendingUp, color: 'teal' },
      classification: { title: 'Classification des Actifs', icon: Archive, color: 'cyan' },
      immobilisations: { title: t('assets.title'), icon: Archive, color: 'amber' },
      tresorerie: { title: t('treasury.title'), icon: DollarSign, color: 'emerald' },
      budget: { title: 'Gestion budgétaire', icon: FileText, color: 'rose' },
      reporting: { title: 'États & Reporting', icon: Printer, color: 'violet' },
      securite: { title: 'Sécurité & Audit', icon: Shield, color: 'red' }
    };
    return configs[category];
  };

  // Toggle section expansion
  const toggleSection = (category: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setLoading(false);
    };
    loadSettings();
  }, []);

  // Handle setting change
  const handleSettingChange = (category: string, settingId: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: prev[category].map(setting =>
        setting.id === settingId ? { ...setting, value } : setting
      )
    }));
    setHasChanges(true);
  };

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSaving(false);
    setHasChanges(false);
    setNotification({
      type: 'success',
      message: 'Les paramètres ont été enregistrés avec succès'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Add new parameter
  const handleAddParameter = () => {
    if (!newParameter.id || !newParameter.label || !newParameter.category) {
      setNotification({
        type: 'error',
        message: 'Veuillez remplir tous les champs obligatoires'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Parse options if type is select
    let parsedOptions: { value: string; label: string }[] | undefined;
    if (newParameter.type === 'select' && (newParameter as any).optionsText) {
      const optionsText = (newParameter as any).optionsText as string;
      parsedOptions = optionsText.split('\n').filter(line => line.trim()).map(line => {
        const parts = line.split('|');
        if (parts.length === 2) {
          return { value: parts[0].trim(), label: parts[1].trim() };
        }
        return { value: line.trim(), label: line.trim() };
      });

      if (parsedOptions.length === 0) {
        setNotification({
          type: 'error',
          message: 'Veuillez définir au moins une option pour la liste de choix'
        });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
    }

    const param: AccountingSetting = {
      id: newParameter.id!,
      label: newParameter.label!,
      description: newParameter.description || '',
      value: newParameter.value || (newParameter.type === 'boolean' ? false : ''),
      type: newParameter.type || 'text',
      required: newParameter.required || false,
      category: newParameter.category!,
      options: parsedOptions || newParameter.options,
      min: newParameter.min,
      max: newParameter.max
    };

    setSettings(prev => ({
      ...prev,
      [param.category]: [...(prev[param.category] || []), param]
    }));

    setShowAddModal(false);
    setNewParameter({
      type: 'text',
      required: false,
      category: 'general',
      optionsText: ''
    });
    setHasChanges(true);
    setNotification({
      type: 'success',
      message: 'Paramètre ajouté avec succès'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Delete parameter
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; category: string; settingId: string }>({
    isOpen: false,
    category: '',
    settingId: ''
  });

  const handleDeleteParameterClick = (category: string, settingId: string) => {
    setDeleteConfirm({ isOpen: true, category, settingId });
  };

  const handleConfirmDeleteParameter = () => {
    setSettings(prev => ({
      ...prev,
      [deleteConfirm.category]: prev[deleteConfirm.category].filter(s => s.id !== deleteConfirm.settingId)
    }));
    setHasChanges(true);
    setNotification({
      type: 'success',
      message: 'Paramètre supprimé avec succès'
    });
    setTimeout(() => setNotification(null), 3000);
    setDeleteConfirm({ isOpen: false, category: '', settingId: '' });
  };

  // Open edit modal
  const handleEditParameter = (category: string, setting: AccountingSetting) => {
    setEditingParameter({ category, setting });
    setShowEditModal(true);
  };

  // Update parameter
  const handleUpdateParameter = () => {
    if (!editingParameter) return;

    setSettings(prev => ({
      ...prev,
      [editingParameter.category]: prev[editingParameter.category].map(s =>
        s.id === editingParameter.setting.id ? editingParameter.setting : s
      )
    }));

    setShowEditModal(false);
    setEditingParameter(null);
    setHasChanges(true);
    setNotification({
      type: 'success',
      message: 'Paramètre modifié avec succès'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Render setting field
  const renderSettingField = (setting: AccountingSetting, category: string) => {
    const hasError = validationErrors[setting.id];

    switch (setting.type) {
      case 'select':
        return (
          <select
            value={setting.value}
            onChange={(e) => handleSettingChange(category, setting.id, e.target.value)}
            className={cn(
              "w-full px-3 py-2 border rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2",
              hasError
                ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
                : "border-[var(--color-border)] focus:ring-[var(--color-primary)]"
            )}
          >
            {setting.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={setting.value}
            onChange={(e) => handleSettingChange(category, setting.id, parseFloat(e.target.value))}
            min={setting.min}
            max={setting.max}
            className={cn(
              "w-full px-3 py-2 border rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2",
              hasError
                ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
                : "border-[var(--color-border)] focus:ring-[var(--color-primary)]"
            )}
          />
        );

      case 'boolean':
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={setting.value}
              onChange={(e) => handleSettingChange(category, setting.id, e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--color-border-light)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary-light)] rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
            <span className="ml-3 text-sm font-medium text-[var(--color-text-primary)]">
              {setting.value ? 'Activé' : 'Désactivé'}
            </span>
          </label>
        );

      case 'action':
        return (
          <ModernButton
            onClick={setting.action}
            className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
            icon={<ExternalLink className="w-4 h-4" />}
          >
            {setting.actionLabel || 'Exécuter'}
          </ModernButton>
        );

      default:
        return null;
    }
  };

  // Render Classification View
  const renderClassificationView = () => {
    const assetClasses = AssetClassificationService.getAssetClasses();
    const filteredClassifications = classifications.filter(item => {
      const matchesSearch = classificationSearchTerm === '' ||
        item.assetCategory.toLowerCase().includes(classificationSearchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(classificationSearchTerm.toLowerCase()) ||
        item.examples.some(ex => ex.toLowerCase().includes(classificationSearchTerm.toLowerCase()));

      const matchesClass = selectedAssetClass === 'all' || item.assetClass === selectedAssetClass;

      return matchesSearch && matchesClass;
    });

    const getDepreciationRangeText = (item: AssetClassification) => {
      if (item.depreciationRate.min === 0 && item.depreciationRate.max === 0) {
        return 'Non amortissable';
      }
      if (item.depreciationRate.min === item.depreciationRate.max) {
        return `${item.depreciationRate.min}%`;
      }
      return `${item.depreciationRate.min}% à ${item.depreciationRate.max}%`;
    };

    const getUsefulLifeText = (item: AssetClassification) => {
      if (item.usefulLifeYears.min === 0 && item.usefulLifeYears.max === 0) {
        return 'Illimitée';
      }
      if (item.usefulLifeYears.min === item.usefulLifeYears.max) {
        return `${item.usefulLifeYears.min} ans`;
      }
      return `${item.usefulLifeYears.min} à ${item.usefulLifeYears.max} ans`;
    };

    const getCategoryColor = (assetClass: string) => {
      const colors: { [key: string]: string } = {
        '21-Immobilisations incorporelles': 'bg-purple-100 text-purple-800 border-purple-200',
        '22-Terrains': 'bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success)]',
        '23-Bâtiments, installations techniques et agencements': 'bg-[var(--color-info-light)] text-[var(--color-info)] border-[var(--color-info)]',
        '24 - Matériel, mobilier': 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border-[var(--color-warning)]'
      };
      return colors[assetClass] || 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] border-[var(--color-border)]';
    };

    return (
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="bg-[var(--color-info-light)] border border-[var(--color-info)] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[var(--color-info)] mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                Classification des Actifs selon SYSCOHADA
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                Cette classification détermine automatiquement les durées de vie, taux d'amortissement
                et comptes comptables lors de la capitalisation des immobilisations.
              </p>
              <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                <span>📊 {classifications.length} catégories configurées</span>
                <span>✓ Conforme SYSCOHADA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-tertiary)] w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher une catégorie d'actif..."
              value={classificationSearchTerm}
              onChange={(e) => setClassificationSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <select
            value={selectedAssetClass}
            onChange={(e) => setSelectedAssetClass(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="all">Toutes les classes</option>
            {assetClasses.map(cls => (
              <option key={cls.code} value={cls.code}>{cls.code} - {cls.name}</option>
            ))}
          </select>
        </div>

        {/* Classifications Table */}
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-surface-hover)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Classe</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Catégorie</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Contenu</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Durée de vie</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Taux amortissement</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Comptes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClassifications.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(item.assetClass)}`}>
                        {item.assetClass.split('-')[0]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{item.assetCategory}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-[var(--color-text-secondary)]">{item.content}</div>
                      {item.examples.length > 0 && (
                        <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
                          Ex: {item.examples.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{getUsefulLifeText(item)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{getDepreciationRangeText(item)}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-xs">
                        {item.accountNumbers && item.accountNumbers.length > 0 ? (
                          item.accountNumbers.map((acc, i) => (
                            <div key={i} className="font-mono text-[var(--color-text-secondary)]">{acc}</div>
                          ))
                        ) : (
                          <span className="text-[var(--color-text-tertiary)]">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredClassifications.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-tertiary)]">
            <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucune classification trouvée</p>
          </div>
        )}
      </div>
    );
  };

  // Render fiscal view
  const renderFiscalView = () => {
    return (
      <div className="space-y-6">
        <ModernCard>
          <CardBody>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[var(--color-primary)]" />
              TVA et Taxes
            </h2>
            <div className="space-y-4">
              <div className="border border-[var(--color-border)] rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">Taux TVA Normal</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Taux de TVA standard applicable dans votre pays (ex: 19% Cameroun, 18% Congo)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <input
                    type="number"
                    defaultValue={19}
                    min={0}
                    max={50}
                    className="w-24 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-[var(--color-text-secondary)]">%</span>
                </div>
              </div>

              <div className="border border-[var(--color-border)] rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">Taux TVA Réduit</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Taux réduit pour certains produits ou services</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <input
                    type="number"
                    defaultValue={5}
                    min={0}
                    max={50}
                    className="w-24 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-[var(--color-text-secondary)]">%</span>
                </div>
              </div>

              <div className="border border-[var(--color-border)] rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">Régime Fiscal</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Type de régime fiscal applicable à votre entreprise</p>
                  </div>
                </div>
                <div className="mt-3">
                  <select className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                    <option key="reel" value="reel">Régime Réel</option>
                    <option key="simplifie" value="simplifie">Régime Simplifié</option>
                    <option key="micro" value="micro">Micro-entreprise</option>
                  </select>
                </div>
              </div>

              <div className="border border-[var(--color-border)] rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">Exercice Fiscal</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Date de début de l'exercice fiscal</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Date de début</label>
                    <input
                      type="date"
                      defaultValue="2024-01-01"
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Date de fin</label>
                    <input
                      type="date"
                      defaultValue="2024-12-31"
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-[var(--color-border)] rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">Assujetti à la TVA</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Votre entreprise est-elle assujettie à la TVA?</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="tva" value="oui" defaultChecked className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="text-sm text-[var(--color-text-primary)]">Oui</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="tva" value="non" className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="text-sm text-[var(--color-text-primary)]">Non</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-[var(--color-border)]">
              <ModernButton
                onClick={handleSave}
                className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                icon={<Save className="w-4 h-4" />}
              >
                Enregistrer les modifications
              </ModernButton>
              <ModernButton
                onClick={() => {}}
                className="border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-gray-50"
              >
                Annuler
              </ModernButton>
            </div>
          </CardBody>
        </ModernCard>
      </div>
    );
  };

  // Render list view
  const renderListView = () => {
    return (
      <div className="space-y-4">
        {Object.entries(settings).map(([category, categorySettings]) => {
          const config = getCategoryConfig(category);
          if (!config) return null;

          const isExpanded = expandedSections.has(category);
          const Icon = config.icon;

          return (
            <div key={category} className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(category)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    config.color === 'blue' && "bg-[var(--color-info-light)]",
                    config.color === 'green' && "bg-[var(--color-success-light)]",
                    config.color === 'purple' && "bg-purple-100",
                    config.color === 'orange' && "bg-[var(--color-warning-light)]",
                    config.color === 'indigo' && "bg-indigo-100",
                    config.color === 'teal' && "bg-teal-100",
                    config.color === 'amber' && "bg-amber-100",
                    config.color === 'emerald' && "bg-emerald-100",
                    config.color === 'rose' && "bg-rose-100",
                    config.color === 'violet' && "bg-violet-100",
                    config.color === 'red' && "bg-[var(--color-error-light)]"
                  )}>
                    <Icon className={cn(
                      "w-5 h-5",
                      config.color === 'blue' && "text-[var(--color-info)]",
                      config.color === 'green' && "text-[var(--color-success)]",
                      config.color === 'purple' && "text-purple-600",
                      config.color === 'orange' && "text-[var(--color-warning)]",
                      config.color === 'indigo' && "text-indigo-600",
                      config.color === 'teal' && "text-teal-600",
                      config.color === 'amber' && "text-amber-600",
                      config.color === 'emerald' && "text-emerald-600",
                      config.color === 'rose' && "text-rose-600",
                      config.color === 'violet' && "text-violet-600",
                      config.color === 'red' && "text-[var(--color-error)]"
                    )} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">{config.title}</h3>
                    <p className="text-sm text-[var(--color-text-tertiary)]">{categorySettings.length} paramètres</p>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "w-5 h-5 text-[var(--color-text-tertiary)] transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="border-t border-[var(--color-border-light)]">
                  <div className="p-6 space-y-6">
                    {categorySettings.map(setting => (
                      <div key={setting.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                              {setting.label}
                              {setting.required && <span className="text-[var(--color-error)] ml-1">*</span>}
                            </label>
                            <p className="text-sm text-[var(--color-text-tertiary)]">{setting.description}</p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditParameter(category, setting)}
                              className="ml-2 p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded transition-colors"
                              title="Modifier ce paramètre"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {!setting.required && (
                              <button
                                onClick={() => handleDeleteParameterClick(category, setting.id)}
                                className="p-1 text-[var(--color-error)] hover:bg-[var(--color-error-light)] rounded transition-colors"
                                title="Supprimer ce paramètre"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          {renderSettingField(setting, category)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render compact view
  const renderCompactView = () => {
    return (
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
        <div className="space-y-8">
          {Object.entries(settings).map(([category, categorySettings]) => {
            const config = getCategoryConfig(category);
            if (!config) return null;

            const Icon = config.icon;

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--color-border)]">
                  <Icon className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <h3 className="font-semibold text-[var(--color-text-primary)]">{config.title}</h3>
                </div>
                <div className="space-y-4">
                  {categorySettings.map(setting => (
                    <div key={setting.id} className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                          {setting.label}
                          {setting.required && <span className="text-[var(--color-error)] ml-1">*</span>}
                        </span>
                      </div>
                      <div className="w-64">
                        {renderSettingField(setting, category)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render cards view (original)
  const renderCardsView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(settings).map(([category, categorySettings]) => {
          const config = getCategoryConfig(category);
          if (!config) return null;

          const Icon = config.icon;

          return (
            <ModernCard key={category}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-[var(--color-primary)]" />
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{config.title}</h2>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {categorySettings.map(setting => (
                    <div key={setting.id}>
                      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                        {setting.label}
                        {setting.required && <span className="text-[var(--color-error)] ml-1">*</span>}
                      </label>
                      <p className="text-xs text-[var(--color-text-tertiary)] mb-2">{setting.description}</p>
                      {renderSettingField(setting, category)}
                    </div>
                  ))}
                </div>
              </CardBody>
            </ModernCard>
          );
        })}
      </div>
    );
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

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
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
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddModal(true)}
              className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] border-[var(--color-primary)]"
            >
              Ajouter un paramètre
            </ModernButton>
            {/* View Mode Selector */}
            <div className="flex bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-1">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "px-3 py-1.5 rounded flex items-center gap-2 transition-colors",
                  viewMode === 'list'
                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                )}
                title="Vue liste"
              >
                <List className="w-4 h-4" />
                <span className="text-sm hidden md:inline">Liste</span>
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={cn(
                  "px-3 py-1.5 rounded flex items-center gap-2 transition-colors",
                  viewMode === 'compact'
                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                )}
                title="Vue compacte"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-sm hidden md:inline">Compact</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  "px-3 py-1.5 rounded flex items-center gap-2 transition-colors",
                  viewMode === 'cards'
                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                )}
                title="Vue cartes"
              >
                <Grid3x3 className="w-4 h-4" />
                <span className="text-sm hidden md:inline">Cartes</span>
              </button>
            </div>

            <ModernButton
              variant="outline"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => window.location.reload()}
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
              {saving ? 'Enregistrement...' : t('actions.save')}
            </ModernButton>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-[var(--color-border)]">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('base')}
            className={cn(
              "px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === 'base'
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]"
            )}
          >
            Paramètres généraux
          </button>
          <button
            onClick={() => setActiveTab('classification')}
            className={cn(
              "px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
              activeTab === 'classification'
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]"
            )}
          >
            <Archive className="w-4 h-4" />
            Classification des Actifs
          </button>
          <button
            onClick={() => setActiveTab('fiscal')}
            className={cn(
              "px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
              activeTab === 'fiscal'
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]"
            )}
          >
            <FileText className="w-4 h-4" />
            Paramètres Fiscaux
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={cn(
          'mb-6 p-4 rounded-lg flex items-center justify-between gap-3',
          notification.type === 'success' && 'bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success)]',
          notification.type === 'error' && 'bg-[var(--color-error-light)] text-[var(--color-error)] border border-[var(--color-error)]',
          notification.type === 'info' && 'bg-[var(--color-info-light)] text-[var(--color-info)] border border-[var(--color-info)]',
          notification.type === 'warning' && 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[var(--color-warning)]'
        )}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' && <Check className="w-5 h-5" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {notification.type === 'info' && <Info className="w-5 h-5" />}
            {notification.type === 'warning' && <AlertCircle className="w-5 h-5" />}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-tertiary)] w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher un paramètre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      ) : activeTab === 'classification' ? (
        renderClassificationView()
      ) : activeTab === 'fiscal' ? (
        renderFiscalView()
      ) : (
        <>
          {viewMode === 'list' && renderListView()}
          {viewMode === 'compact' && renderCompactView()}
          {viewMode === 'cards' && renderCardsView()}
        </>
      )}

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--color-surface)] rounded-lg p-4 border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Total paramètres</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                {Object.values(settings).flat().length}
              </p>
            </div>
            <Settings className="w-8 h-8 text-[var(--color-text-tertiary)]" />
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg p-4 border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Modifications</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                {hasChanges ? '1' : '0'}
              </p>
            </div>
            <FileCheck className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg p-4 border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Catégories</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                {Object.keys(settings).length}
              </p>
            </div>
            <Database className="w-8 h-8 text-[var(--color-text-tertiary)]" />
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg p-4 border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Obligatoires</p>
              <p className="text-2xl font-bold text-[var(--color-warning)]">
                {Object.values(settings).flat().filter(s => s.required).length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-[var(--color-warning)]" />
          </div>
        </div>
      </div>

      {/* Add Parameter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Ajouter un nouveau paramètre</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
              >
                <X size={24} className="text-[var(--color-text-tertiary)]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">
                  Identifiant <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={newParameter.id || ''}
                  onChange={(e) => setNewParameter(prev => ({...prev, id: e.target.value.toLowerCase().replace(/\s+/g, '_')}))}
                  placeholder="mon_parametre"
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all"
                />
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Format: minuscules_avec_underscores</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">
                  Libellé <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={newParameter.label || ''}
                  onChange={(e) => setNewParameter(prev => ({...prev, label: e.target.value}))}
                  placeholder="Mon nouveau paramètre"
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Description</label>
                <textarea
                  value={newParameter.description || ''}
                  onChange={(e) => setNewParameter(prev => ({...prev, description: e.target.value}))}
                  placeholder="Description du paramètre"
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Type <span className="text-[var(--color-error)]">*</span></label>
                  <select
                    value={newParameter.type || 'text'}
                    onChange={(e) => setNewParameter(prev => ({...prev, type: e.target.value as any}))}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all"
                  >
                    <option key="text" value="text">Texte</option>
                    <option key="number" value="number">Nombre</option>
                    <option key="boolean" value="boolean">Oui/Non</option>
                    <option key="select" value="select">Liste de choix</option>
                    <option key="date" value="date">{t('common.date')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Catégorie <span className="text-[var(--color-error)]">*</span></label>
                  <select
                    value={newParameter.category || 'general'}
                    onChange={(e) => setNewParameter(prev => ({...prev, category: e.target.value}))}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all"
                  >
                    <option key="general" value="general">Paramètres généraux</option>
                    <option key="saisie" value="saisie">Saisie comptable</option>
                    <option key="affichage" value="affichage">Format et affichage</option>
                    <option key="cloture" value="cloture">Clôture & Périodes</option>
                    <option key="taxes" value="taxes">Taxes & Fiscalité</option>
                    <option key="analytique" value="analytique">Comptabilité analytique</option>
                    <option key="immobilisations" value="immobilisations">{t('assets.title')}</option>
                    <option key="tresorerie" value="tresorerie">{t('treasury.title')}</option>
                    <option key="budget" value="budget">Gestion budgétaire</option>
                    <option key="reporting" value="reporting">États & Reporting</option>
                    <option key="securite" value="securite">Sécurité & Audit</option>
                  </select>
                </div>
              </div>

              {newParameter.type === 'select' && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">
                    Options <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <textarea
                    value={(newParameter as any).optionsText || ''}
                    onChange={(e) => setNewParameter(prev => ({...prev, optionsText: e.target.value}))}
                    placeholder="option1|Libellé 1&#10;option2|Libellé 2&#10;option3|Libellé 3"
                    rows={5}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all font-mono text-sm"
                  />
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    Une option par ligne. Format : <code className="bg-[var(--color-surface-hover)] px-1 py-0.5 rounded">valeur|Libellé</code> ou simplement <code className="bg-[var(--color-surface-hover)] px-1 py-0.5 rounded">valeur</code>
                  </p>
                  <p className="text-xs text-[var(--color-primary)] mt-1">
                    Exemple : <code className="bg-[var(--color-primary-light)] px-1 py-0.5 rounded">XAF|Franc CFA</code> ou <code className="bg-[var(--color-primary-light)] px-1 py-0.5 rounded">EUR</code>
                  </p>
                </div>
              )}

              {newParameter.type !== 'boolean' && newParameter.type !== 'action' && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Valeur par défaut</label>
                  <input
                    type={newParameter.type === 'number' ? 'number' : 'text'}
                    value={newParameter.value || ''}
                    onChange={(e) => setNewParameter(prev => ({...prev, value: e.target.value}))}
                    placeholder="Valeur initiale"
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all"
                  />
                </div>
              )}

              {newParameter.type === 'number' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Valeur minimum</label>
                    <input
                      type="number"
                      value={newParameter.min || ''}
                      onChange={(e) => setNewParameter(prev => ({...prev, min: parseFloat(e.target.value)}))}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Valeur maximum</label>
                    <input
                      type="number"
                      value={newParameter.max || ''}
                      onChange={(e) => setNewParameter(prev => ({...prev, max: parseFloat(e.target.value)}))}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Aide contextuelle (tooltip)</label>
                <textarea
                  value={newParameter.help || ''}
                  onChange={(e) => setNewParameter(prev => ({...prev, help: e.target.value}))}
                  placeholder="Texte d'aide qui s'affichera au survol de l'icône d'information"
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={newParameter.required || false}
                  onChange={(e) => setNewParameter(prev => ({...prev, required: e.target.checked}))}
                  className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
                />
                <label htmlFor="required" className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Paramètre obligatoire
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <ModernButton
                  onClick={handleAddParameter}
                  className="flex-1 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Ajouter le paramètre
                </ModernButton>
                <ModernButton
                  onClick={() => setShowAddModal(false)}
                  variant="outline"
                >
                  Annuler
                </ModernButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Parameter Modal */}
      {showEditModal && editingParameter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Modifier le paramètre</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingParameter(null);
                }}
                className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
              >
                <X size={24} className="text-[var(--color-text-tertiary)]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">
                  Identifiant <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={editingParameter.setting.id}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)] cursor-not-allowed"
                />
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">L'identifiant ne peut pas être modifié</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">
                  Libellé <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={editingParameter.setting.label}
                  onChange={(e) => setEditingParameter({
                    ...editingParameter,
                    setting: { ...editingParameter.setting, label: e.target.value }
                  })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Description</label>
                <textarea
                  value={editingParameter.setting.description}
                  onChange={(e) => setEditingParameter({
                    ...editingParameter,
                    setting: { ...editingParameter.setting, description: e.target.value }
                  })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Type</label>
                  <input
                    type="text"
                    value={editingParameter.setting.type}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)] cursor-not-allowed"
                  />
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Le type ne peut pas être modifié</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Catégorie</label>
                  <input
                    type="text"
                    value={getCategoryConfig(editingParameter.category)?.title || editingParameter.category}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)] cursor-not-allowed"
                  />
                </div>
              </div>

              {editingParameter.setting.type === 'number' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Valeur minimum</label>
                    <input
                      type="number"
                      value={editingParameter.setting.min || ''}
                      onChange={(e) => setEditingParameter({
                        ...editingParameter,
                        setting: { ...editingParameter.setting, min: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Valeur maximum</label>
                    <input
                      type="number"
                      value={editingParameter.setting.max || ''}
                      onChange={(e) => setEditingParameter({
                        ...editingParameter,
                        setting: { ...editingParameter.setting, max: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {editingParameter.setting.type === 'select' && editingParameter.setting.options && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Options disponibles</label>
                  <div className="bg-[var(--color-surface-hover)] p-3 rounded-lg border border-[var(--color-border)]">
                    <ul className="list-disc list-inside text-sm text-[var(--color-text-secondary)]">
                      {editingParameter.setting.options.map((opt, idx) => (
                        <li key={idx}>{opt.label}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Les options ne peuvent pas être modifiées ici</p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-required"
                  checked={editingParameter.setting.required || false}
                  onChange={(e) => setEditingParameter({
                    ...editingParameter,
                    setting: { ...editingParameter.setting, required: e.target.checked }
                  })}
                  className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
                />
                <label htmlFor="edit-required" className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Paramètre obligatoire
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <ModernButton
                  onClick={handleUpdateParameter}
                  className="flex-1 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Enregistrer les modifications
                </ModernButton>
                <ModernButton
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingParameter(null);
                  }}
                  variant="outline"
                >
                  Annuler
                </ModernButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, category: '', settingId: '' })}
        onConfirm={handleConfirmDeleteParameter}
        title="Supprimer le paramètre"
        message="Êtes-vous sûr de vouloir supprimer ce paramètre ? Cette action est irréversible."
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </div>
  );
};

export default AccountingSettingsPageV2;