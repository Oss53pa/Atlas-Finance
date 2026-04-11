import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Search, BookOpen, MessageCircle, ChevronRight, HelpCircle } from 'lucide-react';
import { HELP_ARTICLES, type HelpArticle } from '../../data/helpArticles';

/** Map URL route prefixes to help article categories */
const ROUTE_CATEGORY_MAP: Array<{ prefix: string; category: HelpArticle['category'] }> = [
  { prefix: '/accounting', category: 'comptabilite' },
  { prefix: '/treasury', category: 'tresorerie' },
  { prefix: '/closures', category: 'cloture' },
  { prefix: '/taxation', category: 'fiscalite' },
  { prefix: '/fiscal', category: 'fiscalite' },
  { prefix: '/assets', category: 'immobilisations' },
  { prefix: '/reporting', category: 'rapports' },
  { prefix: '/financial-statements', category: 'rapports' },
  { prefix: '/settings', category: 'parametres' },
  { prefix: '/security', category: 'parametres' },
];

function pickContextArticles(pathname: string): HelpArticle[] {
  const match = ROUTE_CATEGORY_MAP.find(m => pathname.startsWith(m.prefix));
  if (!match) return HELP_ARTICLES.slice(0, 5);
  return HELP_ARTICLES.filter(a => a.category === match.category);
}

export const HelpDrawer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const location = useLocation();

  // Global F1 handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setOpen(v => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Expose a window hook so other components (e.g. header help button) can open it
  useEffect(() => {
    (window as any).openHelpDrawer = () => setOpen(true);
    return () => {
      delete (window as any).openHelpDrawer;
    };
  }, []);

  const contextArticles = useMemo(() => pickContextArticles(location.pathname), [location.pathname]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contextArticles;
    return HELP_ARTICLES.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [query, contextArticles]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105"
        aria-label="Ouvrir l'aide (F1)"
        title="Aide (F1)"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed top-0 right-0 z-50 h-full w-full sm:w-96 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col"
        role="dialog"
        aria-label="Panneau d'aide"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Aide</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
              autoFocus
            />
          </div>
        </div>

        {/* Context label */}
        {!query && (
          <div className="px-4 pt-3 pb-1 text-xs font-medium text-gray-500 uppercase">
            Articles suggérés pour cette page
          </div>
        )}

        {/* Articles */}
        <div className="flex-1 overflow-y-auto p-4 pt-2">
          <div className="space-y-2">
            {filtered.slice(0, 10).map(a => (
              <Link
                key={a.id}
                to={`/help/article/${a.id}`}
                onClick={() => setOpen(false)}
                className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {a.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {a.excerpt}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2 mt-0.5" />
                </div>
              </Link>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                Aucun résultat.
              </p>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Link
            to="/help"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Centre d'aide complet
          </Link>
          <Link
            to="/proph3t"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            PROPH3T Assistant
          </Link>
          <p className="text-xs text-center text-gray-500 pt-1">
            Astuce : appuyez sur <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs">F1</kbd> pour ouvrir/fermer ce panneau.
          </p>
        </div>
      </aside>
    </>
  );
};

export default HelpDrawer;
