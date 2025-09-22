import React, { useState } from 'react';
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
  Zap
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
  const navigate = useNavigate();
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
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

  const handleSettingChange = (category: string, settingId: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: prev[category].map(setting =>
        setting.id === settingId ? { ...setting, value } : setting
      )
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulation de sauvegarde
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSaving(false);
    setHasChanges(false);
    setNotification({
      type: 'success',
      message: 'Les paramètres de comptabilité ont été enregistrés avec succès'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleReset = () => {
    // Réinitialiser aux valeurs par défaut
    window.location.reload();
  };

  const renderSetting = (setting: AccountingSetting, category: string) => {
    switch (setting.type) {
      case 'select':
        return (
          <select
            value={setting.value}
            onChange={(e) => handleSettingChange(category, setting.id, e.target.value)}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            required={setting.required}
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
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            required={setting.required}
          />
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
          <input
            type="text"
            value={setting.value}
            onChange={(e) => handleSettingChange(category, setting.id, e.target.value)}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            required={setting.required}
          />
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
          'mb-6 p-4 rounded-lg flex items-center gap-3',
          notification.type === 'success' && 'bg-green-50 text-green-800 border border-green-200',
          notification.type === 'error' && 'bg-red-50 text-red-800 border border-red-200',
          notification.type === 'info' && 'bg-blue-50 text-blue-800 border border-blue-200'
        )}>
          {notification.type === 'success' && <Check className="w-5 h-5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {notification.type === 'info' && <Info className="w-5 h-5" />}
          <span className="flex-1">{notification.message}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className="border-b border-[var(--color-border)]">
          <nav className="flex space-x-8">
            <button className="py-2 px-1 border-b-2 border-[var(--color-primary)] text-[var(--color-primary)] font-medium text-sm">
              Paramètres de base
            </button>
            <button className="py-2 px-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium text-sm">
              Modules avancés
            </button>
            <button className="py-2 px-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium text-sm">
              Sécurité & Audit
            </button>
          </nav>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Paramètres généraux */}
        <ModernCard>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Paramètres généraux
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {settings.general.map(setting => (
                <div key={setting.id}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {setting.label}
                    {setting.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    {setting.description}
                  </p>
                  {renderSetting(setting, 'general')}
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>

        {/* Paramètres de saisie */}
        <ModernCard>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Saisie comptable
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {settings.saisie.map(setting => (
                <div key={setting.id}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {setting.label}
                    {setting.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    {setting.description}
                  </p>
                  {renderSetting(setting, 'saisie')}
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>

        {/* Paramètres d'affichage */}
        <ModernCard>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Format et affichage
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {settings.affichage.map(setting => (
                <div key={setting.id}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {setting.label}
                    {setting.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    {setting.description}
                  </p>
                  {renderSetting(setting, 'affichage')}
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>

        {/* Paramètres de clôture */}
        <ModernCard>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Clôture & Périodes
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {settings.cloture.map(setting => (
                <div key={setting.id}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {setting.label}
                    {setting.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    {setting.description}
                  </p>
                  {renderSetting(setting, 'cloture')}
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>

        {/* Paramètres fiscaux */}
        <ModernCard className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Taxes & Fiscalité
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {settings.taxes.map(setting => (
                <div key={setting.id}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {setting.label}
                    {setting.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    {setting.description}
                  </p>
                  {renderSetting(setting, 'taxes')}
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>

        {/* Comptabilité analytique */}
        <ModernCard>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Comptabilité analytique
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {settings.analytique.map(setting => (
                <div key={setting.id}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {setting.label}
                    {setting.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    {setting.description}
                  </p>
                  {renderSetting(setting, 'analytique')}
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>

        {/* Immobilisations */}
        <ModernCard>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Immobilisations
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {settings.immobilisations.map(setting => (
                <div key={setting.id}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {setting.label}
                    {setting.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    {setting.description}
                  </p>
                  {renderSetting(setting, 'immobilisations')}
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>

        {/* Trésorerie */}
        <ModernCard>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Trésorerie
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {settings.tresorerie.map(setting => (
                <div key={setting.id}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {setting.label}
                    {setting.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    {setting.description}
                  </p>
                  {renderSetting(setting, 'tresorerie')}
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>

        {/* Gestion budgétaire */}
        <ModernCard>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Gestion budgétaire
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {settings.budget.map(setting => (
                <div key={setting.id}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {setting.label}
                    {setting.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    {setting.description}
                  </p>
                  {renderSetting(setting, 'budget')}
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>

        {/* Reporting */}
        <ModernCard>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                États & Reporting
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {settings.reporting.map(setting => (
                <div key={setting.id}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {setting.label}
                    {setting.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    {setting.description}
                  </p>
                  {renderSetting(setting, 'reporting')}
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>

        {/* Sécurité */}
        <ModernCard>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Sécurité & Audit
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {settings.securite.map(setting => (
                <div key={setting.id}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {setting.label}
                    {setting.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    {setting.description}
                  </p>
                  {renderSetting(setting, 'securite')}
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>

        {/* Paramètres avancés */}
        <ModernCard>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Paramètres avancés
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {settings.avance.map(setting => (
                <div key={setting.id}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {setting.label}
                    {setting.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    {setting.description}
                  </p>
                  {renderSetting(setting, 'avance')}
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>

        {/* Normes et conformité */}
        <ModernCard>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Normes & Conformité
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {settings.normes.map(setting => (
                <div key={setting.id}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {setting.label}
                    {setting.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    {setting.description}
                  </p>
                  {renderSetting(setting, 'normes')}
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>
      </div>

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
                { label: 'Immobilisations', enabled: settings.immobilisations.find(s => s.id === 'gestion_immobilisations')?.value },
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
    </div>
  );
};

export default AccountingSettingsPage;