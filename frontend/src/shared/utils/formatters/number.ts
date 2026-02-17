export const formatNumber = (
  value: number,
  decimals: number = 0,
  locale: string = 'fr-FR'
): string => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercent = (
  value: number,
  decimals: number = 1,
  locale: string = 'fr-FR'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

export const formatPercentage = (
  value: number,
  total: number,
  decimals: number = 1
): string => {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
};

export const abbreviateNumber = (value: number): string => {
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}Mrd`;
  }
  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return value.toString();
};