import React from 'react';

export interface MoneyValueProps {
  value: number;
  currency?: string;          // ex: 'FCFA', '€', '$'
  /** Display size — controls font scale */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Compact thresholds (k, M, Md) */
  compact?: boolean;
  /** Show currency symbol/code */
  showCurrency?: boolean;
  /** Show decimals (last 2 digits as superscript) */
  decimals?: boolean;
  /** Decimal precision when not compact */
  precision?: number;
  /** Mono font (JetBrains) instead of Inter tabular */
  mono?: boolean;
  className?: string;
  tone?: 'default' | 'success' | 'danger' | 'muted';
}

const SIZE_CLASS: Record<NonNullable<MoneyValueProps['size']>, string> = {
  sm:   'display-sm',
  md:   'display-md',
  lg:   'display-lg',
  xl:   'display-xl',
  '2xl':'display-2xl',
};

const TONE_COLOR: Record<NonNullable<MoneyValueProps['tone']>, string> = {
  default: 'var(--color-text-primary)',
  success: '#0F8F5F',
  danger:  '#C0322B',
  muted:   'var(--color-text-tertiary)',
};

function formatCompact(n: number): { whole: string; suffix: string; decimals: string } {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    const v = n / 1_000_000_000;
    const whole = Math.trunc(Math.abs(v)).toString();
    const dec = Math.round((Math.abs(v) - Math.trunc(Math.abs(v))) * 100).toString().padStart(2, '0');
    return { whole: sign + whole, suffix: ' Md', decimals: dec };
  }
  if (abs >= 1_000_000) {
    const v = n / 1_000_000;
    const whole = Math.trunc(Math.abs(v)).toString();
    const dec = Math.round((Math.abs(v) - Math.trunc(Math.abs(v))) * 100).toString().padStart(2, '0');
    return { whole: sign + whole, suffix: ' M', decimals: dec };
  }
  if (abs >= 10_000) {
    const v = n / 1_000;
    const whole = Math.trunc(Math.abs(v)).toString();
    const dec = Math.round((Math.abs(v) - Math.trunc(Math.abs(v))) * 100).toString().padStart(2, '0');
    return { whole: sign + whole, suffix: ' k', decimals: dec };
  }
  const whole = Math.trunc(n).toLocaleString('fr-FR');
  const dec = Math.round((Math.abs(n) - Math.trunc(Math.abs(n))) * 100).toString().padStart(2, '0');
  return { whole, suffix: '', decimals: dec };
}

const MoneyValue: React.FC<MoneyValueProps> = ({
  value,
  currency = 'FCFA',
  size = 'md',
  compact = true,
  showCurrency = true,
  decimals = false,
  precision = 0,
  mono = false,
  className = '',
  tone = 'default',
}) => {
  const sizeCls = SIZE_CLASS[size];
  const color = TONE_COLOR[tone];
  const baseFont = mono ? 'num-mono' : 'num-display';

  if (compact) {
    const { whole, suffix, decimals: dec } = formatCompact(value);
    return (
      <span className={`${sizeCls} ${baseFont} ${className}`} style={{ color, display: 'inline-flex', alignItems: 'baseline' }}>
        <span>{whole}</span>
        {decimals && dec !== '00' && <sup className="num-decimals">,{dec}</sup>}
        {suffix && <span style={{ fontSize: '0.65em', fontWeight: 500, color: 'var(--color-text-tertiary)', marginLeft: '0.15em' }}>{suffix.trim()}</span>}
        {showCurrency && currency && (
          <span style={{ fontSize: '0.5em', fontWeight: 500, color: 'var(--color-text-tertiary)', marginLeft: '0.35em', letterSpacing: '0.04em' }}>
            {currency}
          </span>
        )}
      </span>
    );
  }

  const formatted = value.toLocaleString('fr-FR', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  return (
    <span className={`${sizeCls} ${baseFont} ${className}`} style={{ color, display: 'inline-flex', alignItems: 'baseline' }}>
      <span>{formatted}</span>
      {showCurrency && currency && (
        <span style={{ fontSize: '0.5em', fontWeight: 500, color: 'var(--color-text-tertiary)', marginLeft: '0.35em', letterSpacing: '0.04em' }}>
          {currency}
        </span>
      )}
    </span>
  );
};

export default MoneyValue;
