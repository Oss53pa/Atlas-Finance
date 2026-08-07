/**
 * Palettes officielles Atlas FnA
 * Page de sélection des palettes de couleurs avec aperçu visuel.
 * Route : /settings/themes
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Palette, Sparkles, ArrowRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { themes, type ThemeType, type Theme } from '../../styles/theme';
import { Card, CardContent, Badge, Button } from '../../components/ui';
import ThemeConfigurator from '../../components/settings/ThemeConfigurator';
import { useLanguage } from '@/contexts/LanguageContext';

// Clés (et non libellés) : la table est figée au chargement du module. Les noms
// propres de palette (« Obsidian & Champagne ») restent des littéraux — ce sont
// des marques, pas du texte à traduire.
interface PaletteMeta {
  longName: string | null;
  longNameKey?: string;
  taglineKey: string;
}

const paletteMeta: Record<ThemeType, PaletteMeta> = {
  atlasStudio: {
    longName: 'Obsidian & Champagne',
    taglineKey: 'themePalettes.atlasStudioTagline',
  },
  sapphireSlate: {
    longName: 'Sapphire & Slate',
    taglineKey: 'themePalettes.sapphireSlateTagline',
  },
  steelCarbon: {
    longName: 'Steel & Carbon',
    taglineKey: 'themePalettes.steelCarbonTagline',
  },
  atlasFinance: {
    longName: null, longNameKey: 'themePalettes.atlasFinanceName',
    taglineKey: 'themePalettes.atlasFinanceTagline',
  },
  oceanBlue: {
    longName: null, longNameKey: 'themePalettes.oceanBlueName',
    taglineKey: 'themePalettes.oceanBlueTagline',
  },
  forestGreen: {
    longName: null, longNameKey: 'themePalettes.forestGreenName',
    taglineKey: 'themePalettes.forestGreenTagline',
  },
  midnightDark: {
    longName: null, longNameKey: 'themePalettes.midnightDarkName',
    taglineKey: 'themePalettes.midnightDarkTagline',
  },
  sahelGold: {
    longName: null, longNameKey: 'themePalettes.sahelGoldName',
    taglineKey: 'themePalettes.sahelGoldTagline',
  },
  royalIndigo: {
    longName: null, longNameKey: 'themePalettes.royalIndigoName',
    taglineKey: 'themePalettes.royalIndigoTagline',
  },
};

const Swatch: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className="w-10 h-10 rounded-full border-2"
      style={{
        backgroundColor: color,
        borderColor: 'var(--color-border)',
      }}
      title={`${label} ${color}`}
    />
    <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
      {label}
    </span>
  </div>
);

const MiniDashboardPreview: React.FC<{ theme: Theme }> = ({ theme }) => {
  const c = theme.colors;
  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{
        backgroundColor: c.background,
        borderColor: c.border,
      }}
    >
      {/* Sidebar strip + content */}
      <div className="flex h-24">
        <div className="w-8" style={{ backgroundColor: c.sidebar.bg }}>
          <div className="w-full h-1.5 mt-3" style={{ backgroundColor: c.sidebar.active }} />
        </div>
        <div className="flex-1 p-2">
          <div
            className="rounded p-1.5 mb-1.5 border"
            style={{ backgroundColor: c.surface, borderColor: c.card.border }}
          >
            <div className="h-1 w-1/3 rounded mb-1" style={{ backgroundColor: c.primary }} />
            <div className="h-0.5 w-1/2 rounded" style={{ backgroundColor: c.text.tertiary }} />
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div
              className="h-3 rounded"
              style={{ backgroundColor: c.accent, opacity: 0.85 }}
            />
            <div
              className="h-3 rounded"
              style={{ backgroundColor: c.success, opacity: 0.85 }}
            />
            <div
              className="h-3 rounded"
              style={{ backgroundColor: c.info, opacity: 0.85 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const ThemePalettesPage: React.FC = () => {
  const { themeType, setTheme } = useTheme();
  const { t } = useLanguage();
  const entries = Object.entries(themes) as [ThemeType, Theme][];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Palette className="w-7 h-7" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('themePalettes.title')}
          </h1>
        </div>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          {t('themePalettes.subtitle')}
        </p>
      </div>

      {/* Grid of palette cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {entries.map(([key, theme]) => {
          const meta = paletteMeta[key];
          const isActive = themeType === key;
          const c = theme.colors;
          return (
            <Card
              key={key}
              className="transition-all duration-200 hover:shadow-lg"
              style={{
                borderColor: isActive ? c.accent : 'var(--color-border)',
                borderWidth: isActive ? 2 : 1,
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
                      {meta.longName ?? t(meta.longNameKey!)}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                      {t(meta.taglineKey)}
                    </p>
                  </div>
                  {isActive && (
                    <Badge className="bg-amber-100 text-amber-800 flex-shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('themePalettes.currentPalette')}
                    </Badge>
                  )}
                </div>

                {/* Swatches */}
                <div className="flex justify-between items-end">
                  <Swatch color={c.primary} label="Primary" />
                  <Swatch color={c.accent} label="Accent" />
                  <Swatch color={c.background} label="Bg" />
                  <Swatch color={c.surface} label="Surface" />
                </div>

                {/* Mini dashboard preview */}
                <MiniDashboardPreview theme={theme} />

                <Button
                  className="w-full"
                  disabled={isActive}
                  onClick={() => setTheme(key)}
                >
                  {isActive ? t('themePalettes.currentPalette') : 'Appliquer cette palette'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Custom palette section */}
      <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('themePalettes.customPalette')}
          </h2>
        </div>
        <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {t('themePalettes.customPaletteHint')}
        </p>
        <ThemeConfigurator />

        <div className="mt-6">
          <Link
            to="/settings/typography"
            className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('themePalettes.typographyGuide')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ThemePalettesPage;
