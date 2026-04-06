// @ts-nocheck

/**
 * useFiscalAlerts — Hook partagé pour les alertes fiscales.
 *
 * Utilisé par :
 * - EcheancesFiscalesPage (calendrier fiscal)
 * - ComptableWorkspaceFinal (widget alertes)
 * - ManagerWorkspace (widget alertes)
 * - NotificationBell (badges)
 */
import { useQuery } from '@tanstack/react-query';
import { useData } from '../contexts/DataContext';

export interface FiscalAlert {
  id: string;
  taxCode: string;
  taxName: string;
  taxCategory: string;
  periodLabel: string;
  deadline: string;
  status: 'en_retard' | 'a_declarer' | 'calculee' | 'declaree' | 'payee';
  montant?: number;
  daysUntil: number;
  isOverdue: boolean;
  isUrgent: boolean; // <= 7 jours
  periodicite: string;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export function useFiscalAlerts(year?: number) {
  const { adapter } = useData();
  const currentYear = year ?? new Date().getFullYear();

  return useQuery({
    queryKey: ['fiscal-alerts', currentYear],
    queryFn: async (): Promise<FiscalAlert[]> => {
      const [declarations, registries] = await Promise.all([
        adapter.getAll<Record<string, unknown>>('taxDeclarations'),
        adapter.getAll<Record<string, unknown>>('taxRegistry'),
      ]);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayMs = new Date().getTime();
      const alerts: FiscalAlert[] = [];

      // From existing declarations
      for (const decl of declarations) {
        const reg = registries.find(r => r.id === decl.taxRegistryId || r.taxCode === decl.taxCode);
        const deadline = decl.declarationDeadline || decl.periodEnd || '';
        const daysUntil = Math.ceil((new Date(deadline).getTime() - todayMs) / 86400000);

        let status: FiscalAlert['status'];
        switch (decl.status) {
          case 'paid': status = 'payee'; break;
          case 'declared': case 'validated': status = 'declaree'; break;
          case 'calculated': status = 'calculee'; break;
          case 'overdue': status = 'en_retard'; break;
          default:
            status = deadline < todayStr ? 'en_retard' : 'a_declarer';
        }

        alerts.push({
          id: decl.id,
          taxCode: decl.taxCode || reg?.taxCode || '?',
          taxName: reg?.taxName || decl.taxCode || 'Taxe',
          taxCategory: reg?.taxCategory || 'AUTRE',
          periodLabel: decl.periodLabel || '',
          deadline,
          status,
          montant: decl.netTax ?? decl.balanceDue,
          daysUntil,
          isOverdue: status === 'en_retard',
          isUrgent: daysUntil >= 0 && daysUntil <= 7 && status === 'a_declarer',
          periodicite: reg?.periodicity || 'MONTHLY',
        });
      }

      // Generate from registry if no declarations
      if (alerts.length === 0) {
        for (const reg of registries) {
          if (!reg.isActive) continue;
          const months = reg.periodicity === 'MONTHLY' ? 12
            : reg.periodicity === 'QUARTERLY' ? 4
            : reg.periodicity === 'ANNUAL' ? 1 : 0;

          for (let i = 0; i < months; i++) {
            const periodMonth = reg.periodicity === 'QUARTERLY' ? (i + 1) * 3 : i + 1;
            const periodEnd = new Date(currentYear, periodMonth, 0);
            const deadlineDate = new Date(periodEnd);
            deadlineDate.setDate(deadlineDate.getDate() + (reg.declarationDeadlineDays || 15));
            const deadlineStr = deadlineDate.toISOString().split('T')[0];
            const daysUntil = Math.ceil((deadlineDate.getTime() - todayMs) / 86400000);

            alerts.push({
              id: `${reg.taxCode}-${currentYear}-${String(periodMonth).padStart(2, '0')}`,
              taxCode: reg.taxCode,
              taxName: reg.taxName || reg.taxShortName,
              taxCategory: reg.taxCategory,
              periodLabel: reg.periodicity === 'ANNUAL' ? `${currentYear}`
                : reg.periodicity === 'QUARTERLY' ? `T${i + 1} ${currentYear}`
                : `${MONTH_NAMES[i]} ${currentYear}`,
              deadline: deadlineStr,
              status: deadlineStr < todayStr ? 'en_retard' : 'a_declarer',
              daysUntil,
              isOverdue: deadlineStr < todayStr,
              isUrgent: daysUntil >= 0 && daysUntil <= 7,
              periodicite: reg.periodicity,
            });
          }
        }
      }

      return alerts.sort((a, b) => a.deadline.localeCompare(b.deadline));
    },
    staleTime: 60_000, // Refresh every minute
  });
}

/** Get only overdue + urgent alerts (for workspace widgets) */
export function useFiscalUrgentAlerts() {
  const { data: alerts = [] } = useFiscalAlerts();
  return alerts.filter(a => a.isOverdue || a.isUrgent);
}

/** Get counts by status */
export function useFiscalAlertCounts() {
  const { data: alerts = [] } = useFiscalAlerts();
  const counts = { en_retard: 0, a_declarer: 0, calculee: 0, declaree: 0, payee: 0, urgent: 0 };
  for (const a of alerts) {
    counts[a.status]++;
    if (a.isUrgent) counts.urgent++;
  }
  return counts;
}
