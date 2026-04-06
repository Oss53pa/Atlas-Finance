/**
 * Fiscal Year Utilities
 * Handles exercice a cheval (fiscal years spanning 2 calendar years)
 * and prorata temporis calculations per SYSCOHADA rules.
 */

export interface FiscalMonth {
  month: number;  // 1-12
  year: number;
}

/**
 * Returns true if the fiscal year spans 2 calendar years.
 * Example: 01/07/2024 -> 30/06/2025 is "a cheval".
 */
export function isExerciceACheval(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start.getFullYear() !== end.getFullYear();
}

/**
 * Returns an array of {month, year} covering every month of the fiscal year.
 * Useful for prorata temporis calculations and monthly period generation.
 */
export function getFiscalMonths(startDate: string, endDate: string): FiscalMonth[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months: FiscalMonth[] = [];

  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= last) {
    months.push({
      month: current.getMonth() + 1,
      year: current.getFullYear(),
    });
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

/**
 * Computes the SYSCOHADA prorata temporis ratio (days / 360).
 *
 * SYSCOHADA uses a commercial year of 360 days (12 months x 30 days).
 * Each month is counted as 30 days regardless of actual calendar days.
 *
 * The prorata is computed from the acquisition date (or exercice start if later)
 * to the exercice end date.
 *
 * @returns ratio between 0 and 1 (days / 360)
 */
export function getProrataDays(
  acquisitionDate: string,
  exerciceStart: string,
  exerciceEnd: string,
): number {
  const acq = new Date(acquisitionDate);
  const start = new Date(exerciceStart);
  const end = new Date(exerciceEnd);

  // Effective start: the later of acquisition date and exercice start
  const effectiveStart = acq > start ? acq : start;

  // SYSCOHADA commercial calendar: each month = 30 days
  const startMonth = effectiveStart.getFullYear() * 12 + effectiveStart.getMonth();
  const endMonth = end.getFullYear() * 12 + end.getMonth();

  // Cap day-of-month at 30 (commercial calendar)
  const startDay = Math.min(effectiveStart.getDate(), 30);
  const endDay = Math.min(end.getDate(), 30);

  const totalDays = (endMonth - startMonth) * 30 + (endDay - startDay);

  if (totalDays <= 0) return 0;
  if (totalDays >= 360) return 1;

  return totalDays / 360;
}

/**
 * Returns the number of months in a fiscal year (used for period generation).
 */
export function getFiscalYearMonthCount(startDate: string, endDate: string): number {
  return getFiscalMonths(startDate, endDate).length;
}

/**
 * Determines if a given date falls within a fiscal year.
 */
export function isDateInFiscalYear(
  date: string,
  exerciceStart: string,
  exerciceEnd: string,
): boolean {
  return date >= exerciceStart && date <= exerciceEnd;
}
