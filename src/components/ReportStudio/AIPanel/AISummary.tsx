import React from 'react';

interface AISummaryProps {
  content: string;
  isLoading: boolean;
  onRegenerate: () => void;
  onEdit: () => void;
  onCopy: () => void;
}

export const AISummary: React.FC<AISummaryProps> = ({
  content,
  isLoading,
  onRegenerate,
  onEdit,
  onCopy,
}) => {
  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-primary-200 rounded w-full" />
          <div className="h-3 bg-primary-200 rounded w-5/6" />
          <div className="h-3 bg-primary-200 rounded w-4/6" />
        </div>
      ) : (
        <>
          <p className="text-sm text-primary-600 leading-relaxed">
            {content || "Aucun résumé généré pour le moment."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onRegenerate}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Régénérer
            </button>
            <button
              onClick={onEdit}
              className="text-xs text-primary-500 hover:underline flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifier
            </button>
            <button
              onClick={onCopy}
              className="text-xs text-primary-500 hover:underline flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copier
            </button>
          </div>
        </>
      )}
    </div>
  );
};
