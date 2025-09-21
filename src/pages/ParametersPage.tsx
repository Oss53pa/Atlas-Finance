import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Info
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
  const [activeTab, setActiveTab] = useState('GENERAL');
  const [parameters, setParameters] = useState<Record<string, Parameter[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

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
          group: 'Configuration',
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
          group: 'Configuration',
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
      ]
    };

    setParameters(mockParameters);
    setLoading(false);
  }, []);

  const tabs = [
    { key: 'GENERAL', name: 'Général', icon: Building2 },
    { key: 'COMPTABILITE', name: 'Comptabilité', icon: Calculator },
    { key: 'SECURITE', name: 'Sécurité', icon: Shield },
    { key: 'INTERFACE', name: 'Interface', icon: Palette },
    { key: 'NOTIFICATIONS', name: 'Notifications', icon: Bell }
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
                  param.value ? 'bg-green-500' : 'bg-gray-300'
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
                to="/" 
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
                style={{backgroundColor: '#353A3B', color: '#FFFFFF'}}
              >
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
                          <label className="text-base font-semibold" style={{color: '#353A3B'}}>
                            {param.name}
                            {param.required && <span style={{color: '#EF4444'}}> *</span>}
                          </label>
                          {param.help && (
                            <div className="relative group">
                              <Info size={16} style={{color: '#7A8B8E'}} className="cursor-help" />
                              <div className="absolute right-0 top-6 w-64 p-3 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParametersPage;