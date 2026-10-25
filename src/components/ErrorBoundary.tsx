import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[var(--color-background)] p-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-[var(--color-red-soft)] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-[var(--color-red)]" />
            </div>
            <div>
              <h2 className="text-lg font-normal text-[var(--color-ink)] mb-2">Something went wrong</h2>
              <p className="text-xs text-[var(--color-muted)] font-normal leading-relaxed">
                {this.state.error?.message || 'An unexpected error occurred.'}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-panel)] border border-[var(--color-border)] text-xs text-[var(--color-ink)] hover:bg-[var(--color-border-soft)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
