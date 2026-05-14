import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

export interface AiInsightCardProps {
  title?: string;                // Default "Insight du jour"
  source?: string;               // Default "Proph3t · AI"
  confidence?: number;           // 0-100
  insight: React.ReactNode;      // Phrase principale (peut contenir <strong>)
  detail?: React.ReactNode;      // Détail/analyse
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

const AiInsightCard: React.FC<AiInsightCardProps> = ({
  title = 'Insight du jour',
  source = 'Proph3t · AI',
  confidence,
  insight,
  detail,
  primaryAction,
  secondaryAction,
}) => {
  return (
    <article
      className="relative overflow-hidden animate-rise-in"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: '1.25rem 1.375rem',
      }}
    >
      {/* Filet gold supérieur très fin */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent 0%, var(--color-accent) 50%, transparent 100%)',
          opacity: 0.6,
        }}
      />

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="shrink-0 inline-flex items-center justify-center"
          style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'var(--gradient-champagne)',
            boxShadow: '0 4px 12px -2px rgba(201,169,97,0.40), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}
        >
          <Sparkles className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="chip chip-gold">{title}</span>
            <span className="eyebrow-gold">{source}</span>
            {confidence !== undefined && (
              <span className="eyebrow num-tabular" style={{ color: 'var(--color-text-tertiary)' }}>
                · Confiance {confidence} %
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Insight */}
      <p
        className="font-semibold"
        style={{
          color: 'var(--color-text-primary)',
          fontSize: '1.0625rem',
          lineHeight: 1.45,
          letterSpacing: '-0.015em',
        }}
      >
        {insight}
      </p>

      {/* Detail */}
      {detail && (
        <p
          className="mt-2 text-sm"
          style={{ color: 'var(--color-text-tertiary)', lineHeight: 1.65 }}
        >
          {detail}
        </p>
      )}

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-2 mt-4">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="btn"
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-text-inverse)',
                padding: '0.5rem 0.875rem',
                fontSize: '0.8125rem',
                gap: '0.375rem',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {primaryAction.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="btn btn-outline"
              style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem' }}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </article>
  );
};

export default AiInsightCard;
