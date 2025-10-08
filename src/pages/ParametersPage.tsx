import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  Settings,
  Save,
  RefreshCw,
  ArrowLeft,
  Building2,
  Palette,
  Shield,
  Bell,
  Globe,
  Calculator,
  Database,
  Mail,
  Smartphone,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Info,
  Plus,
  X,
  Edit2,
  Trash2,
  Brain,
  FileText,
  Server,
  BarChart3,
  Download,
  Code,
  Monitor
} from 'lucide-react';

interface Parameter {
  key: string;
  name: string;
  description: string;
  type: string;
  value: any;
  required: boolean;
  group: string;
  category: string;
  options?: string[];
  min?: number;
  max?: number;
  help?: string;
}

const ParametersPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('GENERAL');
  const [parameters, setParameters] = useState<Record<string, Parameter[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAlgoModal, setShowAlgoModal] = useState(false);
  const [selectedAlgo, setSelectedAlgo] = useState<string | null>(null);
  const [newParameter, setNewParameter] = useState<Partial<Parameter>>({
    category: 'COMPTABILITE',
    type: 'STRING',
    required: false,
    group: t('settings.configuration')
  });

  // Simulation des paramètres (à remplacer par un appel API)
  useEffect(() => {
    const mockParameters: Record<string, Parameter[]> = {
      'GENERAL': [
        {
          key: 'SOCIETE_NOM',
          name: 'Nom de la société',
          description: 'Nom officiel de votre société',
          type: 'STRING',
          value: 'WiseBook ERP SARL',
          required: true,
          group: 'Informations générales',
          category: 'GENERAL',
          help: 'Ce nom apparaîtra sur tous les documents officiels'
        },
        {
          key: 'SOCIETE_ADRESSE',
          name: 'Adresse complète',
          description: 'Adresse du siège social',
          type: 'STRING',
          value: 'BP 1234, Yaoundé, Cameroun',
          required: true,
          group: 'Informations générales',
          category: 'GENERAL'
        },
        {
          key: 'SYSTEME_LANGUE',
          name: 'Langue par défaut',
          description: 'Langue d\'interface du système',
          type: 'STRING',
          value: 'fr',
          required: true,
          group: 'Localisation',
          category: 'GENERAL',
          options: ['fr', 'en', 'es']
        }
      ],
      'COMPTABILITE': [
        {
          key: 'COMPTABILITE_DECIMALES',
          name: 'Nombre de décimales',
          description: 'Précision des montants comptables',
          type: 'INTEGER',
          value: 2,
          required: true,
          group: 'Affichage',
          category: 'COMPTABILITE',
          min: 0,
          max: 6
        },
        {
          key: 'COMPTABILITE_DEVISE_DEFAUT',
          name: 'Devise par défaut',
          description: 'Devise principale de la société',
          type: 'STRING',
          value: 'XAF',
          required: true,
          group: t('settings.configuration'),
          category: 'COMPTABILITE',
          options: ['XAF', 'XOF', 'EUR', 'USD']
        },
        {
          key: 'COMPTABILITE_PLAN_TYPE',
          name: 'Type de plan comptable',
          description: 'Plan comptable SYSCOHADA à utiliser',
          type: 'STRING',
          value: 'SYSCOHADA_NORMAL',
          required: true,
          group: t('settings.configuration'),
          category: 'COMPTABILITE',
          options: ['SYSCOHADA_NORMAL', 'SYSCOHADA_MINIMAL', 'SYSCOHADA_BANQUE']
        }
      ],
      'SECURITE': [
        {
          key: 'SECURITE_SESSION_DUREE',
          name: 'Durée des sessions',
          description: 'Temps d\'inactivité avant déconnexion (minutes)',
          type: 'INTEGER',
          value: 60,
          required: true,
          group: 'Sessions',
          category: 'SECURITE',
          min: 5,
          max: 480
        },
        {
          key: 'SECURITE_TENTATIVES_MAX',
          name: 'Tentatives de connexion max',
          description: 'Nombre d\'essais avant blocage du compte',
          type: 'INTEGER',
          value: 5,
          required: true,
          group: 'Authentification',
          category: 'SECURITE',
          min: 3,
          max: 10
        },
        {
          key: 'SECURITE_2FA_OBLIGATOIRE',
          name: 'Authentification à 2 facteurs',
          description: 'Rendre la 2FA obligatoire pour tous les utilisateurs',
          type: 'BOOLEAN',
          value: false,
          required: false,
          group: 'Authentification',
          category: 'SECURITE'
        }
      ],
      'INTERFACE': [
        {
          key: 'INTERFACE_THEME',
          name: 'Thème par défaut',
          description: 'Apparence de l\'interface utilisateur',
          type: 'STRING',
          value: 'TRINITY_LIGHT',
          required: true,
          group: 'Apparence',
          category: 'INTERFACE',
          options: ['TRINITY_LIGHT', 'TRINITY_DARK', 'CLASSIC']
        },
        {
          key: 'INTERFACE_COULEUR_PRINCIPALE',
          name: 'Couleur principale',
          description: 'Couleur principale du thème',
          type: 'COLOR',
          value: '#7A8B8E',
          required: true,
          group: 'Apparence',
          category: 'INTERFACE'
        }
      ],
      'NOTIFICATIONS': [
        {
          key: 'NOTIFICATIONS_EMAIL_ACTIVES',
          name: 'Notifications email',
          description: 'Activer les notifications par email',
          type: 'BOOLEAN',
          value: true,
          required: false,
          group: 'Email',
          category: 'NOTIFICATIONS'
        },
        {
          key: 'NOTIFICATIONS_SMS_ACTIVES',
          name: 'Notifications SMS',
          description: 'Activer les notifications par SMS',
          type: 'BOOLEAN',
          value: false,
          required: false,
          group: 'SMS',
          category: 'NOTIFICATIONS'
        }
      ],
      'FISCAL': [
        {
          key: 'FISCAL_TVA_TAUX_NORMAL',
          name: 'Taux TVA Normal',
          description: 'Taux de TVA standard applicable',
          type: 'INTEGER',
          value: 19,
          required: true,
          group: 'TVA et Taxes',
          category: 'FISCAL',
          min: 0,
          max: 50,
          help: 'Taux applicable dans votre pays (ex: 19% Cameroun, 18% Congo)'
        },
        {
          key: 'FISCAL_TVA_TAUX_REDUIT',
          name: 'Taux TVA Réduit',
          description: 'Taux de TVA réduit pour produits spécifiques',
          type: 'INTEGER',
          value: 5,
          required: false,
          group: 'TVA et Taxes',
          category: 'FISCAL',
          min: 0,
          max: 50
        },
        {
          key: 'FISCAL_REGIME_IMPOSITION',
          name: 'Régime d\'imposition',
          description: 'Type de régime fiscal de l\'entreprise',
          type: 'STRING',
          value: 'REEL_NORMAL',
          required: true,
          group: 'Configuration fiscale',
          category: 'FISCAL',
          options: ['REEL_NORMAL', 'REEL_SIMPLIFIE', 'MICRO_ENTREPRISE']
        },
        {
          key: 'FISCAL_EXERCICE_DEBUT',
          name: 'Début exercice fiscal',
          description: 'Date de début de l\'exercice fiscal',
          type: 'STRING',
          value: '01/01',
          required: true,
          group: 'Exercice fiscal',
          category: 'FISCAL',
          help: 'Format: JJ/MM'
        },
        {
          key: 'FISCAL_DECLARATION_AUTO',
          name: 'Déclarations automatiques',
          description: 'Générer automatiquement les déclarations fiscales',
          type: 'BOOLEAN',
          value: true,
          required: false,
          group: 'Déclarations',
          category: 'FISCAL'
        }
      ],
      'IA': []
    };

    setParameters(mockParameters);
    setLoading(false);
  }, []);

  const tabs = [
    { key: 'GENERAL', name: 'Général', icon: Building2 },
    { key: 'COMPTABILITE', name: t('accounting.title'), icon: Calculator },
    { key: 'FISCAL', name: 'Paramètres Fiscaux', icon: FileText },
    { key: 'SECURITE', name: t('settings.security'), icon: Shield },
    { key: 'INTERFACE', name: 'Interface', icon: Palette },
    { key: 'NOTIFICATIONS', name: 'Notifications', icon: Bell },
    { key: 'IA', name: 'Algorithmes IA', icon: Brain }
  ];

  const handleSave = async () => {
    setSaving(true);
    // Simulation d'appel API
    setTimeout(() => {
      setSaving(false);
      setNotification({ type: 'success', message: 'Paramètres sauvegardés avec succès!' });
      setTimeout(() => setNotification(null), 3000);
    }, 1000);
  };

  const handleParameterChange = (category: string, paramKey: string, newValue: any) => {
    setParameters(prev => ({
      ...prev,
      [category]: prev[category].map(param =>
        param.key === paramKey ? { ...param, value: newValue } : param
      )
    }));
  };

  const handleAddParameter = () => {
    if (!newParameter.key || !newParameter.name || !newParameter.category) {
      setNotification({ type: 'error', message: 'Veuillez remplir tous les champs requis!' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const param: Parameter = {
      key: newParameter.key!,
      name: newParameter.name!,
      description: newParameter.description || '',
      type: newParameter.type || 'STRING',
      value: newParameter.value || '',
      required: newParameter.required || false,
      group: newParameter.group || t('settings.configuration'),
      category: newParameter.category!,
      options: newParameter.options,
      min: newParameter.min,
      max: newParameter.max,
      help: newParameter.help
    };

    setParameters(prev => ({
      ...prev,
      [param.category]: [...(prev[param.category] || []), param]
    }));

    setShowAddModal(false);
    setNewParameter({
      category: 'COMPTABILITE',
      type: 'STRING',
      required: false,
      group: t('settings.configuration')
    });
    setNotification({ type: 'success', message: 'Paramètre ajouté avec succès!' });
    setTimeout(() => setNotification(null), 3000);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; category: string; paramKey: string }>({
    isOpen: false,
    category: '',
    paramKey: ''
  });

  const handleDeleteParameterClick = (category: string, paramKey: string) => {
    setDeleteConfirm({ isOpen: true, category, paramKey });
  };

  const handleConfirmDeleteParameter = () => {
    const { category, paramKey } = deleteConfirm;
    setParameters(prev => ({
      ...prev,
      [category]: prev[category].filter(param => param.key !== paramKey)
    }));
    setNotification({ type: 'success', message: 'Paramètre supprimé avec succès!' });
    setTimeout(() => setNotification(null), 3000);
    setDeleteConfirm({ isOpen: false, category: '', paramKey: '' });
  };

  const handleViewAlgorithm = (algoName: string) => {
    setSelectedAlgo(algoName);
    setShowAlgoModal(true);
  };

  const renderParameterInput = (param: Parameter) => {
    const baseStyle = {
      backgroundColor: '#FFFFFF',
      border: '2px solid #D5D0CD',
      borderRadius: '8px',
      padding: '12px',
      fontFamily: 'Sometype Mono, sans-serif',
      fontSize: '14px',
      color: '#353A3B',
      width: '100%'
    };

    const focusStyle = {
      outline: 'none',
      borderColor: '#7A8B8E'
    };

    switch (param.type) {
      case 'BOOLEAN':
        return (
          <label className="flex items-center space-x-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={param.value}
                onChange={(e) => handleParameterChange(param.category, param.key, e.target.checked)}
                className="sr-only"
              />
              <div 
                className={`w-11 h-6 rounded-full transition-colors ${
                  param.value ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'
                }`}
              >
                <div 
                  className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                    param.value ? 'translate-x-5' : 'translate-x-0.5'
                  } mt-0.5`}
                />
              </div>
            </div>
            <span style={{color: '#353A3B', fontWeight: '500'}}>
              {param.value ? 'Activé' : 'Désactivé'}
            </span>
          </label>
        );

      case 'INTEGER':
        return (
          <input
            type="number"
            value={param.value}
            min={param.min}
            max={param.max}
            onChange={(e) => handleParameterChange(param.category, param.key, parseInt(e.target.value))}
            style={baseStyle}
            onFocus={(e) => Object.assign(e.target.style, focusStyle)}
            onBlur={(e) => e.target.style.borderColor = '#D5D0CD'}
          />
        );

      case 'COLOR':
        return (
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={param.value}
              onChange={(e) => handleParameterChange(param.category, param.key, e.target.value)}
              className="w-12 h-12 rounded-lg border-2 cursor-pointer"
              style={{borderColor: '#D5D0CD'}}
            />
            <input
              type="text"
              value={param.value}
              onChange={(e) => handleParameterChange(param.category, param.key, e.target.value)}
              style={{...baseStyle, width: 'auto', flex: 1}}
              onFocus={(e) => Object.assign(e.target.style, focusStyle)}
              onBlur={(e) => e.target.style.borderColor = '#D5D0CD'}
            />
          </div>
        );

      default:
        if (param.options) {
          return (
            <select
              value={param.value}
              onChange={(e) => handleParameterChange(param.category, param.key, e.target.value)}
              style={baseStyle}
              onFocus={(e) => Object.assign(e.target.style, focusStyle)}
              onBlur={(e) => e.target.style.borderColor = '#D5D0CD'}
            >
              {param.options.map(option => (
                <option key={option} value={option}>
                  {option === 'fr' ? 'Français' : 
                   option === 'en' ? 'Anglais' : 
                   option === 'es' ? 'Espagnol' : 
                   option}
                </option>
              ))}
            </select>
          );
        }

        return (
          <input
            type={param.type === 'EMAIL' ? 'email' : 'text'}
            value={param.value}
            onChange={(e) => handleParameterChange(param.category, param.key, e.target.value)}
            style={baseStyle}
            onFocus={(e) => Object.assign(e.target.style, focusStyle)}
            onBlur={(e) => e.target.style.borderColor = '#D5D0CD'}
          />
        );
    }
  };

  const groupParameters = (params: Parameter[]) => {
    const groups: Record<string, Parameter[]> = {};
    params.forEach(param => {
      if (!groups[param.group]) {
        groups[param.group] = [];
      }
      groups[param.group].push(param);
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: '#F7F3E9'}}>
        <div className="text-center">
          <RefreshCw size={48} className="animate-spin mx-auto mb-4" style={{color: '#7A8B8E'}} />
          <p style={{color: '#353A3B', fontFamily: 'Sometype Mono, sans-serif', fontWeight: '600'}}>
            Chargement des paramètres...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F7F3E9', fontFamily: 'Sometype Mono, sans-serif'}}>
      
      {/* Header */}
      <header className="border-b" style={{backgroundColor: '#FFFFFF', borderColor: '#D5D0CD'}}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="flex items-center space-x-2 text-base font-medium hover:opacity-80 transition-opacity"
                style={{color: '#7A8B8E'}}
              >
                <ArrowLeft size={20} />
                <span>Retour à l'accueil</span>
              </Link>
              <div style={{color: '#D5D0CD'}}>|</div>
              <div className="flex items-center space-x-3">
                <Settings size={24} style={{color: '#353A3B'}} />
                <div>
                  <h1 className="text-xl font-bold" style={{color: '#353A3B'}}>
                    Paramètres Système
                  </h1>
                  <p className="text-sm" style={{color: '#7A8B8E'}}>
                    Configuration de WiseBook ERP V3.0
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{backgroundColor: '#353A3B', color: '#FFFFFF'}} aria-label="Actualiser">
                {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div 
          className="fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3 animate-in slide-in-from-right-full duration-300"
          style={{
            backgroundColor: notification.type === 'success' ? '#10B981' : '#EF4444',
            color: '#FFFFFF'
          }}
        >
          <Check size={20} />
          <span>{notification.message}</span>
        </div>
      )}

      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          
          {/* Sidebar */}
          <div className="w-64">
            <nav className="space-y-2">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left font-medium transition-all ${
                    activeTab === tab.key ? 'shadow-md' : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: activeTab === tab.key ? '#FFFFFF' : 'transparent',
                    color: activeTab === tab.key ? '#353A3B' : '#7A8B8E',
                    border: activeTab === tab.key ? '1px solid #D5D0CD' : '1px solid transparent'
                  }}
                >
                  <tab.icon size={20} />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Rendu spécial pour l'onglet IA */}
            {activeTab === 'IA' ? (
              <div className="space-y-6">
                {/* Statistiques IA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div
                    className="p-6 rounded-2xl border"
                    style={{background: 'linear-gradient(to br, #F3E8FF, #E9D5FF)', borderColor: '#C084FC'}}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold" style={{color: '#581C87'}}>🧠 Modèles Actifs</h4>
                      <Brain className="w-8 h-8" style={{color: '#9333EA'}} />
                    </div>
                    <p className="text-3xl font-bold" style={{color: '#581C87'}}>4/6</p>
                    <p className="text-sm mt-2" style={{color: '#7C3AED'}}>Modèles opérationnels</p>
                  </div>

                  <div
                    className="p-6 rounded-2xl border"
                    style={{background: 'linear-gradient(to br, #DCFCE7, #BBF7D0)', borderColor: '#86EFAC'}}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold" style={{color: '#14532D'}}>📊 Précision Moyenne</h4>
                      <BarChart3 className="w-8 h-8" style={{color: '#16A34A'}} />
                    </div>
                    <p className="text-3xl font-bold" style={{color: '#14532D'}}>92.4%</p>
                    <p className="text-sm mt-2" style={{color: '#15803D'}}>Sur tous les modèles</p>
                  </div>

                  <div
                    className="p-6 rounded-2xl border"
                    style={{background: 'linear-gradient(to br, #DBEAFE, #BFDBFE)', borderColor: '#60A5FA'}}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold" style={{color: '#1E3A8A'}}>⚡ Prédictions/Jour</h4>
                      <Server className="w-8 h-8" style={{color: '#2563EB'}} />
                    </div>
                    <p className="text-3xl font-bold" style={{color: '#1E3A8A'}}>1,247</p>
                    <p className="text-sm mt-2" style={{color: '#1D4ED8'}}>Calculs effectués</p>
                  </div>
                </div>

                {/* Liste des modèles IA */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center" style={{color: '#353A3B'}}>
                    <Brain className="w-5 h-5 mr-2" style={{color: '#9333EA'}} />
                    Modèles d'Intelligence Artificielle
                  </h3>

                  {/* Modèle 1: Prédiction Trésorerie */}
                  <div
                    className="p-4 rounded-lg border hover:shadow-md transition-shadow"
                    style={{backgroundColor: '#FFFFFF', borderColor: '#D5D0CD'}}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-bold" style={{color: '#353A3B'}}>💰 Prédiction de Trésorerie</h4>
                          <span className="px-2 py-0.5 text-xs rounded-full font-medium" style={{backgroundColor: '#DCFCE7', color: '#15803D'}}>Actif</span>
                          <span className="px-2 py-0.5 text-xs rounded-full font-medium" style={{backgroundColor: '#E0E7FF', color: '#3730A3'}}>LSTM</span>
                        </div>
                        <p className="text-sm mb-3" style={{color: '#7A8B8E'}}>
                          Prédiction des flux de trésorerie à 30 jours avec analyse des tendances saisonnières
                        </p>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <span style={{color: '#7A8B8E'}}>Précision:</span>
                            <span className="font-semibold" style={{color: '#16A34A'}}>94.2%</span>
                          </div>
                          <div style={{color: '#D5D0CD'}}>•</div>
                          <div className="flex items-center space-x-1">
                            <span style={{color: '#7A8B8E'}}>Dernière prédiction:</span>
                            <span className="font-medium" style={{color: '#353A3B'}}>Il y a 5 min</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewAlgorithm('Prédiction de Trésorerie')}
                        className="px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm hover:opacity-90 transition-opacity"
                        style={{backgroundColor: '#9333EA', color: '#FFFFFF'}}
                      >
                        <Eye className="w-4 h-4" />
                        <span>Voir Algorithme</span>
                      </button>
                    </div>
                  </div>

                  {/* Modèle 2: Détection d'Anomalies */}
                  <div
                    className="p-4 rounded-lg border hover:shadow-md transition-shadow"
                    style={{backgroundColor: '#FFFFFF', borderColor: '#D5D0CD'}}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-bold" style={{color: '#353A3B'}}>🔍 Détection d'Anomalies</h4>
                          <span className="px-2 py-0.5 text-xs rounded-full font-medium" style={{backgroundColor: '#DCFCE7', color: '#15803D'}}>Actif</span>
                          <span className="px-2 py-0.5 text-xs rounded-full font-medium" style={{backgroundColor: '#FEE2E2', color: '#991B1B'}}>Isolation Forest</span>
                        </div>
                        <p className="text-sm mb-3" style={{color: '#7A8B8E'}}>
                          Détection automatique des transactions suspectes et des comportements anormaux
                        </p>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <span style={{color: '#7A8B8E'}}>Précision:</span>
                            <span className="font-semibold" style={{color: '#16A34A'}}>89.7%</span>
                          </div>
                          <div style={{color: '#D5D0CD'}}>•</div>
                          <div className="flex items-center space-x-1">
                            <span style={{color: '#7A8B8E'}}>Anomalies détectées:</span>
                            <span className="font-medium" style={{color: '#EF4444'}}>147 ce mois</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewAlgorithm('Détection d\'Anomalies')}
                        className="px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm hover:opacity-90 transition-opacity"
                        style={{backgroundColor: '#9333EA', color: '#FFFFFF'}}
                      >
                        <Eye className="w-4 h-4" />
                        <span>Voir Algorithme</span>
                      </button>
                    </div>
                  </div>

                  {/* Modèle 3: Recommandations Comptables */}
                  <div
                    className="p-4 rounded-lg border hover:shadow-md transition-shadow"
                    style={{backgroundColor: '#FFFFFF', borderColor: '#D5D0CD'}}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-bold" style={{color: '#353A3B'}}>📋 Recommandations Comptables</h4>
                          <span className="px-2 py-0.5 text-xs rounded-full font-medium" style={{backgroundColor: '#DCFCE7', color: '#15803D'}}>Actif</span>
                          <span className="px-2 py-0.5 text-xs rounded-full font-medium" style={{backgroundColor: '#DBEAFE', color: '#1E40AF'}}>Random Forest</span>
                        </div>
                        <p className="text-sm mb-3" style={{color: '#7A8B8E'}}>
                          Suggestions automatiques de comptes comptables et écritures basées sur l'historique
                        </p>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <span style={{color: '#7A8B8E'}}>Précision:</span>
                            <span className="font-semibold" style={{color: '#16A34A'}}>96.1%</span>
                          </div>
                          <div style={{color: '#D5D0CD'}}>•</div>
                          <div className="flex items-center space-x-1">
                            <span style={{color: '#7A8B8E'}}>Taux d'adoption:</span>
                            <span className="font-medium" style={{color: '#353A3B'}}>87%</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewAlgorithm('Recommandations Comptables')}
                        className="px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm hover:opacity-90 transition-opacity"
                        style={{backgroundColor: '#9333EA', color: '#FFFFFF'}}
                      >
                        <Eye className="w-4 h-4" />
                        <span>Voir Algorithme</span>
                      </button>
                    </div>
                  </div>

                  {/* Modèle 4: Analyse de Risques Clients */}
                  <div
                    className="p-4 rounded-lg border hover:shadow-md transition-shadow"
                    style={{backgroundColor: '#FFFFFF', borderColor: '#D5D0CD'}}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-bold" style={{color: '#353A3B'}}>⚠️ Analyse de Risques Clients</h4>
                          <span className="px-2 py-0.5 text-xs rounded-full font-medium" style={{backgroundColor: '#DCFCE7', color: '#15803D'}}>Actif</span>
                          <span className="px-2 py-0.5 text-xs rounded-full font-medium" style={{backgroundColor: '#FED7AA', color: '#9A3412'}}>Gradient Boosting</span>
                        </div>
                        <p className="text-sm mb-3" style={{color: '#7A8B8E'}}>
                          Évaluation du risque de défaut de paiement des clients et recommandations de recouvrement
                        </p>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <span style={{color: '#7A8B8E'}}>Précision:</span>
                            <span className="font-semibold" style={{color: '#16A34A'}}>91.3%</span>
                          </div>
                          <div style={{color: '#D5D0CD'}}>•</div>
                          <div className="flex items-center space-x-1">
                            <span style={{color: '#7A8B8E'}}>Clients à risque:</span>
                            <span className="font-medium" style={{color: '#EF4444'}}>12 actuellement</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewAlgorithm('Analyse de Risques Clients')}
                        className="px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm hover:opacity-90 transition-opacity"
                        style={{backgroundColor: '#9333EA', color: '#FFFFFF'}}
                      >
                        <Eye className="w-4 h-4" />
                        <span>Voir Algorithme</span>
                      </button>
                    </div>
                  </div>

                  {/* Modèles inactifs */}
                  <div className="mt-6 pt-6" style={{borderTop: '1px solid #D5D0CD'}}>
                    <h4 className="text-base font-semibold mb-3" style={{color: '#7A8B8E'}}>⏸️ Modèles Inactifs</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className="p-4 rounded-lg border opacity-60"
                        style={{backgroundColor: '#F7F3E9', borderColor: '#D5D0CD'}}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold" style={{color: '#353A3B'}}>💡 Optimisation Budgétaire</h5>
                          <span className="px-2 py-0.5 text-xs rounded-full font-medium" style={{backgroundColor: '#E5E7EB', color: '#4B5563'}}>Inactif</span>
                        </div>
                        <p className="text-xs" style={{color: '#7A8B8E'}}>Suggestions d'allocation budgétaire optimale</p>
                      </div>
                      <div
                        className="p-4 rounded-lg border opacity-60"
                        style={{backgroundColor: '#F7F3E9', borderColor: '#D5D0CD'}}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold" style={{color: '#353A3B'}}>📈 Prévision des Ventes</h5>
                          <span className="px-2 py-0.5 text-xs rounded-full font-medium" style={{backgroundColor: '#E5E7EB', color: '#4B5563'}}>Inactif</span>
                        </div>
                        <p className="text-xs" style={{color: '#7A8B8E'}}>Prédiction des ventes futures par produit</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Add Parameter Button */}
                {activeTab === 'COMPTABILITE' && (
                  <div className="mb-6 flex justify-end">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
                      style={{backgroundColor: '#353A3B', color: '#FFFFFF'}}
                    >
                      <Plus size={20} />
                      Ajouter un paramètre
                    </button>
                  </div>
                )}

                <div className="space-y-8">
                  {Object.entries(groupParameters(parameters[activeTab] || [])).map(([groupName, groupParams]) => (
                <div 
                  key={groupName}
                  className="p-8 rounded-2xl"
                  style={{backgroundColor: '#FFFFFF', border: '1px solid #D5D0CD'}}
                >
                  <h3 className="text-xl font-bold mb-6" style={{color: '#353A3B'}}>
                    {groupName}
                  </h3>
                  
                  <div className="space-y-6">
                    {groupParams.map(param => (
                      <div key={param.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <label className="text-base font-semibold" style={{color: '#353A3B'}}>
                              {param.name}
                              {param.required && <span style={{color: '#EF4444'}}> *</span>}
                            </label>
                            {activeTab === 'COMPTABILITE' && (
                              <button
                                onClick={() => handleDeleteParameterClick(param.category, param.key)}
                                className="p-1 rounded hover:bg-[var(--color-error-light)] transition-colors"
                                title="Supprimer ce paramètre"
                              >
                                <Trash2 size={16} style={{color: '#EF4444'}} />
                              </button>
                            )}
                          </div>
                          {param.help && (
                            <div className="relative group">
                              <Info size={16} style={{color: '#7A8B8E'}} className="cursor-help" />
                              <div className="absolute right-0 top-6 w-64 p-3 bg-[var(--color-text-primary)] text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {param.help}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-sm mb-3" style={{color: '#7A8B8E'}}>
                          {param.description}
                        </p>
                        
                        {renderParameterInput(param)}
                        
                        {param.type === 'INTEGER' && (param.min !== undefined || param.max !== undefined) && (
                          <p className="text-xs" style={{color: '#7A8B8E'}}>
                            Valeur entre {param.min} et {param.max}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Parameter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{border: '1px solid #D5D0CD'}}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{color: '#353A3B'}}>Ajouter un nouveau paramètre</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
              >
                <X size={24} style={{color: '#7A8B8E'}} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{color: '#353A3B'}}>
                  Clé du paramètre <span style={{color: '#EF4444'}}>*</span>
                </label>
                <input
                  type="text"
                  value={newParameter.key || ''}
                  onChange={(e) => setNewParameter(prev => ({...prev, key: e.target.value.toUpperCase().replace(/\s+/g, '_')}))}
                  placeholder="COMPTABILITE_MA_FONCTIONNALITE"
                  className="w-full px-4 py-3 rounded-lg border-2 border-[var(--color-border)] focus:border-[#7A8B8E] focus:outline-none"
                  style={{fontFamily: 'Sometype Mono, sans-serif'}}
                />
                <p className="text-xs mt-1" style={{color: '#7A8B8E'}}>Format: MAJUSCULES_AVEC_UNDERSCORES</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{color: '#353A3B'}}>
                  Nom d'affichage <span style={{color: '#EF4444'}}>*</span>
                </label>
                <input
                  type="text"
                  value={newParameter.name || ''}
                  onChange={(e) => setNewParameter(prev => ({...prev, name: e.target.value}))}
                  placeholder="Ma nouvelle fonctionnalité"
                  className="w-full px-4 py-3 rounded-lg border-2 border-[var(--color-border)] focus:border-[#7A8B8E] focus:outline-none"
                  style={{fontFamily: 'Sometype Mono, sans-serif'}}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{color: '#353A3B'}}>Description</label>
                <textarea
                  value={newParameter.description || ''}
                  onChange={(e) => setNewParameter(prev => ({...prev, description: e.target.value}))}
                  placeholder="Description du paramètre"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[var(--color-border)] focus:border-[#7A8B8E] focus:outline-none"
                  style={{fontFamily: 'Sometype Mono, sans-serif'}}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{color: '#353A3B'}}>Type de donnée</label>
                  <select
                    value={newParameter.type || 'STRING'}
                    onChange={(e) => setNewParameter(prev => ({...prev, type: e.target.value}))}
                    className="w-full px-4 py-3 rounded-lg border-2 border-[var(--color-border)] focus:border-[#7A8B8E] focus:outline-none"
                    style={{fontFamily: 'Sometype Mono, sans-serif'}}
                  >
                    <option value="STRING">Texte (STRING)</option>
                    <option value="INTEGER">Nombre entier (INTEGER)</option>
                    <option value="BOOLEAN">Oui/Non (BOOLEAN)</option>
                    <option value="COLOR">Couleur (COLOR)</option>
                    <option value="EMAIL">Email (EMAIL)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{color: '#353A3B'}}>Groupe</label>
                  <input
                    type="text"
                    value={newParameter.group || t('settings.configuration')}
                    onChange={(e) => setNewParameter(prev => ({...prev, group: e.target.value}))}
                    placeholder={t('settings.configuration')}
                    className="w-full px-4 py-3 rounded-lg border-2 border-[var(--color-border)] focus:border-[#7A8B8E] focus:outline-none"
                    style={{fontFamily: 'Sometype Mono, sans-serif'}}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{color: '#353A3B'}}>Valeur par défaut</label>
                <input
                  type={newParameter.type === 'INTEGER' ? 'number' : 'text'}
                  value={newParameter.value || ''}
                  onChange={(e) => setNewParameter(prev => ({...prev, value: e.target.value}))}
                  placeholder="Valeur initiale"
                  className="w-full px-4 py-3 rounded-lg border-2 border-[var(--color-border)] focus:border-[#7A8B8E] focus:outline-none"
                  style={{fontFamily: 'Sometype Mono, sans-serif'}}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={newParameter.required || false}
                  onChange={(e) => setNewParameter(prev => ({...prev, required: e.target.checked}))}
                  className="w-5 h-5 rounded border-2 border-[var(--color-border)]"
                />
                <label htmlFor="required" className="text-sm font-medium" style={{color: '#353A3B'}}>
                  Paramètre obligatoire
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{color: '#353A3B'}}>Aide contextuelle</label>
                <textarea
                  value={newParameter.help || ''}
                  onChange={(e) => setNewParameter(prev => ({...prev, help: e.target.value}))}
                  placeholder="Texte d'aide pour l'utilisateur"
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[var(--color-border)] focus:border-[#7A8B8E] focus:outline-none"
                  style={{fontFamily: 'Sometype Mono, sans-serif'}}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddParameter}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  style={{backgroundColor: '#353A3B', color: '#FFFFFF'}}
                >
                  Ajouter le paramètre
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 rounded-lg font-semibold hover:opacity-80 transition-opacity"
                  style={{backgroundColor: '#D5D0CD', color: '#353A3B'}}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Algorithme IA */}
      {showAlgoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAlgoModal(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Brain className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">{selectedAlgo}</h2>
                    <p className="text-purple-100 text-sm mt-1">Détails de l'algorithme d'intelligence artificielle</p>
                  </div>
                </div>
                <button onClick={() => setShowAlgoModal(false)} className="p-2 hover:bg-purple-700 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {selectedAlgo === 'Prédiction de Trésorerie' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-700 font-medium">Type d'algorithme</p>
                      <p className="text-lg font-bold text-purple-900 mt-1">LSTM Neural Network</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 font-medium">Précision actuelle</p>
                      <p className="text-lg font-bold text-green-900 mt-1">94.2%</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700 font-medium">Données d'entraînement</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">24,567 transactions</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Description</h3>
                    <p className="text-[#444444] leading-relaxed">Ce modèle utilise un réseau de neurones LSTM (Long Short-Term Memory) pour analyser les flux de trésorerie historiques et prédire les mouvements futurs avec une haute précision. L'algorithme prend en compte les tendances saisonnières, les cycles de paiement clients, et les patterns de dépenses.</p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Paramètres du modèle</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Couches cachées</p>
                        <p className="font-semibold text-[#191919]">3 couches (128, 64, 32 neurones)</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Taux d'apprentissage</p>
                        <p className="font-semibold text-[#191919]">0.001</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Fenêtre temporelle</p>
                        <p className="font-semibold text-[#191919]">90 jours</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Dropout</p>
                        <p className="font-semibold text-[#191919]">0.2</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Variables d'entrée</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Soldes bancaires historiques</span>
                        <span className="text-sm font-semibold text-purple-600">Importance: 32%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Factures clients en attente</span>
                        <span className="text-sm font-semibold text-purple-600">Importance: 28%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Échéances fournisseurs</span>
                        <span className="text-sm font-semibold text-purple-600">Importance: 24%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Tendances saisonnières</span>
                        <span className="text-sm font-semibold text-purple-600">Importance: 16%</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedAlgo === 'Détection d\'Anomalies' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-sm text-red-700 font-medium">Type d'algorithme</p>
                      <p className="text-lg font-bold text-red-900 mt-1">Isolation Forest</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 font-medium">Précision actuelle</p>
                      <p className="text-lg font-bold text-green-900 mt-1">89.7%</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700 font-medium">Anomalies détectées</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">147 ce mois</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Description</h3>
                    <p className="text-[#444444] leading-relaxed">Cet algorithme utilise la méthode Isolation Forest pour détecter les transactions inhabituelles qui pourraient indiquer des erreurs, des fraudes ou des comportements anormaux. Il apprend continuellement des patterns normaux pour mieux identifier les anomalies.</p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Critères de détection</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Montant inhabituel</span>
                        <span className="text-sm font-semibold text-red-600">Seuil: ±3σ</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Fréquence anormale</span>
                        <span className="text-sm font-semibold text-red-600">Seuil: ±2.5σ</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Bénéficiaire inhabituel</span>
                        <span className="text-sm font-semibold text-red-600">Score &lt; 0.3</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Timing suspect</span>
                        <span className="text-sm font-semibold text-red-600">Hors heures: 22h-6h</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedAlgo === 'Recommandations Comptables' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700 font-medium">Type d'algorithme</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">Random Forest</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 font-medium">Précision actuelle</p>
                      <p className="text-lg font-bold text-green-900 mt-1">96.1%</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-700 font-medium">Taux d'adoption</p>
                      <p className="text-lg font-bold text-purple-900 mt-1">87%</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Description</h3>
                    <p className="text-[#444444] leading-relaxed">Ce modèle utilise un ensemble d'arbres de décision (Random Forest) pour suggérer les comptes comptables appropriés et proposer des écritures automatiques basées sur l'analyse de milliers de transactions similaires passées.</p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Paramètres du modèle</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Nombre d'arbres</p>
                        <p className="font-semibold text-[#191919]">500 arbres</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Profondeur maximale</p>
                        <p className="font-semibold text-[#191919]">15 niveaux</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Variables par split</p>
                        <p className="font-semibold text-[#191919]">√n features</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Min samples leaf</p>
                        <p className="font-semibold text-[#191919]">10 échantillons</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Features principales</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Libellé de la transaction</span>
                        <span className="text-sm font-semibold text-blue-600">Importance: 38%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Montant et devise</span>
                        <span className="text-sm font-semibold text-blue-600">Importance: 22%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Tiers (client/fournisseur)</span>
                        <span className="text-sm font-semibold text-blue-600">Importance: 25%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Historique des comptes utilisés</span>
                        <span className="text-sm font-semibold text-blue-600">Importance: 15%</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedAlgo === 'Analyse de Risques Clients' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-700 font-medium">Type d'algorithme</p>
                      <p className="text-lg font-bold text-orange-900 mt-1">Gradient Boosting</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 font-medium">Précision actuelle</p>
                      <p className="text-lg font-bold text-green-900 mt-1">91.3%</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-sm text-red-700 font-medium">Clients à risque</p>
                      <p className="text-lg font-bold text-red-900 mt-1">12 actuellement</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Description</h3>
                    <p className="text-[#444444] leading-relaxed">Cet algorithme de Gradient Boosting analyse le comportement de paiement des clients pour prédire le risque de défaut. Il combine plusieurs modèles faibles pour créer une prédiction robuste et fiable du risque client.</p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Indicateurs de risque</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Historique de retards</span>
                        <span className="text-sm font-semibold text-orange-600">Importance: 35%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Montant des créances</span>
                        <span className="text-sm font-semibold text-orange-600">Importance: 28%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Secteur d'activité</span>
                        <span className="text-sm font-semibold text-orange-600">Importance: 18%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Santé financière</span>
                        <span className="text-sm font-semibold text-orange-600">Importance: 19%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Niveaux de risque</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-semibold text-green-900">Risque faible (&lt; 20%)</p>
                          <p className="text-sm text-green-700">Client fiable, paiements réguliers</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-semibold text-orange-900">Risque moyen (20-60%)</p>
                          <p className="text-sm text-orange-700">Surveillance recommandée</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-semibold text-red-900">Risque élevé (&gt; 60%)</p>
                          <p className="text-sm text-red-700">Action immédiate requise</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-4 rounded-b-xl border-t flex items-center justify-end space-x-3">
              <button onClick={() => setShowAlgoModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                Fermer
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Exporter les détails</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, category: '', paramKey: '' })}
        onConfirm={handleConfirmDeleteParameter}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer ce paramètre ? Cette action est irréversible."
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </div>
  );
};

export default ParametersPage;