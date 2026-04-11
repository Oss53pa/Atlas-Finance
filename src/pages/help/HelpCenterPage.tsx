import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, BookOpen, MessageCircle, HelpCircle, ChevronRight } from 'lucide-react';
import { HELP_ARTICLES, HELP_CATEGORIES, type HelpArticle } from '../../data/helpArticles';

export default function HelpCenterPage() {
  const [query, setQuery] = useState('');

  const filtered: HelpArticle[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HELP_ARTICLES;
    return HELP_ARTICLES.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [query]);

  const recent = HELP_ARTICLES.slice(0, 5);

  return (
    <>
      <Helmet>
        <title>Centre d'aide | Atlas Finance</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
              <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Centre d'aide Atlas Finance
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Comment pouvons-nous vous aider aujourd'hui ?
            </p>
          </div>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto mb-10">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher dans l'aide (ex. TVA, clôture, lettrage...)"
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                data-search-input
              />
            </div>
          </div>

          {/* Category cards */}
          {!query && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Parcourir par catégorie
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {HELP_CATEGORIES.map(cat => {
                  const count = HELP_ARTICLES.filter(a => a.category === cat.id).length;
                  return (
                    <Link
                      key={cat.id}
                      to={`/help?category=${cat.id}`}
                      onClick={(e) => { e.preventDefault(); setQuery(cat.label); }}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md hover:border-blue-500 transition-all text-center"
                    >
                      <div className="text-3xl mb-2">{cat.icon}</div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">{cat.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{count} article{count > 1 ? 's' : ''}</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Articles list (filtered or recent) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {query ? `Résultats (${filtered.length})` : 'Articles récents'}
              </h2>
              <div className="space-y-3">
                {(query ? filtered : recent).map(article => (
                  <Link
                    key={article.id}
                    to={`/help/article/${article.id}`}
                    className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:border-blue-500 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1 uppercase">
                          {HELP_CATEGORIES.find(c => c.id === article.category)?.label}
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {article.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {article.excerpt}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                  </Link>
                ))}
                {query && filtered.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Aucun article ne correspond à votre recherche.
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Link
                to="/help/faq"
                className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md hover:border-blue-500 transition-all"
              >
                <HelpCircle className="w-6 h-6 text-blue-600 mb-2" />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">FAQ</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Réponses aux questions fréquentes
                </p>
              </Link>

              <Link
                to="/proph3t"
                className="block bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-xl p-5 hover:shadow-lg transition-all"
              >
                <MessageCircle className="w-6 h-6 mb-2" />
                <h3 className="font-semibold mb-1">PROPH3T Assistant</h3>
                <p className="text-sm text-white/90">
                  Obtenez une aide instantanée avec notre assistant IA
                </p>
              </Link>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Besoin de plus d'aide ?</h3>
                <a
                  href="mailto:support@advist.io"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  support@advist.io
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
