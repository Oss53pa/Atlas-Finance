import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NotebookPen, Check, Loader2 } from 'lucide-react';

/**
 * Socle visuel partagé des espaces de travail (Comptable / Manager / Admin).
 *
 * Les trois écrans empilaient des cartes blanches de même poids : aucune
 * hiérarchie, donc rien qui ressemble à un poste de travail. Ce socle pose
 * trois niveaux — un bandeau d'accueil qui situe la personne et la période,
 * des cartes de section au chrome commun, et un bloc-notes persistant.
 *
 * 100 % tokens de thème : les six thèmes de l'application restent valides.
 */

/* ─────────────────────────── Bandeau d'accueil ─────────────────────────── */

export interface WorkspaceHeroProps {
  /** Prénom ou nom complet affiché dans la salutation */
  userName?: string;
  /** Libellé de l'espace (« Espace Comptable »…) */
  spaceLabel: string;
  /** Phrase de contexte sous la salutation */
  subtitle?: string;
  /** Pastilles de contexte : exercice, période, statut… */
  chips?: { label: string; value: string }[];
  /** Zone d'actions à droite (boutons) */
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

/** Salutation selon l'heure locale — un poste de travail parle à son occupant. */
const greeting = (d: Date) => {
  const h = d.getHours();
  if (h < 5) return 'Bonne nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

const longDate = (d: Date) =>
  d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const WorkspaceHero: React.FC<WorkspaceHeroProps> = ({
  userName, spaceLabel, subtitle, chips = [], actions, icon,
}) => {
  const now = useMemo(() => new Date(), []);
  const firstName = (userName || '').trim().split(' ')[0];

  return (
    <section
      className="relative overflow-hidden rounded-2xl"
      style={{
        background:
          'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover, var(--color-primary)) 55%, var(--color-secondary) 190%)',
        boxShadow: 'var(--shadow-md, 0 12px 32px -14px rgba(23,25,18,.35))',
      }}
    >
      {/* Halo décoratif — purement ornemental, masqué aux lecteurs d'écran. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full opacity-25"
        style={{ background: 'radial-gradient(circle, #FFFFFF 0%, transparent 68%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #FFFFFF 0%, transparent 70%)' }}
      />

      <div className="relative flex flex-wrap items-start justify-between gap-6 px-7 py-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {icon && (
              <span
                className="grid place-items-center rounded-xl text-white [&_svg]:h-4 [&_svg]:w-4"
                style={{ width: 32, height: 32, background: 'rgba(255,255,255,.18)' }}
              >
                {icon}
              </span>
            )}
            <span
              className="text-[11px] font-bold uppercase"
              style={{ letterSpacing: '.16em', color: 'rgba(255,255,255,.78)' }}
            >
              {spaceLabel}
            </span>
          </div>

          <h1
            className="mt-3 font-bold text-white"
            style={{ fontSize: 'clamp(1.35rem, 2.4vw, 1.9rem)', letterSpacing: '-.02em', lineHeight: 1.1 }}
          >
            {greeting(now)}{firstName ? `, ${firstName}` : ''}
          </h1>

          <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,.8)' }}>
            <span className="capitalize">{longDate(now)}</span>
            {subtitle ? ` · ${subtitle}` : ''}
          </p>

          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {chips.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-baseline gap-1.5 rounded-full px-3 py-1"
                  style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.16)' }}
                >
                  <span className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '.1em', color: 'rgba(255,255,255,.7)' }}>
                    {c.label}
                  </span>
                  <span className="num-tabular text-[12.5px] font-bold text-white">{c.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </section>
  );
};

/* ──────────────────────────── Carte de section ─────────────────────────── */

export interface WorkspaceSectionProps {
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  /** Lien / bouton aligné à droite du titre */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Retire le rembourrage du corps (tableaux pleine largeur) */
  flush?: boolean;
}

export const WorkspaceSection: React.FC<WorkspaceSectionProps> = ({
  title, icon, subtitle, action, children, className = '', flush = false,
}) => (
  <section
    className={className}
    style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 18,
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}
  >
    <header className="flex items-center justify-between gap-4 px-5 pt-4 pb-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span
            className="grid flex-none place-items-center rounded-lg [&_svg]:h-4 [&_svg]:w-4"
            style={{
              width: 30, height: 30,
              background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
              color: 'var(--color-primary)',
            }}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
          {subtitle && <p className="truncate text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
    <div className={flush ? '' : 'px-5 pb-5'}>{children}</div>
  </section>
);

/* ─────────────────────────── Actions rapides ───────────────────────────── */

export interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  /** Teinte de la tuile (hex ou var CSS) */
  color?: string;
  hint?: string;
}

export const QuickActionGrid: React.FC<{ actions: QuickAction[] }> = ({ actions }) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
    {actions.map((a) => {
      const color = a.color || 'var(--color-primary)';
      const Icon = a.icon;
      return (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className="group flex flex-col items-start gap-3 rounded-xl p-4 text-left transition-all duration-150 hover:-translate-y-0.5"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span
            className="grid place-items-center rounded-xl transition-transform duration-150 group-hover:scale-105 [&_svg]:h-5 [&_svg]:w-5"
            style={{
              width: 40, height: 40,
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
              color,
            }}
          >
            <Icon className="" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {a.label}
            </span>
            {a.hint && (
              <span className="block truncate text-[11.5px]" style={{ color: 'var(--color-text-tertiary)' }}>{a.hint}</span>
            )}
          </span>
        </button>
      );
    })}
  </div>
);

/* ───────────────────────────── Bloc-notes ──────────────────────────────── */

type SaveState = 'idle' | 'saving' | 'saved';

export interface WorkspaceNotepadProps {
  /** Clé de persistance — inclure l'identifiant utilisateur pour cloisonner. */
  storageKey: string;
  /** Lecture d'une valeur persistée (retourne null si absente) */
  load: (key: string) => Promise<string | null>;
  /** Écriture de la valeur */
  save: (key: string, value: string) => Promise<void>;
  placeholder?: string;
  rows?: number;
}

/**
 * Bloc-notes de l'espace de travail : texte libre, enregistré automatiquement
 * une seconde après la dernière frappe. Aucun bouton « Enregistrer » à ne pas
 * oublier — l'état d'enregistrement est affiché en clair.
 */
export const WorkspaceNotepad: React.FC<WorkspaceNotepadProps> = ({
  storageKey, load, save, placeholder = 'Notes, rappels, points à traiter…', rows = 8,
}) => {
  const [value, setValue] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Évite d'écrire au montage : le premier rendu n'est pas une modification.
  const dirty = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await load(storageKey);
        if (!cancelled && v != null) setValue(v);
      } catch {
        /* pas de note enregistrée : on démarre sur une page blanche */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [storageKey, load]);

  const flush = useCallback(async (v: string) => {
    setState('saving');
    try {
      await save(storageKey, v);
      setSavedAt(new Date());
      setState('saved');
    } catch {
      setState('idle');
    }
  }, [save, storageKey]);

  const onChange = (v: string) => {
    setValue(v);
    dirty.current = true;
    setState('idle');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(v), 1000);
  };

  // Ne pas perdre la dernière frappe si l'on quitte l'écran avant l'échéance.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (dirty.current) void flush(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={loaded ? placeholder : 'Chargement…'}
          disabled={!loaded}
          aria-label="Bloc-notes de l'espace de travail"
          className="w-full resize-y rounded-xl px-4 py-3 text-sm leading-relaxed outline-none transition-colors"
          style={{
            background: 'color-mix(in srgb, var(--color-secondary) 5%, var(--color-surface))',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            // Réglure discrète : la zone se lit comme un carnet, pas comme un champ.
            backgroundImage:
              'repeating-linear-gradient(transparent, transparent 27px, color-mix(in srgb, var(--color-border) 60%, transparent) 28px)',
            backgroundAttachment: 'local',
            lineHeight: '28px',
          }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11.5px]" style={{ color: 'var(--color-text-tertiary)' }}>
        <span className="num-tabular">{words} mot{words > 1 ? 's' : ''}</span>
        <span className="inline-flex items-center gap-1.5">
          {state === 'saving' && (<><Loader2 className="h-3 w-3 animate-spin" />Enregistrement…</>)}
          {state === 'saved' && savedAt && (
            <><Check className="h-3 w-3" style={{ color: 'var(--color-success)' }} />
              Enregistré à {savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>
          )}
          {state === 'idle' && loaded && savedAt && 'Modifications non enregistrées'}
        </span>
      </div>
    </div>
  );
};

export const NotepadIcon = NotebookPen;
