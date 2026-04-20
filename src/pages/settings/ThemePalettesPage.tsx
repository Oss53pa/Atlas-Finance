/**
 * Palettes officielles Atlas F&A
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

interface PaletteMeta {
  longName: string;
  tagline: string;
}

const paletteMeta: Record<ThemeType, PaletteMeta> = {
  atlasStudio: {
    longName: 'Atlas Studio — Anthracite & Or',
    tagline: 'Élégance professionnelle, tons mate',
  },
  atlasFinance: {
    longName: 'Atlas F&A — Grayscale',
    tagline: 'Monochrome sobre et intemporel',
  },
  oceanBlue: {
    longName: 'Ocean Blue — Finance classique',
    tagline: 'Bleu corporate rassurant',
  },
  forestGreen: {
    longName: 'Forest Green — Nature',
    tagline: 'Vert apaisant, éco-responsable',
  },
  midnightDark: {
    longName: 'Midnight — Mode Sombre',
    tagline: 'Travail nocturne, contraste élevé',
  },
  sahelGold: {
    longName: 'Sahel Gold — OHADA',
    tagline: 'Tons chauds africains, zone OHADA',
  },
  royalIndigo: {
    longName: 'Royal Indigo — Premium',
    tagline: 'Violet sophistiqué, gamme haut de gamme',
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
  const entries = Object.entries(themes) as [ThemeType, Theme][];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Palette className="w-7 h-7" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Palettes de couleurs Atlas F&A
          </h1>
        </div>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Choisissez la palette qui correspond à votre entreprise
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
                      {meta.longName}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                      {meta.tagline}
                    </p>
                  </div>
                  {isActive && (
                    <Badge className="bg-amber-100 text-amber-800 flex-shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Palette actuelle
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
                  {isActive ? 'Palette actuelle' : 'Appliquer cette palette'}
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
            Palette personnalisée
          </h2>
        </div>
        <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Besoin d'une identité sur mesure ? Créez votre propre palette couleur par couleur.
        </p>
        <ThemeConfigurator />

        <div className="mt-6">
          <Link
            to="/settings/typography"
            className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            Voir le guide typographique
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ThemePalettesPage;
