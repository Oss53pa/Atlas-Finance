/**
 * Centralized formatting utilities for Atlas Finance.
 * Use these instead of inline formatting throughout the codebase.
 *
 * IMPORTANT: Ne pas dupliquer ces fonctions localement dans les composants.
 * Importer depuis '@/utils/formatters' ou '../utils/formatters'.
 */

/**
 * Format a number as currency.
 * FCFA (XOF/XAF) : pas de centimes, separateur d'espace.
 */
export function formatCurrency(amount: number, currency = 'XOF', locale = 'fr-FR'): string {
  if (currency === 'FCFA' || currency === 'XOF' || currency === 'XAF') {
    return new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format compact currency (e.g., 1.5M FCFA, 350k FCFA).
 * Utile pour les badges, KPIs, graphiques.
 */
export function formatCompactCurrency(amount: number, currency = 'FCFA'): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  let value: string;
  let suffix: string;

  if (absAmount >= 1_000_000_000) {
    value = (absAmount / 1_000_000_000).toFixed(1);
    suffix = 'Mrd';
  } else if (absAmount >= 1_000_000) {
    value = (absAmount / 1_000_000).toFixed(1);
    suffix = 'M';
  } else if (absAmount >= 1_000) {
    value = (absAmount / 1_000).toFixed(0);
    suffix = 'k';
  } else {
    value = absAmount.toFixed(0);
    suffix = '';
  }

  return `${sign}${value}${suffix} ${currency}`;
}

/** Parse a formatted currency string back to a number */
export function parseCurrency(value: string): number {
  const cleanedValue = value.replace(/[^\d.,-]/g, '').replace(',', '.');
  return parseFloat(cleanedValue) || 0;
}

/** Format a number with thousands separators */
export function formatNumber(value: number, decimals = 0, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a date string (ISO or Date) to localized format.
 * @param date - ISO string or Date object
 * @param format - 'short' (21/02/2026), 'long' (21 fevrier 2026), 'iso' (2026-02-21)
 */
export function formatDate(date: string | Date, format: 'short' | 'long' | 'iso' = 'short', locale = 'fr-FR'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : '';

  switch (format) {
    case 'short':
      return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    case 'long':
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    case 'iso':
      return d.toISOString().split('T')[0];
  }
}

/** Format date and time */
export function formatDateTime(date: string | Date, locale = 'fr-FR'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : '';
  return d.toLocaleDateString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Format a percentage */
export function formatPercent(value: number, decimals = 1): string {
  return formatNumber(value, decimals) + ' %';
}

/** Format a date to relative time (e.g., "il y a 3 jours") */
export function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
  return `Il y a ${Math.floor(diffDays / 365)} ans`;
}

/** Calculate number of days between two dates */
export function getDaysBetween(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

/** Check if a date is overdue (past today) */
export function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

/** Format a percentage from a ratio (value/total) */
export function formatPercentage(value: number, totalOrDecimals?: number, decimals = 1): string {
  if (totalOrDecimals !== undefined && totalOrDecimals > 1) {
    // Called as formatPercentage(value, total, decimals)
    if (totalOrDecimals === 0) return '0%';
    const pct = (value / totalOrDecimals) * 100;
    return `${pct.toFixed(decimals)}%`;
  }
  // Called as formatPercentage(value, decimals?)
  return `${value.toFixed(totalOrDecimals ?? decimals)}%`;
}

/** Abbreviate a number (e.g., 1.5M, 350k) */
export function abbreviateNumber(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absValue >= 1_000_000_000) return `${sign}${(absValue / 1_000_000_000).toFixed(1)}Mrd`;
  if (absValue >= 1_000_000) return `${sign}${(absValue / 1_000_000).toFixed(1)}M`;
  if (absValue >= 1_000) return `${sign}${(absValue / 1_000).toFixed(1)}k`;
  return value.toString();
}
