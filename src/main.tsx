import { StrictMode } from 'react';

import * as Sentry from '@sentry/react';
import { createRoot } from 'react-dom/client';

import './main.css';

import FrameWork from '.';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim();

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    // Ties an event to the build it came from, so a stack trace can be mapped
    // back to source once source maps are uploaded for a release.
    release: __APP_VERSION__,
    /**
     * What this client is allowed to send with an error.
     *
     * The defaults are not neutral here. `httpBodies` defaults to all four
     * targets — every request and response body, in and out — and the bodies
     * this application exchanges are contracts, purchase orders, invoices,
     * vendor records and mailbox content. That is customer data leaving for a
     * third party on any error, which is not what error reporting is for.
     *
     * `stackFrameVariables` defaults to on, and the SDK's own note says name
     * filtering cannot be relied on after minification — so the safe setting in
     * a bundled browser build is off. The values are usually unreadable anyway.
     *
     * `userInfo` already defaults to `false`; it is written out so the next
     * SDK upgrade cannot change that quietly.
     *
     * Left at their defaults: cookies (the session cookie is `httpOnly`, so
     * this SDK cannot read it) and URL query parameters, both of which Sentry
     * filters for sensitive values already.
     *
     * Still reported, which is everything needed to find a bug: the exception,
     * its stack, the release, the environment and the breadcrumb trail.
     */
    dataCollection: {
      userInfo: false,
      httpBodies: [],
      stackFrameVariables: false,
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FrameWork />
  </StrictMode>
);
