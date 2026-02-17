export const formatCurrency = (
  amount: number,
  currency: string = 'FCFA',
  locale: string = 'fr-FR'
): string => {
  if (currency === 'FCFA') {
    return new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

export const parseCurrency = (value: string): number => {
  const cleanedValue = value.replace(/[^\d.,-]/g, '').replace(',', '.');
  return parseFloat(cleanedValue) || 0;
};

export const formatCompactCurrency = (
  amount: number,
  currency: string = 'FCFA'
): string => {
  const absAmount = Math.abs(amount);
  let value: string;
  let suffix: string;

  if (absAmount >= 1_000_000_000) {
    value = (amount / 1_000_000_000).toFixed(1);
    suffix = 'Mrd';
  } else if (absAmount >= 1_000_000) {
    value = (amount / 1_000_000).toFixed(1);
    suffix = 'M';
  } else if (absAmount >= 1_000) {
    value = (amount / 1_000).toFixed(1);
    suffix = 'k';
  } else {
    value = amount.toFixed(0);
    suffix = '';
  }

  return `${value}${suffix} ${currency}`;
};