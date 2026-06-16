import { Component, type ErrorInfo, type ReactNode } from 'react';

import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@app/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <div className="flex items-center justify-center size-16 rounded-full bg-destructive/10 mb-6">
            <AlertTriangle className="size-7 text-destructive" />
          </div>

          <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mb-2">
            Error
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mb-2">
            An unexpected error occurred while rendering this page.
          </p>
          {this.state.error && (
            <p className="text-xs text-muted-foreground/60 font-mono max-w-lg mb-8 break-all">
              {this.state.error.message}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              <RotateCcw className="size-4" />
              Try again
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={-1 as unknown as string} replace>
                <ArrowLeft className="size-4" />
                Go back
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/app">Home</Link>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
