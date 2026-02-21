import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'XAF') {
  if (currency === 'XAF') {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' XAF';
  }
  return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;
}

export function formatDate(date: string | Date | undefined) {
  if (!date) return 'Non défini';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Vérifier si la date est valide
    if (isNaN(dateObj.getTime())) {
      return 'Date invalide';
    }
    
    return dateObj.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Erreur de format';
  }
}

export function formatPercentage(value: number, decimals: number = 1) {
  return (value).toFixed(decimals) + '%';
}

export function formatPercent(value: number | null | undefined, decimals: number = 1) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.0%';
  }
  return value.toFixed(decimals) + '%';
}