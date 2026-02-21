import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export formatters from central source
export { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent, formatPercentage, formatCompactCurrency, formatRelativeDate, abbreviateNumber, parseCurrency, getDaysBetween, isOverdue } from '../utils/formatters';
