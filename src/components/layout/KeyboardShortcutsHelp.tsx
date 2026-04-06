import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Alt', 'D'], description: 'Tableau de bord' },
      { keys: ['Alt', 'B'], description: 'Balance' },
      { keys: ['Alt', 'G'], description: 'Grand Livre' },
      { keys: ['Alt', 'J'], description: 'Journaux' },
      { keys: ['Alt', 'P'], description: 'PROPH3T (assistant IA)' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['Alt', 'S'], description: 'Rechercher' },
      { keys: ['Alt', 'N'], description: 'Nouvelle ecriture' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Afficher les raccourcis clavier' },
      { keys: ['Alt', 'H'], description: 'Afficher les raccourcis clavier' },
      { keys: ['Esc'], description: 'Fermer la fenetre modale' },
    ],
  },
];

/**
 * Keyboard shortcuts help overlay.
 * Triggered by pressing "?" or "Alt+H".
 * Renders a modal showing all available shortcuts.
 */
const KeyboardShortcutsHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // "?" key (without modifiers other than shift)
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Alt+H
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Raccourcis clavier"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border bg-white dark:bg-neutral-900 dark:border-neutral-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Raccourcis clavier
          </h2>
          <button
            onClick={close}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, ki) => (
                        <React.Fragment key={ki}>
                          {ki > 0 && (
                            <span className="text-xs text-neutral-400">+</span>
                          )}
                          <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
            Appuyez sur <kbd className="px-1.5 py-0.5 text-xs bg-neutral-200 dark:bg-neutral-700 rounded">Esc</kbd> ou <kbd className="px-1.5 py-0.5 text-xs bg-neutral-200 dark:bg-neutral-700 rounded">?</kbd> pour fermer
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
