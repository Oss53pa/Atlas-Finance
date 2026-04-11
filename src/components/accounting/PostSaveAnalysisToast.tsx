import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import type { PostSaveAnalysisResult } from '../../services/prophet/postSaveAnalysis';

interface Props {
  result: PostSaveAnalysisResult | null;
  onClose: () => void;
  autoCloseMs?: number;
}

/**
 * Non-blocking toast that surfaces SYSCOHADA warnings produced by
 * {@link analyzeEntryPostSave} after a journal entry save. Auto-dismisses
 * when no warnings or only info-level signals are present; otherwise waits
 * for the user to close it manually.
 */
export const PostSaveAnalysisToast: React.FC<Props> = ({
  result,
  onClose,
  autoCloseMs = 8000,
}) => {
  useEffect(() => {
    if (!result || result.hasBloquants || result.hasMajeurs) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [result, autoCloseMs, onClose]);

  if (!result) return null;

  const icon = result.hasBloquants ? (
    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
  ) : result.hasMajeurs ? (
    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
  ) : result.warnings.length > 0 ? (
    <Info className="w-5 h-5 text-blue-500 shrink-0" />
  ) : (
    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
  );

  const bgColor = result.hasBloquants
    ? 'bg-red-50 border-red-200'
    : result.hasMajeurs
    ? 'bg-amber-50 border-amber-200'
    : result.warnings.length > 0
    ? 'bg-blue-50 border-blue-200'
    : 'bg-green-50 border-green-200';

  return (
    <div
      className={`fixed bottom-6 right-6 max-w-md z-[9999] ${bgColor} border rounded-xl shadow-xl p-4 animate-in slide-in-from-bottom-4 duration-300`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-neutral-900">
              Analyse PROPH3T SYSCOHADA
            </h4>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Fermer"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-neutral-700 mb-2">{result.summary}</p>
          {result.warnings.length > 0 && (
            <ul className="space-y-1.5 max-h-48 overflow-y-auto">
              {result.warnings.slice(0, 5).map((w, i) => (
                <li
                  key={i}
                  className="text-xs border-l-2 pl-2 border-neutral-300"
                >
                  <span className="font-mono text-[10px] text-neutral-500">
                    {w.code}
                  </span>{' '}
                  <span className="text-neutral-700">{w.message}</span>
                  {w.article && (
                    <span className="block text-[10px] text-neutral-500 italic">
                      {w.article}
                    </span>
                  )}
                </li>
              ))}
              {result.warnings.length > 5 && (
                <li className="text-xs text-neutral-500 italic">
                  + {result.warnings.length - 5} autre(s)...
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostSaveAnalysisToast;
