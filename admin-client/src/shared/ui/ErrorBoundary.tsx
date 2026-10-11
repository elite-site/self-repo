import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env?.DEV) {
      console.error('Admin ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-xl mx-auto my-8">
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 text-danger p-5"
          >
            <AlertCircle size={20} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-base mb-1">
                {this.props.fallbackTitle || 'Something went wrong'}
              </p>
              <p className="text-sm text-ink-secondary">
                {this.props.fallbackMessage ||
                  'An unexpected error occurred in this admin panel. Please try refreshing or retry below.'}
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-surface hover:bg-surface-raised border border-edge text-ink inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <RefreshCw size={12} strokeWidth={2} aria-hidden="true" />
              <span>Try again</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
