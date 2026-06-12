import React, { Suspense, Component, ErrorInfo, ReactNode } from 'react';
import DataPageLayout from '../../components/layout/DataPageLayout';

// Lazy load AdvancedBalance component
const AdvancedBalance = React.lazy(() => import('../../components/accounting/AdvancedBalance'));

// ErrorBoundary local pour capturer les erreurs de rendu d'AdvancedBalance
interface ErrorBoundaryState { hasError: boolean; message: string }
class BalanceErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(err: Error): ErrorBoundaryState {
    return { hasError: true, message: err?.message || 'Erreur inconnue' };
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[BalancePage] AdvancedBalance a lancé une exception :', err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-3 text-[var(--color-error)]">
          <span className="text-4xl">⚠</span>
          <p className="font-semibold">Impossible d'afficher la balance comptable</p>
          <p className="text-sm text-[var(--color-text-tertiary)]">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="px-4 py-2 border border-[var(--color-error)] rounded-lg text-sm hover:bg-[var(--color-error-light)] transition-colors"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const BalancePage: React.FC = () => {
  return (
    // Gabarit standard des écrans de travail : titre FIXE, contenu = seule zone défilante.
    <DataPageLayout
      className="bg-[var(--color-background)]"
      header={
        <div className="px-4 pt-3 pb-2">
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Balance Comptable</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Consultez et analysez la balance des comptes</p>
        </div>
      }
    >
      <div className="px-4 pb-4">
        <BalanceErrorBoundary>
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
            </div>
          }>
            <AdvancedBalance />
          </Suspense>
        </BalanceErrorBoundary>
      </div>
    </DataPageLayout>
  );
};

export default BalancePage;