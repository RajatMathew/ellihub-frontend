import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@app/components/ui/button';

interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
}

/**
 * What `ErrorBoundary` renders once it has caught something.
 *
 * Its own file for two reasons. It needs router hooks, and a class component
 * cannot call them — so it could never have lived inside the boundary itself.
 * And fast refresh only works for a module whose exports are all function
 * components, so pairing it with the boundary class in one file breaks HMR for
 * both (`react-refresh/only-export-components`).
 *
 * "Go back" is a `navigate(-1)`. It used to be `<Link to={-1 as unknown as
 * string}>` — a `Link` takes a destination, not a history delta, so React
 * Router resolved `-1` as a path and the button navigated to `/-1`, a 404.
 */
export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const navigate = useNavigate();

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
      {error && (
        <p className="text-xs text-muted-foreground/60 font-mono max-w-lg mb-8 break-all">
          {error.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="size-4" />
          Try again
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
          Go back
        </Button>
        <Button size="sm" asChild>
          <Link to="/app">Home</Link>
        </Button>
      </div>
    </div>
  );
}
