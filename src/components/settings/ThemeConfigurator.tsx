/**
 * Configurateur de Thèmes Atlas F&A
 * Connecté au ThemeContext officiel (src/contexts/ThemeContext.tsx)
 * Affiche les 7 palettes officielles définies dans src/styles/theme.ts
 * + onglet Personnalisation pour un thème custom (clé 'custom' en localStorage).
 */
import React, { useState } from 'react';
import {
  Palette,
  Eye,
  Save,
  RefreshCw,
  Download,
  Upload,
  Sparkles,
  CheckCircle2,
  DollarSign,
  Users,
  CreditCard,
  Home,
  FileText,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui';
import { useTheme } from '../../contexts/ThemeContext';
import { themes, type ThemeType } from '../../styles/theme';

interface CustomColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
}

interface ThemeConfiguratorProps {
  className?: string;
}

const CUSTOM_STORAGE_KEY = 'atlas-fna-theme-custom';

const defaultCustomColors: CustomColors = {
  primary: '#1F1F23',
  secondary: '#8C7A5A',
  accent: '#B8954A',
  background: '#faf8f3',
  surface: '#FFFFFF',
  text: '#16161A',
};

function loadCustomColors(): CustomColors {
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CustomColors>;
      return { ...defaultCustomColors, ...parsed };
    }
  } catch { /* ignore */ }
  return defaultCustomColors;
}

const ThemeConfigurator: React.FC<ThemeConfiguratorProps> = ({ className = '' }) => {
  const { themeType, setTheme } = useTheme();
  const [customColors, setCustomColors] = useState<CustomColors>(() => loadCustomColors());
  const [hoveredTheme, setHoveredTheme] = useState<ThemeType | null>(null);

  const themeEntries = Object.entries(themes) as [ThemeType, typeof themes[ThemeType]][];

  const handleApply = (key: ThemeType) => {
    setTheme(key);
  };

  const updateCustomColor = (colorType: keyof CustomColors, color: string) => {
    setCustomColors((prev) => {
      const next = { ...prev, [colorType]: color };
      try { localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const applyCustomTheme = () => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', customColors.primary);
    root.style.setProperty('--color-secondary', customColors.secondary);
    root.style.setProperty('--color-accent', customColors.accent);
    root.style.setProperty('--color-background', customColors.background);
    root.style.setProperty('--color-surface', customColors.surface);
    root.style.setProperty('--color-text-primary', customColors.text);
    try {
      localStorage.setItem('atlas-fna-theme', 'custom');
      localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(customColors));
    } catch { /* ignore */ }
  };

  const resetCustom = () => {
    setCustomColors(defaultCustomColors);
    try { localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(defaultCustomColors)); } catch { /* ignore */ }
  };

  const exportThemeConfig = () => {
    const config = {
      themeType,
      customColors,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atlas-fna-theme-${themeType}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center" style={{ color: 'var(--color-text-primary)' }}>
            <Palette className="h-6 w-6 mr-3" />
            Configurateur de Thèmes Atlas F&A
          </h2>
          <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Palette active : <strong>{themes[themeType]?.name ?? 'Personnalisée'}</strong>
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
          <TabsTrigger value="predefined">Palettes Officielles</TabsTrigger>
          <TabsTrigger value="custom">Personnalisation</TabsTrigger>
          <TabsTrigger value="preview">Aperçu Live</TabsTrigger>
        </TabsList>

        {/* Palettes officielles */}
        <TabsContent value="predefined" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {themeEntries.map(([key, theme]) => {
              const isActive = themeType === key;
              const c = theme.colors;
              return (
                <Card
                  key={key}
                  className="cursor-pointer transition-all duration-200 hover:shadow-lg"
                  style={{
                    borderColor: isActive ? c.accent : undefined,
                    borderWidth: isActive ? 2 : undefined,
                  }}
                  onMouseEnter={() => setHoveredTheme(key)}
                  onMouseLeave={() => setHoveredTheme(null)}
                >
                  <CardContent className="p-4">
                    {/* Preview gradient */}
                    <div
                      className="h-16 rounded-lg mb-3"
                      style={{
                        background: `linear-gradient(135deg, ${c.primary}, ${c.accent}, ${c.secondary})`,
                      }}
                    />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{theme.name}</h3>
                        {isActive && (
                          <Badge className="bg-amber-100 text-amber-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Actif
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {theme.description}
                      </p>

                      {/* 4 swatches */}
                      <div className="grid grid-cols-4 gap-1 mt-3">
                        <div
                          className="h-6 rounded border"
                          style={{ backgroundColor: c.primary }}
                          title={`Primary ${c.primary}`}
                        />
                        <div
                          className="h-6 rounded border"
                          style={{ backgroundColor: c.accent }}
                          title={`Accent ${c.accent}`}
                        />
                        <div
                          className="h-6 rounded border"
                          style={{ backgroundColor: c.background }}
                          title={`Background ${c.background}`}
                        />
                        <div
                          className="h-6 rounded border"
                          style={{ backgroundColor: c.surface }}
                          title={`Surface ${c.surface}`}
                        />
                      </div>

                      <Button
                        className="w-full mt-3"
                        disabled={isActive}
                        onClick={() => handleApply(key)}
                      >
                        {isActive ? 'Palette actuelle' : 'Appliquer'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {hoveredTheme && (
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Survol : {themes[hoveredTheme].name}
            </p>
          )}
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
                <div className="space-y-4">
                  {(Object.entries(customColors) as [keyof CustomColors, string][]).map(([colorType, colorValue]) => (
                    <div key={colorType} className="flex items-center justify-between">
                      <label className="text-sm font-medium capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                        {colorType}
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

                <div className="space-y-4">
                  <h4 className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Aperçu Temps Réel</h4>
                  <div
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: customColors.surface,
                      borderColor: customColors.primary,
                      color: customColors.text,
                    }}
                  >
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
                      Exemple widget Atlas F&A
                    </div>
                  </div>

                  <div className="space-x-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded font-medium text-white transition-colors"
                      style={{ backgroundColor: customColors.primary }}
                    >
                      Bouton Principal
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded font-medium border transition-colors"
                      style={{
                        borderColor: customColors.primary,
                        color: customColors.primary,
                        backgroundColor: 'transparent',
                      }}
                    >
                      Bouton Outline
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <Button variant="outline" onClick={resetCustom}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réinitialiser
                </Button>
                <Button onClick={applyCustomTheme}>
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
                Aperçu Interface Atlas F&A
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { icon: DollarSign, label: 'Trésorerie', value: '3 850 000 XAF' },
                    { icon: Users, label: 'Créances', value: '2 400 000 XAF' },
                    { icon: CreditCard, label: 'Dettes', value: '1 800 000 XAF' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: 'var(--color-primary-light)' }}
                        >
                          <Icon className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                            {label}
                          </p>
                          <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {value}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <h4 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                    Navigation Atlas F&A
                  </h4>
                  <div className="space-y-2">
                    <div
                      className="p-2 rounded flex items-center space-x-3"
                      style={{
                        backgroundColor: 'var(--color-primary-light)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      <Home className="h-4 w-4" />
                      <span>Dashboard Executive</span>
                    </div>
                    <div
                      className="p-2 rounded flex items-center space-x-3"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Comptabilité</span>
                      <Badge
                        className="ml-auto"
                        style={{
                          backgroundColor: 'var(--color-error)',
                          color: '#fff',
                        }}
                      >
                        3
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ThemeConfigurator;
