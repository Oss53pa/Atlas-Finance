import React, { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ThumbsUp, ThumbsDown, ChevronRight } from 'lucide-react';
import { HELP_ARTICLES, HELP_CATEGORIES } from '../../data/helpArticles';

/**
 * Minimal markdown renderer — supports headings, lists, code fences, inline
 * code, bold, and paragraphs. Intentionally lightweight to avoid pulling in a
 * full markdown library.
 */
function renderMarkdown(md: string): React.ReactNode {
  const lines = md.split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const renderInline = (text: string): React.ReactNode => {
    // bold **text**
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|`([^`]+)`/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      if (m[1] !== undefined) {
        parts.push(<strong key={`b${key++}`}>{m[1]}</strong>);
      } else if (m[2] !== undefined) {
        parts.push(
          <code key={`c${key++}`} className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">
            {m[2]}
          </code>
        );
      }
      last = regex.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return <>{parts}</>;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        <pre key={key++} className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm font-mono my-4">
          <code>{buf.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Table (pipe-delimited)
    if (line.startsWith('|') && i + 1 < lines.length && lines[i + 1].startsWith('|')) {
      const header = line.split('|').slice(1, -1).map(c => c.trim());
      i += 2; // skip header separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i].split('|').slice(1, -1).map(c => c.trim()));
        i++;
      }
      out.push(
        <div key={key++} className="overflow-x-auto my-4">
          <table className="min-w-full border border-gray-200 dark:border-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {header.map((h, idx) => (
                  <th key={idx} className="px-3 py-2 text-left font-semibold border-b border-gray-200 dark:border-gray-700">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, rIdx) => (
                <tr key={rIdx} className="even:bg-gray-50 dark:even:bg-gray-800/50">
                  {r.map((c, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      out.push(<h1 key={key++} className="text-3xl font-bold text-gray-900 dark:text-white mt-6 mb-4">{renderInline(line.slice(2))}</h1>);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      out.push(<h2 key={key++} className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">{renderInline(line.slice(3))}</h2>);
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      out.push(<h3 key={key++} className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">{renderInline(line.slice(4))}</h3>);
      i++;
      continue;
    }

    // Unordered list
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2));
        i++;
      }
      out.push(
        <ul key={key++} className="list-disc list-inside space-y-1 my-3 text-gray-700 dark:text-gray-300">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      out.push(
        <ol key={key++} className="list-decimal list-inside space-y-1 my-3 text-gray-700 dark:text-gray-300">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph
    out.push(
      <p key={key++} className="my-3 text-gray-700 dark:text-gray-300 leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{out}</>;
}

export default function HelpArticlePage() {
  const { articleId } = useParams<{ articleId: string }>();
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const article = HELP_ARTICLES.find(a => a.id === articleId);
  if (!article) {
    return <Navigate to="/help" replace />;
  }

  const category = HELP_CATEGORIES.find(c => c.id === article.category);
  const related = HELP_ARTICLES
    .filter(a => a.id !== article.id && (a.category === article.category || a.tags.some(t => article.tags.includes(t))))
    .slice(0, 3);

  return (
    <>
      <Helmet>
        <title>{article.title} | Centre d'aide Atlas Finance</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center text-sm text-gray-500 mb-6">
            <Link to="/help" className="hover:text-blue-600 dark:hover:text-blue-400">
              Centre d'aide
            </Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-gray-700 dark:text-gray-300">
              {category?.icon} {category?.label}
            </span>
          </nav>

          <Link
            to="/help"
            className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour
          </Link>

          {/* Article */}
          <article className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8 shadow-sm">
            {renderMarkdown(article.content)}

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  {article.tags.map(t => (
                    <span key={t} className="inline-block bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Cet article vous a-t-il été utile ?
              </p>
              {feedback === null ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setFeedback('up')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-900 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" /> Oui
                  </button>
                  <button
                    onClick={() => setFeedback('down')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    <ThumbsDown className="w-4 h-4" /> Non
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feedback === 'up'
                    ? 'Merci pour votre retour !'
                    : 'Merci. Nous améliorons cet article en continu.'}
                </p>
              )}
            </div>
          </article>

          {/* Related articles */}
          {related.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Articles liés
              </h2>
              <div className="space-y-3">
                {related.map(a => (
                  <Link
                    key={a.id}
                    to={`/help/article/${a.id}`}
                    className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:border-blue-500 transition-all"
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">{a.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{a.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
