import { Component, type ErrorInfo, type ReactNode } from 'react';

import * as Sentry from '@sentry/react';

import { ErrorFallback } from '@app/components/error/error-fallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * Clears a caught error when it changes.
   *
   * Without it the boundary latches: once something threw, the fallback stayed
   * on screen for the rest of the session, because navigating away re-rendered
   * the children but left `hasError` true. Callers pass the current location.
   */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  resetKey?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    if (props.resetKey === state.resetKey) return null;
    // A new key means the user has moved on; drop any error with it.
    return { hasError: false, error: null, resetKey: props.resetKey };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // A boundary consumes the error before Sentry's global handlers can see
    // it, so a render crash — the failure most worth knowing about — was
    // invisible in production. Report it here or it is reported nowhere.
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });

    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onRetry={this.handleReset} />;
    }

    return this.props.children;
  }
}
