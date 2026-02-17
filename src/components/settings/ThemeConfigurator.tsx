/**
 * Configurateur de Thèmes Clarity Atlas Finance
 * Interface de personnalisation des thèmes selon cahier des charges 6.1.2
 */
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Eye,
  Save,
  RefreshCw,
  Download,
  Upload,
  Sparkles,
  Settings
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Slider,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../ui';

interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  preview: string;
}

interface ThemeConfiguratorProps {
  currentTheme?: string;
  onThemeChange?: (themeId: string) => void;
  className?: string;
}

const ThemeConfigurator: React.FC<ThemeConfiguratorProps> = ({
  currentTheme = 'corporate-blue',
  onThemeChange,
  className = ''
}) => {
  const { t } = useLanguage();
  // États
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customColors, setCustomColors] = useState({
    primary: '#1E40AF',
    secondary: '#3B82F6', 
    accent: '#60A5FA',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#1E293B'
  });

  // Thèmes prédéfinis selon cahier des charges (6.1.2)
  const predefinedThemes: Theme[] = [
    {
      id: 'ocean-blue',
      name: 'Ocean Blue',
      description: 'Bleu océan professionnel',
      colors: {
        primary: '#0066CC',
        secondary: '#00A8E8',
        accent: '#00C9FF',
        background: '#F8FBFF',
        surface: '#FFFFFF',
        text: '#1A1A2E'
      },
      preview: 'linear-gradient(135deg, #0066CC, #00A8E8, #00C9FF)'
    },
    {
      id: 'forest-green',
      name: 'Forest Green',
      description: 'Vert nature apaisant',
      colors: {
        primary: '#2E7D32',
        secondary: '#4CAF50',
        accent: '#81C784',
        background: '#F1F8F4',
        surface: '#FFFFFF',
        text: '#1B5E20'
      },
      preview: 'linear-gradient(135deg, #2E7D32, #4CAF50, #81C784)'
    },
    {
      id: 'sunset-orange',
      name: 'Sunset Orange',
      description: 'Orange coucher de soleil',
      colors: {
        primary: '#FF6B35',
        secondary: '#FF8C42',
        accent: '#FFB86C',
        background: '#FFF8F3',
        surface: '#FFFFFF',
        text: '#5D4037'
      },
      preview: 'linear-gradient(135deg, #FF6B35, #FF8C42, #FFB86C)'
    },
    {
      id: 'midnight-dark',
      name: 'Midnight Dark',
      description: 'Mode sombre élégant',
      colors: {
        primary: '#6366F1',
        secondary: '#8B5CF6',
        accent: '#A78BFA',
        background: '#0F172A',
        surface: '#1E293B',
        text: '#F1F5F9'
      },
      preview: 'linear-gradient(135deg, #6366F1, #8B5CF6, #A78BFA)'
    },
    {
      id: 'corporate-blue',
      name: 'Corporate Blue',
      description: 'Bleu corporate standard',
      colors: {
        primary: '#1E40AF',
        secondary: '#3B82F6',
        accent: '#60A5FA',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        text: '#1E293B'
      },
      preview: 'linear-gradient(135deg, #1E40AF, #3B82F6, #60A5FA)'
    },
    {
      id: 'elegant-purple',
      name: 'Elegant Purple',
      description: 'Violet élégant moderne',
      colors: {
        primary: '#7C3AED',
        secondary: '#A855F7',
        accent: '#C084FC',
        background: '#FAFAF9',
        surface: '#FFFFFF',
        text: '#374151'
      },
      preview: 'linear-gradient(135deg, #7C3AED, #A855F7, #C084FC)'
    }
  ];

  // Application d'un thème
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    Object.entries(theme.colors).forEach(([property, color]) => {
      root.style.setProperty(`--${property}-color`, color);
    });
    
    // Sauvegarde
    localStorage.setItem('atlas-finance-theme', theme.id);
    localStorage.setItem('atlas-finance-theme-config', JSON.stringify(theme.colors));
    
    setSelectedTheme(theme.id);
    onThemeChange?.(theme.id);
  };

  // Personnalisation couleur
  const updateCustomColor = (colorType: string, color: string) => {
    setCustomColors(prev => ({ ...prev, [colorType]: color }));
    
    // Application immédiate pour preview
    document.documentElement.style.setProperty(`--${colorType}-color`, color);
  };

  // Aperçu temps réel
  const previewTheme = (theme: Theme) => {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([property, color]) => {
      root.style.setProperty(`--${property}-color`, color);
    });
  };

  // Restaurer thème original
  const restoreTheme = () => {
    const originalTheme = predefinedThemes.find(t => t.id === currentTheme);
    if (originalTheme) {
      applyTheme(originalTheme);
    }
  };

  // Export/Import configuration
  const exportThemeConfig = () => {
    const config = {
      themeId: selectedTheme,
      customColors: customColors,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atlas-finance-theme-${selectedTheme}.json`;
    link.click();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Palette className="h-6 w-6 mr-3" />
            Configurateur de Thèmes Clarity
          </h2>
          <p className="text-gray-600 mt-1">
            Personnalisation complète de l'interface Atlas Finance
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={exportThemeConfig}>
            <Download className="h-4 w-4 mr-2" />
            Export Config
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Config
          </Button>
        </div>
      </div>

      <Tabs defaultValue="predefined" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="predefined">Thèmes Prédéfinis</TabsTrigger>
          <TabsTrigger value="custom">Personnalisation</TabsTrigger>
          <TabsTrigger value="preview">Aperçu Live</TabsTrigger>
        </TabsList>

        {/* Thèmes prédéfinis */}
        <TabsContent value="predefined" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {predefinedThemes.map((theme) => (
              <Card 
                key={theme.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedTheme === theme.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => applyTheme(theme)}
                onMouseEnter={() => previewTheme(theme)}
                onMouseLeave={restoreTheme}
              >
                <CardContent className="p-4">
                  {/* Aperçu couleurs */}
                  <div 
                    className="h-16 rounded-lg mb-3"
                    style={{ background: theme.preview }}
                  />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{theme.name}</h3>
                      {selectedTheme === theme.id && (
                        <Badge className="bg-blue-100 text-blue-800">
                          Actif
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{theme.description}</p>
                    
                    {/* Palette de couleurs */}
                    <div className="grid grid-cols-3 gap-1 mt-3">
                      <div 
                        className="h-6 rounded border"
                        style={{ backgroundColor: theme.colors.primary }}
                        title="Couleur primaire"
                      />
                      <div 
                        className="h-6 rounded border"
                        style={{ backgroundColor: theme.colors.secondary }}
                        title="Couleur secondaire"
                      />
                      <div 
                        className="h-6 rounded border"
                        style={{ backgroundColor: theme.colors.accent }}
                        title="Couleur d'accent"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Personnalisation avancée */}
        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="h-5 w-5 mr-2" />
                Palette Personnalisée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Sélecteurs de couleurs */}
                <div className="space-y-4">
                  {Object.entries(customColors).map(([colorType, colorValue]) => (
                    <div key={colorType} className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 capitalize">
                        {colorType.replace(/([A-Z])/g, ' $1')}
                      </label>
                      <div className="flex items-center space-x-3">
                        <Input
                          type="color"
                          value={colorValue}
                          onChange={(e) => updateCustomColor(colorType, e.target.value)}
                          className="w-12 h-8 rounded cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={colorValue}
                          onChange={(e) => updateCustomColor(colorType, e.target.value)}
                          className="w-24 font-mono text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Aperçu temps réel */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800">Aperçu Temps Réel</h4>
                  
                  {/* Exemple de carte */}
                  <div className="p-4 rounded-lg border" style={{
                    backgroundColor: customColors.surface,
                    borderColor: customColors.primary,
                    color: customColors.text
                  }}>
                    <div className="flex items-center space-x-3 mb-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: customColors.primary }}
                      >
                        <DollarSign className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: customColors.text }}>
                          Position Trésorerie
                        </p>
                        <p className="text-lg font-bold" style={{ color: customColors.primary }}>
                          3 850 000 XAF
                        </p>
                      </div>
                    </div>
                    <div 
                      className="px-3 py-1 rounded text-white text-sm text-center"
                      style={{ backgroundColor: customColors.secondary }}
                    >
                      Exemple widget Atlas Finance
                    </div>
                  </div>

                  {/* Boutons d'exemple */}
                  <div className="space-x-2">
                    <button 
                      className="px-4 py-2 rounded font-medium text-white transition-colors"
                      style={{ backgroundColor: customColors.primary }}
                    >
                      Bouton Principal
                    </button>
                    <button 
                      className="px-4 py-2 rounded font-medium border transition-colors"
                      style={{ 
                        borderColor: customColors.primary,
                        color: customColors.primary,
                        backgroundColor: 'transparent'
                      }}
                    >
                      Bouton Outline
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => setCustomColors({
                  primary: '#1E40AF',
                  secondary: '#3B82F6',
                  accent: '#60A5FA', 
                  background: '#F8FAFC',
                  surface: '#FFFFFF',
                  text: '#1E293B'
                })}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réinitialiser
                </Button>
                
                <Button onClick={() => {
                  // Application du thème personnalisé
                  const customTheme: Theme = {
                    id: 'custom',
                    name: 'Thème Personnalisé',
                    description: 'Configuration utilisateur',
                    colors: customColors,
                    preview: `linear-gradient(135deg, ${customColors.primary}, ${customColors.secondary}, ${customColors.accent})`
                  };
                  applyTheme(customTheme);
                }}>
                  <Save className="h-4 w-4 mr-2" />
                  Appliquer Thème
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aperçu live */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Aperçu Interface Atlas Finance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Simulation dashboard */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="clarity-kpi-card p-4 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <DollarSign className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">{t('navigation.treasury')}</p>
                        <p className="text-lg font-bold">3 850 000 XAF</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="clarity-kpi-card p-4 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-green-100">
                        <Users className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Créances</p>
                        <p className="text-lg font-bold">2 400 000 XAF</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="clarity-kpi-card p-4 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-orange-100">
                        <CreditCard className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Dettes</p>
                        <p className="text-lg font-bold">1 800 000 XAF</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulation navigation */}
                <div className="clarity-card p-4">
                  <h4 className="font-semibold mb-3">Navigation Atlas Finance</h4>
                  <div className="space-y-2">
                    <div className="clarity-nav-item active p-2 rounded flex items-center space-x-3">
                      <Home className="h-4 w-4" />
                      <span>Dashboard Executive</span>
                    </div>
                    <div className="clarity-nav-item p-2 rounded flex items-center space-x-3">
                      <FileText className="h-4 w-4" />
                      <span>{t('accounting.title')}</span>
                      <Badge className="bg-red-500 text-white text-xs ml-auto">3</Badge>
                    </div>
                    <div className="clarity-nav-item p-2 rounded flex items-center space-x-3">
                      <Users className="h-4 w-4" />
                      <span>{t('navigation.clients')}</span>
                    </div>
                  </div>
                </div>

                {/* Simulation table */}
                <div className="clarity-table rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-primary">
                        <th className="p-3 text-left text-white font-semibold">{t('common.date')}</th>
                        <th className="p-3 text-left text-white font-semibold">Description</th>
                        <th className="p-3 text-right text-white font-semibold">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-gray-50">
                        <td className="p-3">29/08/2024</td>
                        <td className="p-3">Virement client ABC</td>
                        <td className="p-3 text-right font-mono text-green-600">+ 850 000</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="p-3">28/08/2024</td>
                        <td className="p-3">Paiement fournisseur XYZ</td>
                        <td className="p-3 text-right font-mono text-red-600">- 420 000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Paramètres avancés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Paramètres d'Affichage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode d'affichage
              </label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center">
                      <Sun className="h-4 w-4 mr-2" />
                      Mode clair
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center">
                      <Moon className="h-4 w-4 mr-2" />
                      Mode sombre
                    </div>
                  </SelectItem>
                  <SelectItem value="auto">
                    <div className="flex items-center">
                      <Monitor className="h-4 w-4 mr-2" />
                      Automatique
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taille police (zoom)
              </label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Taille normale" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Petite (90%)</SelectItem>
                  <SelectItem value="normal">Normale (100%)</SelectItem>
                  <SelectItem value="large">Grande (110%)</SelectItem>
                  <SelectItem value="xl">Très grande (120%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Animations
              </label>
              <Select defaultValue="enabled">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Activées</SelectItem>
                  <SelectItem value="reduced">Réduites</SelectItem>
                  <SelectItem value="disabled">Désactivées</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraste
              </label>
              <Select defaultValue="normal">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Contraste élevé</SelectItem>
                  <SelectItem value="maximum">Contraste maximum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThemeConfigurator;