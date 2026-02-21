import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

interface Props {
  children?: ReactNode;
  feature: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Per-feature Error Boundary — shows a compact error UI within the layout
 * instead of replacing the entire page. Used as a route wrapper in App.tsx.
 */
class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.feature}] Error:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 max-w-lg w-full text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Erreur dans le module {this.props.feature}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Une erreur est survenue dans ce module. Les autres parties de l'application restent fonctionnelles.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="text-xs text-left bg-gray-50 p-3 rounded mb-4 overflow-auto max-h-32 text-red-700">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children || <Outlet />;
  }
}

export default FeatureErrorBoundary;
