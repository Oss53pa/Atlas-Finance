/**
 * Variable Service — Dynamic variable resolution in text blocks
 * CDC §12.2 — Variables Dynamiques
 *
 * Supported variables:
 *   {{period.label}}       → "Décembre 2025"
 *   {{period.year}}        → "2025"
 *   {{period.month}}       → "Décembre"
 *   {{report.name}}        → "Rapport Mensuel DG"
 *   {{report.version}}     → "3"
 *   {{company.name}}       → "Atlas Finance"
 *   {{generated.date}}     → "15 mars 2026"
 *   {{user.fullname}}      → "Dev Admin"
 *   {{kpi.ca}}             → "2 847 000 000 FCFA"
 *   {{kpi.resultat_net}}   → "342 000 000 FCFA"
 *   {{kpi.tresorerie}}     → "518 000 000 FCFA"
 *   {{kpi.variation_ca_pct}} → "+12.4%"
 */

import type { VariableContext } from '../types';

const VARIABLE_REGEX = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

const months = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(num) + ' FCFA';
}

function resolveVariable(path: string, context: VariableContext): string | null {
  const parts = path.split('.');

  switch (parts[0]) {
    case 'period': {
      if (!context.period) return null;
      switch (parts[1]) {
        case 'label': return context.period.label;
        case 'year': return context.period.endDate?.substring(0, 4) || '';
        case 'month': {
          const m = parseInt(context.period.endDate?.substring(5, 7) || '0', 10);
          return months[m - 1] || '';
        }
        case 'start': return context.period.startDate;
        case 'end': return context.period.endDate;
        case 'type': return context.period.type;
        default: return null;
      }
    }

    case 'report': {
      if (!context.report) return null;
      switch (parts[1]) {
        case 'name': return context.report.name;
        case 'version': return String(context.report.version);
        default: return null;
      }
    }

    case 'company': {
      if (!context.company) return null;
      switch (parts[1]) {
        case 'name': return context.company.name;
        case 'address': return context.company.address || '';
        default: return null;
      }
    }

    case 'user': {
      if (!context.user) return null;
      switch (parts[1]) {
        case 'fullname': return context.user.fullname;
        default: return null;
      }
    }

    case 'generated': {
      switch (parts[1]) {
        case 'date': {
          const d = context.generatedDate ? new Date(context.generatedDate) : new Date();
          return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        case 'datetime': {
          const d = context.generatedDate ? new Date(context.generatedDate) : new Date();
          return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        default: return null;
      }
    }

    case 'kpi': {
      if (!context.kpis) return null;
      const kpiKey = parts.slice(1).join('.');
      const value = context.kpis[kpiKey];
      if (value === undefined || value === null) return '—';
      if (typeof value === 'number') return formatCurrency(value);
      return String(value);
    }

    default:
      return null;
  }
}

/**
 * Resolve all {{variables}} in a text string.
 * Unknown variables are left as-is (displayed in template form).
 */
export function resolveVariables(text: string, context: VariableContext): string {
  return text.replace(VARIABLE_REGEX, (match, path: string) => {
    const resolved = resolveVariable(path, context);
    return resolved !== null ? resolved : match;
  });
}

/**
 * Extract all variable names from a text.
 */
export function extractVariables(text: string): string[] {
  const vars: string[] = [];
  let match;
  while ((match = VARIABLE_REGEX.exec(text)) !== null) {
    vars.push(match[1]);
  }
  return vars;
}

/**
 * Get all available variables with descriptions.
 */
export function getAvailableVariables(): { path: string; label: string; example: string }[] {
  return [
    { path: 'period.label', label: 'Période', example: 'Décembre 2025' },
    { path: 'period.year', label: 'Année', example: '2025' },
    { path: 'period.month', label: 'Mois', example: 'Décembre' },
    { path: 'report.name', label: 'Nom du rapport', example: 'Rapport Mensuel DG' },
    { path: 'report.version', label: 'Version', example: '3' },
    { path: 'company.name', label: 'Société', example: 'Atlas Finance' },
    { path: 'generated.date', label: 'Date de génération', example: '15 mars 2026' },
    { path: 'user.fullname', label: 'Utilisateur', example: 'Dev Admin' },
    { path: 'kpi.ca', label: 'Chiffre d\'Affaires', example: '2 847 000 000 FCFA' },
    { path: 'kpi.resultat_net', label: 'Résultat Net', example: '342 000 000 FCFA' },
    { path: 'kpi.tresorerie', label: 'Trésorerie', example: '518 000 000 FCFA' },
    { path: 'kpi.variation_ca_pct', label: 'Variation CA %', example: '+12.4%' },
    { path: 'kpi.ebitda', label: 'EBITDA', example: '480 000 000 FCFA' },
    { path: 'kpi.marge_brute', label: 'Marge Brute %', example: '32.5%' },
    { path: 'kpi.dso', label: 'DSO (jours)', example: '47' },
    { path: 'kpi.dpo', label: 'DPO (jours)', example: '38' },
  ];
}
