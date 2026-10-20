import type { ReactNode } from 'react';

import { useLocation } from 'react-router-dom';

import { ErrorBoundary } from './error-boundary';

/**
 * The application-wide boundary, wired to the router.
 *
 * A separate component rather than an inline `<ErrorBoundary>` in `FrameWork`
 * because the reset key is the current location, and `useLocation` only works
 * for a component rendered *inside* `BrowserRouter` — `FrameWork` renders the
 * router, so its own body is outside it.
 */
export function RootErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();

  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}
