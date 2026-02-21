/**
 * Route prefetching utility for improved navigation performance.
 *
 * Prefetches lazy-loaded route chunks when the user hovers over navigation links
 * or when the app is idle, so the next page loads instantly.
 */

type LazyImportFn = () => Promise<{ default: React.ComponentType }>;

const prefetchedRoutes = new Set<string>();

/**
 * Map of route paths to their lazy import functions.
 * Add routes that are commonly navigated to from the dashboard.
 */
const CRITICAL_ROUTES: Record<string, LazyImportFn> = {
  '/accounting': () => import('../pages/accounting/AccountingDashboard'),
  '/accounting/entries': () => import('../pages/accounting/EntriesPage'),
  '/accounting/journals': () => import('../pages/accounting/JournalsPage'),
  '/accounting/balance': () => import('../pages/accounting/BalancePage'),
  '/accounting/general-ledger': () => import('../pages/accounting/GeneralLedgerPage'),
  '/treasury': () => import('../pages/treasury/TreasuryDashboard'),
  '/tiers': () => import('../pages/tiers/TiersDashboard'),
  '/closures': () => import('../pages/closures/ClosureModulesIndex'),
  '/reporting': () => import('../pages/reporting/ReportingDashboard'),
};

/**
 * Prefetch a specific route's chunk.
 */
export function prefetchRoute(path: string): void {
  if (prefetchedRoutes.has(path)) return;
  const importFn = CRITICAL_ROUTES[path];
  if (!importFn) return;

  prefetchedRoutes.add(path);
  // Fire and forget — we don't need the result, just want the chunk cached
  importFn().catch(() => {
    prefetchedRoutes.delete(path); // Allow retry on failure
  });
}

/**
 * Prefetch all critical routes during idle time.
 * Call this after the app has loaded and is idle.
 */
export function prefetchCriticalRoutes(): void {
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => {
      for (const path of Object.keys(CRITICAL_ROUTES)) {
        prefetchRoute(path);
      }
    });
  } else {
    // Fallback: prefetch after 3s delay
    setTimeout(() => {
      for (const path of Object.keys(CRITICAL_ROUTES)) {
        prefetchRoute(path);
      }
    }, 3000);
  }
}

/**
 * Create an onMouseEnter handler for navigation links.
 * Usage: <Link to="/accounting" onMouseEnter={() => prefetchRoute('/accounting')}>
 */
export function createPrefetchHandler(path: string): () => void {
  return () => prefetchRoute(path);
}
